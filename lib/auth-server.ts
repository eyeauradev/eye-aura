import { cookies } from "next/headers";
import { getAdminAuth, getAdminDb } from "@/services/firebase/admin";
import type { UserProfile, UserRole } from "@/types/auth";

export async function getServerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) {
    return null;
  }

  try {
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    if (!decodedToken.uid) {
      return null;
    }

    // Get user from Firestore
    const adminDb = getAdminDb();
    const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();
    
    if (!userData) {
      return null;
    }
    
    const profile: UserProfile = {
      id: decodedToken.uid,
      email: decodedToken.email || "",
      displayName: userData.displayName || decodedToken.name || "",
      role: userData.role as UserRole,
      isActive: userData.isActive ?? true,
      isSuspended: userData.isSuspended ?? false,
      onboardingCompleted: (userData.onboarding?.patientCompleted ?? false) || (userData.onboarding?.doctorCompleted ?? false),
      emailVerified: decodedToken.emailVerified || false,
      createdAt: userData.createdAt?.toDate() || new Date(),
      updatedAt: userData.updatedAt?.toDate() || new Date(),
    };

    return profile;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

export async function requireAuth() {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireRole(allowedRoles: UserRole[]) {
  const session = await requireAuth();
  if (!session.role || !allowedRoles.includes(session.role as UserRole)) {
    throw new Error("Forbidden");
  }
  return session;
}

export async function isAdmin() {
  try {
    const session = await requireRole(["admin"]);
    return true;
  } catch {
    return false;
  }
}

export async function isDoctor() {
  try {
    const session = await requireRole(["doctor", "admin"]);
    return true;
  } catch {
    return false;
  }
}

export async function isPatient() {
  try {
    const session = await requireRole(["patient", "doctor", "admin"]);
    return true;
  } catch {
    return false;
  }
}
