"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { getFirebaseAuth } from "@/services/firebase/client";
import { authService } from "@/services/auth/auth.service";
import { trackSignUp, trackLogin } from "@/services/analytics/analytics.service";
import type { UserProfile, AuthState } from "@/types/auth";

interface AuthContextType extends AuthState {
  signInWithEmail: (credentials: { email: string; password: string }) => Promise<UserProfile>;
  signInWithGoogle: () => Promise<UserProfile>;
  signUp: (credentials: { email: string; password: string; displayName: string }) => Promise<UserProfile>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<UserProfile>;
  sendVerificationEmail: () => Promise<void>;
  reloadUser: () => Promise<UserProfile>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          try {
            const userProfile = await authService.getCurrentUserProfile();
            setState({ user: userProfile, loading: false, error: null });

            // Sync session cookie with fresh ID token (handles token refresh)
            try {
              const idToken = await firebaseUser.getIdToken();
              await fetch("/api/auth/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken }),
              });
            } catch {
              // Non-critical: cookie sync failure shouldn't break auth state
              console.error("[AuthContext] Failed to sync session cookie");
            }
          } catch (error) {
            setState({ user: null, loading: false, error: error as Error });
          }
        } else {
          setState({ user: null, loading: false, error: null });

          // Clear stale session cookie
          try {
            await fetch("/api/auth/session", { method: "DELETE" });
          } catch {
            // Non-critical: cookie clear failure shouldn't break auth state
            console.error("[AuthContext] Failed to clear session cookie");
          }
        }
      }
    );

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (credentials: { email: string; password: string }) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const user = await authService.signInWithEmail(credentials);
      setState({ user, loading: false, error: null });
      try { trackLogin({ method: "email" }); } catch { /* analytics is non-critical */ }
      return user;
    } catch (error) {
      setState(prev => ({ ...prev, loading: false, error: error as Error }));
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const { profile, isNewUser } = await authService.signInWithGoogle();
      setState({ user: profile, loading: false, error: null });
      if (isNewUser) {
        try { trackSignUp({ method: "google" }); } catch { /* analytics is non-critical */ }
      } else {
        try { trackLogin({ method: "google" }); } catch { /* analytics is non-critical */ }
      }
      return profile;
    } catch (error) {
      setState(prev => ({ ...prev, loading: false, error: error as Error }));
      throw error;
    }
  };

  const signUp = async (credentials: { email: string; password: string; displayName: string }) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const user = await authService.signUp(credentials);
      setState({ user, loading: false, error: null });
      try { trackSignUp({ method: "email" }); } catch { /* analytics is non-critical */ }
      return user;
    } catch (error) {
      setState(prev => ({ ...prev, loading: false, error: error as Error }));
      throw error;
    }
  };

  const signOut = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await authService.signOut();
      setState({ user: null, loading: false, error: null });
    } catch (error) {
      setState(prev => ({ ...prev, loading: false, error: error as Error }));
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await authService.resetPassword(email);
    } catch (error) {
      setState(prev => ({ ...prev, error: error as Error }));
      throw error;
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    setState(prev => ({ ...prev, error: null }));
    try {
      const user = await authService.updateUserProfile(updates);
      setState(prev => ({ ...prev, user, error: null }));
      return user;
    } catch (error) {
      setState(prev => ({ ...prev, error: error as Error }));
      throw error;
    }
  };

  const sendVerificationEmail = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await authService.sendVerificationEmail();
      setState(prev => ({ ...prev, loading: false, error: null }));
    } catch (error) {
      setState(prev => ({ ...prev, loading: false, error: error as Error }));
      throw error;
    }
  };

  const reloadUser = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const user = await authService.reloadUser();
      setState({ user, loading: false, error: null });
      return user;
    } catch (error) {
      setState(prev => ({ ...prev, loading: false, error: error as Error }));
      throw error;
    }
  };

  const value: AuthContextType = {
    ...state,
    signInWithEmail,
    signInWithGoogle,
    signUp,
    signOut,
    resetPassword,
    updateUserProfile,
    sendVerificationEmail,
    reloadUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
