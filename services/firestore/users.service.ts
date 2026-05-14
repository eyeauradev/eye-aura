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
import { userConverter } from "./converters";
import type { UserDocument } from "@/types/firestore";

const COLLECTION_NAME = "users";

export class UsersService {
  private db = getFirebaseDb();
  private collection = collection(this.db, COLLECTION_NAME).withConverter(userConverter);

  async getById(id: string): Promise<UserDocument | null> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef.withConverter(userConverter));
    return docSnap.exists() ? docSnap.data() : null;
  }

  async getByEmail(email: string): Promise<UserDocument | null> {
    const q = query(this.collection, where("email", "==", email), limit(1));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty ? null : querySnapshot.docs[0].data();
  }

  async create(user: UserDocument): Promise<UserDocument> {
    const docRef = doc(this.db, COLLECTION_NAME, user.id);
    await setDoc(docRef.withConverter(userConverter), user);
    return user;
  }

  async update(id: string, updates: Partial<UserDocument>): Promise<UserDocument> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date(),
    });
    const updated = await this.getById(id);
    if (!updated) throw new Error("User not found after update");
    return updated;
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }

  async query(constraints: QueryConstraint[]): Promise<UserDocument[]> {
    const q = query(this.collection, ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data());
  }

  async getByRole(role: string): Promise<UserDocument[]> {
    return this.query([where("role", "==", role), orderBy("createdAt", "desc")]);
  }

  async getAll(limitCount: number = 50): Promise<UserDocument[]> {
    return this.query([orderBy("createdAt", "desc"), limit(limitCount)]);
  }
}

export const usersService = new UsersService();
