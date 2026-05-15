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
import type { DoctorBlockDocument } from "@/types/firestore";

const COLLECTION_NAME = "doctor_blocks";

export class DoctorBlocksService {
  private db = getFirebaseDb();
  private collection = collection(this.db, COLLECTION_NAME);

  async getById(id: string): Promise<DoctorBlockDocument | null> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as DoctorBlockDocument : null;
  }

  async create(block: Omit<DoctorBlockDocument, "id" | "createdAt" | "updatedAt">): Promise<DoctorBlockDocument> {
    const id = `${block.doctorId}_${Date.now()}`;
    const docRef = doc(this.db, COLLECTION_NAME, id);
    const newBlock: DoctorBlockDocument = {
      ...block,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await setDoc(docRef, newBlock);
    return newBlock;
  }

  async update(id: string, updates: Partial<DoctorBlockDocument>): Promise<DoctorBlockDocument> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date(),
    });
    const updated = await this.getById(id);
    if (!updated) throw new Error("Block not found after update");
    return updated;
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }

  async query(constraints: QueryConstraint[]): Promise<DoctorBlockDocument[]> {
    const q = query(this.collection, ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as DoctorBlockDocument);
  }

  async getByDoctorId(doctorId: string, startDate?: Date, endDate?: Date): Promise<DoctorBlockDocument[]> {
    let constraints: QueryConstraint[] = [where("doctorId", "==", doctorId)];
    
    if (startDate && endDate) {
      constraints.push(where("start", ">=", startDate));
      constraints.push(where("end", "<=", endDate));
    }
    
    constraints.push(orderBy("start", "asc"));
    
    return this.query(constraints);
  }

  async getBlocksInRange(doctorId: string, startDate: Date, endDate: Date): Promise<DoctorBlockDocument[]> {
    return this.query([
      where("doctorId", "==", doctorId),
      where("start", "<=", endDate),
      where("end", ">=", startDate),
      orderBy("start", "asc"),
    ]);
  }

  async hasBlockAtTime(doctorId: string, startTime: Date, endTime: Date): Promise<boolean> {
    const blocks = await this.getBlocksInRange(doctorId, startTime, endTime);
    return blocks.length > 0;
  }
}

export const doctorBlocksService = new DoctorBlocksService();
