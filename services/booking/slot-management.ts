import { addDays, startOfDay, endOfDay, isSameDay, format } from "date-fns";
import type { SlotGenerationConfig, DateSlot, TimeSlot } from "@/types/booking";

export class SlotManagementService {
  generateTimeSlots(
    startTime: string,
    endTime: string,
    duration: number,
    breakDuration: number
  ): TimeSlot[] {
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    const slots: TimeSlot[] = [];
    let currentMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    while (currentMinutes + duration <= endMinutes) {
      const hour = Math.floor(currentMinutes / 60);
      const minute = currentMinutes % 60;
      const label = format(new Date().setHours(hour, minute), "h:mm a");

      slots.push({ hour, minute, label });
      currentMinutes += duration + breakDuration;
    }

    return slots;
  }

  generateDateSlots(
    startDate: Date,
    endDate: Date,
    excludedDays: number[],
    excludedDates: Date[]
  ): DateSlot[] {
    const slots: DateSlot[] = [];
    const current = startOfDay(startDate);
    const end = endOfDay(endDate);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      const isExcludedDay = excludedDays.includes(dayOfWeek);
      const isExcludedDate = excludedDates.some((date) => isSameDay(date, current));

      if (!isExcludedDay && !isExcludedDate) {
        slots.push({
          date: new Date(current),
          day: current.getDate(),
          month: current.getMonth(),
          year: current.getFullYear(),
          isAvailable: true,
          availableSlots: [],
        });
      }

      current.setDate(current.getDate() + 1);
    }

    return slots;
  }

  validateSlotConfig(config: SlotGenerationConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.doctorId) {
      errors.push("Doctor ID is required");
    }

    if (config.startDate >= config.endDate) {
      errors.push("Start date must be before end date");
    }

    if (config.consultationDuration < 15) {
      errors.push("Consultation duration must be at least 15 minutes");
    }

    if (config.consultationDuration > 120) {
      errors.push("Consultation duration must not exceed 120 minutes");
    }

    if (config.breakDuration < 0) {
      errors.push("Break duration cannot be negative");
    }

    const [startHour, startMinute] = config.startTime.split(":").map(Number);
    const [endHour, endMinute] = config.endTime.split(":").map(Number);
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;

    if (startTotalMinutes >= endTotalMinutes) {
      errors.push("Start time must be before end time");
    }

    const totalWorkMinutes = endTotalMinutes - startTotalMinutes;
    if (totalWorkMinutes < config.consultationDuration) {
      errors.push("Work hours must accommodate at least one consultation");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  calculateRecurringSlots(
    config: SlotGenerationConfig,
    weeks: number = 4
  ): number {
    const { startDate, startTime, endTime, consultationDuration, breakDuration, excludedDays } = config;
    const endDate = addDays(startDate, weeks * 7);
    
    const dateSlots = this.generateDateSlots(startDate, endDate, excludedDays, []);
    const timeSlots = this.generateTimeSlots(startTime, endTime, consultationDuration, breakDuration);
    
    return dateSlots.length * timeSlots.length;
  }

  formatSlotRange(startTime: Date, endTime: Date): string {
    const start = format(startTime, "h:mm a");
    const end = format(endTime, "h:mm a");
    return `${start} - ${end}`;
  }

  isSlotInPast(slotTime: Date): boolean {
    return slotTime < new Date();
  }

  isSlotTooSoon(slotTime: Date, minimumHours: number = 2): boolean {
    const now = new Date();
    const minimumTime = new Date(now.getTime() + minimumHours * 60 * 60 * 1000);
    return slotTime < minimumTime;
  }

  groupSlotsByDate(slots: any[]): Map<string, any[]> {
    const grouped = new Map<string, any[]>();
    
    slots.forEach((slot) => {
      const dateKey = format(slot.startTime, "yyyy-MM-dd");
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(slot);
    });
    
    return grouped;
  }
}

export const slotManagementService = new SlotManagementService();
