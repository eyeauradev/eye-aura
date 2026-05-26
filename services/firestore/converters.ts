import {
  Timestamp,
  serverTimestamp,
  doc,
  collection,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import type {
  UserDocument,
  AppointmentDocument,
  DoctorSlotDocument,
  PrescriptionDocument,
  SupportTicketDocument,
  ServiceDocument,
  DoctorInviteDocument,
  DoctorAvailabilityDocument,
  DoctorBlockDocument,
  BookingRequestDocument,
  PaymentDocument,
  VisionAssessmentDocument,
} from "@/types/firestore";

// Timestamp converter helpers
function toTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

function fromTimestamp(timestamp: Timestamp | Date | undefined): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  return timestamp.toDate();
}

// User converter
export const userConverter = {
  toFirestore: (user: UserDocument): DocumentData => {
    const firestoreData: DocumentData = {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isSuspended: user.isSuspended,
      onboarding: user.onboarding,
      createdAt: toTimestamp(user.createdAt),
      updatedAt: toTimestamp(user.updatedAt),
    };

    // Only include optional fields if they have values
    if (user.displayName) firestoreData.displayName = user.displayName;
    if (user.phoneNumber) firestoreData.phoneNumber = user.phoneNumber;
    if (user.photoURL) firestoreData.photoURL = user.photoURL;
    if (user.emergencyContact) firestoreData.emergencyContact = user.emergencyContact;
    if (user.emergencyPhone) firestoreData.emergencyPhone = user.emergencyPhone;

    return firestoreData;
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot): UserDocument => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      email: data.email,
      displayName: data.displayName,
      photoURL: data.photoURL,
      role: data.role,
      phoneNumber: data.phoneNumber,
      emergencyContact: data.emergencyContact,
      emergencyPhone: data.emergencyPhone,
      isActive: data.isActive ?? true,
      isSuspended: data.isSuspended ?? false,
      onboarding: data.onboarding || { patientCompleted: false, doctorCompleted: false },
      createdAt: fromTimestamp(data.createdAt),
      updatedAt: fromTimestamp(data.updatedAt),
    };
  },
};

// Appointment converter
export const appointmentConverter = {
  toFirestore: (appointment: AppointmentDocument): DocumentData => ({
    ...appointment,
    scheduledFor: toTimestamp(appointment.scheduledFor),
    completedAt: appointment.completedAt ? toTimestamp(appointment.completedAt) : null,
    cancelledAt: appointment.cancelledAt ? toTimestamp(appointment.cancelledAt) : null,
    followUpDate: appointment.followUpDate ? toTimestamp(appointment.followUpDate) : null,
    createdAt: toTimestamp(appointment.createdAt),
    updatedAt: toTimestamp(appointment.updatedAt),
  }),
  fromFirestore: (snapshot: QueryDocumentSnapshot): AppointmentDocument => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      patientId: data.patientId,
      doctorId: data.doctorId,
      serviceId: data.serviceId,
      slotId: data.slotId,
      status: data.status,
      notes: data.notes,
      prescriptionId: data.prescriptionId,
      paymentId: data.paymentId,
      consultationPlatform: data.consultationPlatform || "google_meet",
      consultationLink: data.consultationLink,
      followUpRequired: data.followUpRequired,
      followUpDate: data.followUpDate ? fromTimestamp(data.followUpDate) : undefined,
      createdAt: fromTimestamp(data.createdAt),
      updatedAt: fromTimestamp(data.updatedAt),
      scheduledFor: fromTimestamp(data.scheduledFor),
      completedAt: data.completedAt ? fromTimestamp(data.completedAt) : undefined,
      cancelledAt: data.cancelledAt ? fromTimestamp(data.cancelledAt) : undefined,
      cancellationReason: data.cancellationReason,
    };
  },
};

// Service converter
export const serviceConverter = {
  toFirestore: (service: ServiceDocument): DocumentData => ({
    ...service,
    createdAt: toTimestamp(service.createdAt),
    updatedAt: toTimestamp(service.updatedAt),
  }),
  fromFirestore: (snapshot: QueryDocumentSnapshot): ServiceDocument => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      title: data.title,
      description: data.description,
      type: data.type,
      price: data.price,
      currency: data.currency,
      duration: data.duration,
      suitableFor: data.suitableFor,
      isActive: data.isActive,
      doctorIds: data.doctorIds || [],
      assessmentAutomation: data.assessmentAutomation ?? undefined,
      createdAt: fromTimestamp(data.createdAt),
      updatedAt: fromTimestamp(data.updatedAt),
    };
  },
};

// Doctor Slot converter
export const doctorSlotConverter = {
  toFirestore: (slot: DoctorSlotDocument): DocumentData => ({
    ...slot,
    startTime: toTimestamp(slot.startTime),
    endTime: toTimestamp(slot.endTime),
    createdAt: toTimestamp(slot.createdAt),
    updatedAt: toTimestamp(slot.updatedAt),
  }),
  fromFirestore: (snapshot: QueryDocumentSnapshot): DoctorSlotDocument => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      doctorId: data.doctorId,
      startTime: fromTimestamp(data.startTime),
      endTime: fromTimestamp(data.endTime),
      isAvailable: data.isAvailable,
      appointmentId: data.appointmentId,
      isBlocked: data.isBlocked,
      blockReason: data.blockReason,
      createdAt: fromTimestamp(data.createdAt),
      updatedAt: fromTimestamp(data.updatedAt),
    };
  },
};

// Prescription converter
export const prescriptionConverter = {
  toFirestore: (prescription: PrescriptionDocument): DocumentData => ({
    ...prescription,
    followUpDate: prescription.followUpDate ? toTimestamp(prescription.followUpDate) : null,
    createdAt: toTimestamp(prescription.createdAt),
    updatedAt: toTimestamp(prescription.updatedAt),
  }),
  fromFirestore: (snapshot: QueryDocumentSnapshot): PrescriptionDocument => {
    const d = snapshot.data();
    return {
      id: snapshot.id,
      appointmentId: d.appointmentId,
      patientId: d.patientId,
      doctorId: d.doctorId,
      rightEye: { sph: d.rightEye?.sph || "", cyl: d.rightEye?.cyl || "", axis: d.rightEye?.axis || "", va: d.rightEye?.va || "", remarks: d.rightEye?.remarks || "" },
      leftEye: { sph: d.leftEye?.sph || "", cyl: d.leftEye?.cyl || "", axis: d.leftEye?.axis || "", va: d.leftEye?.va || "", remarks: d.leftEye?.remarks || "" },
      pd: d.pd || "",
      nearPD: d.nearPD || "",
      nearVisionRight: d.nearVisionRight ? { add: d.nearVisionRight.add || "", va: d.nearVisionRight.va || "", remarks: d.nearVisionRight.remarks || "" } : undefined,
      nearVisionLeft: d.nearVisionLeft ? { add: d.nearVisionLeft.add || "", va: d.nearVisionLeft.va || "", remarks: d.nearVisionLeft.remarks || "" } : undefined,
      patientAge: d.patientAge || "",
      patientGender: d.patientGender || "",
      referredBy: d.referredBy || "",
      findings: d.findings || "",
      diagnosis: d.diagnosis || "",
      medications: d.medications || "",
      eyeDrops: d.eyeDrops || "",
      recommendations: d.recommendations || "",
      exercises: d.exercises || "",
      reviewAfter: d.reviewAfter || "",
      followUpRequired: d.followUpRequired || false,
      followUpDate: d.followUpDate?.toDate(),
      consultationNotes: d.consultationNotes || "",
      createdAt: d.createdAt?.toDate() || new Date(),
      updatedAt: d.updatedAt?.toDate() || new Date(),
    };
  },
};

// Doctor Invite converter
export const doctorInviteConverter = {
  toFirestore: (data: DoctorInviteDocument): DocumentData => {
    const firestoreData: DocumentData = {
      id: data.id,
      email: data.email,
      role: data.role,
      status: data.status,
      token: data.token,
      expiresAt: data.expiresAt,
      invitedBy: data.invitedBy,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };

    // Only include optional fields if they have values
    if (data.invitedByName) firestoreData.invitedByName = data.invitedByName;
    if (data.openedAt) firestoreData.openedAt = data.openedAt;
    if (data.completedAt) firestoreData.completedAt = data.completedAt;
    if (data.specialization) firestoreData.specialization = data.specialization;
    if (data.consultationTypes) firestoreData.consultationTypes = data.consultationTypes;
    if (data.createdUserId) firestoreData.createdUserId = data.createdUserId;
    if (data.errorReason) firestoreData.errorReason = data.errorReason;
    if (data.resendCount !== undefined) firestoreData.resendCount = data.resendCount;
    if (data.existingUser !== undefined) firestoreData.existingUser = data.existingUser;

    return firestoreData;
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot): DoctorInviteDocument => {
    const doc = snapshot;
    return {
      id: doc.id,
      email: doc.data().email,
      role: doc.data().role || "doctor",
      status: doc.data().status || "pending",
      token: doc.data().token,
      expiresAt: doc.data().expiresAt?.toDate() || new Date(),
      invitedBy: doc.data().invitedBy,
      invitedByName: doc.data().invitedByName,
      openedAt: doc.data().openedAt?.toDate(),
      completedAt: doc.data().completedAt?.toDate(),
      resendCount: doc.data().resendCount || 0,
      specialization: doc.data().specialization,
      consultationTypes: doc.data().consultationTypes,
      existingUser: doc.data().existingUser || false,
      createdUserId: doc.data().createdUserId,
      errorReason: doc.data().errorReason,
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    };
  },
};

// Support Ticket converter
export const supportTicketConverter = {
  toFirestore: (ticket: SupportTicketDocument): DocumentData => ({
    ...ticket,
    responses: ticket.responses.map((response) => ({
      ...response,
      createdAt: toTimestamp(response.createdAt),
    })),
    resolvedAt: ticket.resolvedAt ? toTimestamp(ticket.resolvedAt) : null,
    createdAt: toTimestamp(ticket.createdAt),
    updatedAt: toTimestamp(ticket.updatedAt),
  }),
  fromFirestore: (snapshot: QueryDocumentSnapshot): SupportTicketDocument => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      userId: data.userId,
      subject: data.subject,
      message: data.message || data.description,
      description: data.description,
      category: data.category,
      status: data.status,
      priority: data.priority,
      assignedTo: data.assignedTo,
      responses: data.responses || [],
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      resolvedAt: data.resolvedAt?.toDate(),
    };
  },
};

// Payment converter
export const paymentConverter = {
  toFirestore: (payment: PaymentDocument): DocumentData => ({
    ...payment,
    requestedTime: toTimestamp(payment.requestedTime),
    completedAt: payment.completedAt ? toTimestamp(payment.completedAt) : null,
    failedAt: payment.failedAt ? toTimestamp(payment.failedAt) : null,
    refundedAt: payment.refundedAt ? toTimestamp(payment.refundedAt) : null,
    refundStatus: payment.refundStatus ?? "none",
    refundId: payment.refundId ?? null,
    refundFailureReason: payment.refundFailureReason ?? null,
    createdAt: toTimestamp(payment.createdAt),
    updatedAt: toTimestamp(payment.updatedAt),
  }),
  fromFirestore: (snapshot: QueryDocumentSnapshot): PaymentDocument => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      userId: data.userId,
      doctorId: data.doctorId,
      serviceId: data.serviceId,
      amount: data.amount,
      currency: data.currency || "INR",
      status: data.status,
      razorpayOrderId: data.razorpayOrderId,
      razorpayPaymentId: data.razorpayPaymentId,
      razorpaySignature: data.razorpaySignature,
      bookingRequestId: data.bookingRequestId,
      requestedTime: fromTimestamp(data.requestedTime),
      notes: data.notes,
      method: data.method,
      createdAt: fromTimestamp(data.createdAt),
      updatedAt: fromTimestamp(data.updatedAt),
      completedAt: data.completedAt ? fromTimestamp(data.completedAt) : undefined,
      failedAt: data.failedAt ? fromTimestamp(data.failedAt) : undefined,
      failureReason: data.failureReason,
      refundedAt: data.refundedAt ? fromTimestamp(data.refundedAt) : undefined,
      refundReason: data.refundReason,
      refundStatus: data.refundStatus ?? "none",
      refundId: data.refundId ?? undefined,
      refundFailureReason: data.refundFailureReason ?? undefined,
      appointmentId: data.appointmentId,
      transactionId: data.transactionId,
    };
  },
};

// Doctor Availability converter (New Scheduling System)
export const doctorAvailabilityConverter = {
  toFirestore: (availability: DoctorAvailabilityDocument): DocumentData => ({
    ...availability,
    createdAt: toTimestamp(availability.createdAt),
    updatedAt: toTimestamp(availability.updatedAt),
  }),
  fromFirestore: (snapshot: QueryDocumentSnapshot): DoctorAvailabilityDocument => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      doctorId: data.doctorId,
      dayOfWeek: data.dayOfWeek,
      timeRanges: data.timeRanges || [],
      duration: data.duration || 30,
      isOff: data.isOff || false,
      createdAt: fromTimestamp(data.createdAt),
      updatedAt: fromTimestamp(data.updatedAt),
    };
  },
};

// Doctor Block converter (New Scheduling System)
export const doctorBlockConverter = {
  toFirestore: (block: DoctorBlockDocument): DocumentData => ({
    ...block,
    start: toTimestamp(block.start),
    end: toTimestamp(block.end),
    createdAt: toTimestamp(block.createdAt),
    updatedAt: toTimestamp(block.updatedAt),
  }),
  fromFirestore: (snapshot: QueryDocumentSnapshot): DoctorBlockDocument => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      doctorId: data.doctorId,
      start: fromTimestamp(data.start),
      end: fromTimestamp(data.end),
      reason: data.reason,
      repeatWeekly: data.repeatWeekly || false,
      createdAt: fromTimestamp(data.createdAt),
      updatedAt: fromTimestamp(data.updatedAt),
    };
  },
};

// Booking Request converter (New Scheduling System)
export const bookingRequestConverter = {
  toFirestore: (request: BookingRequestDocument): DocumentData => ({
    ...request,
    requestedTime: toTimestamp(request.requestedTime),
    proposedTime: request.proposedTime ? toTimestamp(request.proposedTime) : null,
    createdAt: toTimestamp(request.createdAt),
    updatedAt: toTimestamp(request.updatedAt),
  }),
  fromFirestore: (snapshot: QueryDocumentSnapshot): BookingRequestDocument => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      patientId: data.patientId,
      doctorId: data.doctorId,
      serviceId: data.serviceId,
      requestedTime: fromTimestamp(data.requestedTime),
      proposedTime: data.proposedTime ? fromTimestamp(data.proposedTime) : undefined,
      status: data.status,
      notes: data.notes,
      rejectionReason: data.rejectionReason,
      rescheduleReason: data.rescheduleReason,
      createdAt: fromTimestamp(data.createdAt),
      updatedAt: fromTimestamp(data.updatedAt),
      appointmentId: data.appointmentId,
    };
  },
};

// VisionAssessment converter
export const visionAssessmentConverter = {
  toFirestore: (doc: VisionAssessmentDocument): DocumentData => {
    const d: DocumentData = {
      id: doc.id,
      patientId: doc.patientId,
      assignedBy: doc.assignedBy,
      assignedRole: doc.assignedRole,
      overrideUsed: doc.overrideUsed,
      assessmentTypes: doc.assessmentTypes,
      status: doc.status,
      autoAssigned: doc.autoAssigned,
      createdAt: toTimestamp(doc.createdAt),
      updatedAt: toTimestamp(doc.updatedAt),
    };
    if (doc.doctorId)      d.doctorId      = doc.doctorId;
    if (doc.appointmentId) d.appointmentId = doc.appointmentId;
    if (doc.serviceId)     d.serviceId     = doc.serviceId;
    if (doc.expiresAt)          d.expiresAt          = toTimestamp(doc.expiresAt);
    if (doc.resultFar)          d.resultFar          = { ...doc.resultFar, completedAt: toTimestamp(doc.resultFar.completedAt) };
    if (doc.resultNear)         d.resultNear         = { ...doc.resultNear, completedAt: toTimestamp(doc.resultNear.completedAt) };
    if (doc.doctorRemarks)      d.doctorRemarks      = doc.doctorRemarks;
    if (doc.doctorCorrectedFar) d.doctorCorrectedFar = doc.doctorCorrectedFar;
    if (doc.doctorCorrectedNear) d.doctorCorrectedNear = doc.doctorCorrectedNear;
    if (doc.reviewedAt)         d.reviewedAt         = toTimestamp(doc.reviewedAt);
    return d;
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot): VisionAssessmentDocument => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      patientId: data.patientId,
      doctorId: data.doctorId,
      appointmentId: data.appointmentId,
      serviceId: data.serviceId,
      assignedBy: data.assignedBy,
      assignedRole: data.assignedRole,
      overrideUsed: data.overrideUsed ?? false,
      assessmentTypes: data.assessmentTypes ?? [],
      status: data.status,
      autoAssigned: data.autoAssigned ?? false,
      resultFar:  data.resultFar  ? { ...data.resultFar,  completedAt: fromTimestamp(data.resultFar.completedAt)  } : undefined,
      resultNear: data.resultNear ? { ...data.resultNear, completedAt: fromTimestamp(data.resultNear.completedAt) } : undefined,
      doctorRemarks:       data.doctorRemarks,
      doctorCorrectedFar:  data.doctorCorrectedFar,
      doctorCorrectedNear: data.doctorCorrectedNear,
      reviewedAt:  data.reviewedAt  ? fromTimestamp(data.reviewedAt)  : undefined,
      createdAt:   fromTimestamp(data.createdAt),
      updatedAt:   fromTimestamp(data.updatedAt),
      expiresAt:   data.expiresAt   ? fromTimestamp(data.expiresAt)   : undefined,
    };
  },
};
