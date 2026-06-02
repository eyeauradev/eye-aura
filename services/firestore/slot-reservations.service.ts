import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  QueryConstraint,
} from "firebase/firestore";
import { getFirebaseDb } from "@/services/firebase/client";
import { doctorBlocksService } from "./doctor-blocks.service";
import { doctorAvailabilityService } from "./doctor-availability.service";
import type { SlotReservation, SlotReservationStatus } from "@/types/recommendations";
import type { DayOfWeek } from "@/types/firestore";

const COLLECTION_NAME = "slot_reservations";

export class SlotReservationService {
  private db = getFirebaseDb();
  private collection = collection(this.db, COLLECTION_NAME);

  async getById(id: string): Promise<SlotReservation | null> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    return {
      id: docSnap.id,
      doctorId: data.doctorId,
      recommendationId: data.recommendationId,
      start: data.start instanceof Date ? data.start : data.start.toDate(),
      end: data.end instanceof Date ? data.end : data.end.toDate(),
      status: data.status,
      createdAt: data.createdAt instanceof Date ? data.createdAt : data.createdAt.toDate(),
      releasedAt: data.releasedAt
        ? data.releasedAt instanceof Date
          ? data.releasedAt
          : data.releasedAt.toDate()
        : undefined,
      convertedAt: data.convertedAt
        ? data.convertedAt instanceof Date
          ? data.convertedAt
          : data.convertedAt.toDate()
        : undefined,
    } as SlotReservation;
  }

  private async queryReservations(constraints: QueryConstraint[]): Promise<SlotReservation[]> {
    const q = query(this.collection, ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        doctorId: data.doctorId,
        recommendationId: data.recommendationId,
        start: data.start instanceof Date ? data.start : data.start.toDate(),
        end: data.end instanceof Date ? data.end : data.end.toDate(),
        status: data.status,
        createdAt: data.createdAt instanceof Date ? data.createdAt : data.createdAt.toDate(),
        releasedAt: data.releasedAt
          ? data.releasedAt instanceof Date
            ? data.releasedAt
            : data.releasedAt.toDate()
          : undefined,
        convertedAt: data.convertedAt
          ? data.convertedAt instanceof Date
            ? data.convertedAt
            : data.convertedAt.toDate()
          : undefined,
      } as SlotReservation;
    });
  }

  /**
   * Check slot availability against soft reservations, hard blocks, and doctor schedule.
   * Returns true only if NO conflicts exist and the time falls within the doctor's schedule.
   */
  async checkAvailability(doctorId: string, start: Date, end: Date): Promise<boolean> {
    // Step 1: Check hard blocks (doctor_blocks)
    const hasBlock = await doctorBlocksService.hasBlockAtTime(doctorId, start, end);
    if (hasBlock) return false;

    // Step 2: Check active soft reservations for overlaps
    const activeReservations = await this.getByDoctorId(doctorId, start, end);
    const hasOverlap = activeReservations.some(
      (r) => r.start < end && r.end > start && r.status === "active"
    );
    if (hasOverlap) return false;

    // Step 3: Verify doctor has availability for this day/time
    const dayOfWeek = this.getDayOfWeek(start);
    const availability = await doctorAvailabilityService.getByDoctorIdAndDay(doctorId, dayOfWeek);
    if (!availability || availability.isOff) return false;

    // Step 4: Check time falls within doctor's defined time ranges
    const startTime = this.formatTime(start);
    const endTime = this.formatTime(end);
    const inRange = availability.timeRanges.some(
      (range) => startTime >= range.startTime && endTime <= range.endTime
    );

    return inRange;
  }

  /**
   * Create a soft reservation for a time slot.
   * Returns the reservation ID.
   */
  async softReserve(
    doctorId: string,
    start: Date,
    end: Date,
    recommendationId: string
  ): Promise<string> {
    const id = `res_${doctorId}_${Date.now()}`;
    const docRef = doc(this.db, COLLECTION_NAME, id);
    const reservation: SlotReservation = {
      id,
      doctorId,
      recommendationId,
      start,
      end,
      status: "active",
      createdAt: new Date(),
    };
    await setDoc(docRef, reservation);
    return id;
  }

  /**
   * Release a soft reservation (set status to "released").
   * Only transitions from "active" status.
   */
  async release(reservationId: string): Promise<void> {
    const reservation = await this.getById(reservationId);
    if (!reservation) throw new Error("Reservation not found");
    if (reservation.status !== "active") {
      throw new Error(`Cannot release reservation with status "${reservation.status}". Only active reservations can be released.`);
    }

    const docRef = doc(this.db, COLLECTION_NAME, reservationId);
    await updateDoc(docRef, {
      status: "released" as SlotReservationStatus,
      releasedAt: new Date(),
    });
  }

  /**
   * Convert a soft reservation to a hard block.
   * Sets status to "converted", creates a doctor_blocks entry for the same time range.
   * Only transitions from "active" status.
   */
  async convertToHardBlock(reservationId: string, reason: string): Promise<void> {
    const reservation = await this.getById(reservationId);
    if (!reservation) throw new Error("Reservation not found");
    if (reservation.status !== "active") {
      throw new Error(`Cannot convert reservation with status "${reservation.status}". Only active reservations can be converted.`);
    }

    // Update reservation status
    const docRef = doc(this.db, COLLECTION_NAME, reservationId);
    await updateDoc(docRef, {
      status: "converted" as SlotReservationStatus,
      convertedAt: new Date(),
    });

    // Create corresponding hard block in doctor_blocks
    await doctorBlocksService.create({
      doctorId: reservation.doctorId,
      start: reservation.start,
      end: reservation.end,
      reason,
    });
  }

  /**
   * Get all active reservations for a doctor within a time range.
   */
  async getByDoctorId(doctorId: string, start: Date, end: Date): Promise<SlotReservation[]> {
    return this.queryReservations([
      where("doctorId", "==", doctorId),
      where("status", "==", "active"),
      where("start", "<=", end),
      orderBy("start", "asc"),
    ]).then((reservations) =>
      // Additional client-side filter for overlap (Firestore can't do end >= start in same query)
      reservations.filter((r) => r.end > start)
    );
  }

  /**
   * Link a recommendation ID to a reservation.
   */
  async linkRecommendation(reservationId: string, recommendationId: string): Promise<void> {
    const docRef = doc(this.db, COLLECTION_NAME, reservationId);
    await updateDoc(docRef, { recommendationId });
  }

  /**
   * Get the day of week string from a Date.
   */
  private getDayOfWeek(date: Date): DayOfWeek {
    const days: DayOfWeek[] = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    return days[date.getDay()];
  }

  /**
   * Format a Date's time component as "HH:mm".
   */
  private formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }
}

export const slotReservationService = new SlotReservationService();
