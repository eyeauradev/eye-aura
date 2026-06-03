import type { UserRole } from "./auth";

// Users Collection
export interface UserDocument {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  phoneNumber?: string;
  whatsappNumber?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  
  // Account status fields (replaces onboardingCompleted for status determination)
  isActive: boolean;
  isSuspended: boolean;
  
  // Role-specific onboarding tracking
  onboarding: {
    patientCompleted: boolean;
    doctorCompleted: boolean;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

// Refund Decision Types
export type RefundDecisionType = "refund" | "no_refund";

export interface RefundDecision {
  decision: RefundDecisionType;
  decidedBy: string;
  decidedByRole: "doctor" | "admin";
  decidedAt: Date;
}

export interface RefundAuditEntry {
  action: "decision_at_approval" | "post_approval_refund";
  decision: RefundDecisionType | "refund";
  actorId: string;
  actorRole: "doctor" | "admin";
  timestamp: Date;
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
  // Consultation platform (set by doctor before consultation)
  consultationPlatform?: ConsultationPlatform;
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

  // Cancellation request fields
  cancellationRequestedAt?: Date;
  previousStatus?: "pending" | "confirmed";

  // Cancellation approval fields
  cancellationApprovedBy?: string;
  cancellationApprovedByRole?: "doctor" | "admin";
  cancellationApprovedAt?: Date;

  // Cancellation rejection fields
  cancellationRejectedBy?: string;
  cancellationRejectedByRole?: "doctor" | "admin";
  cancellationRejectedAt?: Date;
  cancellationRejectionReason?: string;

  // Refund fields
  refundId?: string;
  refundAmount?: number;
  refundedAt?: Date;

  // Refund decision tracking
  refundDecision?: RefundDecisionType;
  refundDecisionBy?: string;
  refundDecisionByRole?: "doctor" | "admin";
  refundDecisionAt?: Date;
  refundAuditTrail?: RefundAuditEntry[];
  refundStatus?: RefundStatus;

  // Booking request reference (for refund lookup)
  bookingRequestId?: string;
}

// Services Collection
export type ServiceType = 
  | "visual_acuity_assessment"
  | "voice_consultation"
  | "video_consultation"
  | "contact_lens_consultation"
  | "digital_eye_strain_guidance";

// Vision Assessment Types
export type VisionAssessmentType = "far" | "near" | "color_vision" | "contrast_sensitivity" | "custom";

export type AssessmentTriggerMode = "instant" | "before_appointment";

export interface ServiceAssessmentAutomation {
  enabled: boolean;
  assessmentTypes: VisionAssessmentType[];
  triggerMode: AssessmentTriggerMode;
  triggerMinutesBefore?: number;
}

export interface ServiceDocument {
  id: string;
  title: string;
  description: string;
  type: ServiceType;
  price: number;
  currency: string;
  duration: number; // in minutes
  suitableFor: string[];
  doctorIds: string[]; // IDs of doctors who can provide this service
  isActive: boolean;
  assessmentAutomation?: ServiceAssessmentAutomation;
  createdAt: Date;
  updatedAt: Date;
}

// Vision Assessments Collection
export type VisionAssessmentStatus =
  | "assigned"
  | "in_progress"
  | "completed"
  | "expired"
  | "cancelled";

export type AssignedByRole = "doctor" | "admin" | "system";

export type AssignmentTiming = "now" | "schedule_later";

export interface VisionAssessmentDocument {
  id: string;
  patientId: string;
  doctorId?: string;
  appointmentId?: string;
  serviceId?: string;
  assignedBy: string;         // UID of the user who assigned
  assignedRole: AssignedByRole;
  overrideUsed: boolean;      // true when admin bypassed appointment requirement
  assessmentTypes: VisionAssessmentType[];
  status: VisionAssessmentStatus;
  autoAssigned: boolean;
  // Scheduling fields (for "Schedule Later" assignments)
  scheduledFor?: Date;        // When "Schedule Later" is used
  instructions?: string;      // Doctor-provided guidance (max 500 chars)
  assignmentTiming?: AssignmentTiming; // "now" or "schedule_later"
  // Results (populated after patient completes)
  resultFar?: {
    rightEye: string;
    leftEye: string;
    completedAt: Date;
  };
  resultNear?: {
    rightEye: string;
    leftEye: string;
    completedAt: Date;
  };
  // Doctor review (filled after patient completes)
  doctorRemarks?: string;
  doctorCorrectedFar?: {
    rightEye: string;
    leftEye: string;
  };
  doctorCorrectedNear?: {
    rightEye: string;
    leftEye: string;
  };
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
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
export interface PrescriptionHistoryEntry {
  savedAt: Date;
  savedBy: string; // doctorId
  data: Partial<PrescriptionDocument>;
}

export interface PrescriptionDocument {
  id: string;
  appointmentId?: string; // Optional — standalone prescriptions don't require an appointment
  patientId: string;
  doctorId: string;
  // Edit history — previous versions stored before each update
  history?: PrescriptionHistoryEntry[];
  // Eye examination data
  rightEye: EyeData;
  leftEye: EyeData;
  pd: string; // Distance pupillary distance (kept for backward compat)
  nearPD?: string; // Near pupillary distance
  // Near vision (ADD)
  nearVisionRight?: NearVisionData;
  nearVisionLeft?: NearVisionData;
  // Patient demographics (captured at time of prescription)
  patientAge?: string; // e.g. "32 years"
  patientGender?: string; // e.g. "Male" / "Female"
  // Referral
  referredBy?: string;
  // Clinical findings
  findings: string;
  diagnosis: string;
  // Treatments
  medications: string; // Used for glasses recommendation in template
  eyeDrops: string;
  // Recommendations
  recommendations: string;
  exercises: string;
  // Review
  reviewAfter?: string; // e.g. "1 month", "3 months"
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
  remarks?: string; // Remarks
}

export interface NearVisionData {
  add: string; // Addition power for near vision
  va: string; // Visual acuity for near
  remarks: string; // Remarks
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
export type InviteStatus = "pending" | "opened" | "completed" | "expired" | "cancelled" | "failed";

export interface DoctorInviteDocument {
  id: string;
  email: string;
  role: "doctor";
  
  status: InviteStatus;
  
  token: string;
  expiresAt: Date;
  
  doctorName?: string;

  invitedBy: string; // Admin user ID
  invitedByName?: string;
  
  openedAt?: Date;
  completedAt?: Date;
  
  resendCount: number;
  
  specialization?: string;
  consultationTypes?: string[];
  
  existingUser: boolean;
  createdUserId?: string;
  
  errorReason?: string;
  
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

export type RefundStatus = "none" | "pending" | "processed" | "failed";

export type PaymentMethod = "card" | "upi" | "net_banking" | "wallet";

export interface PaymentDocument {
  id: string;
  userId: string;               // Patient UID
  doctorId: string;             // Doctor UID
  serviceId: string;            // Service UID
  amount: number;               // Amount in INR (human-readable, e.g. 500)
  currency: string;             // "INR"
  status: PaymentStatus;
  // Razorpay fields
  razorpayOrderId: string;      // Created by /api/payments/create-order
  razorpayPaymentId?: string;   // Returned by Razorpay after successful payment
  razorpaySignature?: string;   // Verified server-side in /api/payments/verify-payment
  // Booking linkage
  bookingRequestId?: string;    // Set after successful verification (links to booking_requests)
  // Booking snapshot at payment time
  requestedTime: Date;
  notes?: string;
  // Payment method (resolved after checkout)
  method?: PaymentMethod;
  // Timestamps and audit
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  refundedAt?: Date;
  refundReason?: string;
  // Refund tracking
  refundStatus?: RefundStatus;  // "none" | "pending" | "processed" | "failed"
  refundId?: string;            // Razorpay refund ID (rfnd_...)
  refundFailureReason?: string; // Populated if refundStatus === "failed"
  // Deprecated — kept for schema backward compatibility
  appointmentId?: string;
  transactionId?: string;
}

// Doctor Availability Collection (New Scheduling System)
export type DayOfWeek = 
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface TimeRange {
  startTime: string; // HH:mm format, e.g., "09:00"
  endTime: string;   // HH:mm format, e.g., "17:00"
}

export interface DoctorAvailabilityDocument {
  id: string;
  doctorId: string;
  dayOfWeek: DayOfWeek;
  timeRanges: TimeRange[]; // Multiple time ranges per day
  duration: number; // Consultation duration in minutes
  isOff: boolean; // If true, entire day is marked as off
  createdAt: Date;
  updatedAt: Date;
}

// Doctor Blocks Collection (New Scheduling System)
export interface DoctorBlockDocument {
  id: string;
  doctorId: string;
  start: Date; // Block start datetime
  end: Date;   // Block end datetime
  reason: string; // e.g., "lunch break", "emergency", "vacation"
  repeatWeekly?: boolean; // If true, block repeats every week
  createdAt: Date;
  updatedAt: Date;
}

// Booking Requests Collection (New Scheduling System)
export type BookingRequestStatus = 
  | "pending"
  | "accepted"
  | "reschedule_requested"
  | "rejected"
  | "cancelled";

export interface BookingRequestDocument {
  id: string;
  patientId: string;
  doctorId: string;
  serviceId: string;
  requestedTime: Date; // Patient's preferred time
  proposedTime?: Date; // Doctor's proposed time (for reschedule)
  status: BookingRequestStatus;
  notes?: string; // Patient's notes
  rejectionReason?: string; // Reason for rejection
  rescheduleReason?: string; // Reason for reschedule request
  // Payment linkage — set when booking_request is created via Razorpay verify-payment flow
  paymentId?: string;        // Links to payments collection
  paymentStatus?: string;    // "completed" at creation time
  paymentAmount?: number;    // Amount paid in INR
  refundStatus?: RefundStatus; // Mirrors payment.refundStatus for quick UI access
  createdAt: Date;
  updatedAt: Date;
  appointmentId?: string; // Once converted to appointment
}
