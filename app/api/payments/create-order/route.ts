import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/services/firebase/admin";
import { logServerError } from "@/services/error-logging/error-log.service.server";
import { ERROR_CODES } from "@/lib/errors";

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
    const { doctorId, serviceId, serviceIds: rawServiceIds, requestedTime, notes, amount, currency } = body;

    // Resolve serviceIds: prefer serviceIds array, fall back to [serviceId] for backward compatibility
    const serviceIds: string[] = Array.isArray(rawServiceIds) && rawServiceIds.length > 0
      ? rawServiceIds
      : serviceId
        ? [serviceId]
        : [];

    if (!doctorId || !requestedTime || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: doctorId, requestedTime, amount" },
        { status: 400 }
      );
    }

    // Validate serviceIds is a non-empty array of strings
    if (serviceIds.length === 0) {
      return NextResponse.json(
        { error: "At least one service must be specified (serviceIds or serviceId)" },
        { status: 400 }
      );
    }

    if (!serviceIds.every((id: unknown) => typeof id === "string" && id.length > 0)) {
      return NextResponse.json(
        { error: "serviceIds must be an array of non-empty strings" },
        { status: 400 }
      );
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const db = getAdminDb();

    // Validate all services exist and are active
    const serviceDocRefs = serviceIds.map((id: string) => db.collection("services").doc(id));
    const serviceDocs = await db.getAll(...serviceDocRefs);

    const services: { id: string; price: number; currency: string; isActive: boolean }[] = [];
    for (let i = 0; i < serviceDocs.length; i++) {
      const doc = serviceDocs[i];
      if (!doc.exists) {
        return NextResponse.json(
          { error: `Service not found: ${serviceIds[i]}` },
          { status: 400 }
        );
      }
      const data = doc.data()!;
      if (data.isActive === false) {
        return NextResponse.json(
          { error: `Service is not active: ${serviceIds[i]}` },
          { status: 400 }
        );
      }
      services.push({
        id: doc.id,
        price: data.price,
        currency: data.currency || "INR",
        isActive: data.isActive,
      });
    }

    // Validate all service currencies match
    const firstCurrency = services[0].currency;
    const currencyMismatch = services.find((s) => s.currency !== firstCurrency);
    if (currencyMismatch) {
      return NextResponse.json(
        { error: `Currency mismatch: service ${currencyMismatch.id} uses ${currencyMismatch.currency}, expected ${firstCurrency}` },
        { status: 400 }
      );
    }

    // Validate amount equals the sum of all service prices (server-side price verification)
    const expectedAmount = services.reduce((sum, s) => sum + s.price, 0);
    if (Math.abs(amount - expectedAmount) > 0.01) {
      return NextResponse.json(
        { error: `Amount mismatch: expected ${expectedAmount}, received ${amount}` },
        { status: 400 }
      );
    }

    // Set serviceId to serviceIds[0] for backward compatibility
    const primaryServiceId = serviceIds[0];

    // Idempotency: if a pending payment already exists for the same order parameters,
    // reuse it to prevent double-charging for the same booking attempt.
    const existing = await db
      .collection("payments")
      .where("userId", "==", patient.uid)
      .where("doctorId", "==", doctorId)
      .where("serviceId", "==", primaryServiceId)
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
        currency: currency || firstCurrency,
        receipt: `ea_${patient.uid.slice(-8)}_${Date.now().toString(36)}`,
        notes: {
          patient_id: patient.uid,
          service_id: primaryServiceId,
          service_ids: serviceIds.join(","),
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
      serviceId: primaryServiceId,
      serviceIds,
      amount,
      currency: currency || firstCurrency,
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
    logServerError({
      code: ERROR_CODES.PAYMENT.CREATION_FAILED,
      title: "Payment Creation Failed",
      message: "Failed to create payment order",
      originalError: error,
      context: "payments/create-order",
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
