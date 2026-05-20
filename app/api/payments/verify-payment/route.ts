import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/services/firebase/admin";
import crypto from "crypto";

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
    await db.collection("booking_requests").doc(bookingRequestId).set({
      id: bookingRequestId,
      patientId: patient.uid,
      doctorId: payment.doctorId,
      serviceId: payment.serviceId,
      requestedTime: payment.requestedTime,
      status: "pending",
      notes: payment.notes || null,
      paymentId,
      paymentStatus: "completed",
      paymentAmount: payment.amount,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Update payment to completed with all Razorpay identifiers
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
