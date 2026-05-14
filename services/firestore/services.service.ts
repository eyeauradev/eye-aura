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
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date(),
    });
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
    return this.query([
      where("isActive", "==", true),
      orderBy("createdAt", "desc"),
    ]);
  }

  async getByType(type: ServiceType): Promise<ServiceDocument[]> {
    return this.query([
      where("type", "==", type),
      where("isActive", "==", true),
      orderBy("createdAt", "desc"),
    ]);
  }

  async getAll(limitCount: number = 50): Promise<ServiceDocument[]> {
    return this.query([orderBy("createdAt", "desc"), limit(limitCount)]);
  }
}

export const servicesService = new ServicesService();
