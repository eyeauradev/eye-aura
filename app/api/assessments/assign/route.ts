import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/services/firebase/admin";
import type { VisionAssessmentType, AssignedByRole } from "@/types/firestore";

/**
 * POST /api/assessments/assign
 *
 * Body:
 *   patientId        string   (required)
 *   assessmentTypes  string[] (required) — ["far"] | ["near"] | ["far","near"]
 *   assignedRole     string   (required) — "doctor" | "admin" | "system"
 *   doctorId         string   (optional)
 *   appointmentId    string   (optional — required for doctor role unless admin)
 *   serviceId        string   (optional)
 *   overrideUsed     boolean  (optional — must be true for admin bypass)
 *   autoAssigned     boolean  (optional — true when triggered by service automation)
 *
 * Permission rules enforced server-side:
 *   - doctor: appointmentId is required; appointment must belong to that doctor
 *   - admin:  unrestricted; overrideUsed=true allowed
 *   - system: only from internal API calls (no Firebase Auth token)
 */
export async function POST(req: NextRequest) {
  try {
    const db   = getAdminDb();
    const auth = getAdminAuth();

    // --- Authenticate caller ---
    const authHeader = req.headers.get("Authorization");
    let callerUid: string | null = null;
    let callerRole: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      try {
        const decoded = await auth.verifyIdToken(token);
        callerUid = decoded.uid;
        // Fetch role from Firestore
        const userSnap = await db.collection("users").doc(decoded.uid).get();
        callerRole = userSnap.data()?.role ?? null;
      } catch {
        return NextResponse.json({ error: "Invalid auth token" }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 });
    }

    const body = await req.json();
    const {
      patientId,
      assessmentTypes,
      assignedRole,
      doctorId,
      appointmentId,
      serviceId,
      overrideUsed = false,
      autoAssigned = false,
    } = body as {
      patientId: string;
      assessmentTypes: VisionAssessmentType[];
      assignedRole: AssignedByRole;
      doctorId?: string;
      appointmentId?: string;
      serviceId?: string;
      overrideUsed?: boolean;
      autoAssigned?: boolean;
    };

    // --- Validate required fields ---
    if (!patientId || !assessmentTypes?.length || !assignedRole) {
      return NextResponse.json(
        { error: "patientId, assessmentTypes, and assignedRole are required" },
        { status: 400 }
      );
    }

    const validTypes: VisionAssessmentType[] = ["far", "near"];
    if (!assessmentTypes.every((t) => validTypes.includes(t))) {
      return NextResponse.json({ error: "Invalid assessmentTypes" }, { status: 400 });
    }

    // --- Permission enforcement ---
    if (callerRole === "doctor") {
      // Doctor must provide appointmentId and it must belong to them
      if (!appointmentId) {
        return NextResponse.json(
          { error: "Doctors must link an assessment to an appointment" },
          { status: 403 }
        );
      }
      const apptSnap = await db.collection("appointments").doc(appointmentId).get();
      if (!apptSnap.exists) {
        return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
      }
      const appt = apptSnap.data()!;
      if (appt.doctorId !== callerUid) {
        return NextResponse.json(
          { error: "Appointment does not belong to this doctor" },
          { status: 403 }
        );
      }
      if (appt.patientId !== patientId) {
        return NextResponse.json(
          { error: "Patient does not match appointment" },
          { status: 403 }
        );
      }
    } else if (callerRole === "admin") {
      // Admins are unrestricted — overrideUsed flag is informational
    } else {
      return NextResponse.json(
        { error: "Only doctors and admins can assign assessments" },
        { status: 403 }
      );
    }

    // --- Create assessment documents (one per type) ---
    const now = new Date();
    // Expire 30 minutes after the appointment's scheduled time (or 24h fallback for admin overrides)
    let expiresAt: Date;
    if (appointmentId) {
      const apptForExpiry = await db.collection("appointments").doc(appointmentId).get();
      const scheduledFor = apptForExpiry.data()?.scheduledFor;
      const apptTime = scheduledFor
        ? (scheduledFor.toDate ? scheduledFor.toDate() : new Date(scheduledFor))
        : now;
      expiresAt = new Date(apptTime.getTime() + 30 * 60 * 1000);
    } else {
      expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }

    // Create ONE document per assessment type so each can be tracked independently
    const createdIds: string[] = [];
    for (const type of assessmentTypes) {
      const id = crypto.randomUUID();
      const assessment = {
        id,
        patientId,
        assignedBy: callerUid,
        assignedRole,
        overrideUsed,
        assessmentTypes: [type],   // single type per document
        status: "assigned",
        autoAssigned,
        createdAt: now,
        updatedAt: now,
        expiresAt,
        ...(doctorId      && { doctorId }),
        ...(appointmentId && { appointmentId }),
        ...(serviceId     && { serviceId }),
      };
      await db.collection("vision_assessments").doc(id).set(assessment);
      createdIds.push(id);
    }

    return NextResponse.json(
      { success: true, assessmentIds: createdIds, assessmentId: createdIds[0] },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("[assessments/assign]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
