import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/services/firebase/admin";

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

export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuthToken(req);
    const db = getAdminDb();
    const { searchParams } = new URL(req.url);

    // Parse query params
    const status = searchParams.get("status");
    const limitParam = searchParams.get("limit");
    const cursor = searchParams.get("cursor");
    const doctorIdFilter = searchParams.get("doctorId");
    const patientIdFilter = searchParams.get("patientId");
    const serviceIdFilter = searchParams.get("serviceId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const queryLimit = Math.min(parseInt(limitParam || "50", 10), 100);

    // Build Firestore query based on role
    let queryRef = db.collection("service_recommendations") as FirebaseFirestore.Query;

    if (user.role === "doctor") {
      // Doctors can only see their own recommendations
      queryRef = queryRef.where("doctorId", "==", user.uid);
    } else if (user.role === "patient") {
      // Patients can only see their own recommendations
      queryRef = queryRef.where("patientId", "==", user.uid);
    } else if (user.role === "admin") {
      // Admins can see all, with optional filters
      if (doctorIdFilter) {
        queryRef = queryRef.where("doctorId", "==", doctorIdFilter);
      }
      if (patientIdFilter) {
        queryRef = queryRef.where("patientId", "==", patientIdFilter);
      }
      if (serviceIdFilter) {
        queryRef = queryRef.where("serviceId", "==", serviceIdFilter);
      }
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Apply status filter (available to all roles)
    if (status) {
      queryRef = queryRef.where("status", "==", status.toUpperCase());
    }

    // Apply date range filter (admin only, applies to createdAt)
    if (dateFrom && user.role === "admin") {
      queryRef = queryRef.where("createdAt", ">=", new Date(dateFrom));
    }
    if (dateTo && user.role === "admin") {
      queryRef = queryRef.where("createdAt", "<=", new Date(dateTo));
    }

    // Order by createdAt descending
    queryRef = queryRef.orderBy("createdAt", "desc");

    // Cursor-based pagination
    if (cursor) {
      const cursorDoc = await db.collection("service_recommendations").doc(cursor).get();
      if (cursorDoc.exists) {
        queryRef = queryRef.startAfter(cursorDoc);
      }
    }

    // Apply limit
    queryRef = queryRef.limit(queryLimit);

    const snapshot = await queryRef.get();
    const recommendations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore Timestamps to ISO strings for JSON response
      createdAt: doc.data().createdAt?.toDate?.() ? doc.data().createdAt.toDate().toISOString() : doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.() ? doc.data().updatedAt.toDate().toISOString() : doc.data().updatedAt,
      expiresAt: doc.data().expiresAt?.toDate?.() ? doc.data().expiresAt.toDate().toISOString() : doc.data().expiresAt,
      recommendedSlotStart: doc.data().recommendedSlotStart?.toDate?.() ? doc.data().recommendedSlotStart.toDate().toISOString() : doc.data().recommendedSlotStart,
      recommendedSlotEnd: doc.data().recommendedSlotEnd?.toDate?.() ? doc.data().recommendedSlotEnd.toDate().toISOString() : doc.data().recommendedSlotEnd,
      acceptedAt: doc.data().acceptedAt?.toDate?.() ? doc.data().acceptedAt.toDate().toISOString() : doc.data().acceptedAt,
      declinedAt: doc.data().declinedAt?.toDate?.() ? doc.data().declinedAt.toDate().toISOString() : doc.data().declinedAt,
      cancelledAt: doc.data().cancelledAt?.toDate?.() ? doc.data().cancelledAt.toDate().toISOString() : doc.data().cancelledAt,
    }));

    // Determine next cursor
    const nextCursor = snapshot.docs.length === queryLimit
      ? snapshot.docs[snapshot.docs.length - 1].id
      : null;

    return NextResponse.json({
      recommendations,
      count: recommendations.length,
      nextCursor,
    });
  } catch (error: any) {
    console.error("[recommendations/list] Error:", error.message, error.code || "", error.stack || "");
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Surface index errors clearly
    if (error.code === 9 || error.message?.includes("index")) {
      return NextResponse.json({ error: "Query requires a composite index. Please deploy Firestore indexes." }, { status: 500 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
