import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/services/firebase/admin";

/**
 * POST /api/recommendations/expire-stale
 *
 * Expires all PENDING recommendations that have passed their expiresAt date.
 * Any authenticated user can trigger this — it's a lightweight housekeeping endpoint.
 * For each expired recommendation: updates status to EXPIRED and releases the soft reservation.
 */

async function verifyAuthToken(req: NextRequest) {
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
  if (data.isActive === false) throw new Error("Forbidden");
  return { uid: decoded.uid, role: data.role as string };
}

export async function POST(req: NextRequest) {
  try {
    await verifyAuthToken(req);
    const db = getAdminDb();
    const now = new Date();

    // Query all PENDING recommendations where expiresAt < now
    const expiredSnapshot = await db
      .collection("service_recommendations")
      .where("status", "==", "PENDING")
      .where("expiresAt", "<", now)
      .get();

    if (expiredSnapshot.empty) {
      return NextResponse.json({ expiredCount: 0 });
    }

    let expiredCount = 0;

    // Process each expired recommendation
    for (const docSnap of expiredSnapshot.docs) {
      const recommendation = docSnap.data();

      // Update status to EXPIRED
      await db.collection("service_recommendations").doc(docSnap.id).update({
        status: "EXPIRED",
        updatedAt: now,
      });

      // Release soft reservation if one exists
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

      expiredCount++;
    }

    return NextResponse.json({ expiredCount });
  } catch (error: any) {
    console.error("[recommendations/expire-stale] Error:", error.message);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
