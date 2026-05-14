"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { getFirebaseAuth } from "@/services/firebase/client";
import { authService } from "@/services/auth/auth.service";
import type { UserProfile, AuthState } from "@/types/auth";

interface AuthContextType extends AuthState {
  signInWithEmail: (credentials: { email: string; password: string }) => Promise<UserProfile>;
  signInWithGoogle: () => Promise<UserProfile>;
  signUp: (credentials: { email: string; password: string; displayName: string }) => Promise<UserProfile>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<UserProfile>;
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
          } catch (error) {
            setState({ user: null, loading: false, error: error as Error });
          }
        } else {
          setState({ user: null, loading: false, error: null });
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
      return user;
    } catch (error) {
      setState(prev => ({ ...prev, loading: false, error: error as Error }));
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const user = await authService.signInWithGoogle();
      setState({ user, loading: false, error: null });
      return user;
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
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const user = await authService.updateUserProfile(updates);
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
