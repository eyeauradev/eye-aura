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
  writeBatch,
  QueryConstraint,
} from "firebase/firestore";
import { getFirebaseDb } from "@/services/firebase/client";
import { doctorInviteConverter } from "./converters";
import type { DoctorInviteDocument } from "@/types/firestore";

const COLLECTION_NAME = "doctor_invites";

export class DoctorInvitesService {
  private db = getFirebaseDb();
  private collection = collection(this.db, COLLECTION_NAME).withConverter(doctorInviteConverter);

  async getById(id: string): Promise<DoctorInviteDocument | null> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef.withConverter(doctorInviteConverter));
    return docSnap.exists() ? docSnap.data() : null;
  }

  async create(data: Omit<DoctorInviteDocument, "id" | "createdAt" | "updatedAt">): Promise<DoctorInviteDocument> {
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invite: DoctorInviteDocument = {
      id: crypto.randomUUID(),
      ...data,
      token,
      expiresAt,
      used: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = doc(this.db, COLLECTION_NAME, invite.id);
    await setDoc(docRef.withConverter(doctorInviteConverter), invite);
    return invite;
  }

  async getByToken(token: string): Promise<DoctorInviteDocument | null> {
    const q = query(this.collection, where("token", "==", token), limit(1));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty ? null : querySnapshot.docs[0].data();
  }

  async update(id: string, updates: Partial<DoctorInviteDocument>): Promise<DoctorInviteDocument> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date(),
    });
    const updated = await this.getById(id);
    if (!updated) throw new Error("Invite not found after update");
    return updated;
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }

  async query(constraints: QueryConstraint[]): Promise<DoctorInviteDocument[]> {
    const q = query(this.collection, ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data());
  }

  async getAll(limitCount: number = 50): Promise<DoctorInviteDocument[]> {
    return this.query([orderBy("createdAt", "desc"), limit(limitCount)]);
  }

  async markAsUsed(inviteId: string): Promise<void> {
    await this.update(inviteId, { used: true });
  }

  async cleanupExpiredInvites(): Promise<void> {
    const now = new Date();
    const q = query(this.collection, where("expiresAt", "<", now));
    const querySnapshot = await getDocs(q);
    
    const batch = writeBatch(this.db);
    querySnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  }

  private generateToken(): string {
    const array = new Uint32Array(4);
    crypto.getRandomValues(array);
    return Array.from(array, (dec) => dec.toString(16)).join("");
  }
}

export const doctorInvitesService = new DoctorInvitesService();
