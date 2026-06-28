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
import { appointmentConverter } from "./converters";
import type { BookingRequestDocument, BookingRequestStatus, VisionAssessmentDocument, ServiceDocument } from "@/types/firestore";
import type { AppointmentDocument } from "@/types/firestore";
import { doctorBlocksService } from "./doctor-blocks.service";
import { servicesService } from "./index";
import { getEffectiveServiceIds } from "@/lib/booking/compatibility";

const COLLECTION_NAME = "booking_requests";
const APPOINTMENTS_COLLECTION = "appointments";

function toDate(value: any): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  return new Date(value);
}

function mapDocToBookingRequest(id: string, data: any): BookingRequestDocument {
  return {
    ...data,
    id,
    requestedTime: toDate(data.requestedTime),
    proposedTime: data.proposedTime ? toDate(data.proposedTime) : undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as BookingRequestDocument;
}

export class BookingRequestsService {
  private db = getFirebaseDb();
  private collection = collection(this.db, COLLECTION_NAME);

  async getById(id: string): Promise<BookingRequestDocument | null> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? mapDocToBookingRequest(docSnap.id, docSnap.data()) : null;
  }

  async create(request: Omit<BookingRequestDocument, "id" | "createdAt" | "updatedAt">): Promise<BookingRequestDocument> {
    const id = `${request.patientId}_${request.doctorId}_${Date.now()}`;
    const docRef = doc(this.db, COLLECTION_NAME, id);
    const newRequest: BookingRequestDocument = {
      ...request,
      id,
      status: "pending",
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
    return querySnapshot.docs.map((doc) => mapDocToBookingRequest(doc.id, doc.data()));
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
    // First, get the booking request to extract details
    const request = await this.getById(id);
    if (!request) throw new Error("Booking request not found");

    // Determine the effective service IDs (supports multi-service and backward compat)
    const serviceIds = getEffectiveServiceIds(request);

    // Fetch all services and calculate combined duration
    // If combinedDuration is already stored on the booking request, use it directly
    let combinedDuration: number;
    let services: (ServiceDocument | null)[] = [];

    if (request.combinedDuration) {
      combinedDuration = request.combinedDuration;
      // Still fetch services for assessment automation
      services = await Promise.all(serviceIds.map((sid) => servicesService.getById(sid)));
    } else {
      // Fetch all services and sum their durations
      services = await Promise.all(serviceIds.map((sid) => servicesService.getById(sid)));
      combinedDuration = services.reduce((sum, s) => sum + (s?.duration || 30), 0);
    }

    // Create an appointment document
    const appointmentId = `${request.patientId}_${request.doctorId}_${Date.now()}`;
    const appointmentDoc = doc(this.db, APPOINTMENTS_COLLECTION, appointmentId);
    const appointment: AppointmentDocument = {
      id: appointmentId,
      patientId: request.patientId,
      doctorId: request.doctorId,
      serviceId: serviceIds[0], // Backward compatibility: first service ID
      serviceIds, // All service IDs for multi-service support
      combinedDuration, // Total scheduled duration
      slotId: "", // Will be generated based on the requested time
      status: "confirmed",
      scheduledFor: request.requestedTime,
      paymentId: request.paymentId,
      bookingRequestId: id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(appointmentDoc.withConverter(appointmentConverter), appointment);

    // Create a doctor block for the appointment time using combined duration
    const appointmentTime = new Date(request.requestedTime);
    const endTime = new Date(appointmentTime.getTime() + combinedDuration * 60000);
    await doctorBlocksService.create({
      doctorId: request.doctorId,
      start: appointmentTime,
      end: endTime,
      reason: "Accepted booking request",
    });

    // Assessment automation: iterate over each service and trigger automation for those that have it enabled
    for (const service of services) {
      if (service?.assessmentAutomation?.enabled && service.assessmentAutomation.triggerMode === "instant") {
        try {
          const autoId = crypto.randomUUID();
          const now = new Date();
          // Expires 1 hour after the appointment starts (matches the UI label).
          // Using appointmentTime (the scheduled slot) as the anchor, not now.
          const expiresAt = new Date(appointmentTime.getTime() + 60 * 60 * 1000);
          const autoAssessment: VisionAssessmentDocument = {
            id: autoId,
            patientId: request.patientId,
            doctorId: request.doctorId,
            appointmentId,
            serviceId: service.id,
            assignedBy: request.doctorId,
            assignedRole: "system",
            overrideUsed: false,
            assessmentTypes: service.assessmentAutomation.assessmentTypes,
            status: "assigned",
            autoAssigned: true,
            createdAt: now,
            updatedAt: now,
            expiresAt,
          };
          const assessmentRef = doc(this.db, "vision_assessments", autoId);
          await setDoc(assessmentRef, autoAssessment);
        } catch (autoErr) {
          // Non-fatal: log but don't block acceptance
          console.warn("[acceptRequest] auto-assign failed for service", service.id, ":", autoErr);
        }
      }
    }

    // Update the booking request to link to the appointment and set status to accepted
    return this.update(id, { 
      status: "accepted",
      appointmentId: appointmentId,
    });
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
