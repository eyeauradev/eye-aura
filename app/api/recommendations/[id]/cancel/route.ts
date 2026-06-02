import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/services/firebase/admin";

async function verifyDoctorOrAdminToken(req: NextRequest) {
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
  if (data.role !== "doctor" && data.role !== "admin") throw new Error("Forbidden");
  if (data.isActive === false) throw new Error("Forbidden");
  return { uid: decoded.uid, role: data.role as string };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyDoctorOrAdminToken(req);
    const { id } = await params;
    const db = getAdminDb();

    // Fetch recommendation
    const recDoc = await db.collection("service_recommendations").doc(id).get();
    if (!recDoc.exists) {
      return NextResponse.json({ error: "Recommendation not found" }, { status: 404 });
    }
    const recommendation = recDoc.data()!;

    // If doctor, verify they own this recommendation
    if (user.role === "doctor" && recommendation.doctorId !== user.uid) {
      return NextResponse.json(
        { error: "You can only cancel your own recommendations" },
        { status: 403 }
      );
    }

    // Validate PENDING status
    if (recommendation.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only PENDING recommendations can be cancelled" },
        { status: 400 }
      );
    }

    const now = new Date();

    // Cancel the recommendation
    await db.collection("service_recommendations").doc(id).update({
      status: "CANCELLED",
      cancelledAt: now,
      cancelledBy: user.uid,
      updatedAt: now,
    });

    // Release soft reservation
    const reservationId = recommendation.reservationId;
    if (reservationId) {
      const resDoc = await db.collection("slot_reservations").doc(reservationId).get();
      if (resDoc.exists && resDoc.data()!.status === "active") {
        await db.collection("slot_reservations").doc(reservationId).update({
          status: "released",
          releasedAt: now,
        });
      }
    }

    // Fetch updated recommendation
    const updatedDoc = await db.collection("service_recommendations").doc(id).get();
    const cancelledRecommendation = { id: updatedDoc.id, ...updatedDoc.data() };

    return NextResponse.json({ recommendation: cancelledRecommendation }, { status: 200 });
  } catch (error: any) {
    console.error("[recommendations/cancel] Error:", error.message);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
