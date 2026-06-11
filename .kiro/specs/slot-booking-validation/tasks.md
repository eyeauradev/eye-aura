# Implementation Plan: Slot Booking Validation

## Overview

Implement slot booking validation to prevent double-booking by creating a `SlotFilterService` with pure overlap-detection logic, a `SlotFilterDataFetcher` for Firestore queries, frontend integration in the booking page, backend validation in the verify-payment route using Firestore transactions, and doctor panel updates to display pending bookings as blocked time.

## Tasks

- [x] 1. Create SlotFilterService with pure overlap/filter functions
  - [x] 1.1 Create `services/booking/slot-filter.service.ts` with core pure functions
    - Implement `hasTimeRangeOverlap(startA, endA, startB, endB)` using half-open range logic
    - Implement `computeEndTime(start, durationMinutes)` returning a Date offset by duration
    - Implement `filterAvailableSlots(candidates, occupied)` filtering out conflicting slots
    - Implement `buildOccupiedRanges(bookingRequests, appointments, doctorBlocks)` assembling occupied ranges from active statuses only
    - Implement `generateCandidateSlots(date, timeRanges, slotDurationMinutes)` producing time slots from doctor availability
    - Export `TimeSlot` and `OccupiedRange` interfaces
    - _Requirements: 1.4, 1.5, 1.6, 4.1, 4.2, 4.3, 4.4, 5.1_

  - [ ]* 1.2 Write property test for `hasTimeRangeOverlap`
    - **Property 1: Time Range Overlap Detection Correctness**
    - Use `fast-check` to generate arbitrary valid time ranges and verify overlap iff `startA < endB AND startB < endA`
    - **Validates: Requirements 1.4, 4.2**

  - [ ]* 1.3 Write property test for `computeEndTime`
    - **Property 2: Duration Computation Correctness**
    - Use `fast-check` to generate arbitrary start dates and positive durations, verify result is exactly `duration * 60000` ms after start
    - **Validates: Requirements 2.6, 4.1**

  - [ ]* 1.4 Write property test for `filterAvailableSlots`
    - **Property 3: Slot Exclusion Invariant**
    - Use `fast-check` to generate lists of candidate slots and occupied ranges, verify every returned slot has no overlap with any occupied range
    - **Validates: Requirements 1.5, 2.4**

  - [ ]* 1.5 Write property test for `buildOccupiedRanges` status exclusion
    - **Property 4: Cancelled/Rejected Bookings Are Excluded**
    - Use `fast-check` to generate booking requests with various statuses, verify cancelled/rejected ones never appear in output
    - **Validates: Requirements 5.1**

- [x] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Create SlotFilterDataFetcher for Firestore queries
  - [x] 3.1 Create `services/booking/slot-filter-data.service.ts` with data fetching class
    - Implement `SlotFilterDataFetcher` class with `getOccupiedRanges(doctorId, date)` method
    - Implement private `fetchBookingRequests(doctorId, dayStart, dayEnd)` querying `booking_requests` with status `in ["pending", "accepted"]`
    - Implement private `fetchAppointments(doctorId, dayStart, dayEnd)` querying `appointments` with status `in ["confirmed", "pending"]`
    - Implement private `fetchDoctorBlocks(doctorId, dayStart, dayEnd)` querying `doctor_blocks` overlapping with the day
    - Use `Timestamp.fromDate()` for Firestore date comparisons
    - Export singleton `slotFilterDataFetcher` instance
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 3.2 Write unit tests for SlotFilterDataFetcher
    - Test that correct Firestore queries are constructed for each collection
    - Test day boundary calculations (dayStart at 00:00:00, dayEnd at 23:59:59)
    - Mock Firestore and verify query parameters
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 4. Integrate slot filtering into the booking page
  - [x] 4.1 Update `TimeSelectionStep` in `app/booking/page.tsx` to use SlotFilterService
    - Create a `useAvailableSlots` hook that calls `slotFilterDataFetcher.getOccupiedRanges()` and `filterAvailableSlots()`
    - Generate candidate slots using `generateCandidateSlots()` with the booking's combined duration
    - Replace or augment existing slot rendering to only show filtered available slots
    - Add loading state while occupied ranges are being fetched
    - Show "No available slots" message when all slots are filtered out
    - _Requirements: 1.4, 1.5, 1.6, 4.3_

  - [ ]* 4.2 Write unit tests for `useAvailableSlots` hook
    - Test that slots overlapping with occupied ranges are excluded
    - Test loading state transitions
    - Test empty availability scenario
    - _Requirements: 1.5, 4.3_

- [x] 5. Add backend validation in verify-payment route with Firestore transaction
  - [x] 5.1 Add `checkSlotConflictInTransaction` function to `app/api/payments/verify-payment/route.ts`
    - Import `hasTimeRangeOverlap` and `computeEndTime` from `slot-filter.service`
    - Implement conflict checking within a Firestore Admin transaction
    - Query `booking_requests` (pending/accepted), `appointments` (confirmed/pending), and `doctor_blocks` for the same doctor
    - Return `ConflictCheckResult` with `hasConflict`, `conflictSource`, and `conflictId`
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 2.7_

  - [x] 5.2 Wrap booking_request creation in a Firestore transaction with conflict check
    - Replace the current non-transactional `booking_requests` document creation with a transaction
    - Call `checkSlotConflictInTransaction` before creating the booking_request
    - If conflict detected: update payment with `refundStatus: "pending"` and `failureReason`, return 409 response
    - If no conflict: create booking_request within the same transaction
    - _Requirements: 2.4, 2.5, 2.7, 5.3_

  - [ ]* 5.3 Write unit tests for backend conflict detection
    - Test conflict detection against existing booking_requests
    - Test conflict detection against existing appointments
    - Test conflict detection against doctor_blocks
    - Test no-conflict scenario passes through correctly
    - Test refund marking on conflict
    - **Property 5: Conflict Detection Implies Refund Marking**
    - **Validates: Requirements 2.5, 5.3**

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Update doctor panel to show pending bookings as blocked
  - [x] 7.1 Update `/doctor/slots/page.tsx` to fetch and display pending booking_requests
    - Query `booking_requests` with status "pending" for the doctor on the selected date
    - Display pending requests as blocked time ranges using amber/distinct color
    - Show existing `doctor_blocks` and confirmed appointments alongside pending requests
    - Ensure data refreshes on navigation or date change
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 7.2 Write unit tests for doctor panel slot visibility
    - Test pending booking_requests appear as blocked ranges
    - Test doctor_blocks display correctly
    - Test confirmed appointments display correctly
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using `fast-check`
- Unit tests validate specific examples and edge cases
- The `SlotFilterService` is intentionally pure (no I/O) for easy testing and reuse across frontend and backend
- Backend validation uses Firebase Admin SDK transactions (server-side), while frontend uses client-side Firestore SDK

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.5", "3.1"] },
    { "id": 2, "tasks": ["3.2", "4.1", "5.1"] },
    { "id": 3, "tasks": ["4.2", "5.2"] },
    { "id": 4, "tasks": ["5.3", "7.1"] },
    { "id": 5, "tasks": ["7.2"] }
  ]
}
```
