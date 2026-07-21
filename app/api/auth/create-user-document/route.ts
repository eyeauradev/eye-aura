import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/services/firebase/admin";
import { logServerError } from "@/services/error-logging/error-log.service.server";
import { ERROR_CODES } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, email, displayName, role } = body;

    if (!uid || !email || !displayName || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    const userRef = adminDb.collection("users").doc(uid);

    const docData = {
      id: uid,
      email,
      displayName,
      role,
      isActive: true,
      isSuspended: false,
      onboarding: {
        patientCompleted: false,
        doctorCompleted: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await userRef.set(docData);

    console.log("[create-user-document] User document created via Admin SDK:", uid);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[create-user-document] Error:", error);
    logServerError({
      code: ERROR_CODES.AUTH.GENERIC,
      title: "Auth Error",
      message: "Failed to create user document",
      originalError: error,
      context: "auth/create-user-document",
    });
    return NextResponse.json(
      { error: "Failed to create user document" },
      { status: 500 }
    );
  }
}
