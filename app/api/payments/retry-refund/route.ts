import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { getAdminAuth, getAdminDb } from "@/services/firebase/admin";
import { logServerError } from "@/services/error-logging/error-log.service.server";
import { ERROR_CODES } from "@/lib/errors";
import { FieldValue } from "firebase-admin/firestore";

export const maxDuration = 30;

async function verifyAdminToken(req: NextRequest): Promise<{ uid: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const token = authHeader.slice(7);
  const adminAuth = getAdminAuth();
  const decoded = await adminAuth.verifyIdToken(token);
  const adminDb = getAdminDb();
  const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
  if (!userDoc.exists) throw new Error("Unauthorized");
  const data = userDoc.data()!;
  if (data.role !== "admin") throw new Error("Forbidden");
  return { uid: decoded.uid };
}

/**
 * Calls Razorpay and writes outcome back to Firestore.
 * Runs AFTER the HTTP response — no timeout pressure.
 */
async function processRefundInBackground(
  paymentId: string,
  razorpayPaymentId: string,
  amountInr: number,
  idempotencyKey: string,
  notes: Record<string, string>,
  // Optional — update these docs on success/failure
  bookingRequestId?: string,
  appointmentId?: string
) {
  const db = getAdminDb();

  try {
    const credentials = Buffer.from(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
    ).toString("base64");

    const rzpRes = await fetch(
      `https://api.razorpay.com/v1/payments/${razorpayPaymentId}/refund`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${credentials}`,
          "X-Razorpay-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          amount: Math.round(amountInr * 100), // paise
          speed: "normal",
          notes,
        }),
      }
    );

    if (!rzpRes.ok) {
      const errBody = await rzpRes.json().catch(() => ({}));
      const failureReason = errBody?.error?.description || `HTTP ${rzpRes.status}`;
      console.error("[retry-refund:bg] Razorpay non-OK:", errBody);

      const updates: Promise<unknown>[] = [
        db.collection("payments").doc(paymentId).update({
          refundStatus: "failed",
          refundFailureReason: failureReason,
          updatedAt: new Date(),
        }),
      ];
      if (bookingRequestId) {
        updates.push(
          db.collection("booking_requests").doc(bookingRequestId).update({
            refundStatus: "failed",
            updatedAt: new Date(),
          })
        );
      }
      if (appointmentId) {
        updates.push(
          db.collection("appointments").doc(appointmentId).update({
            refundStatus: "failed",
            updatedAt: new Date(),
          })
        );
      }
      await Promise.all(updates);
      return;
    }

    const rzpRefund = await rzpRes.json();
    console.log("[retry-refund:bg] Razorpay refund created:", rzpRefund.id);

    const updates: Promise<unknown>[] = [
      db.collection("payments").doc(paymentId).update({
        status: "refunded",
        refundStatus: "processed",
        refundId: rzpRefund.id,
        refundFailureReason: null,
        refundedAt: new Date(),
        updatedAt: new Date(),
      }),
    ];
    if (bookingRequestId) {
      updates.push(
        db.collection("booking_requests").doc(bookingRequestId).update({
          refundStatus: "processed",
          updatedAt: new Date(),
        })
      );
    }
    if (appointmentId) {
      updates.push(
        db.collection("appointments").doc(appointmentId).update({
          refundId: rzpRefund.id,
          refundAmount: amountInr,
          refundedAt: new Date(),
          refundStatus: "processed",
          updatedAt: new Date(),
          refundAuditTrail: FieldValue.arrayUnion({
            action: "post_approval_refund",
            decision: "refund",
            actorId: "admin-retry",
            actorRole: "admin",
            timestamp: new Date(),
          }),
        })
      );
    }
    await Promise.all(updates);
  } catch (err: any) {
    console.error("[retry-refund:bg] threw:", err?.message);
    const failUpdates: Promise<unknown>[] = [
      db.collection("payments").doc(paymentId).update({
        refundStatus: "failed",
        refundFailureReason: err?.message || "Network error",
        updatedAt: new Date(),
      }),
    ];
    if (bookingRequestId) {
      failUpdates.push(
        db.collection("booking_requests").doc(bookingRequestId).update({
          refundStatus: "failed",
          updatedAt: new Date(),
        })
      );
    }
    if (appointmentId) {
      failUpdates.push(
        db.collection("appointments").doc(appointmentId).update({
          refundStatus: "failed",
          updatedAt: new Date(),
        })
      );
    }
    await Promise.all(failUpdates).catch(() => {});
  }
}

/**
 * POST /api/payments/retry-refund
 * Admin-only. Retries a stuck or failed refund for a given paymentId.
 * Determines the correct flow (booking-request vs appointment-cancellation)
 * from the payment document itself.
 */
export async function POST(req: NextRequest) {
  try {
    await verifyAdminToken(req);

    const { paymentId } = await req.json();
    if (!paymentId) {
      return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });
    }

    const db = getAdminDb();
    const paymentDoc = await db.collection("payments").doc(paymentId).get();
    if (!paymentDoc.exists) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const payment = paymentDoc.data()!;

    // Only retry pending or failed refunds
    if (payment.refundStatus === "processed") {
      return NextResponse.json(
        { error: "Refund already processed" },
        { status: 409 }
      );
    }

    // If razorpayPaymentId is missing, try to fetch it from Razorpay using the Order ID
    let razorpayPaymentId: string = payment.razorpayPaymentId;
    if (!razorpayPaymentId && payment.razorpayOrderId) {
      try {
        const credentials = Buffer.from(
          `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
        ).toString("base64");

        // Fetch all payments for this order from Razorpay
        const rzpRes = await fetch(
          `https://api.razorpay.com/v1/orders/${payment.razorpayOrderId}/payments`,
          {
            headers: { Authorization: `Basic ${credentials}` },
          }
        );

        if (rzpRes.ok) {
          const rzpData = await rzpRes.json();
          // Find the captured payment (if any)
          const captured = rzpData?.items?.find(
            (p: { status: string; id: string }) => p.status === "captured"
          );
          if (captured?.id) {
            razorpayPaymentId = captured.id;
            // Persist it on the payment doc so future retries don't need to re-fetch
            await db.collection("payments").doc(paymentId).update({
              razorpayPaymentId: captured.id,
              status: "completed",
              completedAt: payment.completedAt ?? new Date(),
              updatedAt: new Date(),
            });
            console.log(`[retry-refund] Recovered razorpayPaymentId ${captured.id} for order ${payment.razorpayOrderId}`);
          }
        }
      } catch (e: any) {
        console.error("[retry-refund] Failed to fetch payment from Razorpay:", e?.message);
      }
    }

    if (!razorpayPaymentId) {
      return NextResponse.json(
        { error: "No Razorpay payment ID — payment may not have completed on Razorpay's side. Check Razorpay dashboard for order " + (payment.razorpayOrderId ?? "unknown") },
        { status: 422 }
      );
    }

    if (!payment.amount || typeof payment.amount !== "number" || payment.amount <= 0) {
      return NextResponse.json(
        { error: `Invalid payment amount: ${payment.amount}` },
        { status: 422 }
      );
    }

    // Determine which collection this payment links to
    const bookingRequestId: string | undefined = payment.bookingRequestId;
    let appointmentId: string | undefined;
    let idempotencyKey: string;
    let notes: Record<string, string>;

    if (bookingRequestId) {
      // Booking-request rejection refund
      idempotencyKey = `refund-${bookingRequestId}`;
      notes = {
        reason: "Admin retry: booking request declined",
        booking_request_id: bookingRequestId,
        patient_id: payment.userId ?? "",
      };
    } else {
      // Appointment-cancellation refund — look up the appointment via payment doc
      // payments.appointmentId is deprecated but may be set; otherwise scan appointments
      appointmentId = payment.appointmentId;
      if (!appointmentId) {
        // Find appointment that references this paymentId
        const aptSnap = await db
          .collection("appointments")
          .where("paymentId", "==", paymentId)
          .limit(1)
          .get();
        appointmentId = aptSnap.empty ? undefined : aptSnap.docs[0].id;
      }
      idempotencyKey = appointmentId
        ? `refund-apt-${appointmentId}`
        : `refund-pay-${paymentId}`;
      notes = {
        reason: "Admin retry: cancellation refund",
        appointment_id: appointmentId ?? "",
        patient_id: payment.userId ?? "",
      };
    }

    // Mark as pending before scheduling background work
    const pendingUpdates: Promise<unknown>[] = [
      db.collection("payments").doc(paymentId).update({
        refundStatus: "pending",
        refundFailureReason: null,
        updatedAt: new Date(),
      }),
    ];
    if (bookingRequestId) {
      pendingUpdates.push(
        db.collection("booking_requests").doc(bookingRequestId).update({
          refundStatus: "pending",
          updatedAt: new Date(),
        })
      );
    }
    if (appointmentId) {
      pendingUpdates.push(
        db.collection("appointments").doc(appointmentId).update({
          refundStatus: "pending",
          updatedAt: new Date(),
        })
      );
    }
    await Promise.all(pendingUpdates);

    after(() =>
      processRefundInBackground(
        paymentId,
        razorpayPaymentId,
        payment.amount,
        idempotencyKey,
        notes,
        bookingRequestId,
        appointmentId
      )
    );

    return NextResponse.json({ success: true, refundStatus: "pending" });
  } catch (error: any) {
    console.error("[retry-refund] Error:", error.message);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    logServerError({
      code: ERROR_CODES.PAYMENT.CREATION_FAILED,
      title: "Retry Refund Failed",
      message: "Failed to retry refund",
      originalError: error,
      context: "payments/retry-refund",
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
