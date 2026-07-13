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
  deleteField,
  QueryConstraint,
} from "firebase/firestore";
import { getFirebaseDb } from "@/services/firebase/client";
import { testimonialConverter } from "./converters";
import type { TestimonialDocument } from "@/types/firestore";

const COLLECTION_NAME = "testimonials";

export class TestimonialsService {
  private db = getFirebaseDb();
  private collection = collection(this.db, COLLECTION_NAME).withConverter(testimonialConverter);

  async getById(id: string): Promise<TestimonialDocument | null> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef.withConverter(testimonialConverter));
    return docSnap.exists() ? docSnap.data() : null;
  }

  async create(testimonial: TestimonialDocument): Promise<TestimonialDocument> {
    const docRef = doc(this.db, COLLECTION_NAME, testimonial.id);
    await setDoc(docRef.withConverter(testimonialConverter), testimonial);
    return testimonial;
  }

  async update(id: string, updates: Partial<TestimonialDocument>): Promise<TestimonialDocument> {
    const docRef = doc(this.db, COLLECTION_NAME, id);

    // Build a plain Firestore-safe payload. The converter's toFirestore is only
    // invoked by setDoc/addDoc, not updateDoc, so we must handle special cases here.
    const { displayOrder, imageUrl, tag, ...rest } = updates;

    const payload: Record<string, unknown> = {
      ...rest,
      updatedAt: new Date(),
    };

    // displayOrder: write the number when set, delete the field when explicitly cleared
    if (typeof displayOrder === "number") {
      payload.displayOrder = displayOrder;
    } else if ("displayOrder" in updates) {
      // key present but value is undefined/null → remove field from Firestore
      payload.displayOrder = deleteField();
    }

    // imageUrl: write the value when set, delete the field when explicitly cleared
    if (typeof imageUrl === "string" && imageUrl.trim() !== "") {
      payload.imageUrl = imageUrl.trim();
    } else if ("imageUrl" in updates) {
      payload.imageUrl = deleteField();
    }

    // tag: write the value when set, delete the field when explicitly cleared
    if (typeof tag === "string" && tag.trim() !== "") {
      payload.tag = tag.trim();
    } else if ("tag" in updates) {
      payload.tag = deleteField();
    }

    await updateDoc(docRef, payload);
    const updated = await this.getById(id);
    if (!updated) throw new Error("Testimonial not found after update");
    return updated;
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }

  async query(constraints: QueryConstraint[]): Promise<TestimonialDocument[]> {
    const q = query(this.collection, ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data());
  }

  /** Public homepage feed: only active testimonials, sorted by display order. */
  async getActive(): Promise<TestimonialDocument[]> {
    const results = await this.query([where("isActive", "==", true)]);
    return sortByDisplayOrder(results);
  }

  /** Admin management list: all testimonials, sorted by display order. */
  async getAll(): Promise<TestimonialDocument[]> {
    const snapshot = await getDocs(this.collection);
    const results = snapshot.docs.map((doc) => doc.data());
    return sortByDisplayOrder(results);
  }
}

/**
 * Sort testimonials so that:
 * 1. Testimonials with a displayOrder come first, ascending (1, 2, 3…)
 * 2. Testimonials without a displayOrder sit at the end, ordered by updatedAt desc
 */
function sortByDisplayOrder(items: TestimonialDocument[]): TestimonialDocument[] {
  return [...items].sort((a, b) => {
    const aHas = typeof a.displayOrder === "number";
    const bHas = typeof b.displayOrder === "number";
    if (aHas && bHas) {
      if (a.displayOrder !== b.displayOrder) return a.displayOrder! - b.displayOrder!;
      // same rank — tiebreak by updatedAt ascending (older first keeps stable order)
      return a.updatedAt.getTime() - b.updatedAt.getTime();
    }
    if (aHas) return -1; // a has rank, b doesn't → a first
    if (bHas) return 1;  // b has rank, a doesn't → b first
    // neither has rank — keep updatedAt desc (newest first)
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
}

export const testimonialsService = new TestimonialsService();
