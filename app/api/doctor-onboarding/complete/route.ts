import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/services/firebase/admin";
import { doctorInvitesService } from "@/services/firestore/doctor-invites.service";
import { usersService } from "@/services/firestore/users.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, displayName, password, phoneNumber } = body;

    if (!token || !displayName || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Lazy initialize Firebase Admin
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();
    const invite = await doctorInvitesService.getByToken(token);
    if (!invite) {
      return NextResponse.json(
        { error: "Invalid invite link" },
        { status: 404 }
      );
    }

    if (invite.status === "completed") {
      return NextResponse.json(
        { error: "This invite has already been used" },
        { status: 400 }
      );
    }

    if (invite.status === "cancelled") {
      return NextResponse.json(
        { error: "This invite has been cancelled" },
        { status: 400 }
      );
    }

    if (new Date() > invite.expiresAt) {
      await doctorInvitesService.updateStatus(invite.id, "expired");
      return NextResponse.json(
        { error: "This invite has expired" },
        { status: 400 }
      );
    }

    // Check if Firebase Auth user already exists
    let firebaseUser;
    try {
      firebaseUser = await adminAuth.getUserByEmail(invite.email);
    } catch (error) {
      // User doesn't exist, will create new
    }

    if (firebaseUser) {
      // Check if user already has a Firestore document
      const existingUser = await usersService.getById(firebaseUser.uid);
      
      if (existingUser) {
        // User already exists in Firestore
        if (existingUser.role !== "doctor") {
          return NextResponse.json(
            { error: "This email is already associated with another account type" },
            { status: 400 }
          );
        }
        
        if (existingUser.onboarding?.doctorCompleted) {
          // Doctor onboarding already complete
          await doctorInvitesService.markAsCompleted(invite.id, firebaseUser.uid);
          return NextResponse.json({
            success: true,
            message: "Account already exists, redirecting to dashboard",
            redirect: "/doctor/dashboard",
          });
        }
        
        // Doctor exists but onboarding incomplete, update profile
        await usersService.update(firebaseUser.uid, {
          displayName,
          phoneNumber,
        });
        
        // Mark invite as completed
        await doctorInvitesService.markAsCompleted(invite.id, firebaseUser.uid);
        
        return NextResponse.json({
          success: true,
          message: "Profile updated successfully",
          redirect: "/doctor/dashboard",
        });
      }
      
      // Firebase Auth user exists but no Firestore doc
      // Create Firestore user
      await usersService.create({
        id: firebaseUser.uid,
        email: invite.email,
        displayName,
        phoneNumber,
        role: "doctor",
        isActive: true,
        isSuspended: false,
        onboarding: {
          patientCompleted: false,
          doctorCompleted: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      await doctorInvitesService.markAsCompleted(invite.id, firebaseUser.uid);
      
      return NextResponse.json({
        success: true,
        message: "Account created successfully",
        redirect: "/doctor/dashboard",
      });
    }

    // Create new Firebase Auth user
    const newFirebaseUser = await adminAuth.createUser({
      email: invite.email,
      password,
      displayName,
    });

    // Create Firestore user
    await usersService.create({
      id: newFirebaseUser.uid,
      email: invite.email,
      displayName,
      phoneNumber,
      role: "doctor",
      isActive: true,
      isSuspended: false,
      onboarding: {
        patientCompleted: false,
        doctorCompleted: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Mark invite as completed
    await doctorInvitesService.markAsCompleted(invite.id, newFirebaseUser.uid);

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
      redirect: "/doctor/dashboard",
    });
  } catch (error: any) {
    console.error("Doctor onboarding error:", error);
    
    // Try to mark invite as failed if we have the token
    try {
      const body = await request.json().catch(() => ({}));
      if (body.token) {
        const invite = await doctorInvitesService.getByToken(body.token);
        if (invite) {
          await doctorInvitesService.markAsFailed(invite.id, error.message || "Unknown error");
        }
      }
    } catch (markFailedError) {
      console.error("Failed to mark invite as failed:", markFailedError);
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}
