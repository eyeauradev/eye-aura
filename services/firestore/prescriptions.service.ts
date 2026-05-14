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
import { prescriptionConverter } from "./converters";
import type { PrescriptionDocument } from "@/types/firestore";

const COLLECTION_NAME = "prescriptions";

export class PrescriptionsService {
  private db = getFirebaseDb();
  private collection = collection(this.db, COLLECTION_NAME).withConverter(prescriptionConverter);

  async getById(id: string): Promise<PrescriptionDocument | null> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef.withConverter(prescriptionConverter));
    return docSnap.exists() ? docSnap.data() : null;
  }

  async create(prescription: PrescriptionDocument): Promise<PrescriptionDocument> {
    const docRef = doc(this.db, COLLECTION_NAME, prescription.id);
    await setDoc(docRef.withConverter(prescriptionConverter), prescription);
    return prescription;
  }

  async update(id: string, updates: Partial<PrescriptionDocument>): Promise<PrescriptionDocument> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date(),
    });
    const updated = await this.getById(id);
    if (!updated) throw new Error("Prescription not found after update");
    return updated;
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }

  async query(constraints: QueryConstraint[]): Promise<PrescriptionDocument[]> {
    const q = query(this.collection, ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data());
  }

  async getByPatientId(patientId: string, limitCount: number = 20): Promise<PrescriptionDocument[]> {
    return this.query([
      where("patientId", "==", patientId),
      orderBy("createdAt", "desc"),
      limit(limitCount),
    ]);
  }

  async getByDoctorId(doctorId: string, limitCount: number = 50): Promise<PrescriptionDocument[]> {
    return this.query([
      where("doctorId", "==", doctorId),
      orderBy("createdAt", "desc"),
      limit(limitCount),
    ]);
  }

  async getByAppointmentId(appointmentId: string): Promise<PrescriptionDocument | null> {
    const results = await this.query([where("appointmentId", "==", appointmentId), limit(1)]);
    return results[0] || null;
  }

  async getRecentForPatient(patientId: string, limitCount: number = 5): Promise<PrescriptionDocument[]> {
    return this.query([
      where("patientId", "==", patientId),
      orderBy("createdAt", "desc"),
      limit(limitCount),
    ]);
  }

  async updateFollowUp(id: string, followUpRequired: boolean, followUpDate?: Date): Promise<PrescriptionDocument> {
    return this.update(id, {
      followUpRequired,
      followUpDate,
    });
  }

  async getAll(limitCount: number = 50): Promise<PrescriptionDocument[]> {
    return this.query([orderBy("createdAt", "desc"), limit(limitCount)]);
  }
}

export const prescriptionsService = new PrescriptionsService();
