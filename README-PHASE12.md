# TravelEase Phase 12 — Notifications & Communication

Integrated with Phase 11. Customer notifications are persisted to MongoDB, even without SMTP configuration.

## Install and run

Backend: `cd server && npm install && cp .env.example .env && npm run dev`
Frontend: `cd client && npm install && cp .env.example .env && npm run dev`

On Windows PowerShell use `Copy-Item .env.example .env` instead of `cp`. Keep your existing secrets when upgrading.

Set `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL` and SMTP settings in `server/.env`:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-app-password
SMTP_FROM=TravelEase <notifications@example.com>
ENABLE_TRIP_REMINDERS=false
```

SMTP is optional: email status will be `skipped` and notifications remain visible in-app. Use a real SMTP provider to send emails.

## Routes

- GET `/api/notifications` — own notifications + unread count
- PATCH `/api/notifications/:id/read` — mark one read
- PATCH `/api/notifications/read-all` — mark all read
- GET `/api/notifications/admin` — admin audit
- POST `/api/notifications/admin/reminders` `{ "daysAhead": 1 }` — scan confirmed paid trips on the specified date, idempotent via dedupe keys
- POST `/api/notifications/admin/:id/retry-email` — admin retry (max 5 attempts)

Login with cookie-based auth first. Postman without an Origin header works. If using an Origin header it must match `CLIENT_URL`.

## Test flow

1. Register/login as customer; create a booking. GET `/api/notifications` should show `booking_created`.
2. Use Razorpay Test Mode and verify a captured payment; GET `/api/notifications` should show `payment_received`.
3. Login as admin; create a trip and update it; customer sees trip alerts.
4. As admin call `POST /api/notifications/admin/reminders` with `{ "daysAhead": 1 }`; a confirmed, paid booking traveling tomorrow receives a reminder.
5. Repeat the scan; no duplicate reminder for the same booking/date.
6. Check `/notifications` and `/admin/notifications` in the browser.
7. Without SMTP, verify in-app records and `skipped` email statuses. With valid SMTP, verify receipt in the destination mailbox.
8. Test a customer calling `/api/notifications/admin`; must return 403.

## Limitations

Email dispatch is best-effort and in-process (not a durable job queue). SMTP send can fail or be delayed; use a persistent worker and retry policy for production. Reminder scheduler is optional, runs per backend instance and should be replaced with a centralized scheduler in production. Dedupe keys reduce duplicates but do not replace transactional outbox semantics. Payment email is triggered by verified captured payment only. No SMS/WhatsApp gateway is included.
