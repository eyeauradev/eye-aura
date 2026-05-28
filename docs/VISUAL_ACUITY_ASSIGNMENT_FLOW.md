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

---

## 12. Calibration Sync — `useCalibrationSync` Hook

**File**: `modules/visual-acuity/engine/useCalibrationSync.ts`

After the initial credit card calibration, the device environment may change (DPR change from monitor switch or pinch-zoom, viewport resize, or orientation change). The `useCalibrationSync` hook keeps `pxPerMm` accurate by listening for these changes and recalculating.

### Trigger Events

| Event | Listener | Fires When |
|---|---|---|
| Resize | `window.addEventListener("resize", ...)` | Viewport dimensions change |
| Orientation | `window.addEventListener("orientationchange", ...)` | Device rotates |
| DPR Change | `matchMedia('(resolution: Xdppx)').addEventListener("change", ...)` | Monitor switch, pinch-zoom |

### Recalculation Logic

```typescript
// Constants
const CARD_WIDTH_MM = 85.60;  // ISO/IEC 7810 ID-1 standard
const DEBOUNCE_MS = 300;

// When DPR changes:
newPxPerMm = (calibration.cardWidthPx / CARD_WIDTH_MM) × (currentDpr / calibration.dpr)

// When only viewport size changes (no DPR change):
// pxPerMm stays the same — physical pixel density hasn't changed
// Only deviceWidth/deviceHeight are updated in the effective CalibrationData
```

### Hook Signature

```typescript
function useCalibrationSync(calibration: CalibrationData | null): CalibrationData | null
```

- **Input**: Current `CalibrationData` from the calibration step (or null if not yet calibrated)
- **Output**: Effective `CalibrationData` — either the original or a recalculated version
- **Debouncing**: All recalculations debounced at 300ms to prevent excessive re-renders
- **Cleanup**: All event listeners removed on unmount; pending debounce timers cleared

### Integration with TestingShell

```typescript
// In TestingShell component:
const effectiveCalibration = useCalibrationSync(calibration);

// Passed to SnellenRenderer:
<SnellenRenderer calibration={effectiveCalibration} ... />
```

### SVG Smooth Transition

The SnellenRenderer SVG container includes:
```css
transition: width 0.3s ease, height 0.3s ease;
```

This ensures that when `pxPerMm` is recalculated and SVG dimensions change, the visual update is smooth rather than jarring.

---

## 13. Responsive Layout — TestingShell

**File**: `modules/visual-acuity/steps/TestingShell.tsx`

The Snellen test reading phase uses a responsive layout that adapts to viewport width:

### Desktop Layout (≥768px / `md:` breakpoint)

```
┌──────────────────────────────────────────────────────────────┐
│  ┌─ Eye Info (w-28) ─┐  ┌─ Snellen Chart (flex-1) ─┐  ┌─ Timer (w-28) ─┐  │
│  │  Eye icon          │  │                           │  │  Circular ring  │  │
│  │  "Right Eye"       │  │  [E F P T O Z]           │  │  Countdown      │  │
│  │  Lv 3/11           │  │                           │  │  "sec left"     │  │
│  └────────────────────┘  └───────────────────────────┘  └─────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

- 3-column flex layout: `hidden md:flex items-center gap-4`
- Left column: `w-28 md:flex-shrink-0` — eye icon, eye name, level indicator
- Center: `flex-1` — SnellenRenderer (primary focus, never compressed)
- Right column: `w-28 md:flex-shrink-0` — circular countdown timer

### Mobile Layout (<768px)

```
┌──────────────────────────────────────────────────────────────┐
│  ROW 1: ┌─ Eye Info ──────────────── Timer ─┐               │
│          │  [icon] Right Eye  Lv 3/11   [⏱] 2s │            │
│          └──────────────────────────────────────┘            │
│  ROW 2: ┌─ Snellen Chart (full width) ──────────┐           │
│          │         [E F P T O Z]                  │           │
│          └────────────────────────────────────────┘           │
└──────────────────────────────────────────────────────────────┘
```

- Row 1: `flex md:hidden items-center justify-between px-4 py-3`
  - Left: compact eye info (8×8 icon + name + level)
  - Right: compact timer (48×48 SVG ring + label)
- Row 2: `flex md:hidden items-center justify-center w-full px-3 py-4 min-h-[140px]`
  - SnellenRenderer at full container width — maximum horizontal space for optotype readability

### Why This Layout?

On mobile viewports (e.g., iPhone 14 at 390px), the desktop 3-column layout compresses the chart area to ~250px after subtracting two `w-28` (112px each) columns and gaps. The 2-row mobile layout gives the chart the full container width (~350px+), ensuring optotypes remain readable at their calibrated physical sizes.

---

## 14. SVG Rendering Precision

**File**: `modules/visual-acuity/SnellenRenderer.tsx`

### Physical Sizing Pipeline

```
1. rawCapPx  = exactHeightMm × pxPerMm          (calibrated physical size)
2. capPx     = max(rawCapPx, MIN_CAP_PX)         (device floor: 4px minimum)
3. fontSize  = capPx / CAP_HEIGHT_RATIO           (= capPx / 0.711)
4. SVG rendered at exact numeric pixel dimensions (width={svgW} height={svgH})
```

### Key Constants

| Constant | Value | Purpose |
|---|---|---|
| `CAP_HEIGHT_RATIO` | 0.711 | Arial cap height as fraction of em-square (1456/2048 UPM) |
| `MIN_CAP_PX` | 4 | Hard device-floor for capital height in CSS px |
| `LETTER_GAP_RATIO` | 0.5 | Inter-letter gap = ½ cap height (Sloan crowding standard) |
| `PAD_H_RATIO` | 0.75 | Horizontal edge padding ratio |
| `PAD_V_RATIO` | 0.4 | Vertical padding ratio (top and bottom) |
| `CARD_WIDTH_MM` | 85.60 | ISO/IEC 7810 ID-1 credit card width for calibration |

### Sloan Chart Spacing

Each letter occupies one "slot" of width = `capPx`. Inter-letter gap = `capPx × 0.5`.

```
totalLettersW = letters.length × slotW + (letters.length - 1) × gap
svgW = totalLettersW + padH × 2
svgH = capPx + padV × 2
baselineY = padV + capPx  (alphabetic baseline position)
```

### Font Selection

`'Helvetica Neue', 'Arial', 'Liberation Sans', sans-serif` — chosen because:
- Standard clinical Snellen charts use bold sans-serif letterforms
- Arial/Helvetica cap height ratio (0.711) is consistent across browsers and OS
- Real ophthalmic letter shapes: proper curved O, C, D
- Available on all platforms without web font loading

### SVG Rendering Attributes

```tsx
<svg
  viewBox={`0 0 ${svgW} ${svgH}`}
  width={svgW}
  height={svgH}
  textRendering="geometricPrecision"
  shapeRendering="geometricPrecision"
/>
```

- Exact numeric `width` and `height` — browser cannot scale this element
- `viewBox` matches pixel dimensions 1:1 (1 viewBox unit = 1 CSS px)
- `geometricPrecision` for sharp sub-pixel edges
- `overflowX: auto` on scroll wrapper — large lines scroll, never shrink

---

## 15. Bug Fixes & UX Improvements (2026-05-28)

### 15.1 Assessment Card — Clickable Start/Continue Button

**Problem:** Assessment cards with status `assigned` or `in_progress` were not clickable. The "Begin" button was a `<button>` nested inside a `<Link>` (invalid HTML) or the `canStart` condition was blocked by an expired `expiresAt` timestamp.

**Root Cause:** Auto-assigned assessments had `expiresAt` set to 1 hour after appointment time (too short). The `canStart` condition included `withinExpiry` check which blocked the button.

**Fix:**
- `canStart` now only checks `status === "assigned" || status === "in_progress"` — expiry does not block starting
- Expired assessments (past `expiresAt` but not yet formally `status: "expired"`) show an "Expired — Ask your doctor to reassign" message instead of a button
- Action buttons are now plain `<Link>` elements styled as buttons (not `<button>` inside `<Link>`)
- Auto-assigned assessment `expiresAt` changed from 1 hour after appointment → 7 days after creation

**Files:** `app/patient/assessment/page.tsx`, `services/firestore/booking-requests.service.ts`

---

### 15.2 Assessment Auto-Assignment — triggerMode Check

**Problem:** Service automation was assigning assessments regardless of `triggerMode`. Assessments were being created even for services with `triggerMode: "before_appointment"`.

**Fix:** Added `service.assessmentAutomation.triggerMode === "instant"` check in `acceptRequest()`.

```typescript
// Before (incorrect):
if (service?.assessmentAutomation?.enabled) { ... }

// After (correct):
if (service?.assessmentAutomation?.enabled && service.assessmentAutomation.triggerMode === "instant") { ... }
```

**File:** `services/firestore/booking-requests.service.ts`

---

### 15.3 Removed "Join Consultation" Button

**Problem:** Patient appointment pages showed a "Join Consultation" button. Consultations happen off-platform (Google Meet/Zoom) — the button served no purpose and was misleading.

**Fix:** Removed `canJoin` logic and "Join" / "Join Consultation" buttons from:
- `app/patient/appointments/page.tsx` (list view)
- `app/patient/appointments/[id]/page.tsx` (detail view)

Replaced with an informational section: if the doctor has shared a consultation link, it is displayed as a clickable URL. Otherwise, a message explains the doctor will share the link before the appointment.

---

### 15.4 Removed Hardcoded "google_meet" Default

**Problem:** All new appointments were created with `consultationPlatform: "google_meet"` hardcoded, even though the platform is not always Google Meet.

**Fix:**
- `consultationPlatform` field made optional (`?`) in `AppointmentDocument` type
- Removed `"google_meet"` default from all appointment creation sites:
  - `services/firestore/booking-requests.service.ts`
  - `services/booking/transaction.service.ts`
  - `services/booking/booking.service.ts`
- `appointmentConverter.toFirestore()` now strips `undefined` fields before writing to Firestore (Firestore rejects `undefined` values)
- Admin appointment detail shows "Not set" when platform is undefined

**Files:** `types/firestore.ts`, `services/firestore/converters.ts`, `services/firestore/booking-requests.service.ts`, `services/booking/transaction.service.ts`, `services/booking/booking.service.ts`, `app/admin/appointments/[id]/page.tsx`

---

### 15.5 Calibration UI — Mobile Overflow Fix

**Problem:** On small mobile screens (320px), the calibration fine-tune buttons (`-5px`, `-1px`, `+1px`, `+5px`) overflowed the viewport. The calibration card outline was also being clipped by `overflow-hidden` on the AssessmentWrapper.

**Fix:**
- Fine-tune buttons changed from `flex gap-3` with fixed padding → `grid grid-cols-4 gap-1.5 w-full` so each button takes exactly 1/4 of available width
- Icons on ±5px buttons hidden on mobile (`hidden sm:block`) to prevent text clipping
- Calibration card rectangle separated from controls — card renders freely without a clipping container
- `AssessmentWrapper` changed from `overflow-hidden` → `overflow-visible` so the card can extend beyond panel edges
- Stage content div uses `overflow-x-visible` to allow horizontal overflow while keeping vertical scroll

**Purpose:** The calibration card must be able to overflow the screen edges so users can hold a physical bank card against the screen for size comparison.

**Files:** `modules/visual-acuity/steps/CalibrationStep.tsx`, `components/premium/assessment-wrapper.tsx`

---

### 15.6 Assessment Card Layout Alignment

**Problem:** Assessment cards had inconsistent alignment between expired and non-expired states. The meta column (doctor, date, badge) and action column were not vertically aligned.

**Fix:** Restructured card to a consistent single-row layout:
- Icon on the left (fixed size)
- Title + description in the middle (`flex-1`)
- Right-aligned column with doctor, date, status badge, and action button all stacked

All cards (expired, ready, in-progress, completed) now use identical structure for consistent alignment.

**File:** `app/patient/assessment/page.tsx`
