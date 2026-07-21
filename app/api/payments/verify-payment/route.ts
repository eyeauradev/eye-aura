import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/services/firebase/admin";
import { logServerError } from "@/services/error-logging/error-log.service.server";
import { ERROR_CODES } from "@/lib/errors";
import crypto from "crypto";
import { hasTimeRangeOverlap, computeEndTime } from "@/services/booking/slot-filter.service";

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictSource?: "booking_request" | "appointment" | "doctor_block";
  conflictId?: string;
}

async function checkSlotConflictInTransaction(
  transaction: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  doctorId: string,
  requestedTime: Date,
  combinedDuration: number
): Promise<ConflictCheckResult> {
  const requestStart = requestedTime;
  const requestEnd = computeEndTime(requestedTime, combinedDuration);

  // Check booking_requests (pending or accepted)
  const brSnap = await transaction.get(
    db.collection("booking_requests")
      .where("doctorId", "==", doctorId)
      .where("status", "in", ["pending", "accepted"])
  );

  for (const doc of brSnap.docs) {
    const br = doc.data();
    const brStart = br.requestedTime.toDate();
    const brEnd = computeEndTime(brStart, br.combinedDuration ?? 30);
    if (hasTimeRangeOverlap(requestStart, requestEnd, brStart, brEnd)) {
      return { hasConflict: true, conflictSource: "booking_request", conflictId: doc.id };
    }
  }

  // Check appointments (confirmed or pending)
  const aptSnap = await transaction.get(
    db.collection("appointments")
      .where("doctorId", "==", doctorId)
      .where("status", "in", ["confirmed", "pending"])
  );

  for (const doc of aptSnap.docs) {
    const apt = doc.data();
    const aptStart = apt.scheduledFor.toDate();
    const aptEnd = computeEndTime(aptStart, apt.combinedDuration ?? 30);
    if (hasTimeRangeOverlap(requestStart, requestEnd, aptStart, aptEnd)) {
      return { hasConflict: true, conflictSource: "appointment", conflictId: doc.id };
    }
  }

  // Check doctor_blocks
  const blockSnap = await transaction.get(
    db.collection("doctor_blocks")
      .where("doctorId", "==", doctorId)
  );

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

async function verifyPatientToken(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }
  const token = authHeader.slice(7);
  const adminAuth = getAdminAuth();
  const decoded = await adminAuth.verifyIdToken(token);
  const adminDb = getAdminDb();
  const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
  if (!userDoc.exists) throw new Error("Unauthorized");
  const data = userDoc.data()!;
  if (data.role !== "patient") throw new Error("Forbidden");
  if (data.isActive === false) throw new Error("Forbidden");
  return { uid: decoded.uid };
}

export async function POST(req: NextRequest) {
  try {
    const patient = await verifyPatientToken(req);

    const body = await req.json();
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentId } = body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !paymentId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // SECURITY: Verify Razorpay signature server-side.
    // This is the ONLY way to confirm payment authenticity.
    // Never trust the client's payment success claim alone.
    const signatureBody = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(signatureBody)
      .digest("hex");

    const db = getAdminDb();

    if (expectedSignature !== razorpaySignature) {
      // Mark payment as failed for audit trail
      await db.collection("payments").doc(paymentId).update({
        status: "failed",
        failureReason: "Signature verification failed",
        failedAt: new Date(),
        updatedAt: new Date(),
      }).catch(() => {}); // Don't fail if payment doc doesn't exist
      return NextResponse.json(
        { error: "Payment verification failed. Please contact support." },
        { status: 400 }
      );
    }

    // Fetch payment document
    const paymentDoc = await db.collection("payments").doc(paymentId).get();
    if (!paymentDoc.exists) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    }

    const payment = paymentDoc.data()!;

    // Security: confirm payment belongs to this patient
    if (payment.userId !== patient.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Idempotency: if booking_request was already created for this payment, return it.
    // This safely handles retry scenarios (network failures, double-submits).
    if (payment.bookingRequestId) {
      return NextResponse.json({
        success: true,
        bookingRequestId: payment.bookingRequestId,
      });
    }

    // Create booking_request — this is the authoritative creation point.
    // Appointments are NOT created here. The doctor must accept the request first.
    const bookingRequestId = `${patient.uid}_${payment.doctorId}_${Date.now()}`;

    // Resolve serviceIds from payment document (supports both multi-service and legacy single-service)
    const serviceIds: string[] = Array.isArray(payment.serviceIds) && payment.serviceIds.length > 0
      ? payment.serviceIds
      : [payment.serviceId];

    // Fetch service documents to calculate combined duration
    const serviceDocRefs = serviceIds.map((id: string) => db.collection("services").doc(id));
    const serviceDocs = await db.getAll(...serviceDocRefs);

    let combinedDuration = 0;
    for (const serviceDoc of serviceDocs) {
      if (serviceDoc.exists) {
        const serviceData = serviceDoc.data()!;
        combinedDuration += serviceData.duration || 0;
      }
    }

    // Convert requestedTime from Firestore Timestamp to Date for conflict check
    const requestedTime: Date = payment.requestedTime.toDate();

    // Use a Firestore transaction to atomically check for conflicts and create the booking_request.
    // This prevents race conditions where two concurrent requests could book the same slot.
    const transactionResult = await db.runTransaction(async (transaction) => {
      // Check for slot conflicts within the transaction
      const conflictResult = await checkSlotConflictInTransaction(
        transaction,
        db,
        payment.doctorId,
        requestedTime,
        combinedDuration
      );

      if (conflictResult.hasConflict) {
        // Mark payment for refund and record the conflict reason
        transaction.update(db.collection("payments").doc(paymentId), {
          refundStatus: "pending",
          failureReason: "Slot conflict detected",
          conflictSource: conflictResult.conflictSource,
          conflictId: conflictResult.conflictId,
          updatedAt: new Date(),
        });

        return { conflict: true, conflictResult };
      }

      // No conflict — create the booking_request within the transaction
      transaction.set(db.collection("booking_requests").doc(bookingRequestId), {
        id: bookingRequestId,
        patientId: patient.uid,
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

    // If a conflict was detected, return 409 response
    if (transactionResult.conflict) {
      return NextResponse.json(
        {
          error: "Slot no longer available",
          conflictSource: transactionResult.conflictResult!.conflictSource,
        },
        { status: 409 }
      );
    }

    // Transaction succeeded with no conflict — update payment to completed
    await db.collection("payments").doc(paymentId).update({
      status: "completed",
      razorpayPaymentId,
      razorpaySignature,
      bookingRequestId,
      completedAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, bookingRequestId });
  } catch (error: any) {
    console.error("[verify-payment] Error:", error.message);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    logServerError({
      code: ERROR_CODES.PAYMENT.VERIFICATION_FAILED,
      title: "Payment Verification Failed",
      message: "Failed to verify payment",
      originalError: error,
      context: "verify-payment",
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
