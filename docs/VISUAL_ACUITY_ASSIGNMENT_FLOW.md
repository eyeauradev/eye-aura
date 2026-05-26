# Visual Acuity Assignment Flow

> Last updated: May 2026
> Synchronized with: `types/firestore.ts`, `services/firestore/vision-assessments.service.ts`, `app/api/assessments/assign/route.ts`

---

## 1. Overview

Visual Acuity assessments in Eye Aura are **doctor-controlled and appointment-driven**. Patients cannot self-start an assessment. All access is gated through an assigned `VisionAssessmentDocument` in the `vision_assessments` Firestore collection.

---

## 2. Assessment Types

| Type   | Description                    | Distance |
|--------|--------------------------------|----------|
| `far`  | Far Vision — Snellen chart     | 3 metres |
| `near` | Near Vision — near reading chart | 40 cm  |

Assessments can be assigned individually or together (`["far", "near"]`).

---

## 3. Access Control Rules

### Patient
- Cannot self-initiate any assessment.
- Reads only their own `vision_assessments` documents.
- Accesses `/patient/assessment/visual-acuity?id=<assessmentId>` — the page validates ownership and status before rendering the test.
- Assessment status must be `assigned` or `in_progress` to be accessible.

### Doctor
- Can assign Far Vision, Near Vision, or both.
- **Must provide a valid `appointmentId`** belonging to their own account.
- The API enforces: `appointment.doctorId === callerUid` AND `appointment.patientId === patientId`.
- Cannot assign assessments to patients without a linked appointment.

### Admin
- Unrestricted assignment via `/admin/assessments`.
- No appointment required; `overrideUsed: true` is stored for audit.
- Can assign to any patient at any time.

---

## 4. Assignment Paths

### 4a. Manual Doctor Assignment
**Location:** `/doctor/appointments/[id]` → "Assign Vision Assessment" card

1. Doctor opens appointment detail page.
2. Selects Far / Near / Both using the toggle buttons.
3. Clicks "Assign Assessment".
4. Frontend calls `POST /api/assessments/assign` with the doctor's Firebase ID token.
5. Server validates: token → doctor role → appointment ownership → patient match.
6. `vision_assessments` document created with `assignedRole: "doctor"`, `autoAssigned: false`.
7. Patient sees the assessment immediately on their dashboard.

### 4b. Admin Override Assignment
**Location:** `/admin/assessments`

1. Admin searches for a patient by name/email.
2. Selects assessment type(s).
3. Clicks "Assign Assessment (Admin Override)".
4. Calls `POST /api/assessments/assign` with `assignedRole: "admin"`, `overrideUsed: true`.
5. No appointment linkage required.
6. Stored with full audit metadata.

### 4c. Service Automation (Instant Trigger)
**Trigger:** Doctor accepts a booking request via `/doctor/requests`

1. Patient pays and books a service.
2. Doctor accepts the booking request → `booking-requests.service.ts::acceptRequest()`.
3. System checks `service.assessmentAutomation.enabled` AND `triggerMode === "instant"`.
4. If both true: a `vision_assessments` document is created with:
   - `assignedRole: "system"`
   - `autoAssigned: true`
   - `assessmentTypes` from `service.assessmentAutomation.assessmentTypes`
   - `appointmentId` linked to the newly-created appointment
5. Patient's dashboard shows the assessment as "Ready".
6. Failure is non-fatal — acceptance proceeds regardless.

---

## 5. Assessment Lifecycle

```
assigned  →  in_progress  →  completed
    ↓
  expired  (7 days after creation if not started)
```

| Status        | Set when                                           |
|---------------|----------------------------------------------------|
| `assigned`    | Created by doctor / admin / system                |
| `in_progress` | Patient first opens the assessment URL             |
| `completed`   | AcuitySession reports results (future integration) |
| `expired`     | 7 days pass without completion (cron/manual)       |

---

## 6. Service Assessment Automation Schema

```ts
interface ServiceAssessmentAutomation {
  enabled: boolean;
  assessmentTypes: VisionAssessmentType[];   // ["far"] | ["near"] | ["far","near"]
  triggerMode: "instant" | "before_appointment";
  triggerMinutesBefore?: number;             // only for before_appointment
}
```

Configured in admin service create/edit form under "Assessment Automation".

`before_appointment` trigger requires a cron/scheduled job (future implementation).

---

## 7. VisionAssessmentDocument Schema

```ts
interface VisionAssessmentDocument {
  id: string;
  patientId: string;
  doctorId?: string;
  appointmentId?: string;
  serviceId?: string;
  assignedBy: string;           // UID of assigning user
  assignedRole: "doctor" | "admin" | "system";
  overrideUsed: boolean;        // true for admin bypass
  assessmentTypes: VisionAssessmentType[];
  status: "assigned" | "in_progress" | "completed" | "expired";
  autoAssigned: boolean;
  resultFar?: { rightEye: string; leftEye: string; completedAt: Date };
  resultNear?: { rightEye: string; leftEye: string; completedAt: Date };
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;             // 7 days from createdAt
}
```

---

## 8. API Route

### `POST /api/assessments/assign`

**Auth:** Firebase ID token (Bearer)  
**Allowed callers:** `doctor`, `admin` roles only

**Request body:**
```json
{
  "patientId": "uid_...",
  "assessmentTypes": ["far", "near"],
  "assignedRole": "doctor",
  "doctorId": "uid_...",
  "appointmentId": "apt_...",
  "overrideUsed": false,
  "autoAssigned": false
}
```

**Response (201):**
```json
{ "success": true, "assessmentId": "uuid" }
```

**Permission enforcement (server-side):**
- Doctor: `appointmentId` required; appointment must belong to caller; patient must match.
- Admin: unrestricted.
- Patient / unauthenticated: rejected (403).

---

## 9. Firestore Security Rules Summary

```
vision_assessments/{id}:
  read:   patient (own) | doctor (assigned by them) | admin
  create: doctor (own doctorId, role=doctor) | admin SDK (API route)
  update: patient (status/result fields only) | doctor (own) | admin
  delete: admin only
```

---

## 10. Patient Dashboard Flow

`/patient/assessment` shows three sections:
- **Ready to Start** — `status: assigned | in_progress`
- **Completed** — `status: completed`
- **Expired** — `status: expired`

Each card links to `/patient/assessment/visual-acuity?id=<assessmentId>`.

Direct navigation to `/patient/assessment/visual-acuity` without a valid `?id=` returns a "not available" gate screen.

---

## 11. Future Extensibility

- `before_appointment` trigger: requires a scheduled job (Cloud Functions / Vercel Cron) that queries assessments with `status=assigned` AND the linked appointment is within `triggerMinutesBefore` minutes.
- Bulk admin assignment.
- Push/email notifications when assessment is assigned.
- AI result interpretation after completion.
- Doctor live result review during tele-consultation.
