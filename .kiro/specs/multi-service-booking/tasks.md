# Implementation Plan: Multi-Service Booking

## Overview

This plan transforms the existing single-service booking wizard into a multi-service booking system. Tasks are sequenced to build the compatibility engine first (pure functions, easily testable), then update data models, modify API routes, and finally refactor the booking wizard UI. Each step builds on the previous, with checkpoints at natural breaks.

## Tasks

- [x] 1. Create service compatibility module with pure functions
  - [x] 1.1 Create `lib/booking/compatibility.ts` with core compatibility functions
    - Implement `computeDoctorIntersection(services: ServiceDocument[]): string[]` — returns the intersection of `doctorIds` across all services
    - Implement `computeServiceCompatibility(selectedServices, allServices): Map<string, { compatible: boolean }>` — marks each unselected service as compatible/incompatible based on whether adding it keeps the doctor intersection non-empty
    - Implement `computeBookingSummary(services): { totalPrice, totalDuration, currency }` — sums prices and durations, uses first service's currency
    - Implement `getEffectiveServiceIds(doc: { serviceId: string; serviceIds?: string[] }): string[]` — returns `serviceIds` if present and non-empty, otherwise `[serviceId]`
    - _Requirements: 2.1, 2.3, 2.4, 1.5, 5.1, 5.4, 6.4, 7.3_

  - [ ]* 1.2 Write property test: Doctor intersection correctness (Property 2)
    - **Property 2: Doctor intersection correctness**
    - Create `lib/booking/__tests__/compatibility.test.ts`
    - Use fast-check to generate arbitrary arrays of services with random `doctorIds`
    - Assert `computeDoctorIntersection(services)` equals the mathematical set intersection of all services' `doctorIds`
    - Minimum 100 iterations
    - **Validates: Requirements 3.1**

  - [ ]* 1.3 Write property test: Service compatibility correctness (Property 1)
    - **Property 1: Service compatibility correctness**
    - Use fast-check to generate selected services and candidate services
    - Assert a candidate is compatible iff the intersection of its `doctorIds` with the current doctor intersection is non-empty
    - Minimum 100 iterations
    - **Validates: Requirements 1.3, 2.1, 2.3, 2.4**

  - [ ]* 1.4 Write property test: Price and duration summation (Properties 3 & 4)
    - **Property 3: Price summation correctness**
    - **Property 4: Duration summation correctness**
    - Use fast-check to generate arrays of services with numeric prices and durations
    - Assert `computeBookingSummary(services).totalPrice` equals arithmetic sum of prices
    - Assert `computeBookingSummary(services).totalDuration` equals arithmetic sum of durations
    - Assert currency equals first service's currency
    - Minimum 100 iterations
    - **Validates: Requirements 1.5, 5.1, 5.4, 6.4**

  - [ ]* 1.5 Write property test: Effective service IDs fallback (Property 7)
    - **Property 7: Effective service list fallback**
    - Use fast-check to generate documents with/without `serviceIds` array
    - Assert `getEffectiveServiceIds` returns `serviceIds` when present and non-empty, `[serviceId]` otherwise
    - Minimum 100 iterations
    - **Validates: Requirements 7.3**

- [x] 2. Update data models and type interfaces
  - [x] 2.1 Update `types/booking.ts` — Replace single service with array in BookingState
    - Change `service: ServiceDocument | null` to `selectedServices: ServiceDocument[]`
    - Keep `BookingStep` and other interfaces unchanged
    - _Requirements: 6.5_

  - [x] 2.2 Update `types/firestore.ts` — Add multi-service fields to document interfaces
    - Add `serviceIds?: string[]` and `combinedDuration?: number` to `BookingRequestDocument`
    - Add `serviceIds?: string[]` and `combinedDuration?: number` to `AppointmentDocument`
    - Add `serviceIds?: string[]` to `PaymentDocument`
    - Keep existing `serviceId` field intact for backward compatibility
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.2_

  - [ ]* 2.3 Write unit tests for backward compatibility invariant (Property 6)
    - **Property 6: serviceId backward compatibility invariant**
    - Write example-based tests verifying that any document creation logic always sets `serviceId = serviceIds[0]`
    - Test the `getEffectiveServiceIds` helper with edge cases (empty array, undefined, single element)
    - **Validates: Requirements 7.2, 7.3**

- [x] 3. Update payment API routes for multi-service support
  - [x] 3.1 Update `app/api/payments/create-order/route.ts` to accept `serviceIds` array
    - Accept `serviceIds: string[]` in request body alongside existing `serviceId`
    - Validate that `serviceIds` is a non-empty array of strings
    - Validate that `amount` equals the sum of all service prices (server-side verification)
    - Validate all services exist and are active
    - Validate all service currencies match
    - Store `serviceIds` in the payment document
    - Set `serviceId` to `serviceIds[0]` for backward compatibility
    - Update Razorpay order notes to include all service IDs
    - _Requirements: 5.1, 5.2, 5.4, 6.1, 7.2_

  - [x] 3.2 Update `app/api/payments/verify-payment/route.ts` to create booking request with `serviceIds`
    - When creating the `booking_request` document, include `serviceIds` array from the payment document
    - Set `serviceId` to `serviceIds[0]` for backward compatibility
    - Calculate and store `combinedDuration` (sum of all service durations)
    - Store `paymentAmount` as the combined total
    - _Requirements: 5.3, 6.1, 6.2, 6.4, 7.2_

  - [x] 3.3 Update `services/firestore/booking-requests.service.ts` `acceptRequest()` to handle multi-service appointments
    - When creating the appointment document, include `serviceIds` from the booking request
    - Calculate `combinedDuration` as sum of all service durations
    - Use `combinedDuration` for the doctor block end time instead of single service duration
    - Set `serviceId` to `serviceIds[0]` for backward compatibility
    - Handle assessment automation for each service that has it enabled
    - _Requirements: 6.3, 6.4, 7.2_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Refactor Step 1 (Service Selection) for multi-select with compatibility
  - [x] 5.1 Refactor `ServiceSelectionStep` component in `app/booking/page.tsx` for multi-select
    - Replace single-select `onSelect` with toggle behavior (select/deselect on click)
    - Use `computeServiceCompatibility` to determine which services are disabled
    - Display disabled services with reduced opacity and disabled click interaction
    - Show checkmark indicator in top-right corner of selected cards
    - Remove auto-advance to Step 2 on service selection
    - Update parent `BookingPage` state to use `selectedServices: ServiceDocument[]`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.2, 8.1_

  - [x] 5.2 Add Summary Bar and Continue Button to Step 1
    - Add Summary Bar below the service grid showing "N services selected · Total: ₹X" using `computeBookingSummary`
    - Add Continue Button at the bottom, enabled only when `selectedServices.length > 0`
    - Summary Bar updates in real-time as services are toggled
    - Continue Button advances to Step 2 on click
    - _Requirements: 1.5, 1.6, 1.7, 8.2, 8.4_

  - [x] 5.3 Add incompatibility tooltip/explanation to disabled service cards
    - When a disabled service card is hovered, show tooltip: "No common doctor available for this combination"
    - On mobile (tap), show inline text below the card title
    - _Requirements: 2.2, 8.3_

- [x] 6. Refactor Step 2 (Doctor Selection) for filtered doctors and Continue button
  - [x] 6.1 Update `DoctorSelectionStep` to filter doctors by intersection of selected services
    - Use `computeDoctorIntersection(selectedServices)` to get the valid doctor IDs
    - Display only doctors whose ID appears in the intersection
    - If intersection is empty, show informational message with Back button
    - Remove auto-advance on doctor selection
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 6.2 Update "Also available from this doctor" section to add services to selection
    - Show services from the selected doctor that are NOT already in `selectedServices`
    - When "Add" is clicked, append service to `selectedServices` array and update summary
    - Update total price and duration display
    - _Requirements: 4.2, 4.3_

  - [x] 6.3 Add Continue Button to Step 2
    - Show Continue Button enabled only when a doctor is selected
    - Continue Button advances to Step 3
    - Preserve selected services when navigating back to Step 1
    - _Requirements: 4.1, 4.4, 8.2, 8.5_

- [x] 7. Update Confirmation Step and payment flow for combined payment
  - [x] 7.1 Update `ConfirmationStep` to display all selected services with itemized breakdown
    - Show each selected service with its individual price and duration
    - Show combined total price and combined duration
    - Pass `serviceIds` array and combined amount to the `create-order` API call
    - Update `handleConfirm` in `BookingPage` to send `serviceIds` instead of single `serviceId`
    - _Requirements: 5.1, 5.2, 6.2_

  - [ ]* 7.2 Write unit tests for booking wizard state management
    - Test service toggle preserves step (Property 5 — example-based)
    - Test navigation back from Step 2 preserves selected services (Property 8 — example-based)
    - Test Continue button enabled/disabled conditions
    - Test combined payment amount calculation matches selected services
    - **Validates: Requirements 1.2, 1.6, 1.7, 4.4, 8.5**

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The compatibility module (Task 1) is pure functions with no side effects, making it ideal for property-based testing
- Backward compatibility is maintained throughout: `serviceId` always equals `serviceIds[0]`
- No data migration needed — existing documents without `serviceIds` work via the `getEffectiveServiceIds` fallback

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "2.2"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.5", "2.3", "3.1"] },
    { "id": 2, "tasks": ["3.2", "3.3"] },
    { "id": 3, "tasks": ["5.1", "6.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "6.2", "6.3"] },
    { "id": 5, "tasks": ["7.1"] },
    { "id": 6, "tasks": ["7.2"] }
  ]
}
```
