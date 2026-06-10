# Inactive Service Booking Filter Bugfix Design

## Overview

The booking page displays all services including inactive ones (`isActive === false`), leading to a poor user experience where users can select and attempt to book services that will be rejected by backend validation. This design document specifies a minimal, targeted fix: filtering services at the service layer level through a new dedicated method, ensuring only active services are displayed on the booking page while preserving all other functionality and admin capabilities to view all services.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when the booking page calls `servicesService.getAll()` without filtering by `isActive` status
- **Property (P)**: The desired behavior - booking page SHALL fetch only services where `isActive === true`
- **Preservation**: Existing functionality that must remain unchanged - admin page viewing all services, payment validation, active service booking flow, and service data display
- **ServicesService**: The Firestore service class in `/services/firestore/services.service.ts` that handles service data retrieval
- **isActive**: The boolean property on `ServiceDocument` that determines whether a service is available for booking (`true`) or inactive (`false`)
- **getActiveServices()**: Existing method in `ServicesService` that returns only active services (already exists and is unused)

## Bug Details

### Bug Condition

The bug manifests when the booking page loads and calls `servicesService.getAll()` to fetch services. The `getAll()` method returns ALL services without filtering by `isActive` status, including inactive services that should not be visible or selectable.

**Formal Specification:**
```
FUNCTION isBugCondition(pageContext)
  INPUT: pageContext of type PageLoadContext
  OUTPUT: boolean
  
  RETURN pageContext.route = "/booking"
         AND pageContext.fetchMethod = "servicesService.getAll()"
         AND NOT isFilteredByActiveStatus(pageContext.fetchMethod)
END FUNCTION
```

### Examples

**Current Behavior (Buggy):**
- User navigates to `/booking` → `servicesService.getAll()` returns 10 services including 2 inactive ones → All 10 services displayed → User selects inactive service → Payment creation fails with "[EA-PAYMENT-001] Payment Could Not Be Started | Original: Service is not active: [service_id]"

**Expected Behavior (Fixed):**
- User navigates to `/booking` → booking page calls method that returns only active services → Only 8 active services displayed → User can only select from active services → Payment creation succeeds

**Edge Cases:**
- Admin navigates to `/admin/services` → MUST still see all services (active and inactive) for management purposes → No change to admin functionality
- Dashboard at `/patient/dashboard` → Already filters by `isActive` correctly using `allServices.filter((s) => s.isActive !== false)` → Should migrate to use the same service method for consistency

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Admin page (`/admin/services`) must continue to display all services (active and inactive) for management purposes
- Payment order creation API must continue to validate `isActive === false` and reject inactive services (backend validation remains as defense-in-depth)
- Active service booking flow must continue to work exactly as before (service display, doctor selection, payment, appointment creation)
- Service data display (title, description, price, duration, doctors) must remain unchanged for active services
- Dashboard filtering logic must remain functional (though should be refactored to use service layer)

**Scope:**
All functionality NOT related to the booking page fetching inactive services should be completely unaffected. This includes:
- All admin service management functionality
- All API validation logic
- All service data structure and properties
- All other pages that use services

## Hypothesized Root Cause

Based on the bug description and codebase analysis, the root cause is:

1. **Service Layer Design**: The `ServicesService` class has a `getAll()` method that intentionally fetches ALL services without filtering, which is correct for admin purposes but incorrect for patient-facing booking flows.

2. **Missing Abstraction**: While a `getActiveServices()` method EXISTS in the service layer (line 62-67 of services.service.ts), the booking page does NOT use it. Instead, the booking page directly calls `getAll()` which has no active filter.

3. **Inconsistent Usage Pattern**: The dashboard page (`/patient/dashboard`) works around this by calling `getAll()` and then client-side filtering with `allServices.filter((s) => s.isActive !== false)`. The booking page does NOT do this filtering.

4. **Design Decision**: The most appropriate fix is to have the booking page call the EXISTING `getActiveServices()` method instead of `getAll()`, eliminating the need for client-side filtering and ensuring consistency.

## Correctness Properties

Property 1: Bug Condition - Booking Page Displays Only Active Services

_For any_ page load of the booking page (`/booking`), the services fetching logic SHALL call `servicesService.getActiveServices()` instead of `servicesService.getAll()`, ensuring that only services where `isActive === true` are fetched and displayed to users.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Admin and Other Functionality Unchanged

_For any_ page load or operation that is NOT the booking page fetching services (including admin pages, payment validation, and other service queries), the system SHALL produce exactly the same behavior as the original code, preserving the ability to view all services for admin purposes and maintaining all backend validation logic.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

The fix requires changing only ONE line of code in the booking page component.

**File**: `/app/booking/page.tsx`

**Function**: `loadServicesWithDoctors()`

**Specific Changes**:

1. **Replace `getAll()` with `getActiveServices()`**: Change line 82 from:
   ```typescript
   const allServices = await servicesService.getAll();
   ```
   To:
   ```typescript
   const allServices = await servicesService.getActiveServices();
   ```

**Rationale:**
- The `getActiveServices()` method ALREADY EXISTS in `ServicesService` (line 62-67 of services.service.ts)
- This method uses Firestore query constraints: `where("isActive", "==", true)` and `orderBy("createdAt", "desc")`
- This is a server-side filter, more efficient than client-side filtering
- This makes the booking page consistent with the service layer's intended design
- No changes needed to the service layer itself

### Alternative Considered and Rejected

**Alternative 1: Client-side filtering (like dashboard does)**
```typescript
const allServices = await servicesService.getAll();
const activeServices = allServices.filter((s) => s.isActive !== false);
```

**Rejected because:**
- Less efficient (fetches all services, then filters client-side)
- Inconsistent with existing service layer design (we already have `getActiveServices()`)
- Duplicates logic across components
- Dashboard should also be refactored to use `getActiveServices()` in a future change

**Alternative 2: Add a new method like `getActive()`**

**Rejected because:**
- Redundant - `getActiveServices()` already exists and does exactly this
- Would introduce unnecessary duplication
- No benefit over using the existing method

### Optional Refactoring (Out of Scope for This Bugfix)

The dashboard page at `/app/patient/dashboard/page.tsx` line 153-155 currently does:
```typescript
const allServices = await servicesService.getAll();
const activeServices = allServices.filter((s) => s.isActive !== false);
```

This SHOULD be refactored to:
```typescript
const activeServices = await servicesService.getActiveServices();
```

However, this is OUT OF SCOPE for this bugfix because:
- The dashboard is not exhibiting buggy behavior (it correctly filters)
- This is a performance/consistency improvement, not a bug fix
- Should be tracked as a separate technical debt item

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code by verifying inactive services are fetched, then verify the fix correctly fetches only active services and preserves existing behavior for non-booking contexts.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that the booking page fetches inactive services when using `getAll()`.

**Test Plan**: Write property-based tests that generate service datasets with mixed active/inactive services, seed Firestore with these services, simulate the booking page load using the UNFIXED code path (`getAll()`), and assert that inactive services are present in the fetched results. Run these tests on the UNFIXED code to observe failures and confirm the bug.

**Test Cases**:
1. **Mixed Services Test**: Create 5 active and 2 inactive services → Call `getAll()` → Assert result includes inactive services (will PASS on unfixed code, confirming the bug)
2. **All Inactive Test**: Create only inactive services → Call `getAll()` → Assert result is not empty and includes inactive services (will PASS on unfixed code)
3. **Active Services Test**: Create only active services → Call `getActiveServices()` → Assert result contains only active services (will PASS on unfixed code, confirming the method works)
4. **Edge Case - isActive undefined**: Create service with `isActive` undefined → Call `getAll()` → Assert service is included (may PASS on unfixed code)

**Expected Counterexamples**:
- `getAll()` returns services where `isActive === false` when called from booking page context
- Inactive services are displayed and selectable on the booking page
- Payment order creation fails for inactive service selections with error code EA-PAYMENT-001

**Scoped PBT Approach**: For deterministic verification, scope the property to concrete cases:
- Generate a fixed dataset: 3 active services (IDs: svc-1, svc-2, svc-3) and 2 inactive services (IDs: svc-4, svc-5)
- Verify `getAll()` returns all 5 services
- Verify inactive service IDs (svc-4, svc-5) are present in the result

### Fix Checking

**Goal**: Verify that for all page loads where the bug condition holds (booking page fetching services), the fixed function produces the expected behavior (only active services fetched).

**Pseudocode:**
```
FOR ALL pageLoad WHERE isBugCondition(pageLoad) DO
  result := loadServicesWithDoctors_fixed()
  ASSERT expectedBehavior(result)
    WHERE expectedBehavior(result) = 
      (ALL service IN result SATISFY service.isActive = true)
END FOR
```

**Testing Approach**: Use property-based testing to generate various service datasets and verify that the fixed booking page always receives only active services.

**Test Cases**:
1. **Mixed Services - Fixed**: Create 5 active and 2 inactive services → Fixed booking page calls `getActiveServices()` → Assert result contains only 5 active services
2. **All Active - Fixed**: Create 10 active services → Fixed booking page loads → Assert all 10 services are returned
3. **All Inactive - Fixed**: Create only inactive services → Fixed booking page loads → Assert empty result or no services displayed
4. **Empty Database - Fixed**: No services exist → Fixed booking page loads → Assert empty result, graceful handling

### Preservation Checking

**Goal**: Verify that for all contexts where the bug condition does NOT hold (admin pages, other service queries, payment validation), the fixed code produces the same result as the original code.

**Pseudocode:**
```
FOR ALL operation WHERE NOT isBugCondition(operation) DO
  ASSERT originalBehavior(operation) = fixedBehavior(operation)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across different service datasets
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-booking contexts

**Test Plan**: Observe behavior on UNFIXED code first for admin pages and other contexts, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Admin Page Preservation**: Observe that admin page displays all services (active + inactive) on unfixed code → Write property test: for any service dataset, admin page SHALL display count(active) + count(inactive) services → Verify test passes on FIXED code
2. **Payment Validation Preservation**: Observe that payment API rejects inactive services on unfixed code → Write test: attempt payment for inactive service SHALL return EA-PAYMENT-001 error → Verify test passes on FIXED code (backend validation unchanged)
3. **Active Service Booking Preservation**: Observe that active service booking flow works on unfixed code → Generate random valid bookings (active service + valid doctor + valid time) → Assert booking succeeds on FIXED code
4. **Service Data Display Preservation**: Observe service property display on unfixed code → Write property test: for any active service, verify title, description, price, duration, doctors are displayed identically → Verify test passes on FIXED code

### Unit Tests

- Test `getActiveServices()` method returns only services where `isActive === true`
- Test `getAll()` method still returns all services (unchanged for admin use)
- Test booking page loads and displays only active services after fix
- Test admin page loads and displays all services after fix (preservation)
- Test edge case: service with `isActive` undefined is treated as inactive

### Property-Based Tests

**Bug Condition Property:**
- Generate random service datasets with mixed active/inactive services
- For booking page context: verify fetched services have `isActive === true` for ALL services
- For admin page context: verify fetched services include both active and inactive services

**Preservation Property:**
- Generate random service datasets
- Verify admin functionality: count(fetched_services) = count(all_services_in_db)
- Verify payment validation: inactive service booking attempts SHALL fail with EA-PAYMENT-001
- Verify active service bookings: SHALL complete successfully end-to-end

### Integration Tests

- Test full booking flow with mix of active/inactive services in database
  - Navigate to `/booking`
  - Verify only active services are displayed
  - Select an active service
  - Complete booking successfully
- Test admin flow with mix of active/inactive services
  - Navigate to `/admin/services`
  - Verify all services (active + inactive) are displayed
  - Toggle service active status
  - Verify change persists
- Test payment API validation
  - Attempt to create payment order for inactive service directly via API
  - Verify EA-PAYMENT-001 error is returned
  - Confirm backend validation remains as defense-in-depth
