import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/services/firebase/admin";
import type { VisionAssessmentType, AssignedByRole, AssignmentTiming } from "@/types/firestore";
import { assessmentNotificationsService } from "@/services/notifications/assessment-notifications.service";
import { assessmentAuditService } from "@/services/audit/assessment-audit.service";

/**
 * POST /api/assessments/assign
 *
 * Body:
 *   patientId        string   (required)
 *   assessmentTypes  string[] (required) — valid VisionAssessmentType values
 *   assignedRole     string   (required) — "doctor" | "admin" | "system"
 *   doctorId         string   (optional)
 *   appointmentId    string   (optional — required for doctor role unless admin)
 *   serviceId        string   (optional)
 *   overrideUsed     boolean  (optional — must be true for admin bypass)
 *   autoAssigned     boolean  (optional — true when triggered by service automation)
 *   assignmentTiming string   (optional — "now" | "schedule_later", defaults to "now")
 *   scheduledFor     string   (optional — ISO date string, required when timing is "schedule_later")
 *   instructions     string   (optional — max 500 chars, doctor-provided guidance)
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
    let callerDisplayName: string = "";

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      try {
        const decoded = await auth.verifyIdToken(token);
        callerUid = decoded.uid;
        // Fetch role from Firestore
        const userSnap = await db.collection("users").doc(decoded.uid).get();
        const userData = userSnap.data();
        callerRole = userData?.role ?? null;
        callerDisplayName = userData?.displayName || "";
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
      assignmentTiming = "now",
      scheduledFor,
      instructions,
    } = body as {
      patientId: string;
      assessmentTypes: VisionAssessmentType[];
      assignedRole: AssignedByRole;
      doctorId?: string;
      appointmentId?: string;
      serviceId?: string;
      overrideUsed?: boolean;
      autoAssigned?: boolean;
      assignmentTiming?: AssignmentTiming;
      scheduledFor?: string;
      instructions?: string;
    };

    // --- Validate required fields ---
    if (!patientId || !assessmentTypes?.length || !assignedRole) {
      return NextResponse.json(
        { error: "patientId, assessmentTypes, and assignedRole are required" },
        { status: 400 }
      );
    }

    const validTypes: VisionAssessmentType[] = ["far", "near", "color_vision", "contrast_sensitivity", "custom"];
    if (!assessmentTypes.every((t) => validTypes.includes(t))) {
      return NextResponse.json({ error: "Invalid assessmentTypes" }, { status: 400 });
    }

    // --- Validate assignmentTiming ---
    const validTimings: AssignmentTiming[] = ["now", "schedule_later"];
    if (!validTimings.includes(assignmentTiming)) {
      return NextResponse.json({ error: "Invalid assignmentTiming. Must be 'now' or 'schedule_later'" }, { status: 400 });
    }

    // --- Validate scheduledFor when "schedule_later" ---
    let parsedScheduledFor: Date | undefined;
    if (assignmentTiming === "schedule_later") {
      if (!scheduledFor) {
        return NextResponse.json(
          { error: "scheduledFor is required when assignmentTiming is 'schedule_later'" },
          { status: 400 }
        );
      }
      parsedScheduledFor = new Date(scheduledFor);
      if (isNaN(parsedScheduledFor.getTime())) {
        return NextResponse.json(
          { error: "scheduledFor must be a valid ISO date string" },
          { status: 400 }
        );
      }
      if (parsedScheduledFor <= new Date()) {
        return NextResponse.json(
          { error: "scheduledFor must be in the future" },
          { status: 400 }
        );
      }
    }

    // --- Validate instructions ---
    if (instructions && instructions.length > 500) {
      return NextResponse.json(
        { error: "instructions must be 500 characters or fewer" },
        { status: 400 }
      );
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
    if (assignmentTiming === "schedule_later" && parsedScheduledFor) {
      // For scheduled assessments, expire 30 minutes after the scheduled time
      expiresAt = new Date(parsedScheduledFor.getTime() + 30 * 60 * 1000);
    } else if (appointmentId) {
      const apptForExpiry = await db.collection("appointments").doc(appointmentId).get();
      const scheduledForField = apptForExpiry.data()?.scheduledFor;
      const apptTime = scheduledForField
        ? (scheduledForField.toDate ? scheduledForField.toDate() : new Date(scheduledForField))
        : now;
      expiresAt = new Date(apptTime.getTime() + 30 * 60 * 1000);
    } else {
      expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }

    // Determine initial status based on timing
    const initialStatus = assignmentTiming === "schedule_later" ? "assigned" : "assigned";

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
        status: initialStatus,
        autoAssigned,
        assignmentTiming,
        createdAt: now,
        updatedAt: now,
        expiresAt,
        ...(doctorId      && { doctorId }),
        ...(appointmentId && { appointmentId }),
        ...(serviceId     && { serviceId }),
        ...(parsedScheduledFor && { scheduledFor: parsedScheduledFor }),
        ...(instructions  && { instructions: instructions.slice(0, 500) }),
      };
      await db.collection("vision_assessments").doc(id).set(assessment);
      createdIds.push(id);
    }

    // --- Post-assignment effects (non-blocking) ---

    // Trigger assessment notification
    const effectiveDoctorId = doctorId || callerUid || "";
    for (const [index, assessmentId] of createdIds.entries()) {
      const type = assessmentTypes[index];

      // Build and send notification (fire-and-forget for now — actual persistence can be added later)
      assessmentNotificationsService.notifyAssessmentAssigned({
        assessmentId,
        patientId,
        doctorId: effectiveDoctorId,
        doctorName: callerDisplayName || undefined,
        assessmentType: type,
        timing: assignmentTiming,
        scheduledDate: parsedScheduledFor,
      });

      // Create audit entry (fire-and-forget — do not block response)
      const auditEntry = assessmentAuditService.buildAssignedEntry({
        assessmentId,
        actor: callerUid || "",
        actorRole: (callerRole as "doctor" | "admin") || "doctor",
        patientId,
        doctorId: effectiveDoctorId,
        assessmentType: type,
        timing: assignmentTiming,
        scheduledDate: parsedScheduledFor?.toISOString(),
      });
      // Fire-and-forget: don't await, don't block response
      void assessmentAuditService.persistEntry(auditEntry);
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
