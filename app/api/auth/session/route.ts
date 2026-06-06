import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/services/firebase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json(
        { error: "Missing idToken" },
        { status: 400 }
      );
    }

    // Verify the token with Firebase Admin SDK
    const adminAuth = getAdminAuth();
    await adminAuth.verifyIdToken(idToken);

    // Set the __session cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set("__session", idToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 3600, // 1 hour
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[session] Error verifying token:", error);
    return NextResponse.json(
      { error: "Invalid token" },
      { status: 401 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("__session", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
