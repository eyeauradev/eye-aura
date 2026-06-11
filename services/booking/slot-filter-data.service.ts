import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/services/firebase/client";
import type {
  BookingRequestDocument,
  AppointmentDocument,
  DoctorBlockDocument,
} from "@/types/firestore";
import { buildOccupiedRanges, type OccupiedRange } from "./slot-filter.service";

export class SlotFilterDataFetcher {
  private db = getFirebaseDb();

  /**
   * Fetch all occupied ranges for a doctor on a given date.
   * Queries booking_requests (pending/accepted), appointments (confirmed/pending),
   * and doctor_blocks that overlap with the day.
   */
  async getOccupiedRanges(doctorId: string, date: Date): Promise<OccupiedRange[]> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const [bookingRequests, appointments, doctorBlocks] = await Promise.all([
      this.fetchBookingRequests(doctorId, dayStart, dayEnd),
      this.fetchAppointments(doctorId, dayStart, dayEnd),
      this.fetchDoctorBlocks(doctorId, dayStart, dayEnd),
    ]);

    return buildOccupiedRanges(bookingRequests, appointments, doctorBlocks);
  }

  private async fetchBookingRequests(
    doctorId: string,
    dayStart: Date,
    dayEnd: Date
  ): Promise<BookingRequestDocument[]> {
    const q = query(
      collection(this.db, "booking_requests"),
      where("doctorId", "==", doctorId),
      where("status", "in", ["pending", "accepted"]),
      where("requestedTime", ">=", Timestamp.fromDate(dayStart)),
      where("requestedTime", "<=", Timestamp.fromDate(dayEnd))
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as BookingRequestDocument);
  }

  private async fetchAppointments(
    doctorId: string,
    dayStart: Date,
    dayEnd: Date
  ): Promise<AppointmentDocument[]> {
    const q = query(
      collection(this.db, "appointments"),
      where("doctorId", "==", doctorId),
      where("status", "in", ["confirmed", "pending"]),
      where("scheduledFor", ">=", Timestamp.fromDate(dayStart)),
      where("scheduledFor", "<=", Timestamp.fromDate(dayEnd))
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as AppointmentDocument);
  }

  private async fetchDoctorBlocks(
    doctorId: string,
    dayStart: Date,
    dayEnd: Date
  ): Promise<DoctorBlockDocument[]> {
    const q = query(
      collection(this.db, "doctor_blocks"),
      where("doctorId", "==", doctorId),
      where("start", "<=", Timestamp.fromDate(dayEnd)),
      where("end", ">=", Timestamp.fromDate(dayStart))
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as DoctorBlockDocument);
  }
}

export const slotFilterDataFetcher = new SlotFilterDataFetcher();
