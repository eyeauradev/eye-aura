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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const patient = await verifyPatientToken(req);
    const { id } = await params;
    const db = getAdminDb();

    // Fetch recommendation
    const recDoc = await db.collection("service_recommendations").doc(id).get();
    if (!recDoc.exists) {
      return NextResponse.json({ error: "Recommendation not found" }, { status: 404 });
    }
    const recommendation = recDoc.data()!;

    // Verify patient owns this recommendation
    if (recommendation.patientId !== patient.uid) {
      return NextResponse.json(
        { error: "You can only accept your own recommendations" },
        { status: 403 }
      );
    }

    // Validate PENDING or RECOMMENDED status (both require payment to confirm)
    if (recommendation.status !== "PENDING" && recommendation.status !== "RECOMMENDED") {
      return NextResponse.json(
        { error: "Only PENDING or RECOMMENDED recommendations can be accepted" },
        { status: 400 }
      );
    }

    // Check not expired
    const expiresAt = recommendation.expiresAt?.toDate
      ? recommendation.expiresAt.toDate()
      : new Date(recommendation.expiresAt);
    if (expiresAt <= new Date()) {
      return NextResponse.json(
        { error: "This recommendation has expired" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentId } = body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !paymentId) {
      return NextResponse.json(
        { error: "Missing required payment fields: razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentId" },
        { status: 400 }
      );
    }

    // Verify Razorpay signature server-side
    const signatureBody = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(signatureBody)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      // Payment verification failed — keep PENDING, keep reservation active
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

    // Create booking request
    const now = new Date();
    const requestedTime = recommendation.recommendedSlotStart?.toDate
      ? recommendation.recommendedSlotStart.toDate()
      : new Date(recommendation.recommendedSlotStart);

    const bookingRequestId = `${patient.uid}_${recommendation.doctorId}_${Date.now()}`;
    await db.collection("booking_requests").doc(bookingRequestId).set({
      id: bookingRequestId,
      patientId: patient.uid,
      doctorId: recommendation.doctorId,
      serviceId: recommendation.serviceId,
      requestedTime,
      status: "pending",
      notes: recommendation.recommendationNote || "Recommended by doctor",
      paymentId,
      paymentStatus: "completed",
      paymentAmount: 0, // Amount is in the payment doc itself
      createdAt: now,
      updatedAt: now,
    });

    // Convert soft reservation to hard block
    const reservationId = recommendation.reservationId;
    if (reservationId) {
      const resDoc = await db.collection("slot_reservations").doc(reservationId).get();
      if (resDoc.exists && resDoc.data()!.status === "active") {
        // Update reservation status to converted
        await db.collection("slot_reservations").doc(reservationId).update({
          status: "converted",
          convertedAt: now,
        });

        // Create hard block in doctor_blocks
        const resData = resDoc.data()!;
        const blockId = `block_${recommendation.doctorId}_${Date.now()}`;
        await db.collection("doctor_blocks").doc(blockId).set({
          id: blockId,
          doctorId: recommendation.doctorId,
          start: resData.start,
          end: resData.end,
          reason: `Recommendation accepted: ${id}`,
          createdAt: now,
        });
      }
    }

    // Accept the recommendation
    await db.collection("service_recommendations").doc(id).update({
      status: "ACCEPTED",
      acceptedAt: now,
      bookingId: bookingRequestId,
      updatedAt: now,
    });

    // Update payment to completed
    await db.collection("payments").doc(paymentId).update({
      status: "completed",
      razorpayPaymentId,
      razorpaySignature,
      bookingRequestId,
      completedAt: now,
      updatedAt: now,
    }).catch(() => {}); // Don't fail if payment doc doesn't exist

    return NextResponse.json({ bookingRequestId }, { status: 200 });
  } catch (error: any) {
    console.error("[recommendations/accept] Error:", error.message);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
