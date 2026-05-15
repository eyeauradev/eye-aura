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
  QueryConstraint,
} from "firebase/firestore";
import { getFirebaseDb } from "@/services/firebase/client";
import type { BookingRequestDocument, BookingRequestStatus } from "@/types/firestore";

const COLLECTION_NAME = "booking_requests";

export class BookingRequestsService {
  private db = getFirebaseDb();
  private collection = collection(this.db, COLLECTION_NAME);

  async getById(id: string): Promise<BookingRequestDocument | null> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as BookingRequestDocument : null;
  }

  async create(request: Omit<BookingRequestDocument, "id" | "createdAt" | "updatedAt">): Promise<BookingRequestDocument> {
    const id = `${request.patientId}_${request.doctorId}_${Date.now()}`;
    const docRef = doc(this.db, COLLECTION_NAME, id);
    const newRequest: BookingRequestDocument = {
      ...request,
      id,
      status: "requested",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await setDoc(docRef, newRequest);
    return newRequest;
  }

  async update(id: string, updates: Partial<BookingRequestDocument>): Promise<BookingRequestDocument> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date(),
    });
    const updated = await this.getById(id);
    if (!updated) throw new Error("Booking request not found after update");
    return updated;
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }

  async query(constraints: QueryConstraint[]): Promise<BookingRequestDocument[]> {
    const q = query(this.collection, ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as BookingRequestDocument);
  }

  async getByPatientId(patientId: string): Promise<BookingRequestDocument[]> {
    return this.query([
      where("patientId", "==", patientId),
      orderBy("createdAt", "desc"),
    ]);
  }

  async getByDoctorId(doctorId: string): Promise<BookingRequestDocument[]> {
    return this.query([
      where("doctorId", "==", doctorId),
      orderBy("createdAt", "desc"),
    ]);
  }

  async getByStatus(status: BookingRequestStatus): Promise<BookingRequestDocument[]> {
    return this.query([
      where("status", "==", status),
      orderBy("createdAt", "asc"),
    ]);
  }

  async getByDoctorIdAndStatus(doctorId: string, status: BookingRequestStatus): Promise<BookingRequestDocument[]> {
    return this.query([
      where("doctorId", "==", doctorId),
      where("status", "==", status),
      orderBy("createdAt", "asc"),
    ]);
  }

  async acceptRequest(id: string): Promise<BookingRequestDocument> {
    return this.update(id, { status: "accepted" });
  }

  async rejectRequest(id: string, reason: string): Promise<BookingRequestDocument> {
    return this.update(id, { 
      status: "rejected",
      rejectionReason: reason,
    });
  }

  async requestReschedule(id: string, proposedTime: Date, reason: string): Promise<BookingRequestDocument> {
    return this.update(id, { 
      status: "reschedule_requested",
      proposedTime,
      rescheduleReason: reason,
    });
  }

  async cancelRequest(id: string): Promise<BookingRequestDocument> {
    return this.update(id, { status: "cancelled" });
  }

  async linkToAppointment(id: string, appointmentId: string): Promise<BookingRequestDocument> {
    return this.update(id, { appointmentId });
  }
}

export const bookingRequestsService = new BookingRequestsService();
