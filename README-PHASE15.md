# Phase 15 – Stage 1: Coupon Administration and Validation Preview

This stage adds `Coupon` model and `/api/coupons` routes to the Phase 14 project. Existing bookings and payment calculations are intentionally unchanged. **Do not promise discounts to customers yet**: `/validate` is only a preview, and takes a user-supplied amount. Production checkout must derive the amount from the database, atomically reserve/redeem coupon usage, and reconcile cancellation/refunds. Per-customer usage is stored as a limit but **not yet enforced**; no redemption endpoint exists in this stage.

## Run

Keep your local `.env` files securely (not included in ZIP). Run `npm install` and `npm run dev` in server and client as before.

## Postman (admin cookie)

POST http://localhost:8000/api/coupons/admin

```json
{"code":"GOA20","description":"Goa offer","discountType":"percentage","discountValue":20,"maxDiscount":2000,"minBookingAmount":5000,"startsAt":"2026-10-01T00:00:00.000Z","expiresAt":"2026-12-31T23:59:59.000Z","usageLimit":100,"perCustomerLimit":1,"packageIds":["6accd765ae2c8b93da9bb0ca"],"isActive":true}
```

GET http://localhost:8000/api/coupons/admin

PATCH http://localhost:8000/api/coupons/admin/<coupon-id> with `{"isActive":false}`

## Customer preview (customer cookie)

POST http://localhost:8000/api/coupons/validate

```json
{"code":"GOA20","packageId":"6accd765ae2c8b93da9bb0ca","bookingAmount":11999}
```

Note: this stage has not been tested against a live database. The booking and payment integration is Stage 2.
