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
  orderBy,
  limit,
  QueryConstraint,
} from "firebase/firestore";
import { getFirebaseDb } from "@/services/firebase/client";
import { doctorSlotConverter } from "./converters";
import type { DoctorSlotDocument } from "@/types/firestore";

const COLLECTION_NAME = "doctor_slots";

export class DoctorSlotsService {
  private db = getFirebaseDb();
  private collection = collection(this.db, COLLECTION_NAME).withConverter(doctorSlotConverter);

  async getById(id: string): Promise<DoctorSlotDocument | null> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef.withConverter(doctorSlotConverter));
    return docSnap.exists() ? docSnap.data() : null;
  }

  async create(slot: DoctorSlotDocument): Promise<DoctorSlotDocument> {
    const docRef = doc(this.db, COLLECTION_NAME, slot.id);
    await setDoc(docRef.withConverter(doctorSlotConverter), slot);
    return slot;
  }

  async update(id: string, updates: Partial<DoctorSlotDocument>): Promise<DoctorSlotDocument> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date(),
    });
    const updated = await this.getById(id);
    if (!updated) throw new Error("Doctor slot not found after update");
    return updated;
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }

  async query(constraints: QueryConstraint[]): Promise<DoctorSlotDocument[]> {
    const q = query(this.collection, ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data());
  }

  async getByDoctorId(doctorId: string, startDate: Date, endDate: Date): Promise<DoctorSlotDocument[]> {
    return this.query([
      where("doctorId", "==", doctorId),
      where("startTime", ">=", startDate),
      where("startTime", "<=", endDate),
      orderBy("startTime", "asc"),
    ]);
  }

  async getAvailableSlots(doctorId: string, startDate: Date, endDate: Date): Promise<DoctorSlotDocument[]> {
    return this.query([
      where("doctorId", "==", doctorId),
      where("isAvailable", "==", true),
      where("isBlocked", "==", false),
      where("startTime", ">=", startDate),
      where("startTime", "<=", endDate),
      orderBy("startTime", "asc"),
    ]);
  }

  async bookSlot(slotId: string, appointmentId: string): Promise<DoctorSlotDocument> {
    return this.update(slotId, {
      isAvailable: false,
      appointmentId,
    });
  }

  async releaseSlot(slotId: string): Promise<DoctorSlotDocument> {
    return this.update(slotId, {
      isAvailable: true,
      appointmentId: undefined,
    });
  }

  async getAll(limitCount: number = 50): Promise<DoctorSlotDocument[]> {
    return this.query([orderBy("startTime", "desc"), limit(limitCount)]);
  }

  async blockSlot(slotId: string, reason: string): Promise<DoctorSlotDocument> {
    return this.update(slotId, {
      isBlocked: true,
      blockReason: reason,
      isAvailable: false,
    });
  }

  async unblockSlot(slotId: string): Promise<DoctorSlotDocument> {
    return this.update(slotId, {
      isBlocked: false,
      blockReason: undefined,
      isAvailable: true,
    });
  }

  async getSlotByAppointment(appointmentId: string): Promise<DoctorSlotDocument | null> {
    const results = await this.query([where("appointmentId", "==", appointmentId), limit(1)]);
    return results[0] || null;
  }
}

export const doctorSlotsService = new DoctorSlotsService();
