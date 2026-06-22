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
  Timestamp,
  deleteField,
  QueryConstraint,
} from "firebase/firestore";
import { getFirebaseDb } from "@/services/firebase/client";
import { serviceConverter } from "./converters";
import type { ServiceDocument, ServiceType } from "@/types/firestore";

const COLLECTION_NAME = "services";

export class ServicesService {
  private db = getFirebaseDb();
  private collection = collection(this.db, COLLECTION_NAME).withConverter(serviceConverter);

  async getById(id: string): Promise<ServiceDocument | null> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef.withConverter(serviceConverter));
    return docSnap.exists() ? docSnap.data() : null;
  }

  async create(service: ServiceDocument): Promise<ServiceDocument> {
    const docRef = doc(this.db, COLLECTION_NAME, service.id);
    await setDoc(docRef.withConverter(serviceConverter), service);
    return service;
  }

  async update(id: string, updates: Partial<ServiceDocument>): Promise<ServiceDocument> {
    const docRef = doc(this.db, COLLECTION_NAME, id);

    // Build a plain Firestore-safe payload. The converter's toFirestore is only
    // invoked by setDoc/addDoc, not updateDoc, so we must handle special cases here.
    const { displayOrder, createdAt, updatedAt, assessmentAutomation, ...rest } = updates;

    const payload: Record<string, unknown> = {
      ...rest,
      updatedAt: Timestamp.now(),
    };

    // displayOrder: write the number when set, delete the field when explicitly cleared
    if (typeof displayOrder === "number") {
      payload.displayOrder = displayOrder;
    } else if ("displayOrder" in updates) {
      // key present but value is undefined/null → remove field from Firestore
      payload.displayOrder = deleteField();
    }

    // assessmentAutomation: only write when enabled, omit otherwise
    if (assessmentAutomation?.enabled) {
      payload.assessmentAutomation = assessmentAutomation;
    }

    await updateDoc(docRef, payload);
    const updated = await this.getById(id);
    if (!updated) throw new Error("Service not found after update");
    return updated;
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }

  async query(constraints: QueryConstraint[]): Promise<ServiceDocument[]> {
    const q = query(this.collection, ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data());
  }

  async getActiveServices(): Promise<ServiceDocument[]> {
    const results = await this.query([
      where("isActive", "==", true),
      orderBy("createdAt", "desc"),
    ]);
    return sortByDisplayOrder(results);
  }

  async getByType(type: ServiceType): Promise<ServiceDocument[]> {
    const results = await this.query([
      where("type", "==", type),
      where("isActive", "==", true),
      orderBy("createdAt", "desc"),
    ]);
    return sortByDisplayOrder(results);
  }

  async getAll(limitCount: number = 50): Promise<ServiceDocument[]> {
    const results = await this.query([orderBy("createdAt", "desc"), limit(limitCount)]);
    return sortByDisplayOrder(results);
  }
}

/**
 * Sort services so that:
 * 1. Services with a displayOrder come first, ascending (1, 2, 3…)
 * 2. Services without a displayOrder sit at the end, ordered by createdAt desc
 */
function sortByDisplayOrder(services: ServiceDocument[]): ServiceDocument[] {
  return [...services].sort((a, b) => {
    const aHas = typeof a.displayOrder === "number";
    const bHas = typeof b.displayOrder === "number";
    if (aHas && bHas) {
      if (a.displayOrder !== b.displayOrder) return a.displayOrder! - b.displayOrder!;
      // same rank — tiebreak by createdAt ascending (older first keeps stable order)
      return a.createdAt.getTime() - b.createdAt.getTime();
    }
    if (aHas) return -1; // a has rank, b doesn't → a first
    if (bHas) return 1;  // b has rank, a doesn't → b first
    // neither has rank — keep createdAt desc (newer first)
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

export const servicesService = new ServicesService();
