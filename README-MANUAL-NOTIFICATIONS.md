# Phase 12: Manual + Automatic Notifications (Integrated)

This is the full Phase 1–12 project with an additional admin-only manual notification endpoint.

## Run

Backend: `cd server && npm install && npm run dev` (configure `.env` from `.env.example` first).
Frontend: `cd client && npm install && npm run dev` (configure `.env` first).

## Manual create (admin login required)

`POST http://localhost:8000/api/notifications/admin/create`

```json
{
  "userId": "YOUR_CUSTOMER_MONGODB_ID",
  "title": "Welcome to TravelEase",
  "message": "Your account is ready. Explore tour packages.",
  "link": "/packages",
  "requestId": "welcome-test-001"
}
```

`requestId` is optional; reuse the same value to avoid duplicate notifications on retries. Use a different requestId for a new notification. `link` must be an internal path. All values are validated server-side; admins only.

Response: `{ "success": true, "message": "Notification created", "data": { ... } }`. `emailStatus` is `sent`, `failed`, or `skipped` depending on SMTP setup. Database notification is saved regardless of SMTP availability.

## Automatic booking/payment notifications

Already integrated in the original Phase 12 source:

- `server/routes/booking.routes.js` calls `notifications.onBookingCreated(booking)` after successful booking creation.
- `server/routes/payment.routes.js` calls `notifications.onPaymentConfirmed(booking,payment)` only when gateway-verified payment changes the booking to confirmed.
- `server/services/notifications.js` creates notifications for the customer and admin accounts, and attempts SMTP delivery.

Do not manually mark a booking as paid in MongoDB to simulate a payment; this bypasses gateway verification. Use Razorpay Test Mode.

## Postman test flow

1. Log in as admin with `POST /api/auth/login` (Postman cookie jar stores access_token).
2. Get a valid customer `_id` from MongoDB or admin customer list.
3. `POST /api/notifications/admin/create` with the JSON above.
4. Log in as that customer (separate Postman session or replace login cookie).
5. `GET /api/notifications` to list their notifications.
6. `PATCH /api/notifications/:id/read` or `PATCH /api/notifications/read-all` (no body needed).
7. `GET /api/notifications` again; `readAt` will be a timestamp.
8. Check `GET /api/notifications/admin` as admin for all records.

## Automatic booking test

As a customer, choose an active package and published future departure. Create a booking via the frontend or `POST /api/bookings` with `{ "packageId": "...", "departureId": "...", "travelers": [{"name":"Test Customer","age":25}] }`. Booking event creates a `booking_created` notification. Pay through the Razorpay Test Checkout to trigger a `payment_received` notification.

## Environment

Optional SMTP vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. Without valid SMTP, in-app notifications still work.

## Limits

Actual MongoDB, browser and SMTP integration tests must be run in your environment. No real gateway charges are needed for Razorpay Test Mode.
