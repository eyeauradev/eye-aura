# Bugfix Requirements Document

## Introduction

The booking page currently displays all services to users, including inactive services (`isActive === false`). When users attempt to book an inactive service, the payment order creation API correctly validates and rejects the request with error "[EA-PAYMENT-001] Payment Could Not Be Started | Original: Service is not active: [service_id]". This creates a poor user experience where users can select services they cannot actually book. The fix ensures only active services are visible and selectable in the booking flow.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the booking page loads THEN the system fetches all services using `servicesService.getAll()` without filtering by `isActive` status

1.2 WHEN a user views the booking page THEN the system displays inactive services (`isActive === false`) alongside active services

1.3 WHEN a user selects and attempts to book an inactive service THEN the system allows the selection and proceeds to payment order creation

1.4 WHEN payment order creation validates the selected service THEN the system rejects the request with error "[EA-PAYMENT-001] Payment Could Not Be Started | Original: Service is not active: [service_id]"

### Expected Behavior (Correct)

2.1 WHEN the booking page loads THEN the system SHALL fetch only services where `isActive === true`

2.2 WHEN a user views the booking page THEN the system SHALL display only active services (`isActive === true`)

2.3 WHEN a user attempts to select a service THEN the system SHALL only present active services as options

2.4 WHEN a user books a service from the booking page THEN the system SHALL successfully create a payment order without service validation errors

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user books an active service THEN the system SHALL CONTINUE TO successfully create payment orders as before

3.2 WHEN the payment order creation API validates services THEN the system SHALL CONTINUE TO check `isActive === false` and reject inactive services (backend validation remains)

3.3 WHEN active services are displayed on the booking page THEN the system SHALL CONTINUE TO show all service details (name, description, price, etc.) exactly as before

3.4 WHEN a user navigates the booking flow for active services THEN the system SHALL CONTINUE TO function exactly as it currently does
