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
        };
        
        await this.createUserProfile(newUserProfile);
        console.log("[AuthService] Firestore document created for email sign-in user");
        return newUserProfile;
      }
      
      console.log("[AuthService] User document exists in Firestore");
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
        };
        
        await this.createUserProfile(newUserProfile);
        console.log("[AuthService] Firestore document created for Google sign-in user");
        return newUserProfile;
      }
      
      console.log("[AuthService] User document exists in Firestore");
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

      const userProfile: UserProfile = {
        id: userCredential.user.uid,
        email: credentials.email,
        displayName: credentials.displayName,
        role: "patient", // Public signup always creates patient accounts
        createdAt: new Date(),
        updatedAt: new Date(),
        onboardingCompleted: false,
      };

      console.log("[AuthService] Attempting to create Firestore document for user:", userProfile.id);
      await this.createUserProfile(userProfile);
      console.log("[AuthService] Firestore document created successfully");

      return userProfile;
    } catch (error) {
      console.error("[AuthService] Email signup error:", error);
      throw this.handleError(error);
    }
  }

  async signOut(): Promise<void> {
    try {
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

  async getCurrentUserProfile(): Promise<UserProfile | null> {
    const user = this.auth.currentUser;
    if (!user) return null;
    return await this.getUserProfile(user);
  }

  private async getUserProfile(user: User): Promise<UserProfile> {
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
        onboardingCompleted: data.onboardingCompleted || false,
      };
    }

    return {
      id: user.uid,
      email: user.email || "",
      displayName: user.displayName || undefined,
      photoURL: user.photoURL || undefined,
      role: "patient",
      createdAt: new Date(),
      updatedAt: new Date(),
      onboardingCompleted: false,
    };
  }

  private async createUserProfile(profile: UserProfile): Promise<void> {
    try {
      console.log("[AuthService] Creating Firestore document for user:", profile.id);
      console.log("[AuthService] Document data:", {
        id: profile.id,
        email: profile.email,
        displayName: profile.displayName,
        role: profile.role,
        onboardingCompleted: profile.onboardingCompleted,
      });
      
      const docRef = doc(this.db, "users", profile.id);
      await setDoc(docRef, {
        ...profile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
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
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      const profile = await this.getCurrentUserProfile();
      if (!profile) throw new Error("Failed to retrieve user profile after update");
      return profile;
    } catch (error) {
      throw this.handleError(error);
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
