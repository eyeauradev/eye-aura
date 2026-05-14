import { format, addMinutes, parseISO, isValid } from "date-fns";
import { toZonedTime } from "date-fns-tz";

/**
 * Timezone-safe date utilities for Eye Aura
 * All dates are stored in UTC in Firestore
 * All dates are rendered in user's local timezone
 */

export class TimezoneService {
  /**
   * Convert a UTC date to user's local timezone
   */
  static toLocalTime(utcDate: Date | string, userTimezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone): Date {
    const date = typeof utcDate === "string" ? parseISO(utcDate) : utcDate;
    if (!isValid(date)) return new Date();
    return toZonedTime(date, userTimezone);
  }

  /**
   * Convert a local date to UTC for storage
   */
  static toUTC(localDate: Date | string, userTimezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone): Date {
    const date = typeof localDate === "string" ? parseISO(localDate) : localDate;
    if (!isValid(date)) return new Date();
    // Convert to zoned time, then get the UTC date
    const zonedDate = toZonedTime(date, userTimezone);
    return new Date(zonedDate.getTime() - zonedDate.getTimezoneOffset() * 60000);
  }

  /**
   * Format a date for display in user's timezone
   */
  static formatDate(
    utcDate: Date | string,
    formatStr: string,
    userTimezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone
  ): string {
    const localDate = this.toLocalTime(utcDate, userTimezone);
    return format(localDate, formatStr);
  }

  /**
   * Check if a slot is in the past (in user's timezone)
   */
  static isSlotInPast(utcDate: Date | string, userTimezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone): boolean {
    const localDate = this.toLocalTime(utcDate, userTimezone);
    return localDate < new Date();
  }

  /**
   * Check if a slot is too soon (minimum hours before booking)
   */
  static isSlotTooSoon(
    utcDate: Date | string,
    minimumHours: number = 2,
    userTimezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone
  ): boolean {
    const localDate = this.toLocalTime(utcDate, userTimezone);
    const minimumTime = addMinutes(new Date(), minimumHours * 60);
    return localDate < minimumTime;
  }

  /**
   * Check if a slot is available for joining (within consultation window)
   */
  static isSlotJoinable(
    utcDate: Date | string,
    durationMinutes: number,
    userTimezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone
  ): boolean {
    const localDate = this.toLocalTime(utcDate, userTimezone);
    const now = new Date();
    const startTime = new Date(localDate.getTime());
    const endTime = addMinutes(localDate, durationMinutes);
    
    // Can join 15 minutes before start
    const joinWindowStart = addMinutes(startTime, -15);
    
    return now >= joinWindowStart && now <= endTime;
  }

  /**
   * Get user's timezone
   */
  static getUserTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  /**
   * Format date range for display
   */
  static formatDateRange(
    startDate: Date | string,
    endDate: Date | string,
    userTimezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone
  ): string {
    const localStart = this.toLocalTime(startDate, userTimezone);
    const localEnd = this.toLocalTime(endDate, userTimezone);
    
    return `${format(localStart, "MMM d, yyyy")} - ${format(localEnd, "MMM d, yyyy")}`;
  }

  /**
   * Format time range for display
   */
  static formatTimeRange(
    startDate: Date | string,
    endDate: Date | string,
    userTimezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone
  ): string {
    const localStart = this.toLocalTime(startDate, userTimezone);
    const localEnd = this.toLocalTime(endDate, userTimezone);
    
    return `${format(localStart, "h:mm a")} - ${format(localEnd, "h:mm a")}`;
  }

  /**
   * Get the start and end of a day in UTC for a given local date
   */
  static getDayRangeUTC(localDate: Date, userTimezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone): { start: Date; end: Date } {
    const zonedDate = toZonedTime(localDate, userTimezone);
    const startOfDay = new Date(zonedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(zonedDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    return {
      start: new Date(startOfDay.getTime() - startOfDay.getTimezoneOffset() * 60000),
      end: new Date(endOfDay.getTime() - endOfDay.getTimezoneOffset() * 60000),
    };
  }

  /**
   * Validate a date is not in the past
   */
  static validateFutureDate(utcDate: Date | string, userTimezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone): boolean {
    const localDate = this.toLocalTime(utcDate, userTimezone);
    return localDate > new Date();
  }

  /**
   * Get friendly relative time description
   */
  static getRelativeTime(utcDate: Date | string, userTimezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone): string {
    const localDate = this.toLocalTime(utcDate, userTimezone);
    const now = new Date();
    const diffMs = localDate.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 0) return "in the past";
    if (diffMins < 60) return `in ${diffMins} minute${diffMins !== 1 ? "s" : ""}`;
    if (diffHours < 24) return `in ${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
    if (diffDays < 7) return `in ${diffDays} day${diffDays !== 1 ? "s" : ""}`;
    
    return format(localDate, "MMM d, yyyy");
  }
}

export const timezoneService = TimezoneService;
