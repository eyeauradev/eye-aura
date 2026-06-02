import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/services/firebase/admin";

/**
 * Strips HTML tags and truncates to maxLength characters.
 */
function sanitizeNote(input: string, maxLength: number = 500): string {
  const stripped = input.replace(/<[^>]*>/g, "").trim();
  return stripped.slice(0, maxLength);
}

async function verifyDoctorToken(req: NextRequest) {
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
  if (data.role !== "doctor") throw new Error("Forbidden");
  if (data.isActive === false) throw new Error("Forbidden");
  return { uid: decoded.uid };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const doctor = await verifyDoctorToken(req);
    const { id } = await params;
    const db = getAdminDb();

    // Fetch recommendation
    const recDoc = await db.collection("service_recommendations").doc(id).get();
    if (!recDoc.exists) {
      return NextResponse.json({ error: "Recommendation not found" }, { status: 404 });
    }
    const recommendation = recDoc.data()!;

    // Verify doctor owns this recommendation
    if (recommendation.doctorId !== doctor.uid) {
      return NextResponse.json(
        { error: "You can only edit your own recommendations" },
        { status: 403 }
      );
    }

    // Validate PENDING status
    if (recommendation.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only PENDING recommendations can be edited" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { serviceId, recommendedSlotStart, recommendedSlotEnd, recommendationNote } = body;

    const updates: Record<string, any> = { updatedAt: new Date() };

    // If slot changed, handle reservation swap
    const slotChanged = recommendedSlotStart || recommendedSlotEnd;
    if (slotChanged) {
      const newStart = recommendedSlotStart
        ? new Date(recommendedSlotStart)
        : recommendation.recommendedSlotStart?.toDate
          ? recommendation.recommendedSlotStart.toDate()
          : new Date(recommendation.recommendedSlotStart);
      const newEnd = recommendedSlotEnd
        ? new Date(recommendedSlotEnd)
        : recommendation.recommendedSlotEnd?.toDate
          ? recommendation.recommendedSlotEnd.toDate()
          : new Date(recommendation.recommendedSlotEnd);

      // Validate new slot is in the future
      if (newStart <= new Date()) {
        return NextResponse.json(
          { error: "Recommended slot must be in the future" },
          { status: 400 }
        );
      }
      if (newEnd <= newStart) {
        return NextResponse.json(
          { error: "Slot end must be after slot start" },
          { status: 400 }
        );
      }

      // If serviceId changed, validate duration against new service; otherwise validate against existing
      const effectiveServiceId = serviceId || recommendation.serviceId;
      const serviceDoc = await db.collection("services").doc(effectiveServiceId).get();
      if (!serviceDoc.exists) {
        return NextResponse.json({ error: "Service not found" }, { status: 404 });
      }
      const service = serviceDoc.data()!;
      const slotDurationMinutes = (newEnd.getTime() - newStart.getTime()) / 60000;
      if (slotDurationMinutes !== service.duration) {
        return NextResponse.json(
          { error: `Slot duration (${slotDurationMinutes}min) does not match service duration (${service.duration}min)` },
          { status: 400 }
        );
      }

      // Release old reservation
      const oldReservationId = recommendation.reservationId;
      if (oldReservationId) {
        const oldResDoc = await db.collection("slot_reservations").doc(oldReservationId).get();
        if (oldResDoc.exists && oldResDoc.data()!.status === "active") {
          await db.collection("slot_reservations").doc(oldReservationId).update({
            status: "released",
            releasedAt: new Date(),
          });
        }
      }

      // Check new slot availability - hard blocks
      const blocksSnap = await db
        .collection("doctor_blocks")
        .where("doctorId", "==", doctor.uid)
        .where("start", "<", newEnd)
        .get();
      const hasBlock = blocksSnap.docs.some((d) => {
        const blockData = d.data();
        const blockEnd = blockData.end?.toDate ? blockData.end.toDate() : new Date(blockData.end);
        return blockEnd > newStart;
      });
      if (hasBlock) {
        // Rollback: re-activate old reservation
        if (oldReservationId) {
          await db.collection("slot_reservations").doc(oldReservationId).update({
            status: "active",
            releasedAt: null,
          });
        }
        return NextResponse.json(
          { error: "New time slot conflicts with an existing block" },
          { status: 409 }
        );
      }

      // Check active soft reservations (excluding the old one)
      const reservationsSnap = await db
        .collection("slot_reservations")
        .where("doctorId", "==", doctor.uid)
        .where("status", "==", "active")
        .where("start", "<", newEnd)
        .get();
      const hasOverlap = reservationsSnap.docs.some((d) => {
        if (d.id === oldReservationId) return false; // Skip old reservation
        const resData = d.data();
        const resEnd = resData.end?.toDate ? resData.end.toDate() : new Date(resData.end);
        return resEnd > newStart;
      });
      if (hasOverlap) {
        // Rollback: re-activate old reservation
        if (oldReservationId) {
          await db.collection("slot_reservations").doc(oldReservationId).update({
            status: "active",
            releasedAt: null,
          });
        }
        return NextResponse.json(
          { error: "New time slot conflicts with an existing reservation" },
          { status: 409 }
        );
      }

      // Create new reservation
      const newReservationId = `res_${doctor.uid}_${Date.now()}`;
      await db.collection("slot_reservations").doc(newReservationId).set({
        id: newReservationId,
        doctorId: doctor.uid,
        recommendationId: id,
        start: newStart,
        end: newEnd,
        status: "active",
        createdAt: new Date(),
      });

      updates.recommendedSlotStart = newStart;
      updates.recommendedSlotEnd = newEnd;
      updates.reservationId = newReservationId;
    }

    // Update serviceId if provided
    if (serviceId) {
      // Validate service is active and assigned to doctor
      const serviceDoc = await db.collection("services").doc(serviceId).get();
      if (!serviceDoc.exists) {
        return NextResponse.json({ error: "Service not found" }, { status: 404 });
      }
      const service = serviceDoc.data()!;
      if (!service.isActive) {
        return NextResponse.json({ error: "Service is not active" }, { status: 400 });
      }
      if (!service.doctorIds || !service.doctorIds.includes(doctor.uid)) {
        return NextResponse.json(
          { error: "Doctor is not assigned to this service" },
          { status: 403 }
        );
      }
      updates.serviceId = serviceId;
    }

    // Update note if provided
    if (recommendationNote !== undefined) {
      updates.recommendationNote = recommendationNote ? sanitizeNote(recommendationNote) : null;
    }

    // Apply updates
    await db.collection("service_recommendations").doc(id).update(updates);

    // Fetch updated recommendation
    const updatedDoc = await db.collection("service_recommendations").doc(id).get();
    const updatedRecommendation = { id: updatedDoc.id, ...updatedDoc.data() };

    return NextResponse.json({ recommendation: updatedRecommendation }, { status: 200 });
  } catch (error: any) {
    console.error("[recommendations/update] Error:", error.message);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
