# TravelEase Phase 14 – Advanced Analytics

Integrated with Phase 13. Existing routes and features are preserved.

## New API
GET /api/dashboard/insights (admin cookie required)
Optional query params: `from=2026-10-01&to=2026-10-31` (YYYY-MM-DD).
Returns booking statuses, paid revenue and refunds in INR, top confirmed packages, and monthly customer registrations. Booking and customer filters use createdAt; revenue uses paidAt.

## New frontend
Open `http://localhost:5173/admin/insights` after admin login, or use Advanced Insights link from admin dashboard.

## Start
Server: `cd server && npm install && npm run dev`
Client: `cd client && npm install && npm run dev`
Configure your own server/.env and client/.env from the example files. Do not put real secrets in the ZIP.

## Postman
1. Login as admin via existing POST /api/auth/login.
2. GET http://localhost:8000/api/dashboard/insights
3. GET http://localhost:8000/api/dashboard/insights?from=2026-10-01&to=2026-10-31
4. Negative: `?from=2026-12-31&to=2026-01-01` should return HTTP 400.

## Notes
This is an additive enhancement to the existing Phase 13 dashboard and reporting APIs. Data requires a running MongoDB connection. Live API and browser tests were not performed in this build environment.
