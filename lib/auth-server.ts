import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/services/firebase/admin";
import type { UserProfile, UserRole } from "@/types/auth";

export async function getServerSession() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session");
    
    if (!sessionCookie) {
      return null;
    }

    const decodedClaims = await adminAuth.verifySessionCookie(
      sessionCookie.value,
      true
    );

    if (!decodedClaims.uid) {
      return null;
    }

    const userDoc = await adminDb.collection("users").doc(decodedClaims.uid).get();
    
    if (!userDoc.exists) {
      return null;
    }

    const data = userDoc.data();
    
    return {
      id: decodedClaims.uid,
      uid: decodedClaims.uid,
      email: decodedClaims.email || "",
      emailVerified: decodedClaims.email_verified || false,
      role: data?.role || "patient",
      displayName: data?.displayName || "",
      photoURL: data?.photoURL || "",
      onboardingCompleted: data?.onboardingCompleted || false,
      createdAt: data?.createdAt ? new Date(data.createdAt.seconds * 1000) : new Date(),
      updatedAt: data?.updatedAt ? new Date(data.updatedAt.seconds * 1000) : new Date(),
    } as UserProfile;
  } catch (error) {
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
