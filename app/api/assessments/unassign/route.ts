import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/services/firebase/admin";

/**
 * POST /api/assessments/unassign
 *
 * Body:
 *   assessmentId  string (required)
 *
 * Permission rules:
 *   - Only the doctor who assigned the assessment (or an admin) can unassign it
 *   - Sets status to "cancelled" rather than deleting, to preserve audit trail
 */
export async function POST(req: NextRequest) {
  try {
    const db = getAdminDb();
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
        const userSnap = await db.collection("users").doc(decoded.uid).get();
        callerRole = userSnap.data()?.role ?? null;
      } catch {
        return NextResponse.json({ error: "Invalid auth token" }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 });
    }

    const body = await req.json();
    const { assessmentId } = body as { assessmentId: string };

    if (!assessmentId) {
      return NextResponse.json(
        { error: "assessmentId is required" },
        { status: 400 }
      );
    }

    // --- Fetch the assessment ---
    const assessmentSnap = await db.collection("vision_assessments").doc(assessmentId).get();
    if (!assessmentSnap.exists) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    const assessment = assessmentSnap.data()!;

    // --- Permission check: only the assigning doctor or admin can unassign ---
    if (callerRole === "doctor") {
      if (assessment.assignedBy !== callerUid && assessment.doctorId !== callerUid) {
        return NextResponse.json(
          { error: "You can only unassign assessments you assigned" },
          { status: 403 }
        );
      }
    } else if (callerRole !== "admin") {
      return NextResponse.json(
        { error: "Only doctors and admins can unassign assessments" },
        { status: 403 }
      );
    }

    // --- Cannot unassign completed assessments ---
    if (assessment.status === "completed") {
      return NextResponse.json(
        { error: "Cannot unassign a completed assessment" },
        { status: 400 }
      );
    }

    // --- Set status to cancelled ---
    await db.collection("vision_assessments").doc(assessmentId).update({
      status: "cancelled",
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    console.error("[assessments/unassign]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
