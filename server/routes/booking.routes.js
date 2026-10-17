
const express = require("express");
const mongoose = require("mongoose");
const { z } = require("zod");

const { requireAuth, allowRoles } = require("../middleware/auth");

const TourPackage = require("../models/TourPackage");
const Departure = require("../models/Departure");
const Booking = require("../models/Booking");
const Coupon = require("../models/Coupon");

const notifications = require("../services/notifications");
const {
  releaseBookingInventory,
} = require("../services/bookingInventory");

const router = express.Router();

const validId = (id) => mongoose.isValidObjectId(id);

const isFutureDate = (date) =>
  /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  !Number.isNaN(Date.parse(date + "T00:00:00Z")) &&
  new Date(date + "T00:00:00Z") > new Date();

const travelerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  age: z.coerce.number().int().min(1).max(120),
});

const createSchema = z.object({
  packageId: z.string(),
  departureId: z.string(),
  travelers: z.array(travelerSchema).min(1).max(10),
  couponCode: z.string().trim().max(30).optional(),
});

const fail = (res, message) =>
  res.status(400).json({
    success: false,
    message,
  });

function bookingError(message, status = 409) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// ========================================
// GET PUBLIC DEPARTURES
// ========================================

router.get("/departures/:packageId", async (req, res, next) => {
  try {
    if (!validId(req.params.packageId)) {
      return fail(res, "Invalid package ID");
    }

    const data = await Departure.find({
      package: req.params.packageId,
      isActive: true,
      date: {
        $gte: new Date().toISOString().slice(0, 10),
      },
    })
      .sort({ date: 1 })
      .lean();

    return res.json({
      success: true,
      data: data.map((departure) => ({
        ...departure,
        availableSeats:
          departure.capacity - departure.reserved,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// All routes below require authentication
router.use(requireAuth);

// ========================================
// ADMIN - CREATE DEPARTURE
// ========================================

router.post(
  "/departures",
  allowRoles("admin"),
  async (req, res, next) => {
    try {
      const schema = z.object({
        packageId: z.string(),
        date: z.string(),
        capacity: z.coerce.number().int().min(1).max(10000),
      });

      const parsed = schema.safeParse(req.body);

      if (!parsed.success) {
        return fail(res, parsed.error.issues[0].message);
      }

      const { packageId, date, capacity } = parsed.data;

      if (!validId(packageId) || !isFutureDate(date)) {
        return fail(
          res,
          "Valid package and future departure date required"
        );
      }

      const pkg = await TourPackage.findOne({
        _id: packageId,
        isActive: true,
      });

      if (!pkg) {
        return res.status(404).json({
          success: false,
          message: "Package not found",
        });
      }

      if (capacity > pkg.capacity) {
        return fail(
          res,
          "Departure capacity exceeds package capacity"
        );
      }

      const departure = await Departure.create({
        package: pkg._id,
        date,
        capacity,
      });

      return res.status(201).json({
        success: true,
        data: departure,
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "Departure already exists for this date",
        });
      }

      next(error);
    }
  }
);

// ========================================
// ADMIN - GET DEPARTURES
// ========================================

router.get(
  "/departures-admin",
  allowRoles("admin"),
  async (req, res, next) => {
    try {
      const data = await Departure.find()
        .populate("package", "name")
        .sort({ date: 1 })
        .limit(300);

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ========================================
// CUSTOMER - CREATE BOOKING
// TRANSACTION + ROLLBACK TEST
// ========================================

router.post(
  "/",
  allowRoles("customer"),
  async (req, res, next) => {
    const parsed = createSchema.safeParse(req.body);

    if (!parsed.success) {
      return fail(res, parsed.error.issues[0].message);
    }

    const {
      packageId,
      departureId,
      travelers,
      couponCode,
    } = parsed.data;

    if (!validId(packageId) || !validId(departureId)) {
      return fail(res, "Invalid ID");
    }

    let session;

    try {
      session = await mongoose.startSession();

      let booking;

      await session.withTransaction(async () => {
        // Step 1 - Validate package
        const pkg = await TourPackage.findOne({
          _id: packageId,
          isActive: true,
        }).session(session);

        if (!pkg) {
          throw bookingError("Package unavailable", 404);
        }

        // Step 2 - Validate departure
        const dep = await Departure.findOne({
          _id: departureId,
          package: packageId,
          isActive: true,
        }).session(session);

        if (!dep || !isFutureDate(dep.date)) {
          throw bookingError("Departure unavailable", 400);
        }

        const seats = travelers.length;

        // Step 3 - Atomically reserve seats
        const reserved = await Departure.findOneAndUpdate(
          {
            _id: dep._id,
            package: pkg._id,
            isActive: true,
            reserved: {
              $lte: dep.capacity - seats,
            },
          },
          {
            $inc: { reserved: seats },
          },
          {
            new: true,
            session,
          }
        );

        if (!reserved) {
          throw bookingError("Not enough seats");
        }

        // Step 4 - Calculate price
        const originalAmount =
          Math.round(pkg.price * seats * 100) / 100;

        let coupon = null;
        let discount = 0;
        let couponReserved = false;

        // Step 5 - Validate and reserve coupon
        if (couponCode) {
          coupon = await Coupon.findOne({
            code: couponCode.toUpperCase(),
          }).session(session);

          const now = new Date();

          if (
            !coupon ||
            !coupon.isActive ||
            now < coupon.startsAt ||
            now >= coupon.expiresAt
          ) {
            throw bookingError(
              "Coupon unavailable or expired"
            );
          }

          if (
            coupon.packageIds.length &&
            !coupon.packageIds.some(
              (id) => String(id) === String(pkg._id)
            )
          ) {
            throw bookingError(
              "Coupon not valid for this package"
            );
          }

          if (originalAmount < coupon.minBookingAmount) {
            throw bookingError(
              "Minimum booking amount not met"
            );
          }

          const previous = await Booking.countDocuments({
            customer: req.user._id,
            coupon: coupon._id,
            couponUsageReserved: true,
            status: {
              $in: ["pending_payment", "confirmed"],
            },
          }).session(session);

          if (previous >= coupon.perCustomerLimit) {
            throw bookingError(
              "Per-customer coupon limit reached"
            );
          }

          discount =
            coupon.discountType === "percentage"
              ? (originalAmount * coupon.discountValue) / 100
              : coupon.discountValue;

          if (coupon.maxDiscount != null) {
            discount = Math.min(
              discount,
              coupon.maxDiscount
            );
          }

          discount =
            Math.round(
              Math.min(originalAmount, discount) * 100
            ) / 100;

          const updatedCoupon =
            await Coupon.findOneAndUpdate(
              {
                _id: coupon._id,
                isActive: true,
                startsAt: { $lte: now },
                expiresAt: { $gt: now },
                $expr: {
                  $lt: ["$usedCount", "$usageLimit"],
                },
              },
              {
                $inc: { usedCount: 1 },
              },
              {
                new: true,
                session,
              }
            );

          if (!updatedCoupon) {
            throw bookingError(
              "Coupon usage limit reached"
            );
          }

          couponReserved = true;
        }


        // =====================================
        // Step 6 - Create booking
        // =====================================

        const created = await Booking.create(
          [
            {
              customer: req.user._id,
              package: pkg._id,
              departure: dep._id,
              travelDate: dep.date,
              travelers,
              pricePerPerson: pkg.price,
              originalAmount,
              discountAmount: discount,
              totalAmount:
                Math.round(
                  (originalAmount - discount) * 100
                ) / 100,
              coupon: coupon?._id || null,
              couponCode: coupon?.code || "",
              couponUsageReserved: couponReserved,
              seatsReleased: false,
            },
          ],
          { session }
        );

        booking = created[0];
      });

      // Notification only after successful commit
      void notifications
        .onBookingCreated(booking)
        .catch(console.error);

      return res.status(201).json({
        success: true,
        data: booking,
        message:
          "Booking reserved; complete payment to confirm",
      });
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({
          success: false,
          message: error.message,
        });
      }


      next(error);
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }
);

// ========================================
// CUSTOMER - MY BOOKINGS
// ========================================

router.get("/my", async (req, res, next) => {
  try {
    const data = await Booking.find({
      customer: req.user._id,
    })
      .populate("package", "name image durationDays")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// ADMIN - ALL BOOKINGS
// ========================================

router.get(
  "/admin",
  allowRoles("admin"),
  async (req, res, next) => {
    try {
      const data = await Booking.find()
        .populate("customer", "name email")
        .populate("package", "name")
        .sort({ createdAt: -1 })
        .limit(300);

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ========================================
// CUSTOMER / ADMIN - CANCEL BOOKING
// ========================================

router.patch("/:id/cancel", async (req, res, next) => {
  if (!validId(req.params.id)) {
    return fail(res, "Invalid booking ID");
  }

  let session;

  try {
    session = await mongoose.startSession();

    let booking;

    await session.withTransaction(async () => {
      const query = {
        _id: req.params.id,
      };

      if (req.user.role !== "admin") {
        query.customer = req.user._id;
      }

      const existing = await Booking.findOne(
        query
      ).session(session);

      if (!existing) {
        throw bookingError("Booking not found", 404);
      }

      if (existing.status === "cancelled") {
        throw bookingError(
          "Booking already cancelled"
        );
      }

      if (
        existing.status === "confirmed" ||
        existing.paymentStatus !== "unpaid"
      ) {
        throw bookingError(
          "Confirmed or paid booking cancellation and refund require manual admin handling in Phase 8"
        );
      }

      if (existing.status !== "pending_payment") {
        throw bookingError(
          "Booking cannot be cancelled in its current state"
        );
      }

      const updated =
        await Booking.findOneAndUpdate(
          {
            ...query,
            status: "pending_payment",
            paymentStatus: "unpaid",
            seatsReleased: false,
          },
          {
            $set: {
              status: "cancelled",
              cancelledAt: new Date(),
              cancellationReason: String(
                req.body?.reason || ""
              ).slice(0, 300),
            },
          },
          {
            new: true,
            session,
          }
        );

      if (!updated) {
        throw bookingError(
          "Booking state changed; retry"
        );
      }

      const release =
        await releaseBookingInventory(updated._id, {
          releaseCoupon: true,
          session,
        });

      if (!release.released) {
        throw new Error(
          "Booking inventory could not be released; transaction rolled back"
        );
      }

      booking = await Booking.findById(
        updated._id
      ).session(session);
    });

    void notifications
      .notify({
        recipient: booking.customer,
        type: "booking_cancelled",
        title: "Booking cancelled",
        message: `Booking ${booking._id} has been cancelled.`,
        link: "/my-bookings",
        key: "booking-cancelled:" + booking._id,
      })
      .catch(console.error);

    return res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
});

module.exports = router;
