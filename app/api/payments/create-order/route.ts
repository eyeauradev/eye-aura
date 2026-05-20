import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/services/firebase/admin";

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
  return {
    uid: decoded.uid,
    email: decoded.email || "",
    displayName: data.displayName || "",
  };
}

export async function POST(req: NextRequest) {
  try {
    const patient = await verifyPatientToken(req);

    const body = await req.json();
    const { doctorId, serviceId, requestedTime, notes, amount, currency } = body;

    if (!doctorId || !serviceId || !requestedTime || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: doctorId, serviceId, requestedTime, amount" },
        { status: 400 }
      );
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const db = getAdminDb();

    // Idempotency: if a pending payment already exists for the same order parameters,
    // reuse it to prevent double-charging for the same booking attempt.
    const existing = await db
      .collection("payments")
      .where("userId", "==", patient.uid)
      .where("doctorId", "==", doctorId)
      .where("serviceId", "==", serviceId)
      .where("status", "==", "pending")
      .limit(1)
      .get();

    if (!existing.empty) {
      const existingPayment = existing.docs[0].data();
      return NextResponse.json({
        orderId: existingPayment.razorpayOrderId,
        amount: existingPayment.amount * 100,
        currency: existingPayment.currency,
        paymentId: existing.docs[0].id,
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      });
    }

    // Create Razorpay order via Razorpay REST API (no additional npm package required)
    const paymentDocId = `pay_${patient.uid}_${Date.now()}`;
    const credentials = Buffer.from(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
    ).toString("base64");

    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // INR → paise
        currency: currency || "INR",
        receipt: `ea_${patient.uid.slice(-8)}_${Date.now().toString(36)}`,
        notes: {
          patient_id: patient.uid,
          service_id: serviceId,
          doctor_id: doctorId,
        },
      }),
    });

    if (!rzpRes.ok) {
      const errBody = await rzpRes.json().catch(() => ({}));
      console.error("[create-order] Razorpay API error:", errBody);
      return NextResponse.json(
        { error: "Payment gateway error. Please try again." },
        { status: 502 }
      );
    }

    const rzpOrder = await rzpRes.json();

    // Persist payment document via Admin SDK
    await db.collection("payments").doc(paymentDocId).set({
      id: paymentDocId,
      userId: patient.uid,
      doctorId,
      serviceId,
      amount,
      currency: currency || "INR",
      status: "pending",
      razorpayOrderId: rzpOrder.id,
      requestedTime: new Date(requestedTime),
      notes: notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      orderId: rzpOrder.id,
      amount: rzpOrder.amount, // paise — passed directly to Razorpay checkout
      currency: rzpOrder.currency,
      paymentId: paymentDocId,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (error: any) {
    console.error("[create-order] Error:", error.message);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
