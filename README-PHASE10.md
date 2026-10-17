# TravelEase Phase 10 — Admin Dashboard

Integrated Phase 1–10 source code. Phase 10 adds authenticated admin-only `/api/dashboard/overview` and responsive Recharts admin dashboard at `/admin/dashboard` and `/admin`.

## Setup (PowerShell)

Backend: `cd server`, `npm install`, `Copy-Item .env.example .env` (configure MongoDB, JWT and payment keys), `npm run dev`.

Frontend in a new terminal: `cd client`, `npm install`, `Copy-Item .env.example .env`, `npm run dev`.

Log in with an existing admin account. Go to http://localhost:5173/admin/dashboard. Admin-only API: GET http://localhost:8000/api/dashboard/overview (requires login cookie).

## Analytics semantics

- Gross collections are sums of Payment.amountPaise for paid/refund-related payment statuses.
- Recorded refunds are sums of Payment.refundAmountPaise; net = gross - refunds. These are accounting estimates, not settlement reconciliations.
- Revenue charts group by paidAt in Asia/Kolkata; last 12 months are displayed.
- All statistics come from MongoDB and are not mock data. Empty databases show zeroes.
- Admin authorization is checked server-side; customers/vendors cannot access analytics.
- Dashboard shows at most eight recent bookings and eight recent payments.

## Limitations

Razorpay credentials and an accessible MongoDB are needed for payment end-to-end tests. Verify gateway settlement/refund reconciliation separately before production. Chart months use server UTC current month for selecting the 12-month range.
