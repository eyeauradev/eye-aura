import {
  runTransaction,
  doc,
  getDoc,
  Transaction,
} from "firebase/firestore";
import { getFirebaseDb } from "@/services/firebase/client";
import { v4 as uuidv4 } from "uuid";
import type { AppointmentDocument, DoctorSlotDocument, RefundDecision, RefundAuditEntry } from "@/types/firestore";

export class TransactionService {
  private db = getFirebaseDb();

  /**
   * Atomically book a slot with transaction to prevent race conditions
   * This ensures the slot is still available when we book it
   */
  async bookSlotWithTransaction(
    slotId: string,
    patientId: string,
    doctorId: string,
    serviceId: string,
    notes?: string
  ): Promise<AppointmentDocument> {
    const slotRef = doc(this.db, "doctor_slots", slotId);
    const appointmentId = uuidv4();
    const appointmentRef = doc(this.db, "appointments", appointmentId);

    return runTransaction(this.db, async (transaction) => {
      const slotDoc = await transaction.get(slotRef);
      
      if (!slotDoc.exists()) {
        throw new Error("Slot not found");
      }

      const slot = slotDoc.data() as DoctorSlotDocument;

      // Validate slot is available
      if (!slot.isAvailable) {
        throw new Error("Slot is not available");
      }

      if (slot.isBlocked) {
        throw new Error("Slot is blocked");
      }

      if (slot.appointmentId) {
        throw new Error("Slot is already booked");
      }

      // Check if slot time is in the past
      if (new Date(slot.startTime) < new Date()) {
        throw new Error("Cannot book past slots");
      }

      // Create appointment
      const appointment: AppointmentDocument = {
        id: appointmentId,
        patientId,
        doctorId,
        serviceId,
        slotId,
        status: "pending",
        notes,
        createdAt: new Date(),
        updatedAt: new Date(),
        scheduledFor: slot.startTime,
      };

      // Update slot to mark as booked
      transaction.update(slotRef, {
        isAvailable: false,
        appointmentId: appointmentId,
        updatedAt: new Date(),
      });

      // Create appointment document
      transaction.set(appointmentRef, {
        ...appointment,
        createdAt: new Date(),
        updatedAt: new Date(),
        scheduledFor: slot.startTime.toISOString ? slot.startTime.toISOString() : slot.startTime,
      });

      return appointment;
    });
  }

  /**
   * Atomically cancel an appointment and release the slot
   */
  async cancelAppointmentWithTransaction(
    appointmentId: string,
    reason?: string
  ): Promise<void> {
    const appointmentRef = doc(this.db, "appointments", appointmentId);

    return runTransaction(this.db, async (transaction) => {
      const appointmentDoc = await transaction.get(appointmentRef);
      
      if (!appointmentDoc.exists()) {
        throw new Error("Appointment not found");
      }

      const appointment = appointmentDoc.data() as AppointmentDocument;

      if (appointment.status === "cancelled") {
        throw new Error("Appointment already cancelled");
      }

      if (appointment.status === "completed") {
        throw new Error("Cannot cancel completed appointments");
      }

      // Update appointment status
      transaction.update(appointmentRef, {
        status: "cancelled",
        cancelledAt: new Date(),
        cancellationReason: reason,
        updatedAt: new Date(),
      });

      // Release the slot if it exists
      if (appointment.slotId) {
        const slotRef = doc(this.db, "doctor_slots", appointment.slotId);
        const slotDoc = await transaction.get(slotRef);
        
        if (slotDoc.exists()) {
          const slot = slotDoc.data() as DoctorSlotDocument;
          
          // Only release if this appointment owns the slot
          if (slot.appointmentId === appointmentId) {
            transaction.update(slotRef, {
              isAvailable: true,
              appointmentId: null,
              updatedAt: new Date(),
            });
          }
        }
      }
    });
  }

  /**
   * Atomically reschedule an appointment to a new slot
   */
  async rescheduleAppointmentWithTransaction(
    appointmentId: string,
    newSlotId: string
  ): Promise<void> {
    const appointmentRef = doc(this.db, "appointments", appointmentId);
    const newSlotRef = doc(this.db, "doctor_slots", newSlotId);

    return runTransaction(this.db, async (transaction) => {
      const appointmentDoc = await transaction.get(appointmentRef);
      const newSlotDoc = await transaction.get(newSlotRef);
      
      if (!appointmentDoc.exists()) {
        throw new Error("Appointment not found");
      }

      if (!newSlotDoc.exists()) {
        throw new Error("New slot not found");
      }

      const appointment = appointmentDoc.data() as AppointmentDocument;
      const newSlot = newSlotDoc.data() as DoctorSlotDocument;

      // Validate appointment can be rescheduled
      if (appointment.status === "cancelled" || appointment.status === "completed") {
        throw new Error("Cannot reschedule cancelled or completed appointments");
      }

      // Validate new slot is available
      if (!newSlot.isAvailable || newSlot.isBlocked || newSlot.appointmentId) {
        throw new Error("New slot is not available");
      }

      // Release old slot if it exists
      if (appointment.slotId) {
        const oldSlotRef = doc(this.db, "doctor_slots", appointment.slotId);
        const oldSlotDoc = await transaction.get(oldSlotRef);
        
        if (oldSlotDoc.exists()) {
          const oldSlot = oldSlotDoc.data() as DoctorSlotDocument;
          
          if (oldSlot.appointmentId === appointmentId) {
            transaction.update(oldSlotRef, {
              isAvailable: true,
              appointmentId: null,
              updatedAt: new Date(),
            });
          }
        }
      }

      // Book new slot
      transaction.update(newSlotRef, {
        isAvailable: false,
        appointmentId: appointmentId,
        updatedAt: new Date(),
      });

      // Update appointment
      transaction.update(appointmentRef, {
        slotId: newSlotId,
        scheduledFor: newSlot.startTime,
        updatedAt: new Date(),
      });
    });
  }

  /**
   * Atomically set appointment to cancellation_requested.
   * Stores the reason, timestamp, and previous status for potential restoration.
   */
  async requestCancellationWithTransaction(
    appointmentId: string,
    reason: string
  ): Promise<void> {
    const appointmentRef = doc(this.db, "appointments", appointmentId);

    return runTransaction(this.db, async (transaction) => {
      const appointmentDoc = await transaction.get(appointmentRef);
      if (!appointmentDoc.exists()) throw new Error("Appointment not found");

      const appointment = appointmentDoc.data() as AppointmentDocument;

      if (appointment.status === "cancelled" || appointment.status === "completed") {
        throw new Error("Cannot request cancellation for this appointment");
      }
      if (appointment.status === "cancellation_requested") {
        throw new Error("Cancellation already requested");
      }

      transaction.update(appointmentRef, {
        status: "cancellation_requested",
        cancellationReason: reason,
        cancellationRequestedAt: new Date(),
        previousStatus: appointment.status,
        updatedAt: new Date(),
      });
    });
  }

  /**
   * Atomically reject a cancellation: restore previous status.
   * Records rejection metadata and reason.
   */
  async rejectCancellationWithTransaction(
    appointmentId: string,
    rejectedBy: { uid: string; role: "doctor" | "admin" },
    rejectionReason: string
  ): Promise<void> {
    const appointmentRef = doc(this.db, "appointments", appointmentId);

    return runTransaction(this.db, async (transaction) => {
      const appointmentDoc = await transaction.get(appointmentRef);
      if (!appointmentDoc.exists()) throw new Error("Appointment not found");

      const appointment = appointmentDoc.data() as AppointmentDocument;

      if (appointment.status !== "cancellation_requested") {
        throw new Error("Appointment is not in cancellation_requested state");
      }

      const previousStatus = appointment.previousStatus || "confirmed";

      transaction.update(appointmentRef, {
        status: previousStatus,
        cancellationRejectedBy: rejectedBy.uid,
        cancellationRejectedByRole: rejectedBy.role,
        cancellationRejectedAt: new Date(),
        cancellationRejectionReason: rejectionReason,
        updatedAt: new Date(),
      });
    });
  }

  /**
   * Atomically approve a cancellation: set status to cancelled, release slot.
   * Returns the paymentId (if any) so the caller can trigger refund.
   */
  async approveCancellationWithTransaction(
    appointmentId: string,
    approvedBy: { uid: string; role: "doctor" | "admin" },
    refundDecision: RefundDecision
  ): Promise<{ paymentId?: string; bookingRequestId?: string }> {
    const appointmentRef = doc(this.db, "appointments", appointmentId);

    return runTransaction(this.db, async (transaction) => {
      const appointmentDoc = await transaction.get(appointmentRef);
      if (!appointmentDoc.exists()) throw new Error("Appointment not found");

      const appointment = appointmentDoc.data() as AppointmentDocument;

      if (appointment.status !== "cancellation_requested") {
        throw new Error("Appointment is not in cancellation_requested state");
      }

      // Build the refund audit entry
      const auditEntry: RefundAuditEntry = {
        action: "decision_at_approval",
        decision: refundDecision.decision,
        actorId: refundDecision.decidedBy,
        actorRole: refundDecision.decidedByRole,
        timestamp: refundDecision.decidedAt,
      };

      // Update appointment to cancelled with refund decision fields
      transaction.update(appointmentRef, {
        status: "cancelled",
        cancelledAt: new Date(),
        cancellationApprovedBy: approvedBy.uid,
        cancellationApprovedByRole: approvedBy.role,
        cancellationApprovedAt: new Date(),
        refundDecision: refundDecision.decision,
        refundDecisionBy: refundDecision.decidedBy,
        refundDecisionByRole: refundDecision.decidedByRole,
        refundDecisionAt: refundDecision.decidedAt,
        refundAuditTrail: [auditEntry],
        updatedAt: new Date(),
      });

      // Release the slot
      if (appointment.slotId) {
        const slotRef = doc(this.db, "doctor_slots", appointment.slotId);
        const slotDoc = await transaction.get(slotRef);
        if (slotDoc.exists()) {
          const slot = slotDoc.data() as DoctorSlotDocument;
          if (slot.appointmentId === appointmentId) {
            transaction.update(slotRef, {
              isAvailable: true,
              appointmentId: null,
              updatedAt: new Date(),
            });
          }
        }
      }

      return {
        paymentId: appointment.paymentId,
        bookingRequestId: appointment.bookingRequestId,
      };
    });
  }

  /**
   * Validate slot availability with transaction
   */
  async validateSlotAvailability(slotId: string): Promise<boolean> {
    const slotRef = doc(this.db, "doctor_slots", slotId);

    return runTransaction(this.db, async (transaction) => {
      const slotDoc = await transaction.get(slotRef);
      
      if (!slotDoc.exists()) {
        return false;
      }

      const slot = slotDoc.data() as DoctorSlotDocument;

      return slot.isAvailable && !slot.isBlocked && !slot.appointmentId;
    });
  }

  /**
   * Reserve a slot temporarily (for booking flow)
   * This marks a slot as reserved with a timeout
   */
  async reserveSlot(
    slotId: string,
    reservationId: string,
    timeoutMinutes: number = 15
  ): Promise<void> {
    const slotRef = doc(this.db, "doctor_slots", slotId);
    const expiresAt = new Date(Date.now() + timeoutMinutes * 60000);

    await runTransaction(this.db, async (transaction) => {
      const slotDoc = await transaction.get(slotRef);
      
      if (!slotDoc.exists()) {
        throw new Error("Slot not found");
      }

      const slot = slotDoc.data() as DoctorSlotDocument;

      if (!slot.isAvailable || slot.isBlocked || slot.appointmentId) {
        throw new Error("Slot is not available for reservation");
      }

      transaction.update(slotRef, {
        isAvailable: false,
        isBlocked: true,
        blockReason: `reservation:${reservationId}`,
        updatedAt: new Date(),
      });
    });
  }

  /**
   * Release a reserved slot
   */
  async releaseReservedSlot(
    slotId: string,
    reservationId: string
  ): Promise<void> {
    const slotRef = doc(this.db, "doctor_slots", slotId);

    await runTransaction(this.db, async (transaction) => {
      const slotDoc = await transaction.get(slotRef);
      
      if (!slotDoc.exists()) {
        throw new Error("Slot not found");
      }

      const slot = slotDoc.data() as DoctorSlotDocument;

      // Only release if it's the correct reservation
      if (slot.blockReason === `reservation:${reservationId}`) {
        transaction.update(slotRef, {
          isAvailable: true,
          isBlocked: false,
          blockReason: null,
          updatedAt: new Date(),
        });
      }
    });
  }
}

export const transactionService = new TransactionService();
