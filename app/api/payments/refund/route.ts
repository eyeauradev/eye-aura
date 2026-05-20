import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { getAdminAuth, getAdminDb } from "@/services/firebase/admin";

export const maxDuration = 30;

async function verifyDoctorToken(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const token = authHeader.slice(7);
  const adminAuth = getAdminAuth();
  const decoded = await adminAuth.verifyIdToken(token);
  const adminDb = getAdminDb();
  const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
  if (!userDoc.exists) throw new Error("Unauthorized");
  const data = userDoc.data()!;
  if (data.role !== "doctor") throw new Error("Forbidden");
  if (data.isActive === false) throw new Error("Forbidden");
  return { uid: decoded.uid };
}

/**
 * Calls Razorpay and updates Firestore with the result.
 * Runs AFTER the HTTP response has already been sent — no timeout pressure.
 */
async function processRazorpayRefund(
  paymentId: string,
  bookingRequestId: string,
  razorpayPaymentId: string,
  amountInr: number,
  reason: string,
  patientId: string
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
          // Idempotency key — Razorpay will return the same refund object on retries
          "X-Razorpay-Idempotency-Key": `refund-${bookingRequestId}`,
        },
        body: JSON.stringify({
          amount: Math.round(amountInr * 100), // paise
          speed: "normal",
          notes: {
            reason,
            booking_request_id: bookingRequestId,
            patient_id: patientId,
          },
        }),
      }
    );

    if (!rzpRes.ok) {
      const errBody = await rzpRes.json().catch(() => ({}));
      const failureReason = errBody?.error?.description || `HTTP ${rzpRes.status}`;
      console.error("[refund:bg] Razorpay non-OK:", errBody);
      await Promise.all([
        db.collection("payments").doc(paymentId).update({
          refundStatus: "failed",
          refundFailureReason: failureReason,
          updatedAt: new Date(),
        }),
        db.collection("booking_requests").doc(bookingRequestId).update({
          refundStatus: "failed",
          updatedAt: new Date(),
        }),
      ]);
      return;
    }

    const rzpRefund = await rzpRes.json();
    console.log("[refund:bg] Razorpay refund created:", rzpRefund.id);

    await Promise.all([
      db.collection("payments").doc(paymentId).update({
        status: "refunded",
        refundStatus: "processed",
        refundId: rzpRefund.id,
        refundReason: reason,
        refundFailureReason: null, // clear any stale failure reason from previous attempts
        refundedAt: new Date(),
        updatedAt: new Date(),
      }),
      db.collection("booking_requests").doc(bookingRequestId).update({
        refundStatus: "processed",
        updatedAt: new Date(),
      }),
    ]);
  } catch (err: any) {
    console.error("[refund:bg] fetch threw:", err?.message, "cause:", err?.cause);
    await Promise.all([
      db.collection("payments").doc(paymentId).update({
        refundStatus: "failed",
        refundFailureReason: err?.message || "Network error",
        updatedAt: new Date(),
      }),
      db.collection("booking_requests").doc(bookingRequestId).update({
        refundStatus: "failed",
        updatedAt: new Date(),
      }),
    ]).catch(() => {});
  }
}

export async function POST(req: NextRequest) {
  try {
    const doctor = await verifyDoctorToken(req);
    const { bookingRequestId, reason } = await req.json();

    if (!bookingRequestId || !reason?.trim()) {
      return NextResponse.json(
        { error: "Missing required fields: bookingRequestId, reason" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const requestDoc = await db.collection("booking_requests").doc(bookingRequestId).get();

    if (!requestDoc.exists) {
      return NextResponse.json({ error: "Booking request not found" }, { status: 404 });
    }
    const request = requestDoc.data()!;

    if (request.doctorId !== doctor.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fully resolved — return immediately, no work needed
    if (request.status === "rejected") {
      const rs = request.refundStatus ?? "none";
      if (rs === "processed" || rs === "none") {
        return NextResponse.json({ success: true, alreadyRejected: true, refundStatus: rs });
      }
      // "pending" or "failed" — fall through to retry the refund in background
      console.log(`[refund] Retrying background refund, previous refundStatus: ${rs}`);
    }

    if (request.status !== "pending" && request.status !== "rejected") {
      return NextResponse.json(
        { error: "Only pending requests can be rejected" },
        { status: 400 }
      );
    }

    const paymentId: string | undefined = request.paymentId;

    // Mark booking as rejected and refund as pending — this is the fast path
    await db.collection("booking_requests").doc(bookingRequestId).update({
      status: "rejected",
      rejectionReason: reason.trim(),
      refundStatus: paymentId ? "pending" : "none",
      updatedAt: new Date(),
    });

    if (!paymentId) {
      // No payment attached — done
      return NextResponse.json({ success: true, refunded: false, refundStatus: "none" });
    }

    // Load payment doc to get razorpayPaymentId
    const paymentDoc = await db.collection("payments").doc(paymentId).get();
    if (!paymentDoc.exists) {
      return NextResponse.json({ success: true, refunded: false, refundStatus: "none" });
    }
    const payment = paymentDoc.data()!;

    // Already fully refunded — sync and return
    if (payment.refundStatus === "processed" && payment.refundId) {
      await db.collection("booking_requests").doc(bookingRequestId).update({
        refundStatus: "processed",
        updatedAt: new Date(),
      });
      return NextResponse.json({ success: true, refunded: true, refundId: payment.refundId, refundStatus: "processed" });
    }

    if (!payment.razorpayPaymentId) {
      await Promise.all([
        db.collection("payments").doc(paymentId).update({
          refundStatus: "failed",
          refundFailureReason: "No Razorpay payment ID — payment may not have completed",
          updatedAt: new Date(),
        }),
        db.collection("booking_requests").doc(bookingRequestId).update({
          refundStatus: "failed",
          updatedAt: new Date(),
        }),
      ]);
      return NextResponse.json({ success: true, refunded: false, refundStatus: "failed" });
    }

    // Mark payment as pending before background task runs
    await db.collection("payments").doc(paymentId).update({
      refundStatus: "pending",
      updatedAt: new Date(),
    });

    // Schedule Razorpay API call AFTER this response is sent.
    // The response returns in <3s; Razorpay runs in background with no timeout pressure.
    after(() =>
      processRazorpayRefund(
        paymentId,
        bookingRequestId,
        payment.razorpayPaymentId,
        payment.amount,
        reason.trim(),
        request.patientId ?? ""
      )
    );

    // Return immediately — patient sees "Refund being initiated…" while background runs
    return NextResponse.json({ success: true, refundStatus: "pending" });

  } catch (error: any) {
    console.error("[refund] Error:", error.message);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
