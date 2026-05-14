import type { UserRole } from "./auth";

// Users Collection
export interface UserDocument {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  phoneNumber?: string;
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Appointments Collection
export type AppointmentStatus = 
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "cancellation_requested";

export type ConsultationPlatform = "google_meet" | "zoom" | "phone";

export interface AppointmentDocument {
  id: string;
  patientId: string;
  doctorId: string;
  serviceId: string;
  slotId: string;
  status: AppointmentStatus;
  notes?: string;
  prescriptionId?: string;
  paymentId?: string;
  // Consultation platform
  consultationPlatform: ConsultationPlatform;
  consultationLink?: string;
  // Follow-up
  followUpRequired?: boolean;
  followUpDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  scheduledFor: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
}

// Services Collection
export type ServiceType = 
  | "visual_acuity_assessment"
  | "voice_consultation"
  | "video_consultation"
  | "contact_lens_consultation"
  | "digital_eye_strain_guidance";

export interface ServiceDocument {
  id: string;
  title: string;
  description: string;
  type: ServiceType;
  price: number;
  currency: string;
  duration: number; // in minutes
  suitableFor: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Doctor Slots Collection
export interface DoctorSlotDocument {
  id: string;
  doctorId: string;
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
  appointmentId?: string;
  isBlocked: boolean;
  blockReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Prescriptions Collection
export interface PrescriptionDocument {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  // Eye examination data
  rightEye: EyeData;
  leftEye: EyeData;
  pd: string; // Pupillary distance
  // Clinical findings
  findings: string;
  diagnosis: string;
  // Treatments
  medications: string;
  eyeDrops: string;
  // Recommendations
  recommendations: string;
  exercises: string;
  // Follow-up
  followUpRequired: boolean;
  followUpDate?: Date;
  // Notes
  consultationNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EyeData {
  sph: string; // Spherical power
  cyl: string; // Cylindrical power
  axis: string; // Axis
  va: string; // Visual acuity
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface EyeDrop {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface Exercise {
  name: string;
  description: string;
  frequency: string;
}

// Doctor Invites Collection
export interface DoctorInviteDocument {
  id: string;
  email: string;
  token: string;
  expiresAt: Date;
  invitedBy: string; // Admin user ID
  used: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Support Tickets Collection
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketCategory = 
  | "billing"
  | "technical"
  | "appointment"
  | "prescription"
  | "general";

export interface SupportTicketDocument {
  id: string;
  userId: string;
  subject: string;
  message: string;
  description: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  assignedTo?: string; // admin or doctor ID
  responses: TicketResponse[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export interface TicketResponse {
  id?: string;
  authorId: string;
  authorName?: string;
  message: string;
  createdAt: Date;
  isInternal?: boolean;
}

// Payments Collection
export type PaymentStatus = 
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "refunded"
  | "cancelled";

export type PaymentMethod = "card" | "upi" | "net_banking" | "wallet";

export interface PaymentDocument {
  id: string;
  appointmentId: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  transactionId?: string;
  gatewayResponse?: any;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  refundedAt?: Date;
  refundReason?: string;
}
