import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { getAdminAuth, getAdminDb } from "@/services/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export const maxDuration = 30;

interface RefundRequest {
  appointmentId: string;
  paymentId: string;
}

async function verifyToken(req: NextRequest): Promise<{ uid: string; role: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const token = authHeader.slice(7);
  const adminAuth = getAdminAuth();
  const decoded = await adminAuth.verifyIdToken(token);
  const adminDb = getAdminDb();
  const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
  if (!userDoc.exists) throw new Error("Unauthorized");
  const data = userDoc.data()!;
  if (data.role !== "doctor" && data.role !== "admin") throw new Error("Forbidden");
  return { uid: decoded.uid, role: data.role };
}

/**
 * Calls Razorpay and updates Firestore with the result.
 * Runs AFTER the HTTP response has already been sent — no timeout pressure.
 */
async function processRefundInBackground(
  paymentId: string,
  appointmentId: string,
  razorpayPaymentId: string,
  amountInr: number,
  reason: string,
  patientId: string,
  callerUid: string,
  callerRole: string
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
          "X-Razorpay-Idempotency-Key": `refund-apt-${appointmentId}`,
        },
        body: JSON.stringify({
          amount: Math.round(amountInr * 100), // paise
          speed: "normal",
          notes: {
            reason,
            appointment_id: appointmentId,
            patient_id: patientId,
          },
        }),
      }
    );

    if (!rzpRes.ok) {
      const errBody = await rzpRes.json().catch(() => ({}));
      const failureReason = errBody?.error?.description || `HTTP ${rzpRes.status}`;
      console.error("[cancellation-refund:bg] Razorpay non-OK:", errBody);
      await db.collection("payments").doc(paymentId).update({
        refundStatus: "failed",
        refundFailureReason: failureReason,
        updatedAt: new Date(),
      });
      return;
    }

    const rzpRefund = await rzpRes.json();
    console.log("[cancellation-refund:bg] Razorpay refund created:", rzpRefund.id);

    // Update payment doc with refund details
    await db.collection("payments").doc(paymentId).update({
      status: "refunded",
      refundStatus: "processed",
      refundId: rzpRefund.id,
      refundReason: reason,
      refundFailureReason: null,
      refundedAt: new Date(),
      updatedAt: new Date(),
    });

    // Update appointment with refund metadata
    await db.collection("appointments").doc(appointmentId).update({
      refundId: rzpRefund.id,
      refundAmount: amountInr,
      refundedAt: new Date(),
      refundStatus: "processed",
      updatedAt: new Date(),
      refundAuditTrail: FieldValue.arrayUnion({
        action: "post_approval_refund",
        decision: "refund",
        actorId: callerUid,
        actorRole: callerRole,
        timestamp: new Date(),
      }),
    });
  } catch (err: any) {
    console.error("[cancellation-refund:bg] fetch threw:", err?.message, "cause:", err?.cause);
    await db.collection("payments").doc(paymentId).update({
      refundStatus: "failed",
      refundFailureReason: err?.message || "Network error",
      updatedAt: new Date(),
    }).catch(() => {});
  }
}

export async function POST(req: NextRequest) {
  try {
    const caller = await verifyToken(req);
    const { appointmentId, paymentId } = (await req.json()) as RefundRequest;

    if (!appointmentId || !paymentId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const paymentDoc = await db.collection("payments").doc(paymentId).get();

    if (!paymentDoc.exists) {
      // No payment — cancellation proceeds without refund
      return NextResponse.json({ success: true, refundStatus: "none" });
    }

    const payment = paymentDoc.data()!;

    if (!payment.razorpayPaymentId) {
      await db.collection("payments").doc(paymentId).update({
        refundStatus: "failed",
        refundFailureReason: "No Razorpay payment ID",
        updatedAt: new Date(),
      });
      return NextResponse.json({ success: true, refundStatus: "failed" });
    }

    // Appointment-level duplicate check (Task 5.1)
    const appointmentDoc = await db.collection("appointments").doc(appointmentId).get();
    const appointment = appointmentDoc.data();

    if (appointment?.refundId) {
      return NextResponse.json(
        { error: "Refund already processed for this appointment" },
        { status: 409 }
      );
    }

    // Mark as pending before background processing
    await db.collection("payments").doc(paymentId).update({
      refundStatus: "pending",
      updatedAt: new Date(),
    });

    // Update appointment refundStatus to "pending" (Task 5.2)
    await db.collection("appointments").doc(appointmentId).update({
      refundStatus: "pending",
      updatedAt: new Date(),
    });

    // Process refund in background after response is sent
    after(() =>
      processRefundInBackground(
        paymentId,
        appointmentId,
        payment.razorpayPaymentId,
        payment.amount,
        appointment?.cancellationReason || "Cancellation approved",
        appointment?.patientId || "",
        caller.uid,
        caller.role
      )
    );

    return NextResponse.json({ success: true, refundStatus: "pending" });
  } catch (error: any) {
    console.error("[cancellation-refund] Error:", error.message);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
