import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/services/firebase/admin";
import { logServerError } from "@/services/error-logging/error-log.service.server";
import { ERROR_CODES } from "@/lib/errors";

/**
 * Strips HTML tags and truncates to maxLength characters.
 */
function sanitizeNote(input: string, maxLength: number = 500): string {
  const stripped = input.replace(/<[^>]*>/g, "").trim();
  return stripped.slice(0, maxLength);
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
        { error: "You can only decline your own recommendations" },
        { status: 403 }
      );
    }

    // Validate PENDING status
    if (recommendation.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only PENDING recommendations can be declined" },
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

    const body = await req.json().catch(() => ({}));
    const { reason } = body as { reason?: string };

    // Sanitize decline reason if provided
    const sanitizedReason = reason ? sanitizeNote(reason) : undefined;

    const now = new Date();

    // Decline the recommendation
    const updateData: Record<string, any> = {
      status: "DECLINED",
      declinedAt: now,
      updatedAt: now,
    };
    if (sanitizedReason) {
      updateData.declineReason = sanitizedReason;
    }
    await db.collection("service_recommendations").doc(id).update(updateData);

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
    const declinedRecommendation = { id: updatedDoc.id, ...updatedDoc.data() };

    return NextResponse.json({ recommendation: declinedRecommendation }, { status: 200 });
  } catch (error: any) {
    console.error("[recommendations/decline] Error:", error.message);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    logServerError({
      code: ERROR_CODES.API.SERVER_ERROR,
      title: "Server Error",
      message: "Failed to decline recommendation",
      originalError: error,
      context: "recommendations/decline",
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
