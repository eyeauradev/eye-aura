import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/services/firebase/admin";

/**
 * GET /api/assessments/integrity
 *
 * Admin-only data integrity report for the vision_assessments collection.
 * Scans every document and reports:
 *   - Orphaned documents (patientId / doctorId / appointmentId references a non-existent document)
 *   - Broken expiry (expiresAt < createdAt + 29 minutes — indicates the old born-expired bug)
 *
 * Response body:
 *   {
 *     totalScanned:      number,
 *     orphanCount:       number,
 *     brokenExpiryCount: number,
 *     orphanedIds:       string[],
 *     brokenExpiryIds:   string[],
 *   }
 */
export async function GET(req: NextRequest) {
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
        const userSnap = await db.collection("users").doc(decoded.uid).get();
        callerRole = userSnap.data()?.role ?? null;
      } catch {
        return NextResponse.json({ error: "Invalid auth token" }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 });
    }

    // --- Admin only ---
    if (callerRole !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: admin role required" },
        { status: 403 }
      );
    }

    // Suppress unused-variable warning — callerUid is used implicitly through auth context
    void callerUid;

    // --- Fetch all vision_assessments (no limit) ---
    const snapshot = await db.collection("vision_assessments").get();

    // Collect unique reference IDs to batch-check existence
    const patientIds     = new Set<string>();
    const doctorIds      = new Set<string>();
    const appointmentIds = new Set<string>();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.patientId)     patientIds.add(data.patientId);
      if (data.doctorId)      doctorIds.add(data.doctorId);
      if (data.appointmentId) appointmentIds.add(data.appointmentId);
    }

    // --- Batch-resolve user existence (patientId and doctorId both live in "users") ---
    const userIdsToCheck = new Set<string>([...patientIds, ...doctorIds]);
    const existingUsers  = new Set<string>();

    // Firestore "in" queries support up to 30 values per call; chunk accordingly
    const userIdArray = [...userIdsToCheck];
    for (let i = 0; i < userIdArray.length; i += 30) {
      const chunk = userIdArray.slice(i, i + 30);
      const snap  = await db.collection("users").where("__name__", "in", chunk).get();
      snap.docs.forEach((d) => existingUsers.add(d.id));
    }

    // --- Batch-resolve appointment existence ---
    const existingAppointments = new Set<string>();
    const apptIdArray = [...appointmentIds];
    for (let i = 0; i < apptIdArray.length; i += 30) {
      const chunk = apptIdArray.slice(i, i + 30);
      const snap  = await db.collection("appointments").where("__name__", "in", chunk).get();
      snap.docs.forEach((d) => existingAppointments.add(d.id));
    }

    // --- Classify each document ---
    const orphanedIds:       string[] = [];
    const brokenExpiryIds:   string[] = [];

    const TWENTY_NINE_MINUTES_MS = 29 * 60 * 1000;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      let isOrphan = false;

      // Check patientId — always required
      if (!data.patientId || !existingUsers.has(data.patientId)) {
        isOrphan = true;
      }

      // Check doctorId — optional field, but if present must reference a real user
      if (!isOrphan && data.doctorId && !existingUsers.has(data.doctorId)) {
        isOrphan = true;
      }

      // Check appointmentId — optional field, but if present must reference a real appointment
      if (!isOrphan && data.appointmentId && !existingAppointments.has(data.appointmentId)) {
        isOrphan = true;
      }

      if (isOrphan) {
        orphanedIds.push(doc.id);
      }

      // Check expiry sanity: expiresAt >= createdAt + 29min
      if (data.expiresAt && data.createdAt) {
        const expiresAt = data.expiresAt.toDate
          ? data.expiresAt.toDate()
          : new Date(data.expiresAt);
        const createdAt = data.createdAt.toDate
          ? data.createdAt.toDate()
          : new Date(data.createdAt);

        const minValidExpiry = new Date(createdAt.getTime() + TWENTY_NINE_MINUTES_MS);
        if (expiresAt < minValidExpiry) {
          brokenExpiryIds.push(doc.id);
        }
      }
    }

    return NextResponse.json(
      {
        totalScanned:      snapshot.size,
        orphanCount:       orphanedIds.length,
        brokenExpiryCount: brokenExpiryIds.length,
        orphanedIds,
        brokenExpiryIds,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("[assessments/integrity]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
