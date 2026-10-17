# Phase 15 Stage 2 — Booking + Razorpay Coupon Integration

## What changed
- Booking schema now stores originalAmount, discountAmount, coupon, couponCode, couponUsageReserved.
- POST /api/bookings accepts optional `couponCode`. Price is calculated from the server-side TourPackage.price and travelers count.
- Coupon availability, active dates, package restriction, minimum amount and total usage cap are checked at booking creation.
- Booking.totalAmount is discounted, so the existing Razorpay create-order endpoint uses the discounted total automatically.
- Unpaid booking cancellation releases reserved coupon usage and seats.
- Invoice includes original price, coupon and discount.

## Important limits before production
- **usedCount currently includes unpaid reservations** (not only successful payments). Unpaid reservations that are never cancelled can hold slots indefinitely; implement expiry and reconciliation before production.
- Per-customer limit uses countDocuments and is not concurrency-atomic. Simultaneous booking requests can bypass it; implement MongoDB transactions or a per-customer atomic redemption ledger.
- Seat reservation, coupon reservation and booking creation are not a single database transaction. Compensation is best effort; add transactions and periodic reconciliation for production.
- Zero-amount orders are rejected by existing Razorpay minimum. Configure a policy for 100% discount coupons.
- Existing payments, refunds, and cancellations should be regression tested; no automatic coupon restoration on paid refunds is implemented.
- Razorpay keys and live MongoDB were not available to test. No claims of full integration testing.

## Postman test
1. Customer login.
2. GET /api/bookings/departures/6accd765ae2c8b93da9bb0ca and select an available **future** departure ID.
3. POST /api/bookings with JSON:
```
{"packageId":"6accd765ae2c8b93da9bb0ca","departureId":"REPLACE_WITH_FUTURE_DEPARTURE_ID","travelers":[{"name":"Test Traveler","age":25}],"couponCode":"GOA20"}
```
Expected: originalAmount=11999, discountAmount=2399.8, totalAmount=9599.2 (assuming current package price and coupon).
4. POST /api/payments/create-order {"bookingId":"NEW_BOOKING_ID"}; expected amount=959920 paise, if Razorpay TEST credentials are configured.
5. GET /api/bookings/my and check coupon fields.
6. For unpaid cancellation: PATCH /api/bookings/NEW_BOOKING_ID/cancel with {"reason":"Testing cancellation"}. Verify coupon usedCount decreases by one.

## Setup
Run npm install in server and client. Do not copy .env from an untrusted ZIP; configure your existing local environment separately. Existing routes preserved.
