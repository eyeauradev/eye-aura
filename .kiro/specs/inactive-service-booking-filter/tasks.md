# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Booking Page Fetches Inactive Services
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Use a concrete dataset with 3 active services and 2 inactive services to ensure reproducibility
  - Test that `servicesService.getAll()` returns services where `isActive === false` when called from booking page context
  - Create test services: 3 active (svc-1, svc-2, svc-3) and 2 inactive (svc-4, svc-5)
  - Call `servicesService.getAll()` and verify inactive services (svc-4, svc-5) are present in results
  - The test assertions should match: ALL services in result SHALL have `isActive === true` (this will FAIL on unfixed code)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found: inactive services are returned by `getAll()`
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Admin and Other Functionality Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-booking contexts:
    - Admin page displays all services (active + inactive)
    - Payment validation rejects inactive service bookings with EA-PAYMENT-001 error
    - Active service booking flow completes successfully
    - Service data display (title, description, price) shows correctly
  - Write property-based tests capturing observed behavior patterns:
    - Admin preservation: for any service dataset, admin SHALL display all services (active + inactive)
    - Payment validation preservation: inactive service booking SHALL fail with EA-PAYMENT-001
    - Active booking preservation: active service bookings SHALL complete successfully
    - Service display preservation: service properties SHALL display identically for active services
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix for inactive services appearing on booking page

  - [x] 3.1 Implement the fix
    - Change line 82 in `/app/booking/page.tsx` from `servicesService.getAll()` to `servicesService.getActiveServices()`
    - The `getActiveServices()` method already exists in `ServicesService` (line 62-67 of services.service.ts)
    - This method uses Firestore query constraint: `where("isActive", "==", true)` and `orderBy("createdAt", "desc")`
    - This is a server-side filter (more efficient than client-side filtering)
    - _Bug_Condition: isBugCondition(pageContext) where pageContext.route = "/booking" AND pageContext.fetchMethod = "servicesService.getAll()" from design_
    - _Expected_Behavior: For booking page loads, SHALL fetch only services where isActive === true (Property 1 from design)_
    - _Preservation: Admin pages SHALL continue to display all services, payment validation SHALL remain, active booking flow SHALL remain unchanged (Property 2 from design)_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Booking Page Displays Only Active Services
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify all fetched services have `isActive === true`
    - Verify inactive services are NOT present in results
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Admin and Other Functionality Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Verify admin page still displays all services (active + inactive)
    - Verify payment validation still rejects inactive service bookings
    - Verify active service booking flow still works
    - Verify service data display is unchanged for active services
    - Confirm all tests still pass after fix (no regressions)

- [-] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
