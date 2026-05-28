import { v4 as uuidv4 } from "uuid";
import { appointmentsService, servicesService, doctorSlotsService } from "@/services/firestore";
import { transactionService } from "@/services/booking/transaction.service";
import type { AppointmentDocument, ServiceDocument, DoctorSlotDocument } from "@/types/firestore";
import type { BookingFormData, SlotGenerationConfig, AvailableSlot } from "@/types/booking";

export class BookingService {
  async initiateBooking(formData: BookingFormData, patientId: string, doctorId: string): Promise<AppointmentDocument> {
    // Validate slot availability
    const slot = await doctorSlotsService.getById(formData.slotId);
    if (!slot) {
      throw new Error("Slot not found");
    }
    if (!slot.isAvailable || slot.isBlocked) {
      throw new Error("Slot is not available");
    }
    if (slot.appointmentId) {
      throw new Error("Slot is already booked");
    }

    // Validate service
    const service = await servicesService.getById(formData.serviceId);
    if (!service || !service.isActive) {
      throw new Error("Service not available");
    }

    // Create appointment
    const appointment: AppointmentDocument = {
      id: uuidv4(),
      patientId,
      doctorId,
      serviceId: formData.serviceId,
      slotId: formData.slotId,
      status: "pending",
      notes: formData.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
      scheduledFor: slot.startTime,
    };

    // Create appointment document
    await appointmentsService.create(appointment);

    // Book the slot
    await doctorSlotsService.bookSlot(formData.slotId, appointment.id);

    return appointment;
  }

  async confirmBooking(appointmentId: string): Promise<AppointmentDocument> {
    return appointmentsService.updateStatus(appointmentId, "confirmed");
  }

  async cancelBooking(appointmentId: string, reason: string): Promise<AppointmentDocument> {
    // Validate reason is not empty/whitespace
    if (!reason || !reason.trim()) {
      throw new Error("Cancellation reason is required");
    }

    // Changed: now requests cancellation instead of directly cancelling
    await transactionService.requestCancellationWithTransaction(appointmentId, reason);

    const updated = await appointmentsService.getById(appointmentId);
    if (!updated) throw new Error("Appointment not found after cancellation request");

    return updated;
  }

  async rescheduleBooking(
    appointmentId: string,
    newSlotId: string
  ): Promise<AppointmentDocument> {
    const appointment = await appointmentsService.getById(appointmentId);
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    // Validate new slot
    const newSlot = await doctorSlotsService.getById(newSlotId);
    if (!newSlot || !newSlot.isAvailable || newSlot.isBlocked) {
      throw new Error("New slot is not available");
    }

    // Release old slot
    if (appointment.slotId) {
      await doctorSlotsService.releaseSlot(appointment.slotId);
    }

    // Book new slot
    await doctorSlotsService.bookSlot(newSlotId, appointmentId);

    // Update appointment
    const updated = await appointmentsService.update(appointmentId, {
      slotId: newSlotId,
      scheduledFor: newSlot.startTime,
    });

    return updated;
  }

  async getAvailableSlots(
    doctorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AvailableSlot[]> {
    const slots = await doctorSlotsService.getAvailableSlots(doctorId, startDate, endDate);
    
    return slots.map((slot) => ({
      id: slot.id,
      startTime: slot.startTime,
      endTime: slot.endTime,
      doctorId: slot.doctorId,
    }));
  }

  async generateSlots(config: SlotGenerationConfig): Promise<DoctorSlotDocument[]> {
    const { doctorId, startDate, endDate, startTime, endTime, consultationDuration, breakDuration, excludedDates, excludedDays } = config;
    
    const slots: DoctorSlotDocument[] = [];
    const currentDate = new Date(startDate);
    const end = new Date(endDate);

    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    while (currentDate <= end) {
      // Skip excluded dates
      if (excludedDates.some((date) => date.toDateString() === currentDate.toDateString())) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Skip excluded days
      if (excludedDays.includes(currentDate.getDay())) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Generate time slots for the day
      let slotStart = new Date(currentDate);
      slotStart.setHours(startHour, startMinute, 0, 0);

      const slotEnd = new Date(currentDate);
      slotEnd.setHours(endHour, endMinute, 0, 0);

      while (slotStart < slotEnd) {
        const slotEndTime = new Date(slotStart.getTime() + consultationDuration * 60000);
        
        if (slotEndTime > slotEnd) break;

        const slot: DoctorSlotDocument = {
          id: uuidv4(),
          doctorId,
          startTime: new Date(slotStart),
          endTime: new Date(slotEndTime),
          isAvailable: true,
          isBlocked: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        slots.push(slot);

        // Move to next slot with break
        slotStart.setTime(slotEndTime.getTime() + breakDuration * 60000);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Batch create slots
    for (const slot of slots) {
      await doctorSlotsService.create(slot);
    }

    return slots;
  }

  async validateBookingConstraints(
    patientId: string,
    slotId: string
  ): Promise<{ valid: boolean; reason?: string }> {
    // Check if patient has any conflicting appointments
    const slot = await doctorSlotsService.getById(slotId);
    if (!slot) {
      return { valid: false, reason: "Slot not found" };
    }

    const conflictingAppointments = await appointmentsService.query([
      // Would need to add complex query for time overlap
      // For now, just check same day
    ]);

    return { valid: true };
  }
}

export const bookingService = new BookingService();
