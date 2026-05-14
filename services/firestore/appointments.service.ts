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
import { appointmentConverter } from "./converters";
import type { AppointmentDocument, AppointmentStatus } from "@/types/firestore";

const COLLECTION_NAME = "appointments";

export class AppointmentsService {
  private db = getFirebaseDb();
  private collection = collection(this.db, COLLECTION_NAME).withConverter(appointmentConverter);

  async getById(id: string): Promise<AppointmentDocument | null> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef.withConverter(appointmentConverter));
    return docSnap.exists() ? docSnap.data() : null;
  }

  async create(appointment: AppointmentDocument): Promise<AppointmentDocument> {
    const docRef = doc(this.db, COLLECTION_NAME, appointment.id);
    await setDoc(docRef.withConverter(appointmentConverter), appointment);
    return appointment;
  }

  async update(id: string, updates: Partial<AppointmentDocument>): Promise<AppointmentDocument> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date(),
    });
    const updated = await this.getById(id);
    if (!updated) throw new Error("Appointment not found after update");
    return updated;
  }

  async updateStatus(id: string, status: AppointmentStatus): Promise<AppointmentDocument> {
    const updates: Partial<AppointmentDocument> = { status };
    if (status === "completed") {
      updates.completedAt = new Date();
    } else if (status === "cancelled" || status === "cancellation_requested") {
      updates.cancelledAt = new Date();
    }
    return this.update(id, updates);
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }

  async query(constraints: QueryConstraint[]): Promise<AppointmentDocument[]> {
    const q = query(this.collection, ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data());
  }

  async getByPatientId(patientId: string, limitCount: number = 20): Promise<AppointmentDocument[]> {
    return this.query([
      where("patientId", "==", patientId),
      orderBy("scheduledFor", "desc"),
      limit(limitCount),
    ]);
  }

  async getByDoctorId(doctorId: string, limitCount: number = 20): Promise<AppointmentDocument[]> {
    return this.query([
      where("doctorId", "==", doctorId),
      orderBy("scheduledFor", "desc"),
      limit(limitCount),
    ]);
  }

  async getByStatus(status: AppointmentStatus, limitCount: number = 50): Promise<AppointmentDocument[]> {
    return this.query([
      where("status", "==", status),
      orderBy("scheduledFor", "asc"),
      limit(limitCount),
    ]);
  }

  async getBySlotId(slotId: string): Promise<AppointmentDocument | null> {
    const results = await this.query([where("slotId", "==", slotId), limit(1)]);
    return results[0] || null;
  }

  async getUpcomingForPatient(patientId: string): Promise<AppointmentDocument[]> {
    const now = new Date();
    return this.query([
      where("patientId", "==", patientId),
      where("scheduledFor", ">", now),
      where("status", "in", ["pending", "confirmed"]),
      orderBy("scheduledFor", "asc"),
    ]);
  }

  async getPastForPatient(patientId: string, limitCount: number = 10): Promise<AppointmentDocument[]> {
    const now = new Date();
    return this.query([
      where("patientId", "==", patientId),
      where("scheduledFor", "<=", now),
      orderBy("scheduledFor", "desc"),
      limit(limitCount),
    ]);
  }

  async getAll(limitCount: number = 50): Promise<AppointmentDocument[]> {
    return this.query([orderBy("createdAt", "desc"), limit(limitCount)]);
  }
}

export const appointmentsService = new AppointmentsService();
