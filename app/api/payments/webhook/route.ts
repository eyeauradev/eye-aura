import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/services/firebase/admin";
import { logServerError } from "@/services/error-logging/error-log.service.server";
import { ERROR_CODES } from "@/lib/errors";
import crypto from "crypto";
import { hasTimeRangeOverlap, computeEndTime } from "@/services/booking/slot-filter.service";

/**
 * Razorpay Webhook Handler
 *
 * WHY THIS EXISTS
 * ---------------
 * The client-side Razorpay checkout fires a `handler` callback after payment, which
 * calls /api/payments/verify-payment to mark the payment completed and create the
 * booking_request. But if the browser closes, crashes, or loses connectivity between
 * Razorpay capturing the payment and the handler firing, the payment is stuck as
 * "pending" in Firestore even though Razorpay has the money.
 *
 * This webhook is the server-to-server safety net. Razorpay calls it directly,
 * independently of the user's browser.
 *
 * SETUP REQUIRED (Razorpay Dashboard)
 * ------------------------------------
 * 1. Go to Account & Settings → Webhooks → Add New Webhook
 * 2. Webhook URL: https://<your-domain>/api/payments/webhook
 * 3. Events to subscribe: payment.captured, payment.failed
 * 4. Copy the webhook secret and set RAZORPAY_WEBHOOK_SECRET in your env
 *
 * SECURITY
 * --------
 * Every request is verified via HMAC-SHA256 of the raw body against the
 * x-razorpay-signature header. Requests with invalid signatures return 400
 * immediately — no Firestore work is done.
 *
 * IDEMPOTENCY
 * -----------
 * Both handlers are idempotent. If verify-payment already ran (payment.status
 * is already "completed"), the webhook skips all work and returns 200. Razorpay
 * retries failed webhooks up to 5 times over 24 hours.
 */

// Required: Next.js must receive the raw body for HMAC verification.
// If Next.js parses it as JSON first the signature check will fail.
export const dynamic = "force-dynamic";

interface ConflictCheckResult {
  hasConflict: boolean;
  conflictSource?: "booking_request" | "appointment" | "doctor_block";
  conflictId?: string;
}

async function checkSlotConflict(
  transaction: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  doctorId: string,
  requestedTime: Date,
  combinedDuration: number
): Promise<ConflictCheckResult> {
  const requestStart = requestedTime;
  const requestEnd = computeEndTime(requestedTime, combinedDuration);

  const [brSnap, aptSnap, blockSnap] = await Promise.all([
    transaction.get(
      db.collection("booking_requests")
        .where("doctorId", "==", doctorId)
        .where("status", "in", ["pending", "accepted"])
    ),
    transaction.get(
      db.collection("appointments")
        .where("doctorId", "==", doctorId)
        .where("status", "in", ["confirmed", "pending"])
    ),
    transaction.get(
      db.collection("doctor_blocks").where("doctorId", "==", doctorId)
    ),
  ]);

  for (const doc of brSnap.docs) {
    const br = doc.data();
    const brStart = br.requestedTime.toDate();
    const brEnd = computeEndTime(brStart, br.combinedDuration ?? 30);
    if (hasTimeRangeOverlap(requestStart, requestEnd, brStart, brEnd)) {
      return { hasConflict: true, conflictSource: "booking_request", conflictId: doc.id };
    }
  }

  for (const doc of aptSnap.docs) {
    const apt = doc.data();
    const aptStart = apt.scheduledFor.toDate();
    const aptEnd = computeEndTime(aptStart, apt.combinedDuration ?? 30);
    if (hasTimeRangeOverlap(requestStart, requestEnd, aptStart, aptEnd)) {
      return { hasConflict: true, conflictSource: "appointment", conflictId: doc.id };
    }
  }

  for (const doc of blockSnap.docs) {
    const block = doc.data();
    const blockStart = block.start.toDate();
    const blockEnd = block.end.toDate();
    if (hasTimeRangeOverlap(requestStart, requestEnd, blockStart, blockEnd)) {
      return { hasConflict: true, conflictSource: "doctor_block", conflictId: doc.id };
    }
  }

  return { hasConflict: false };
}

/**
 * Handle payment.captured — mirror of the success path in verify-payment/route.ts.
 *
 * Key difference: we don't have razorpaySignature here (that's the checkout
 * signature, not the webhook signature). We skip that field and leave it null
 * when the webhook completes the payment — the webhook HMAC already proves
 * authenticity at the transport level.
 */
async function handlePaymentCaptured(
  rzpPaymentId: string,
  rzpOrderId: string,
  payload: Record<string, any>
) {
  const db = getAdminDb();

  // Find the payment doc by razorpayOrderId
  const snap = await db
    .collection("payments")
    .where("razorpayOrderId", "==", rzpOrderId)
    .limit(1)
    .get();

  if (snap.empty) {
    // No matching payment doc — nothing to do (could be a non-booking payment)
    console.warn(`[webhook] payment.captured — no payment doc for order ${rzpOrderId}`);
    return;
  }

  const paymentRef = snap.docs[0].ref;
  const paymentId = snap.docs[0].id;
  const payment = snap.docs[0].data();

  // Idempotency: verify-payment may have already completed this
  if (payment.status === "completed") {
    console.log(`[webhook] payment.captured — already completed, skipping (${paymentId})`);
    return;
  }

  // Idempotency: booking_request already created on a previous webhook delivery
  if (payment.bookingRequestId) {
    // Just ensure payment status is synced
    if (payment.status !== "completed") {
      await paymentRef.update({
        status: "completed",
        razorpayPaymentId: rzpPaymentId,
        completedAt: new Date(),
        updatedAt: new Date(),
      });
    }
    console.log(`[webhook] payment.captured — bookingRequest already exists, synced status (${paymentId})`);
    return;
  }

  // Resolve serviceIds (supports both multi-service and legacy single-service payments)
  const serviceIds: string[] =
    Array.isArray(payment.serviceIds) && payment.serviceIds.length > 0
      ? payment.serviceIds
      : [payment.serviceId];

  // Fetch services to compute combined duration
  const serviceDocRefs = serviceIds.map((id: string) =>
    db.collection("services").doc(id)
  );
  const serviceDocs = await db.getAll(...serviceDocRefs);

  let combinedDuration = 0;
  for (const serviceDoc of serviceDocs) {
    if (serviceDoc.exists) {
      combinedDuration += (serviceDoc.data()!.duration as number) || 0;
    }
  }

  const requestedTime: Date = payment.requestedTime.toDate();
  const bookingRequestId = `${payment.userId}_${payment.doctorId}_${Date.now()}`;

  // Atomically check conflicts + create booking_request (same logic as verify-payment)
  const result = await db.runTransaction(async (transaction) => {
    const conflictResult = await checkSlotConflict(
      transaction,
      db,
      payment.doctorId,
      requestedTime,
      combinedDuration
    );

    if (conflictResult.hasConflict) {
      transaction.update(paymentRef, {
        refundStatus: "pending",
        failureReason: "Slot conflict detected (webhook)",
        conflictSource: conflictResult.conflictSource,
        conflictId: conflictResult.conflictId,
        updatedAt: new Date(),
      });
      return { conflict: true };
    }

    transaction.set(db.collection("booking_requests").doc(bookingRequestId), {
      id: bookingRequestId,
      patientId: payment.userId,
      doctorId: payment.doctorId,
      serviceId: serviceIds[0],
      serviceIds,
      requestedTime: payment.requestedTime,
      status: "pending",
      notes: payment.notes || null,
      paymentId,
      paymentStatus: "completed",
      paymentAmount: payment.amount,
      combinedDuration,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { conflict: false };
  });

  if (result.conflict) {
    console.warn(`[webhook] payment.captured — slot conflict for payment ${paymentId}, refund queued`);
    return;
  }

  // Transaction succeeded — mark payment as completed
  await paymentRef.update({
    status: "completed",
    razorpayPaymentId: rzpPaymentId,
    // razorpaySignature is not available in the webhook payload; webhook HMAC
    // already proved authenticity at the transport level.
    bookingRequestId,
    completedAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(
    `[webhook] payment.captured — completed payment ${paymentId}, bookingRequest ${bookingRequestId}`
  );
}

async function handlePaymentFailed(
  rzpPaymentId: string,
  rzpOrderId: string,
  payload: Record<string, any>
) {
  const db = getAdminDb();

  const snap = await db
    .collection("payments")
    .where("razorpayOrderId", "==", rzpOrderId)
    .limit(1)
    .get();

  if (snap.empty) {
    console.warn(`[webhook] payment.failed — no payment doc for order ${rzpOrderId}`);
    return;
  }

  const payment = snap.docs[0].data();

  // Don't overwrite a completed payment (e.g. a stale failed event arriving late)
  if (payment.status === "completed") {
    console.log(`[webhook] payment.failed — payment already completed, ignoring (${snap.docs[0].id})`);
    return;
  }

  const errorDescription =
    payload?.error_code
      ? `${payload.error_code}: ${payload.error_description || "Payment failed"}`
      : "Payment failed";

  await snap.docs[0].ref.update({
    status: "failed",
    failureReason: errorDescription,
    razorpayPaymentId: rzpPaymentId,
    failedAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`[webhook] payment.failed — marked payment ${snap.docs[0].id} as failed`);
}

export async function POST(req: NextRequest) {
  // 1. Read raw body — MUST happen before any JSON parsing
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhook] RAZORPAY_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // 2. Verify HMAC-SHA256 signature
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  if (expectedSignature !== signature) {
    console.warn("[webhook] Invalid signature — possible spoofed request");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // 3. Parse and route the event
  let event: Record<string, any>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const eventType: string = event.event;
  const paymentEntity = event?.payload?.payment?.entity ?? {};
  const rzpPaymentId: string = paymentEntity.id ?? "";
  const rzpOrderId: string = paymentEntity.order_id ?? "";

  console.log(`[webhook] Received event: ${eventType}, payment: ${rzpPaymentId}, order: ${rzpOrderId}`);

  try {
    switch (eventType) {
      case "payment.captured":
        await handlePaymentCaptured(rzpPaymentId, rzpOrderId, paymentEntity);
        break;

      case "payment.failed":
        await handlePaymentFailed(rzpPaymentId, rzpOrderId, paymentEntity);
        break;

      default:
        // Return 200 for unhandled events — Razorpay expects 200 to stop retrying
        console.log(`[webhook] Unhandled event type: ${eventType}`);
    }
  } catch (err: any) {
    // Log but still return 200 — prevents Razorpay from retrying on non-transient errors.
    // For transient errors (network, DB unavailable) you'd return 500 to trigger retries.
    console.error(`[webhook] Error handling ${eventType}:`, err?.message);
    logServerError({
      code: ERROR_CODES.PAYMENT.VERIFICATION_FAILED,
      title: "Webhook Error",
      message: `Failed to process webhook event: ${eventType}`,
      originalError: err,
      context: "payments/webhook",
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  // Razorpay requires a 200 to acknowledge delivery
  return NextResponse.json({ received: true });
}
