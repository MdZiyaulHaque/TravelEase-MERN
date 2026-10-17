# TravelEase Phase 15 — Seat and Coupon Reconciliation Patch

## Install
Back up the existing files. Copy all 4 `server/...` files to the matching paths in your project. Do not replace app.js, Payment.js, Departure.js or Coupon.js. Restart the backend.

## Behavior
- New bookings have `seatsReleased:false` explicitly persisted.
- Unpaid cancellation atomically releases reserved seats and the reserved coupon usage slot.
- A verified full refund releases seats **only after** the booking is cancelled/refunded. The paid coupon redemption stays consumed (anti-abuse policy).
- Duplicate webhook/reconciliation calls do not release the same booking twice.
- Old bookings with no persisted `seatsReleased` field are **not** automatically adjusted, because the release history is unknown.
- New admin-only POST `/api/payments/admin/reconcile-inventory/:bookingId` retries inventory release for an already refunded booking; it NEVER creates a gateway refund.

## IMPORTANT prerequisites and limitations
- MongoDB transactions require a replica set (MongoDB Atlas supports this); standalone MongoDB needs replica set configuration. Do not deploy this patch if transactions are unsupported.
- Take a database backup before deploying. The code was syntax-checked, not tested against your live database.
- Existing cancelled bookings require manual inventory audit. Do not bulk-set `seatsReleased:false` on old records: it could double-release seats.
- Refund reconciliation still relies on verified gateway data. Keep Razorpay webhook signature secret private.
- When a refund is already processed but the inventory transaction fails, retry admin reconcile-inventory after fixing the mismatch; do not issue another refund.
- This patch does not add automatic inventory expiration for abandoned unpaid bookings.

## Tests
1. Create a fresh test booking for 2 travelers; departure reserved rises by 2.
2. Cancel it before payment; reserved decreases by 2, and coupon usedCount decreases by 1 if used.
3. Repeat cancellation; it should reject, and counts must remain unchanged.
4. For a separate newly created paid booking, cancel and process refund in Razorpay TEST mode. After refund processed, reserved decreases by travelers.length; paid coupon usedCount remains unchanged.
5. Repeat refund webhook and admin reconciliation; counts must not decrease again.
6. Existing old bookings must be audited separately.
