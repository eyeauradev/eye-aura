import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/services/firebase/admin";
import { logServerError } from "@/services/error-logging/error-log.service.server";
import { ERROR_CODES } from "@/lib/errors";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, displayName, password, phoneNumber } = body;

    if (!token || !displayName || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // All Firestore operations use Admin SDK — bypasses security rules entirely
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    // 1. Fetch invite by token
    const inviteSnap = await adminDb
      .collection("doctor_invites")
      .where("token", "==", token)
      .limit(1)
      .get();

    if (inviteSnap.empty) {
      return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
    }

    const inviteDoc = inviteSnap.docs[0];
    const inviteData = inviteDoc.data();
    const inviteId = inviteDoc.id;

    // 2. Validate invite state
    if (inviteData.status === "completed") {
      return NextResponse.json({ error: "This invite has already been used" }, { status: 400 });
    }
    if (inviteData.status === "cancelled") {
      return NextResponse.json({ error: "This invite has been cancelled" }, { status: 400 });
    }

    const expiresAt: Date = inviteData.expiresAt?.toDate
      ? inviteData.expiresAt.toDate()
      : new Date(inviteData.expiresAt);

    if (new Date() > expiresAt) {
      await adminDb.collection("doctor_invites").doc(inviteId).update({
        status: "expired",
        updatedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ error: "This invite has expired" }, { status: 400 });
    }

    const email: string = inviteData.email;

    // 3. Mark invite as opened
    await adminDb.collection("doctor_invites").doc(inviteId).update({
      status: "opened",
      openedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 4. Check if Firebase Auth user already exists
    let existingAuthUser;
    try {
      existingAuthUser = await adminAuth.getUserByEmail(email);
    } catch {
      // User does not exist yet — expected for new doctors
    }

    let userId: string;

    if (existingAuthUser) {
      userId = existingAuthUser.uid;

      // Check if Firestore user document exists
      const userDoc = await adminDb.collection("users").doc(userId).get();

      if (userDoc.exists) {
        const userData = userDoc.data()!;
        const existingRole: string = userData.role;

        // Admin accounts are immutable — block unconditionally
        if (existingRole === "admin") {
          return NextResponse.json(
            { error: "Admin accounts cannot be converted via a doctor invite" },
            { status: 400 }
          );
        }

        if (existingRole === "doctor") {
          if (userData.onboarding?.doctorCompleted) {
            // Already onboarded — mark invite complete and let client sign in
            await adminDb.collection("doctor_invites").doc(inviteId).update({
              status: "completed",
              completedAt: FieldValue.serverTimestamp(),
              createdUserId: userId,
              updatedAt: FieldValue.serverTimestamp(),
            });
            return NextResponse.json({ success: true, email });
          }
          // Doctor exists but onboarding incomplete — update profile only
          await adminDb.collection("users").doc(userId).update({
            displayName,
            ...(phoneNumber && { phoneNumber }),
            "onboarding.doctorCompleted": true,
            updatedAt: FieldValue.serverTimestamp(),
          });
        } else if (existingRole === "patient") {
          // Patient → Doctor upgrade: allowed
          // Update Auth password to the one they entered for their new doctor account
          await adminAuth.updateUser(userId, { displayName, password });
          await adminDb.collection("users").doc(userId).update({
            role: "doctor",
            displayName,
            ...(phoneNumber && { phoneNumber }),
            "onboarding.doctorCompleted": true,
            updatedAt: FieldValue.serverTimestamp(),
          });
        } else {
          // Unknown/unsupported role — block
          return NextResponse.json(
            { error: "This email is already registered with an incompatible account type" },
            { status: 400 }
          );
        }
      } else {
        // Auth user exists but no Firestore doc — create it as doctor
        await adminDb.collection("users").doc(userId).set({
          id: userId,
          email,
          displayName,
          phoneNumber: phoneNumber || null,
          role: "doctor",
          isActive: true,
          isSuspended: false,
          onboarding: { patientCompleted: false, doctorCompleted: true },
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    } else {
      // 5. Create new Firebase Auth user
      const newUser = await adminAuth.createUser({
        email,
        password,
        displayName,
      });
      userId = newUser.uid;

      // 6. Create Firestore user document
      await adminDb.collection("users").doc(userId).set({
        id: userId,
        email,
        displayName,
        phoneNumber: phoneNumber || null,
        role: "doctor",
        isActive: true,
        isSuspended: false,
        onboarding: { patientCompleted: false, doctorCompleted: true },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // 7. Mark invite as completed
    await adminDb.collection("doctor_invites").doc(inviteId).update({
      status: "completed",
      completedAt: FieldValue.serverTimestamp(),
      createdUserId: userId,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Return email so client can auto sign-in
    return NextResponse.json({ success: true, email });

  } catch (error: any) {
    console.error("Doctor onboarding error:", error);
    logServerError({
      code: ERROR_CODES.DOCTOR.OPERATION_FAILED,
      title: "Doctor Onboarding Failed",
      message: "Failed to complete doctor onboarding",
      originalError: error,
      context: "doctor-onboarding/complete",
    });
    return NextResponse.json(
      { error: error.message || "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}
