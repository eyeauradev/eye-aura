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
import { supportTicketConverter } from "./converters";
import type { SupportTicketDocument } from "@/types/firestore";

const COLLECTION_NAME = "support_tickets";

export class SupportTicketsService {
  private db = getFirebaseDb();
  private collection = collection(this.db, COLLECTION_NAME).withConverter(supportTicketConverter);

  async getById(id: string): Promise<SupportTicketDocument | null> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef.withConverter(supportTicketConverter));
    return docSnap.exists() ? docSnap.data() : null;
  }

  async create(ticket: SupportTicketDocument): Promise<SupportTicketDocument> {
    const docRef = doc(this.db, COLLECTION_NAME, ticket.id);
    await setDoc(docRef.withConverter(supportTicketConverter), ticket);
    return ticket;
  }

  async update(id: string, updates: Partial<SupportTicketDocument>): Promise<SupportTicketDocument> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date(),
    });
    const updated = await this.getById(id);
    if (!updated) throw new Error("Support ticket not found after update");
    return updated;
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(this.db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }

  async query(constraints: QueryConstraint[]): Promise<SupportTicketDocument[]> {
    const q = query(this.collection, ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data());
  }

  async getByUserId(userId: string, limitCount: number = 50): Promise<SupportTicketDocument[]> {
    return this.query([
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(limitCount),
    ]);
  }

  async getByStatus(status: string, limitCount: number = 50): Promise<SupportTicketDocument[]> {
    return this.query([
      where("status", "==", status),
      orderBy("createdAt", "desc"),
      limit(limitCount),
    ]);
  }

  async getByCategory(category: string, limitCount: number = 50): Promise<SupportTicketDocument[]> {
    return this.query([
      where("category", "==", category),
      orderBy("createdAt", "desc"),
      limit(limitCount),
    ]);
  }

  async getAll(limitCount: number = 50): Promise<SupportTicketDocument[]> {
    return this.query([orderBy("createdAt", "desc"), limit(limitCount)]);
  }

  async addResponse(
    ticketId: string,
    authorId: string,
    authorName: string,
    message: string,
    isInternal: boolean = false
  ): Promise<SupportTicketDocument> {
    const ticket = await this.getById(ticketId);
    if (!ticket) throw new Error("Ticket not found");

    const response = {
      id: `response_${Date.now()}`,
      authorId,
      authorName,
      message,
      createdAt: new Date(),
      isInternal,
    };

    return this.update(ticketId, {
      responses: [...ticket.responses, response],
    });
  }

  async updateStatus(ticketId: string, status: "open" | "in_progress" | "resolved" | "closed"): Promise<SupportTicketDocument> {
    const updates: Partial<SupportTicketDocument> = { status };
    
    if (status === "resolved" || status === "closed") {
      updates.resolvedAt = new Date();
    }

    return this.update(ticketId, updates);
  }

  async assignTo(ticketId: string, assignedTo: string): Promise<SupportTicketDocument> {
    return this.update(ticketId, { assignedTo });
  }
}

export const supportTicketsService = new SupportTicketsService();
