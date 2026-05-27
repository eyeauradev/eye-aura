# Technical Design Document

## Overview

This design covers three areas of the appointment flow revamp: (1) a dark premium header theme for the patient appointment detail page, (2) a cancellation-request workflow with doctor/admin approval and Razorpay refund processing, and (3) a missing Firestore composite index for the `getAvailableSlots()` query.

The implementation uses the existing architecture: Next.js App Router client components for UI, Firestore transactions for atomic state changes, and Next.js API routes with Firebase Admin SDK for server-side operations (refunds).

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
├──────────────────┬──────────────────┬───────────────────────────┤
│  Patient Portal  │  Doctor Portal   │  Admin Dashboard          │
│  - Dark header   │  - Approve/Reject│  - Cancellation list      │
│  - Cancel request│    Quick Actions  │  - Approve/Reject actions │
│  - Status badge  │                  │  - Filter by status       │
└────────┬─────────┴────────┬─────────┴─────────────┬─────────────┘
         │                  │                       │
         ▼                  ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Service Layer                                │
├──────────────────────────────────────────────────────────────────┤
│  TransactionService (extended)                                   │
│  - requestCancellationWithTransaction()                          │
│  - approveCancellationWithTransaction()                          │
│  - rejectCancellationWithTransaction()                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐ ┌────────────────┐ ┌─────────────────────────┐
│   Firestore     │ │  API Route     │ │  Razorpay API           │
│   (appointments,│ │  /api/payments/│ │  POST /v1/payments/     │
│    doctor_slots)│ │  refund        │ │  {id}/refund            │
└─────────────────┘ └────────────────┘ └─────────────────────────┘
```

### State Machine: Appointment Cancellation Flow

```
                    Patient requests
    ┌─────────┐     cancellation      ┌──────────────────────┐
    │ pending │ ─────────────────────▶ │ cancellation_requested│
    └─────────┘                        └──────────┬───────────┘
                                                  │
    ┌──────────┐    Patient requests              │
    │confirmed │ ─────────────────────▶           │
    └──────────┘     cancellation                 │
                                        ┌─────────┴─────────┐
                                        │                   │
                                   Doctor/Admin          Doctor/Admin
                                    approves              rejects
                                        │                   │
                                        ▼                   ▼
                                 ┌───────────┐    ┌─────────────────┐
                                 │ cancelled │    │ previous state   │
                                 │ + refund  │    │ (pending/confirmed)│
                                 └───────────┘    └─────────────────┘
```

## Components and Interfaces

### 1. Dark Premium Header (Patient Appointment Detail)

**File:** `app/patient/appointments/[id]/page.tsx`

Replace the existing header styling:

```tsx
// Before
<div className="border-b border-primary/10 bg-white/50 backdrop-blur-sm">

// After
<div className="border-b border-white/10 bg-[#0f4f4b]">
  <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
    <Link
      href="/patient/appointments"
      className="inline-flex items-center gap-2 text-sm font-bold text-white/70 hover:text-white transition mb-4"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Appointments
    </Link>
    <h1 className="font-display text-3xl text-white sm:text-4xl">Appointment Details</h1>
  </div>
</div>
```

The solid `bg-[#0f4f4b]` background eliminates the translucent `bg-white/50 backdrop-blur-sm` and provides a consistent dark header that doesn't flicker during page load. The `border-b border-white/10` creates a subtle visual transition to the light content below.

### 2. Cancellation Request Transaction Methods

**File:** `services/booking/transaction.service.ts`

Three new methods are added to `TransactionService`:

```typescript
/**
 * Atomically set appointment to cancellation_requested.
 * Stores the reason, timestamp, and previous status for potential restoration.
 */
async requestCancellationWithTransaction(
  appointmentId: string,
  reason: string
): Promise<void> {
  const appointmentRef = doc(this.db, "appointments", appointmentId);

  return runTransaction(this.db, async (transaction) => {
    const appointmentDoc = await transaction.get(appointmentRef);
    if (!appointmentDoc.exists()) throw new Error("Appointment not found");

    const appointment = appointmentDoc.data() as AppointmentDocument;

    if (appointment.status === "cancelled" || appointment.status === "completed") {
      throw new Error("Cannot request cancellation for this appointment");
    }
    if (appointment.status === "cancellation_requested") {
      throw new Error("Cancellation already requested");
    }

    transaction.update(appointmentRef, {
      status: "cancellation_requested",
      cancellationReason: reason,
      cancellationRequestedAt: new Date(),
      previousStatus: appointment.status, // Store for rejection restoration
      updatedAt: new Date(),
    });
  });
}

/**
 * Atomically approve a cancellation: set status to cancelled, release slot.
 * Returns the paymentId (if any) so the caller can trigger refund.
 */
async approveCancellationWithTransaction(
  appointmentId: string,
  approvedBy: { uid: string; role: "doctor" | "admin" }
): Promise<{ paymentId?: string; bookingRequestId?: string }> {
  const appointmentRef = doc(this.db, "appointments", appointmentId);

  return runTransaction(this.db, async (transaction) => {
    const appointmentDoc = await transaction.get(appointmentRef);
    if (!appointmentDoc.exists()) throw new Error("Appointment not found");

    const appointment = appointmentDoc.data() as AppointmentDocument;

    if (appointment.status !== "cancellation_requested") {
      throw new Error("Appointment is not in cancellation_requested state");
    }

    // Update appointment to cancelled
    transaction.update(appointmentRef, {
      status: "cancelled",
      cancelledAt: new Date(),
      cancellationApprovedBy: approvedBy.uid,
      cancellationApprovedByRole: approvedBy.role,
      cancellationApprovedAt: new Date(),
      updatedAt: new Date(),
    });

    // Release the slot
    if (appointment.slotId) {
      const slotRef = doc(this.db, "doctor_slots", appointment.slotId);
      const slotDoc = await transaction.get(slotRef);
      if (slotDoc.exists()) {
        const slot = slotDoc.data() as DoctorSlotDocument;
        if (slot.appointmentId === appointmentId) {
          transaction.update(slotRef, {
            isAvailable: true,
            appointmentId: null,
            updatedAt: new Date(),
          });
        }
      }
    }

    return {
      paymentId: appointment.paymentId,
      bookingRequestId: appointment.bookingRequestId,
    };
  });
}

/**
 * Atomically reject a cancellation: restore previous status.
 */
async rejectCancellationWithTransaction(
  appointmentId: string,
  rejectedBy: { uid: string; role: "doctor" | "admin" },
  rejectionReason: string
): Promise<void> {
  const appointmentRef = doc(this.db, "appointments", appointmentId);

  return runTransaction(this.db, async (transaction) => {
    const appointmentDoc = await transaction.get(appointmentRef);
    if (!appointmentDoc.exists()) throw new Error("Appointment not found");

    const appointment = appointmentDoc.data() as AppointmentDocument;

    if (appointment.status !== "cancellation_requested") {
      throw new Error("Appointment is not in cancellation_requested state");
    }

    const previousStatus = appointment.previousStatus || "confirmed";

    transaction.update(appointmentRef, {
      status: previousStatus,
      cancellationRejectedBy: rejectedBy.uid,
      cancellationRejectedByRole: rejectedBy.role,
      cancellationRejectedAt: new Date(),
      cancellationRejectionReason: rejectionReason,
      updatedAt: new Date(),
    });
  });
}
```

### 3. Refund API Endpoint (Extended)

**File:** `app/api/payments/cancellation-refund/route.ts`

A new API route specifically for cancellation-approval refunds. This reuses the existing `processRazorpayRefund` pattern from the current refund route but is triggered by cancellation approval rather than booking rejection.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { getAdminAuth, getAdminDb } from "@/services/firebase/admin";

export const maxDuration = 30;

interface RefundRequest {
  appointmentId: string;
  paymentId: string;
  approvedBy: string;
  approvedByRole: "doctor" | "admin";
}

async function verifyToken(req: NextRequest): Promise<{ uid: string; role: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const token = authHeader.slice(7);
  const adminAuth = getAdminAuth();
  const decoded = await adminAuth.verifyIdToken(token);
  const adminDb = getAdminDb();
  const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
  if (!userDoc.exists) throw new Error("Unauthorized");
  const data = userDoc.data()!;
  if (data.role !== "doctor" && data.role !== "admin") throw new Error("Forbidden");
  return { uid: decoded.uid, role: data.role };
}

async function processRefundInBackground(
  paymentId: string,
  appointmentId: string,
  razorpayPaymentId: string,
  amountInr: number,
  reason: string,
  patientId: string
) {
  const db = getAdminDb();
  try {
    const credentials = Buffer.from(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
    ).toString("base64");

    const rzpRes = await fetch(
      `https://api.razorpay.com/v1/payments/${razorpayPaymentId}/refund`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${credentials}`,
          "X-Razorpay-Idempotency-Key": `refund-apt-${appointmentId}`,
        },
        body: JSON.stringify({
          amount: Math.round(amountInr * 100),
          speed: "normal",
          notes: {
            reason,
            appointment_id: appointmentId,
            patient_id: patientId,
          },
        }),
      }
    );

    if (!rzpRes.ok) {
      const errBody = await rzpRes.json().catch(() => ({}));
      const failureReason = errBody?.error?.description || `HTTP ${rzpRes.status}`;
      await db.collection("payments").doc(paymentId).update({
        refundStatus: "failed",
        refundFailureReason: failureReason,
        updatedAt: new Date(),
      });
      return;
    }

    const rzpRefund = await rzpRes.json();
    await db.collection("payments").doc(paymentId).update({
      status: "refunded",
      refundStatus: "processed",
      refundId: rzpRefund.id,
      refundReason: reason,
      refundFailureReason: null,
      refundedAt: new Date(),
      updatedAt: new Date(),
    });

    // Also update appointment with refund info
    await db.collection("appointments").doc(appointmentId).update({
      refundId: rzpRefund.id,
      refundAmount: amountInr,
      refundedAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (err: any) {
    await db.collection("payments").doc(paymentId).update({
      refundStatus: "failed",
      refundFailureReason: err?.message || "Network error",
      updatedAt: new Date(),
    }).catch(() => {});
  }
}

export async function POST(req: NextRequest) {
  try {
    const caller = await verifyToken(req);
    const { appointmentId, paymentId } = (await req.json()) as RefundRequest;

    if (!appointmentId || !paymentId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const paymentDoc = await db.collection("payments").doc(paymentId).get();

    if (!paymentDoc.exists) {
      // No payment — cancellation proceeds without refund
      return NextResponse.json({ success: true, refundStatus: "none" });
    }

    const payment = paymentDoc.data()!;

    if (!payment.razorpayPaymentId) {
      await db.collection("payments").doc(paymentId).update({
        refundStatus: "failed",
        refundFailureReason: "No Razorpay payment ID",
        updatedAt: new Date(),
      });
      return NextResponse.json({ success: true, refundStatus: "failed" });
    }

    // Mark as pending
    await db.collection("payments").doc(paymentId).update({
      refundStatus: "pending",
      updatedAt: new Date(),
    });

    // Process in background after response
    const appointmentDoc = await db.collection("appointments").doc(appointmentId).get();
    const appointment = appointmentDoc.data();

    after(() =>
      processRefundInBackground(
        paymentId,
        appointmentId,
        payment.razorpayPaymentId,
        payment.amount,
        appointment?.cancellationReason || "Cancellation approved",
        appointment?.patientId || ""
      )
    );

    return NextResponse.json({ success: true, refundStatus: "pending" });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### 4. Doctor Quick Actions — Cancellation Approval UI

**File:** `app/doctor/appointments/[id]/page.tsx` (additions to Quick Actions card)

```tsx
{appointment.status === "cancellation_requested" && (
  <div className="space-y-3 border-t border-primary/10 pt-3">
    <div className="rounded-xl bg-orange-50 border border-orange-200 p-3">
      <p className="text-sm font-bold text-orange-800 mb-1">Cancellation Requested</p>
      <p className="text-xs text-orange-700">
        Reason: {appointment.cancellationReason}
      </p>
      <p className="text-xs text-orange-600 mt-1">
        Requested: {new Date(appointment.cancellationRequestedAt).toLocaleDateString()}
      </p>
    </div>
    <Button
      onClick={() => handleApproveCancellation()}
      disabled={updating}
      className="w-full bg-green-600 hover:bg-green-700"
    >
      <CheckCircle2 className="h-4 w-4 mr-2" />
      Approve Cancellation
    </Button>
    <Button
      onClick={() => setShowRejectModal(true)}
      disabled={updating}
      variant="outline"
      className="w-full border-red-200 text-red-600 hover:bg-red-50"
    >
      <X className="h-4 w-4 mr-2" />
      Reject Cancellation
    </Button>
  </div>
)}
```

### 5. Admin Cancellation Requests Page

**File:** `app/admin/appointments/cancellations/page.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import { appointmentsService, usersService } from "@/services/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type FilterStatus = "all" | "pending" | "approved" | "rejected";

export default function AdminCancellationsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [loading, setLoading] = useState(true);

  // Fetch appointments with cancellation_requested status
  // Enrich with patient/doctor names
  // Provide approve/reject actions
  // ...
}
```

### 6. Firestore Index Addition

**File:** `firestore.indexes.json`

Add the following index to the `indexes` array:

```json
{
  "collectionGroup": "doctor_slots",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "doctorId", "order": "ASCENDING" },
    { "fieldPath": "isAvailable", "order": "ASCENDING" },
    { "fieldPath": "isBlocked", "order": "ASCENDING" },
    { "fieldPath": "startTime", "order": "ASCENDING" }
  ]
}
```

This index supports the `getAvailableSlots()` query in `DoctorSlotsService` which filters on `doctorId`, `isAvailable`, `isBlocked`, and orders by `startTime`.

### 7. Interfaces

#### Extended AppointmentDocument Fields

```typescript
// Additional fields on AppointmentDocument (types/firestore.ts)
export interface AppointmentDocument {
  // ... existing fields ...

  // Cancellation request fields
  cancellationRequestedAt?: Date;
  previousStatus?: "pending" | "confirmed";

  // Cancellation approval fields
  cancellationApprovedBy?: string;
  cancellationApprovedByRole?: "doctor" | "admin";
  cancellationApprovedAt?: Date;

  // Cancellation rejection fields
  cancellationRejectedBy?: string;
  cancellationRejectedByRole?: "doctor" | "admin";
  cancellationRejectedAt?: Date;
  cancellationRejectionReason?: string;

  // Refund fields
  refundId?: string;
  refundAmount?: number;
  refundedAt?: Date;

  // Booking request reference (for refund lookup)
  bookingRequestId?: string;
}
```

#### BookingService Changes

```typescript
// services/booking/booking.service.ts — update cancelBooking
async cancelBooking(appointmentId: string, reason: string): Promise<AppointmentDocument> {
  // Changed: now requests cancellation instead of directly cancelling
  await transactionService.requestCancellationWithTransaction(appointmentId, reason);
  const updated = await appointmentsService.getById(appointmentId);
  if (!updated) throw new Error("Appointment not found after cancellation request");
  return updated;
}
```

#### Cancellation Refund API Interface

```typescript
// POST /api/payments/cancellation-refund
// Request
interface CancellationRefundRequest {
  appointmentId: string;
  paymentId: string;
}

// Response
interface CancellationRefundResponse {
  success: boolean;
  refundStatus: "pending" | "processed" | "failed" | "none";
  error?: string;
}
```

## Data Models

### Appointment Document (Firestore)

```
appointments/{appointmentId}
├── id: string
├── patientId: string
├── doctorId: string
├── serviceId: string
├── slotId: string
├── status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "cancellation_requested"
├── notes?: string
├── cancellationReason?: string
├── cancellationRequestedAt?: Timestamp
├── previousStatus?: "pending" | "confirmed"
├── cancellationApprovedBy?: string
├── cancellationApprovedByRole?: "doctor" | "admin"
├── cancellationApprovedAt?: Timestamp
├── cancellationRejectedBy?: string
├── cancellationRejectedByRole?: "doctor" | "admin"
├── cancellationRejectedAt?: Timestamp
├── cancellationRejectionReason?: string
├── refundId?: string
├── refundAmount?: number
├── refundedAt?: Timestamp
├── scheduledFor: Timestamp
├── createdAt: Timestamp
└── updatedAt: Timestamp
```

### Payment Document (Firestore) — Existing + Refund Fields

```
payments/{paymentId}
├── id: string
├── userId: string
├── amount: number
├── razorpayPaymentId: string
├── status: "pending" | "completed" | "refunded" | "failed"
├── refundStatus?: "pending" | "processed" | "failed"
├── refundId?: string
├── refundReason?: string
├── refundFailureReason?: string
├── refundedAt?: Timestamp
├── createdAt: Timestamp
└── updatedAt: Timestamp
```

## Error Handling

| Scenario | Handling |
|----------|----------|
| Patient cancels already-cancelled appointment | Transaction throws "Cannot request cancellation for this appointment" — UI shows error toast |
| Doctor approves non-cancellation_requested appointment | Transaction throws "Appointment is not in cancellation_requested state" — UI shows error |
| Razorpay refund API fails | Background task sets `refundStatus: "failed"` with reason; admin dashboard surfaces failed refunds |
| No payment record for appointment | Refund step is skipped; cancellation proceeds normally |
| Razorpay payment ID missing on payment doc | `refundStatus` set to "failed" with reason "No Razorpay payment ID"; admin can investigate |
| Concurrent approval/rejection race | Firestore transaction ensures only one succeeds; second attempt gets "not in cancellation_requested state" error |
| Network timeout during refund | `after()` runs without timeout pressure; if fetch throws, failure is recorded |
| Slot already released (edge case) | Transaction checks `slot.appointmentId === appointmentId` before releasing; no-op if mismatch |

## Testing Strategy

### Unit Tests
- Verify header component renders with correct dark theme classes (Requirement 1)
- Verify cancellation badge renders with orange styling when status is `cancellation_requested` (Requirement 2.2)
- Verify doctor Quick Actions shows approve/reject buttons for `cancellation_requested` status (Requirement 3.1, 3.2)
- Verify admin cancellation list renders required fields (Requirement 4.4)

### Property Tests
- Transaction integrity for cancellation request, approval, and rejection flows (Properties 1, 4, 5)
- Input validation for cancellation reasons (Property 3)
- Refund logic correctness with mocked Razorpay responses (Properties 7, 8, 9, 10)
- Filter correctness for admin dashboard (Property 6)
- UI state derivation from appointment status (Property 2)

### Integration Tests
- End-to-end cancellation flow: patient requests → doctor approves → refund processes
- Firestore composite index resolves `getAvailableSlots()` query without error (Requirement 6.2)
- Razorpay refund API call with valid credentials (1-2 examples with test mode)

### Smoke Tests
- Verify `firestore.indexes.json` contains the new composite index definition (Requirement 6.1, 6.3)

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Cancellation request transaction preserves data integrity

*For any* appointment in a cancellable state (pending or confirmed) and *for any* non-empty reason string, after `requestCancellationWithTransaction` completes, the appointment document SHALL have status `cancellation_requested`, the provided cancellation reason stored, a `cancellationRequestedAt` timestamp set, and the `previousStatus` field matching the original status.

**Validates: Requirements 2.1, 2.5**

### Property 2: Cancellation-requested status disables patient actions

*For any* appointment with status `cancellation_requested`, the computed `canCancel` flag SHALL be `false` and the computed `canReschedule` flag SHALL be `false`, regardless of the appointment's scheduled date.

**Validates: Requirements 2.3**

### Property 3: Empty or whitespace-only cancellation reasons are rejected

*For any* string composed entirely of whitespace characters (including empty string), the cancellation request submission SHALL be blocked and the appointment status SHALL remain unchanged.

**Validates: Requirements 2.4**

### Property 4: Approval transaction atomically cancels and releases slot

*For any* appointment with status `cancellation_requested` and an associated slot where `slot.appointmentId` matches the appointment ID, after `approveCancellationWithTransaction` completes, the appointment status SHALL be `cancelled`, the slot's `isAvailable` SHALL be `true`, the slot's `appointmentId` SHALL be `null`, and `cancellationApprovedAt` SHALL be set.

**Validates: Requirements 3.3, 4.2**

### Property 5: Rejection transaction restores previous appointment state

*For any* appointment with status `cancellation_requested` and a stored `previousStatus` value, after `rejectCancellationWithTransaction` completes, the appointment status SHALL equal the stored `previousStatus`, and `cancellationRejectedAt` and `cancellationRejectionReason` SHALL be set.

**Validates: Requirements 3.4, 4.3**

### Property 6: Admin cancellation filter returns correct subset

*For any* collection of appointments with mixed statuses and *for any* selected filter value from {pending, approved, rejected}, the filtered results SHALL contain only appointments matching that filter criterion, and the count SHALL equal the number of matching items in the original collection.

**Validates: Requirements 4.5**

### Property 7: Refund uses correct payment identifier and full amount

*For any* approved cancellation with a valid payment record containing a `razorpayPaymentId` and `amount`, the refund request sent to Razorpay SHALL use that exact `razorpayPaymentId` and the full `amount` (converted to paise).

**Validates: Requirements 5.1**

### Property 8: Refund API error results in failed status with reason

*For any* error response from the Razorpay refund API, the payment document SHALL have `refundStatus` set to `"failed"` and `refundFailureReason` set to a non-empty string describing the error.

**Validates: Requirements 5.2**

### Property 9: Successful refund records all metadata

*For any* successful Razorpay refund response containing a refund ID, the payment document SHALL have `refundStatus` set to `"processed"`, `refundId` set to the Razorpay refund ID, and `refundedAt` set to a valid timestamp.

**Validates: Requirements 5.3**

### Property 10: No-payment cancellation skips refund without error

*For any* approved cancellation where no payment record exists for the appointment, the cancellation SHALL complete successfully with the appointment status set to `cancelled`, and no refund-related fields SHALL be set on the appointment document.

**Validates: Requirements 5.5**
