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
  toFirestore: (user: UserDocument): DocumentData => ({
    ...user,
    createdAt: toTimestamp(user.createdAt),
    updatedAt: toTimestamp(user.updatedAt),
  }),
  fromFirestore: (snapshot: QueryDocumentSnapshot): UserDocument => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      email: data.email,
      displayName: data.displayName,
      photoURL: data.photoURL,
      role: data.role,
      phoneNumber: data.phoneNumber,
      onboardingCompleted: data.onboardingCompleted,
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
    const doc = snapshot;
    return {
      id: doc.id,
      appointmentId: doc.data().appointmentId,
      patientId: doc.data().patientId,
      doctorId: doc.data().doctorId,
      rightEye: doc.data().rightEye,
      leftEye: doc.data().leftEye,
      pd: doc.data().pd || "",
      findings: doc.data().findings,
      diagnosis: doc.data().diagnosis,
      medications: doc.data().medications,
      eyeDrops: doc.data().eyeDrops,
      recommendations: doc.data().recommendations,
      exercises: doc.data().exercises,
      followUpRequired: doc.data().followUpRequired,
      followUpDate: doc.data().followUpDate?.toDate(),
      consultationNotes: doc.data().consultationNotes,
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    };
  },
};

// Doctor Invite converter
export const doctorInviteConverter = {
  toFirestore: (invite: DoctorInviteDocument): DocumentData => ({
    ...invite,
    expiresAt: toTimestamp(invite.expiresAt),
    createdAt: toTimestamp(invite.createdAt),
    updatedAt: toTimestamp(invite.updatedAt),
  }),
  fromFirestore: (snapshot: QueryDocumentSnapshot): DoctorInviteDocument => {
    const doc = snapshot;
    return {
      id: doc.id,
      email: doc.data().email,
      token: doc.data().token,
      expiresAt: doc.data().expiresAt?.toDate() || new Date(),
      invitedBy: doc.data().invitedBy,
      used: doc.data().used,
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
  toFirestore: (payment: any): DocumentData => ({
    ...payment,
    completedAt: payment.completedAt ? toTimestamp(payment.completedAt) : null,
    refundedAt: payment.refundedAt ? toTimestamp(payment.refundedAt) : null,
    createdAt: toTimestamp(payment.createdAt),
    updatedAt: toTimestamp(payment.updatedAt),
  }),
  fromFirestore: (snapshot: QueryDocumentSnapshot): any => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      ...data,
      completedAt: data.completedAt?.toDate(),
      refundedAt: data.refundedAt?.toDate(),
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
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
