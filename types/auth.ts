export type UserRole = "patient" | "doctor" | "admin";

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  phoneNumber?: string;
  onboardingCompleted: boolean;
}

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: Error | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  displayName: string;
}

export interface AuthError extends Error {
  code?: string;
}

export type AuthProvider = "email" | "google";
