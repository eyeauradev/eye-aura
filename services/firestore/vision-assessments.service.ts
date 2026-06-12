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
import { visionAssessmentConverter } from "./converters";
import type { VisionAssessmentDocument, VisionAssessmentStatus } from "@/types/firestore";

const COLLECTION_NAME = "vision_assessments";

export class VisionAssessmentsService {
  private db = getFirebaseDb();
  private col = () =>
    collection(this.db, COLLECTION_NAME).withConverter(visionAssessmentConverter);

  async getById(id: string): Promise<VisionAssessmentDocument | null> {
    const ref = doc(this.db, COLLECTION_NAME, id).withConverter(visionAssessmentConverter);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  }

  async create(assessment: VisionAssessmentDocument): Promise<VisionAssessmentDocument> {
    const ref = doc(this.db, COLLECTION_NAME, assessment.id).withConverter(visionAssessmentConverter);
    await setDoc(ref, assessment);
    return assessment;
  }

  async update(
    id: string,
    updates: Partial<VisionAssessmentDocument>
  ): Promise<VisionAssessmentDocument> {
    const ref = doc(this.db, COLLECTION_NAME, id);
    await updateDoc(ref, { ...updates, updatedAt: new Date() });
    const updated = await this.getById(id);
    if (!updated) throw new Error("VisionAssessment not found after update");
    return updated;
  }

  async updateStatus(id: string, status: VisionAssessmentStatus): Promise<VisionAssessmentDocument> {
    return this.update(id, { status });
  }

  async delete(id: string): Promise<void> {
    const ref = doc(this.db, COLLECTION_NAME, id);
    await deleteDoc(ref);
  }

  private async query(constraints: QueryConstraint[]): Promise<VisionAssessmentDocument[]> {
    const q = query(this.col(), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  }

  // Patient: list their own assigned assessments
  async getByPatientId(patientId: string): Promise<VisionAssessmentDocument[]> {
    return this.query([
      where("patientId", "==", patientId),
      orderBy("createdAt", "desc"),
    ]);
  }

  // Doctor: list assessments they assigned
  async getByDoctorId(doctorId: string): Promise<VisionAssessmentDocument[]> {
    return this.query([
      where("doctorId", "==", doctorId),
      orderBy("createdAt", "desc"),
    ]);
  }

  // Assessment History: all assessments for a specific patient–doctor pair
  async getAllForPatientByDoctor(
    patientId: string,
    doctorId: string
  ): Promise<VisionAssessmentDocument[]> {
    return this.query([
      where("patientId", "==", patientId),
      where("doctorId", "==", doctorId),
      orderBy("createdAt", "desc"),
    ]);
  }

  // Linked to a specific appointment.
  // Pass doctorId when calling from the doctor portal so the Firestore list rule
  // (which checks resource.data.doctorId) is satisfiable for every returned doc.
  async getByAppointmentId(
    appointmentId: string,
    doctorId?: string
  ): Promise<VisionAssessmentDocument[]> {
    const constraints = [
      where("appointmentId", "==", appointmentId),
      orderBy("createdAt", "desc"),
    ];
    if (doctorId) {
      constraints.unshift(where("doctorId", "==", doctorId));
    }
    return this.query(constraints);
  }

  // Admin: get all assessments
  async getAll(limitCount = 100): Promise<VisionAssessmentDocument[]> {
    return this.query([orderBy("createdAt", "desc"), limit(limitCount)]);
  }

  // Patient: get active (assigned or in_progress) assessments
  async getActiveForPatient(patientId: string): Promise<VisionAssessmentDocument[]> {
    return this.query([
      where("patientId", "==", patientId),
      where("status", "in", ["assigned", "in_progress"]),
      orderBy("createdAt", "desc"),
    ]);
  }
}

export const visionAssessmentsService = new VisionAssessmentsService();
