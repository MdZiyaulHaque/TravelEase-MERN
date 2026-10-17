# TravelEase Phase 13 — Integrated MERN Project

This ZIP includes the supplied **complete Phase 12 source** with Phase 13 Reviews, Ratings, Moderation, Feedback and Analytics integrated. Existing notification, booking and payment routes remain intact.

## Windows PowerShell quick start

1. Extract ZIP; open `TravelEase_Phase13_Integrated` in VS Code.
2. `cd server; npm install; Copy-Item .env.example .env` (edit `.env` with your **existing Phase 12 MongoDB, JWT, SMTP and Razorpay test** settings); `npm run dev`.
3. New terminal: `cd client; npm install; Copy-Item .env.example .env` (ensure `VITE_API_URL=http://localhost:8000/api`); `npm run dev`.
4. Open `http://localhost:5173`. Existing customer/admin accounts in your MongoDB work unchanged.
5. Existing user passwords, credentials and database are **not included** in this ZIP. Do not replace your configured `.env` with placeholders.

## Pages

- `/packages/:id` — approved reviews, star summary, rating distribution.
- `/bookings/:bookingId/review` — customer review form (must be confirmed, paid and travel date **before today UTC**).
- `/feedback` — customer feedback form.
- `/admin/reviews` — moderation and status analytics.
- `/admin/feedback` — feedback handling and replies.

## REST API

- `GET /api/reviews/packages/:packageId` — public approved reviews.
- `GET /api/reviews/packages/:packageId/summary` — public rating distribution.
- `GET /api/reviews/my` — logged-in customer/admin own reviews.
- `POST /api/reviews` — customer; `{ "bookingId":"...", "rating":5, "title":"Wonderful tour", "comment":"The entire trip was well organized." }`.
- `PATCH /api/reviews/:id` — customer updates own pending/rejected review.
- `GET /api/reviews/admin?status=pending` — admin.
- `GET /api/reviews/admin/analytics` — admin.
- `PATCH /api/reviews/admin/:id/moderate` — admin; `{ "status":"approved", "moderationNote":"" }`.
- `POST /api/feedback` — customer; `{ "category":"suggestion", "subject":"More pickups", "message":"Please add pickup locations near the station." }`.
- `GET /api/feedback/my` — customer.
- `GET /api/feedback/admin` — admin.
- `PATCH /api/feedback/admin/:id` — admin; `{ "status":"resolved", "adminReply":"Thanks for your feedback." }`.

## Postman

Import `postman/TravelEase_Phase13.postman_collection.json`. Login via `POST /api/auth/login` as customer or admin and keep the Postman `access_token` cookie. Use real package and booking IDs. For review eligibility use a dedicated **test** booking that is confirmed, paid, and has a travelDate earlier than today. Do not falsify live payments or customer bookings.

## Caveats

- The rating summary includes only **approved** reviews. Submitted reviews require admin approval before public display.
- One review per booking (unique DB index); MongoDB will create indexes on app startup.
- Verified means booking ownership, confirmed status, paid status, and date eligibility checked against stored booking. It is not an independent identity verification service.
- Existing Phase 12 server may use UTC date logic for reminders.
- This integration is source-level validated; you must run it against your local MongoDB and SMTP for end-to-end verification.
