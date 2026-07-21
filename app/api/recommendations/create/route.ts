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
  return { uid: decoded.uid, displayName: data.displayName || "" };
}

export async function POST(req: NextRequest) {
  try {
    const doctor = await verifyDoctorToken(req);
    const db = getAdminDb();

    const body = await req.json();
    const {
      patientId,
      serviceId,
      recommendedSlotStart,
      recommendedSlotEnd,
      recommendationNote,
      sameAppointmentSlot,
      sourceAppointmentId,
    } = body;

    // Validate required fields
    if (!patientId || !serviceId || !recommendedSlotStart || !recommendedSlotEnd) {
      return NextResponse.json(
        { error: "Missing required fields: patientId, serviceId, recommendedSlotStart, recommendedSlotEnd" },
        { status: 400 }
      );
    }

    const slotStart = new Date(recommendedSlotStart);
    const slotEnd = new Date(recommendedSlotEnd);

    // Skip time-in-future validation when using same appointment slot
    if (!sameAppointmentSlot) {
      if (slotStart <= new Date()) {
        return NextResponse.json(
          { error: "Recommended slot must be in the future" },
          { status: 400 }
        );
      }
    }

    if (slotEnd <= slotStart) {
      return NextResponse.json(
        { error: "Slot end must be after slot start" },
        { status: 400 }
      );
    }

    // Validate service exists, is active, and is assigned to this doctor
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

    // Skip duration validation for same appointment slot (service may differ from slot duration)
    if (!sameAppointmentSlot) {
      const slotDurationMinutes = (slotEnd.getTime() - slotStart.getTime()) / 60000;
      if (slotDurationMinutes !== service.duration) {
        return NextResponse.json(
          { error: `Slot duration (${slotDurationMinutes}min) does not match service duration (${service.duration}min)` },
          { status: 400 }
        );
      }
    }

    // Rate limit: max 10 pending recommendations per doctor-patient pair
    const pendingSnap = await db
      .collection("service_recommendations")
      .where("doctorId", "==", doctor.uid)
      .where("patientId", "==", patientId)
      .where("status", "==", "PENDING")
      .get();

    if (pendingSnap.size >= 10) {
      return NextResponse.json(
        { error: "Rate limit exceeded: maximum 10 pending recommendations per doctor-patient pair" },
        { status: 429 }
      );
    }

    // Sanitize recommendation note
    const sanitizedNote = recommendationNote ? sanitizeNote(recommendationNote) : undefined;

    let reservationId: string | null = null;

    // Skip all slot validation and reservation when sameAppointmentSlot is true
    if (!sameAppointmentSlot) {
      // Check hard blocks
      const blocksSnap = await db
        .collection("doctor_blocks")
        .where("doctorId", "==", doctor.uid)
        .where("start", "<", slotEnd)
        .get();
      const hasBlock = blocksSnap.docs.some((d) => {
        const blockData = d.data();
        const blockEnd = blockData.end?.toDate ? blockData.end.toDate() : new Date(blockData.end);
        return blockEnd > slotStart;
      });
      if (hasBlock) {
        return NextResponse.json(
          { error: "Time slot conflicts with an existing block" },
          { status: 409 }
        );
      }

      // Check active soft reservations
      const reservationsSnap = await db
        .collection("slot_reservations")
        .where("doctorId", "==", doctor.uid)
        .where("status", "==", "active")
        .where("start", "<", slotEnd)
        .get();
      const hasOverlap = reservationsSnap.docs.some((d) => {
        const resData = d.data();
        const resEnd = resData.end?.toDate ? resData.end.toDate() : new Date(resData.end);
        return resEnd > slotStart;
      });
      if (hasOverlap) {
        return NextResponse.json(
          { error: "Time slot conflicts with an existing reservation" },
          { status: 409 }
        );
      }

      // Create soft reservation
      reservationId = `res_${doctor.uid}_${Date.now()}`;
      await db.collection("slot_reservations").doc(reservationId).set({
        id: reservationId,
        doctorId: doctor.uid,
        recommendationId: "", // Will be updated after recommendation creation
        start: slotStart,
        end: slotEnd,
        status: "active",
        createdAt: new Date(),
      });
    }

    // Create recommendation
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const recommendationId = `rec_${patientId}_${doctor.uid}_${Date.now()}`;

    const recommendation: Record<string, unknown> = {
      id: recommendationId,
      patientId,
      doctorId: doctor.uid,
      serviceId,
      recommendedSlotStart: slotStart,
      recommendedSlotEnd: slotEnd,
      status: sameAppointmentSlot ? "RECOMMENDED" : "PENDING",
      recommendationNote: sanitizedNote || null,
      reservationId: reservationId || null,
      expiresAt,
      createdAt: now,
      updatedAt: now,
      sameAppointmentSlot: sameAppointmentSlot || false,
      sourceAppointmentId: sourceAppointmentId || null,
    };

    await db.collection("service_recommendations").doc(recommendationId).set(recommendation);

    // Link reservation with recommendation (only if reservation was created)
    if (reservationId) {
      await db.collection("slot_reservations").doc(reservationId).update({
        recommendationId,
      });
    }

    return NextResponse.json({ recommendation }, { status: 201 });
  } catch (error: any) {
    console.error("[recommendations/create] Error:", error.message);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    logServerError({
      code: ERROR_CODES.API.SERVER_ERROR,
      title: "Server Error",
      message: "Failed to create recommendation",
      originalError: error,
      context: "recommendations/create",
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
