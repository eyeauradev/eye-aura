import {
  User,
  UserCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  sendEmailVerification,
  reload,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb, googleAuthProvider } from "@/services/firebase/client";
import type { UserProfile, LoginCredentials, SignupCredentials, AuthError } from "@/types/auth";

class AuthService {
  private auth = getFirebaseAuth();
  private db = getFirebaseDb();

  async signInWithEmail(credentials: LoginCredentials): Promise<UserProfile> {
    try {
      console.log("[AuthService] Starting email sign-in for:", credentials.email);

      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        credentials.email,
        credentials.password
      );

      console.log("[AuthService] Firebase Auth email sign-in successful:", userCredential.user.uid);

      const userProfile = await this.getUserProfile(userCredential.user);

      // Check if user document exists in Firestore
      const userDoc = await getDoc(doc(this.db, "users", userCredential.user.uid));
      if (!userDoc.exists()) {
        console.log("[AuthService] User document not found in Firestore, creating it now");

        const newUserProfile: UserProfile = {
          id: userCredential.user.uid,
          email: userCredential.user.email || "",
          displayName: userCredential.user.displayName || "",
          photoURL: userCredential.user.photoURL || undefined,
          role: "patient", // Default to patient for email sign-in
          createdAt: new Date(),
          updatedAt: new Date(),
          onboardingCompleted: false,
          isActive: true,
          isSuspended: false,
          emailVerified: userCredential.user.emailVerified || false,
        };

        await this.createUserProfile(newUserProfile);
        console.log("[AuthService] Firestore document created for email sign-in user");

        await this.setSessionCookie();
        return newUserProfile;
      }

      console.log("[AuthService] User document exists in Firestore");

      await this.setSessionCookie();
      return userProfile;
    } catch (error) {
      console.error("[AuthService] Email sign-in error:", error);
      throw this.handleError(error);
    }
  }

  async signInWithGoogle(): Promise<UserProfile> {
    try {
      console.log("[AuthService] Starting Google sign-in");

      const userCredential = await signInWithPopup(this.auth, googleAuthProvider);
      console.log("[AuthService] Firebase Auth Google sign-in successful:", userCredential.user.uid);

      const userProfile = await this.getUserProfile(userCredential.user);

      // Check if user document exists in Firestore
      const userDoc = await getDoc(doc(this.db, "users", userCredential.user.uid));
      if (!userDoc.exists()) {
        console.log("[AuthService] User document not found in Firestore, creating it now");

        const newUserProfile: UserProfile = {
          id: userCredential.user.uid,
          email: userCredential.user.email || "",
          displayName: userCredential.user.displayName || "",
          photoURL: userCredential.user.photoURL || undefined,
          role: "patient", // Default to patient for Google sign-up
          createdAt: new Date(),
          updatedAt: new Date(),
          onboardingCompleted: false,
          isActive: true,
          isSuspended: false,
          emailVerified: userCredential.user.emailVerified || false, // Google accounts are auto-verified
        };

        await this.createUserProfile(newUserProfile);
        console.log("[AuthService] Firestore document created for Google sign-in user");

        await this.setSessionCookie();
        return newUserProfile;
      }

      console.log("[AuthService] User document exists in Firestore");

      await this.setSessionCookie();
      return userProfile;
    } catch (error) {
      console.error("[AuthService] Google sign-in error:", error);
      throw this.handleError(error);
    }
  }

  async signInWithGoogleRedirect(): Promise<void> {
    try {
      await signInWithRedirect(this.auth, googleAuthProvider);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async signUp(credentials: SignupCredentials): Promise<UserProfile> {
    try {
      console.log("[AuthService] Starting email signup for:", credentials.email);

      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        credentials.email,
        credentials.password
      );

      console.log("[AuthService] Firebase Auth user created:", userCredential.user.uid);

      await updateProfile(userCredential.user, {
        displayName: credentials.displayName,
      });

      console.log("[AuthService] Firebase Auth profile updated");

      // Create user document via server-side API (uses Admin SDK, bypasses client-side security rules)
      console.log("[AuthService] Creating user document via server API");
      const response = await fetch("/api/auth/create-user-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: userCredential.user.uid,
          email: credentials.email,
          displayName: credentials.displayName,
          role: "patient",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create user document");
      }

      console.log("[AuthService] User document created successfully via server API");

      const userProfile: UserProfile = {
        id: userCredential.user.uid,
        email: credentials.email,
        displayName: credentials.displayName,
        role: "patient", // Public signup always creates patient accounts
        createdAt: new Date(),
        updatedAt: new Date(),
        onboardingCompleted: false,
        isActive: true,
        isSuspended: false,
        emailVerified: userCredential.user.emailVerified || false,
      };

      // Send verification email
      console.log("[AuthService] Sending verification email");
      const actionCodeSettings = {
        url: typeof window !== 'undefined'
          ? `${window.location.origin}/auth/verify-email`
          : 'http://localhost:3000/auth/verify-email',
        handleCodeInApp: false,
      };
      await sendEmailVerification(userCredential.user, actionCodeSettings);
      console.log("[AuthService] Verification email sent");

      return userProfile;
    } catch (error) {
      console.error("[AuthService] Email signup error:", error);
      throw this.handleError(error);
    }
  }

  async signOut(): Promise<void> {
    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
      await firebaseSignOut(this.auth);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async sendVerificationEmail(): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error("No authenticated user");

    try {
      const actionCodeSettings = {
        url: typeof window !== 'undefined'
          ? `${window.location.origin}/auth/verify-email`
          : 'http://localhost:3000/auth/verify-email',
        handleCodeInApp: false,
      };
      await sendEmailVerification(user, actionCodeSettings);
      console.log("[AuthService] Verification email sent");
    } catch (error) {
      console.error("[AuthService] Error sending verification email:", error);
      throw this.handleError(error);
    }
  }

  async reloadUser(): Promise<UserProfile> {
    const user = this.auth.currentUser;
    if (!user) throw new Error("No authenticated user");

    try {
      await reload(user);
      console.log("[AuthService] User reloaded, emailVerified:", user.emailVerified);
      return await this.getUserProfile(user);
    } catch (error) {
      console.error("[AuthService] Error reloading user:", error);
      throw this.handleError(error);
    }
  }

  async getCurrentUserProfile(): Promise<UserProfile | null> {
    const user = this.auth.currentUser;
    if (!user) return null;
    return await this.getUserProfile(user);
  }

  private async getUserProfile(user: User): Promise<UserProfile> {
    try {
      const userDoc = await getDoc(doc(this.db, "users", user.uid));

      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          id: user.uid,
          email: user.email || "",
          displayName: user.displayName || data.displayName,
          photoURL: user.photoURL || data.photoURL,
          role: data.role || "patient",
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          phoneNumber: user.phoneNumber || data.phoneNumber,
          whatsappNumber: data.whatsappNumber,
          emergencyContact: data.emergencyContact,
          emergencyPhone: data.emergencyPhone,
          isActive: data.isActive ?? true,
          isSuspended: data.isSuspended ?? false,
          onboardingCompleted: data.onboarding?.patientCompleted || data.onboarding?.doctorCompleted || false,
          emailVerified: user.emailVerified || false,
        };
      }
    } catch (error) {
      console.error("[AuthService] Error reading user document:", error);
      // If we get a permission error or document doesn't exist, create the document
      console.log("[AuthService] Document doesn't exist or permission error, creating it");
    }

    // Document doesn't exist or we couldn't read it, create a new one
    const defaultProfile: UserProfile = {
      id: user.uid,
      email: user.email || "",
      displayName: user.displayName || undefined,
      photoURL: user.photoURL || undefined,
      role: "patient",
      createdAt: new Date(),
      updatedAt: new Date(),
      phoneNumber: user.phoneNumber || undefined,
      isActive: true,
      isSuspended: false,
      onboardingCompleted: false,
      emailVerified: user.emailVerified || false,
    };

    try {
      await this.createUserProfile(defaultProfile);
      console.log("[AuthService] Created missing user document for:", user.uid);
    } catch (createError) {
      console.error("[AuthService] Failed to create user document:", createError);
    }

    return defaultProfile;
  }

  private async createUserProfile(profile: UserProfile): Promise<void> {
    try {
      console.log("[AuthService] Creating Firestore document for user:", profile.id);
      console.log("[AuthService] Document data:", {
        id: profile.id,
        email: profile.email,
        displayName: profile.displayName,
        role: profile.role,
        isActive: profile.isActive,
        isSuspended: profile.isSuspended,
      });
      
      const docRef = doc(this.db, "users", profile.id);
      
      // Build the document data, only including fields that have values
      const docData: any = {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        isActive: profile.isActive,
        isSuspended: profile.isSuspended,
        onboarding: {
          patientCompleted: false,
          doctorCompleted: false,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Only include optional fields if they have values
      if (profile.displayName) docData.displayName = profile.displayName;
      if (profile.photoURL) docData.photoURL = profile.photoURL;
      if (profile.phoneNumber) docData.phoneNumber = profile.phoneNumber;
      if (profile.emergencyContact) docData.emergencyContact = profile.emergencyContact;
      if (profile.emergencyPhone) docData.emergencyPhone = profile.emergencyPhone;

      await setDoc(docRef, docData);
      
      console.log("[AuthService] Firestore write completed successfully");
    } catch (error) {
      console.error("[AuthService] Firestore write error:", error);
      throw error;
    }
  }

  async updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const user = this.auth.currentUser;
    if (!user) throw new Error("No authenticated user");

    try {
      const userRef = doc(this.db, "users", user.uid);
      
      // Only send safe fields — exclude system fields that could trigger permission issues
      const { id, email, role, isActive, isSuspended, onboardingCompleted, emailVerified, createdAt, updatedAt, ...safeUpdates } = updates as any;
      
      const updateData: any = {
        ...safeUpdates,
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(userRef, updateData);

      const profile = await this.getCurrentUserProfile();
      if (!profile) throw new Error("Failed to retrieve user profile after update");
      return profile;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private async setSessionCookie(): Promise<void> {
    try {
      const idToken = await this.auth.currentUser!.getIdToken();
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      console.log("[AuthService] Session cookie set successfully");
    } catch (error) {
      console.error("[AuthService] Failed to set session cookie:", error);
    }
  }

  private handleError(error: unknown): AuthError {
    if (error instanceof Error) {
      const authError = error as AuthError;
      if ("code" in authError) {
        return authError;
      }
      return { ...error, code: "unknown" };
    }
    return new Error("An unknown error occurred") as AuthError;
  }
}

export const authService = new AuthService();
