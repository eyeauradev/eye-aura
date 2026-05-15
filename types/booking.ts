import type { ServiceDocument, DoctorSlotDocument, UserDocument } from "./firestore";

export interface BookingFormData {
  serviceId: string;
  slotId: string;
  notes?: string;
}

export interface BookingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export interface BookingState {
  currentStep: number;
  service: ServiceDocument | null;
  doctor: UserDocument | null;
  slot: DoctorSlotDocument | null;
  notes: string;
  loading: boolean;
  error: string | null;
}

export interface SlotGenerationConfig {
  doctorId: string;
  startDate: Date;
  endDate: Date;
  startTime: string; // "09:00"
  endTime: string; // "17:00"
  consultationDuration: number; // in minutes
  breakDuration: number; // in minutes
  excludedDates: Date[];
  excludedDays: number[]; // 0 = Sunday, 6 = Saturday
}

export interface AvailableSlot {
  id: string;
  startTime: Date;
  endTime: Date;
  doctorId: string;
  doctorName?: string;
}

export interface TimeSlot {
  hour: number;
  minute: number;
  label: string;
}

export interface DateSlot {
  date: Date;
  day: number;
  month: number;
  year: number;
  isAvailable: boolean;
  availableSlots: TimeSlot[];
}
