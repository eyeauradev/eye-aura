import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  QueryConstraint,
} from "firebase/firestore";
import { getFirebaseDb } from "@/services/firebase/client";
import type { DoctorAvailabilityDocument, DayOfWeek } from "@/types/firestore";

const COLLECTION_NAME = "doctor_availability";

export class DoctorAvailabilityService {
  private db = getFirebaseDb();
  private collection = collection(this.db, COLLECTION_NAME);

  async getById(id: string): Promise<DoctorAvailabilityDocument | null> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as DoctorAvailabilityDocument : null;
  }

  async create(availability: Omit<DoctorAvailabilityDocument, "id" | "createdAt" | "updatedAt">): Promise<DoctorAvailabilityDocument> {
    const id = `${availability.doctorId}_${availability.dayOfWeek}`;
    const docRef = doc(this.db, COLLECTION_NAME, id);
    const newAvailability: DoctorAvailabilityDocument = {
      ...availability,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await setDoc(docRef, newAvailability);
    return newAvailability;
  }

  async update(id: string, updates: Partial<DoctorAvailabilityDocument>): Promise<DoctorAvailabilityDocument> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date(),
    });
    const updated = await this.getById(id);
    if (!updated) throw new Error("Availability not found after update");
    return updated;
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }

  async query(constraints: QueryConstraint[]): Promise<DoctorAvailabilityDocument[]> {
    const q = query(this.collection, ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as DoctorAvailabilityDocument);
  }

  async getByDoctorId(doctorId: string): Promise<DoctorAvailabilityDocument[]> {
    return this.query([where("doctorId", "==", doctorId)]);
  }

  async getByDoctorIdAndDay(doctorId: string, dayOfWeek: DayOfWeek): Promise<DoctorAvailabilityDocument | null> {
    const results = await this.query([
      where("doctorId", "==", doctorId),
      where("dayOfWeek", "==", dayOfWeek),
    ]);
    return results[0] || null;
  }

  async upsertAvailability(
    doctorId: string,
    dayOfWeek: DayOfWeek,
    timeRanges: { startTime: string; endTime: string }[],
    duration: number,
    isOff: boolean
  ): Promise<DoctorAvailabilityDocument> {
    const existing = await this.getByDoctorIdAndDay(doctorId, dayOfWeek);
    
    if (existing) {
      return this.update(existing.id, {
        timeRanges,
        duration,
        isOff,
      });
    } else {
      return this.create({
        doctorId,
        dayOfWeek,
        timeRanges,
        duration,
        isOff,
      });
    }
  }

  async copyAvailability(
    doctorId: string,
    fromDay: DayOfWeek,
    toDay: DayOfWeek
  ): Promise<DoctorAvailabilityDocument> {
    const fromAvailability = await this.getByDoctorIdAndDay(doctorId, fromDay);
    
    if (!fromAvailability) {
      throw new Error(`No availability found for ${fromDay}`);
    }

    return this.upsertAvailability(
      doctorId,
      toDay,
      fromAvailability.timeRanges,
      fromAvailability.duration,
      fromAvailability.isOff
    );
  }
}

export const doctorAvailabilityService = new DoctorAvailabilityService();
