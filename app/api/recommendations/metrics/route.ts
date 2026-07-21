import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/services/firebase/admin";
import { logServerError } from "@/services/error-logging/error-log.service.server";
import { ERROR_CODES } from "@/lib/errors";

async function verifyAdminToken(req: NextRequest) {
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
  if (data.role !== "admin") throw new Error("Forbidden");
  if (data.isActive === false) throw new Error("Forbidden");
  return { uid: decoded.uid };
}

export async function GET(req: NextRequest) {
  try {
    await verifyAdminToken(req);
    const db = getAdminDb();

    // Fetch all recommendations and compute metrics
    const snapshot = await db.collection("service_recommendations").get();

    const counts = {
      total: 0,
      pending: 0,
      accepted: 0,
      declined: 0,
      cancelled: 0,
      expired: 0,
    };

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      counts.total++;
      switch (data.status) {
        case "PENDING":
          counts.pending++;
          break;
        case "ACCEPTED":
          counts.accepted++;
          break;
        case "DECLINED":
          counts.declined++;
          break;
        case "CANCELLED":
          counts.cancelled++;
          break;
        case "EXPIRED":
          counts.expired++;
          break;
      }
    });

    // Conversion rate = accepted / (accepted + declined + expired) * 100
    const denominator = counts.accepted + counts.declined + counts.expired;
    const conversionRate = denominator > 0
      ? Math.round((counts.accepted / denominator) * 1000) / 10
      : 0;

    return NextResponse.json({
      ...counts,
      conversionRate,
    });
  } catch (error: any) {
    console.error("[recommendations/metrics] Error:", error.message);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    logServerError({
      code: ERROR_CODES.API.SERVER_ERROR,
      title: "Server Error",
      message: "Failed to fetch recommendation metrics",
      originalError: error,
      context: "recommendations/metrics",
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
