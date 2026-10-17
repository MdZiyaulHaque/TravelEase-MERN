# TravelEase – Phases 16–19 integrated source

This package retains the supplied Phase 1–15 React/Vite and Express/Mongoose source and adds the following improvements. **Not production certified**; Phase 20 deployment is intentionally excluded.

## Phase 16 – Admin dashboard
- Existing revenue, bookings, payments, trips, and insights dashboards retained.
- New authenticated admin `GET /api/dashboard/operations`: read-only inventory audit, booking funnel, mismatch flags.
- Admin Dashboard includes responsive Inventory Health table with refresh, empty/error/loading handling.

## Phase 17 – Client/server integration
- Existing client routes and API integrations preserved.
- Axios response interceptor provides consistent `userMessage` for network/timeout/API errors.
- Inventory widget integrates with the new admin-only endpoint.

## Phase 18 – Security and validation
- Preserved existing JWT cookie authentication, role guards, Zod validation, Origin guard, and Razorpay raw webhook middleware.
- Added basic HTTP security headers, request IDs and JSON error requestId.
- Auth routes rate-limited to 100 requests/15 minutes per IP (adjust after review).
- Removed the dangerous temporary `TEST_BOOKING_ROLLBACK` injection and its special error handler.
- Review cookie/CSRF behavior, CSP, secure proxy settings, secrets, upload limits and payment gateway setup before production.

## Phase 19 – Testing scaffolding
- Node built-in test runner: `cd server && npm install && npm test`.
- Smoke tests: health, JSON 404, auth guard, security headers, Origin guard.
- Existing database-level rollback, inventory and booking concurrency tests were performed manually in prior Phase 15; not re-run automatically here.
- Full end-to-end UI, payment gateway and production security testing remains pending, by design.

## Local startup
1. `cd server && npm install`; copy `.env.example` to `.env` and fill in local secrets and MongoDB connection. Never commit `.env`.
2. `npm run dev` (server port 8000).
3. `cd client && npm install && npm run dev` (Vite port 5173).
4. Log in as admin, visit `/admin`, check Inventory Health and other existing dashboards.
5. `cd server && npm test`; `cd client && npm run build`.

## Safety notes
- No `.env`, node_modules, generated uploads or user database are included in the ZIP.
- Existing `client/src/pages` and `server/routes` were preserved, apart from described targeted changes.
- Inventory audit never auto-decrements seats. Reconcile manually only after audit and backup.
- Before Phase 20: verify backups/restores, coupon rollback with a test coupon, Razorpay webhooks/refunds, cookie CSRF protections, UI role routes, and real user journeys.
