import type { DoctorAvailabilityDocument, DoctorBlockDocument, AppointmentDocument } from "@/types/firestore";

export interface GeneratedSlot {
  start: Date;
  end: Date;
  duration: number;
}

export class SlotGenerator {
  /**
   * Generate available time slots for a doctor based on their weekly availability,
   * blocked time ranges, and existing appointments.
   */
  static generateAvailableSlots(params: {
    availability: DoctorAvailabilityDocument[];
    blocks: DoctorBlockDocument[];
    appointments: AppointmentDocument[];
    startDate: Date;
    endDate: Date;
    maxSlots?: number;
  }): GeneratedSlot[] {
    const { availability, blocks, appointments, startDate, endDate, maxSlots = 50 } = params;
    const slots: GeneratedSlot[] = [];

    const dayMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    let currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);
    
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);

    while (currentDate <= endDateTime && slots.length < maxSlots) {
      const dayOfWeek = currentDate.getDay();
      const dayName = Object.keys(dayMap).find(key => dayMap[key] === dayOfWeek);
      
      if (!dayName) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Get availability for this day
      const dayAvailability = availability.find(a => a.dayOfWeek === dayName && !a.isOff);
      
      if (dayAvailability) {
        // Generate slots for each time range
        for (const timeRange of dayAvailability.timeRanges) {
          const [startHours, startMinutes] = timeRange.startTime.split(":").map(Number);
          const [endHours, endMinutes] = timeRange.endTime.split(":").map(Number);

          const rangeStart = new Date(currentDate);
          rangeStart.setHours(startHours, startMinutes, 0, 0);

          const rangeEnd = new Date(currentDate);
          rangeEnd.setHours(endHours, endMinutes, 0, 0);

          // Generate slots within this range
          const daySlots = this.generateSlotsInRange({
            rangeStart,
            rangeEnd,
            duration: dayAvailability.duration,
            blocks: blocks.filter(b => {
              const blockStart = new Date(b.start);
              const blockEnd = new Date(b.end);
              return blockStart.toDateString() === currentDate.toDateString();
            }),
            appointments: appointments.filter(a => {
              const appointmentDate = new Date(a.scheduledFor);
              return appointmentDate.toDateString() === currentDate.toDateString();
            }),
            now: new Date(),
          });

          slots.push(...daySlots);
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Sort by start time and limit
    return slots
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, maxSlots);
  }

  /**
   * Generate slots within a specific time range, excluding blocked times and appointments.
   */
  private static generateSlotsInRange(params: {
    rangeStart: Date;
    rangeEnd: Date;
    duration: number;
    blocks: DoctorBlockDocument[];
    appointments: AppointmentDocument[];
    now: Date;
  }): GeneratedSlot[] {
    const { rangeStart, rangeEnd, duration, blocks, appointments, now } = params;
    const slots: GeneratedSlot[] = [];

    // Create a list of unavailable time ranges (blocks + appointments)
    const unavailableRanges: { start: Date; end: Date }[] = [];

    // Add blocks
    blocks.forEach(block => {
      unavailableRanges.push({
        start: new Date(block.start),
        end: new Date(block.end),
      });
    });

    // Add appointments
    appointments.forEach(appointment => {
      const appointmentStart = new Date(appointment.scheduledFor);
      const appointmentEnd = new Date(appointmentStart.getTime() + 30 * 60000); // Assume 30 min duration
      unavailableRanges.push({
        start: appointmentStart,
        end: appointmentEnd,
      });
    });

    // Sort unavailable ranges by start time
    unavailableRanges.sort((a, b) => a.start.getTime() - b.start.getTime());

    // Generate slots, skipping unavailable ranges
    let currentSlotStart = new Date(rangeStart);
    const slotDurationMs = duration * 60000;

    while (currentSlotStart.getTime() + slotDurationMs <= rangeEnd.getTime()) {
      // Check if this slot is in the future
      if (currentSlotStart <= now) {
        currentSlotStart = new Date(currentSlotStart.getTime() + slotDurationMs);
        continue;
      }

      const currentSlotEnd = new Date(currentSlotStart.getTime() + slotDurationMs);

      // Check if this slot overlaps with any unavailable range
      const hasOverlap = unavailableRanges.some(range => {
        return (
          (currentSlotStart < range.end && currentSlotEnd > range.start)
        );
      });

      if (!hasOverlap) {
        slots.push({
          start: new Date(currentSlotStart),
          end: new Date(currentSlotEnd),
          duration,
        });
      }

      currentSlotStart = new Date(currentSlotStart.getTime() + slotDurationMs);
    }

    return slots;
  }

  /**
   * Check if a specific time slot is available.
   */
  static isSlotAvailable(params: {
    start: Date;
    end: Date;
    blocks: DoctorBlockDocument[];
    appointments: AppointmentDocument[];
  }): boolean {
    const { start, end, blocks, appointments } = params;

    // Check blocks
    const hasBlock = blocks.some(block => {
      const blockStart = new Date(block.start);
      const blockEnd = new Date(block.end);
      return start < blockEnd && end > blockStart;
    });

    if (hasBlock) return false;

    // Check appointments
    const hasAppointment = appointments.some(appointment => {
      const appointmentStart = new Date(appointment.scheduledFor);
      const appointmentEnd = new Date(appointmentStart.getTime() + 30 * 60000);
      return start < appointmentEnd && end > appointmentStart;
    });

    if (hasAppointment) return false;

    return true;
  }
}
