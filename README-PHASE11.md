# TravelEase Phase 11 — Reports & Export Management

Includes all Phase 1–10 source files plus new admin reports module.

## Setup (Windows PowerShell)

Backend: `cd server`, `npm install`, copy `.env.example` to `.env`, configure MongoDB/JWT/Razorpay, `npm run dev`.
Frontend: `cd client`, `npm install`, copy `.env.example` to `.env`, `npm run dev`.

Open `http://localhost:5173/admin/reports` and sign in with an existing **admin** account. No admin signup is exposed.

## Endpoints (admin-only, cookie JWT)

`GET /api/reports/:type?from=2026-01-01&to=2026-10-13&status=confirmed&search=alex&format=json`

`:type`: `bookings`, `customers`, `payments`, `revenue`. `format`: `json` (default), `csv`, `xlsx`, `pdf`. Date boundaries are inclusive UTC calendar dates. Revenue groups payments by paidAt UTC month; other reports filter createdAt. Revenue includes successful paid/refund states only, and subtracts recorded refunds. Status/search are not applied to revenue. Exports and JSON capped at 10,000 records. The CSV/XLSX exporters escape formula-like text to reduce spreadsheet injection risk.

### Postman
1. `POST /api/auth/login` with admin email/password (cookie retained by Postman).
2. `GET http://localhost:8000/api/reports/bookings?from=2026-01-01&to=2026-12-31` -> JSON.
3. `GET http://localhost:8000/api/reports/payments?format=csv` -> Save response.
4. `GET http://localhost:8000/api/reports/customers?format=xlsx` -> Save response.
5. `GET http://localhost:8000/api/reports/revenue?format=pdf` -> Save response.
6. Sign in as customer and repeat -> 403. Without auth -> 401.

## Limitations
- This is a demo, not audited accounting software. Refund dates aren't independently modelled; historical revenue grouping attributes refunds to original payment month.
- Reports cap results at 10k; implement streaming/pagination for larger datasets. PDF columns can be narrow for wide reports.
- Integration requires a working MongoDB, real data, and Phase 8 Razorpay test setup; no real payments should be used until gateway flow is fully audited.
