import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { getFirebaseDb } from "@/services/firebase/client";
import { paymentConverter } from "./converters";
import type { PaymentDocument } from "@/types/firestore";

const COLLECTION_NAME = "payments";

class PaymentsService {
  private db = getFirebaseDb();
  private col = () => collection(this.db, COLLECTION_NAME).withConverter(paymentConverter);

  async getById(id: string): Promise<PaymentDocument | null> {
    const docRef = doc(this.db, COLLECTION_NAME, id).withConverter(paymentConverter);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : null;
  }

  async getByUserId(userId: string): Promise<PaymentDocument[]> {
    const q = query(
      this.col(),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  }

  async getAll(): Promise<PaymentDocument[]> {
    const q = query(this.col(), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  }

  async getByBookingRequestId(bookingRequestId: string): Promise<PaymentDocument | null> {
    const q = query(
      this.col(),
      where("bookingRequestId", "==", bookingRequestId)
    );
    const snap = await getDocs(q);
    return snap.empty ? null : snap.docs[0].data();
  }
}

export const paymentsService = new PaymentsService();
