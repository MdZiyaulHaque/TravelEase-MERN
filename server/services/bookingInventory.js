const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Departure = require('../models/Departure');
const Coupon = require('../models/Coupon');

// Use within a caller-owned transaction when session is provided.
// When session is omitted, create and own a transaction for backwards compatibility.
async function releaseWithinSession(bookingId, { releaseCoupon = false, session } = {}) {
  const booking = await Booking.findOne({
    _id: bookingId,
    status: 'cancelled',
    seatsReleased: false,
  }).session(session);

  if (!booking) return { released: false, reason: 'Already released or legacy booking' };

  const seats = booking.travelers?.length || 0;
  if (!seats) throw new Error('Invalid traveler count');

  const departureUpdate = await Departure.updateOne(
    { _id: booking.departure, reserved: { $gte: seats } },
    { $inc: { reserved: -seats } },
    { session }
  );
  if (departureUpdate.modifiedCount !== 1) {
    throw new Error('Departure seat count mismatch; manual review required');
  }

  const updates = { seatsReleased: true };
  if (releaseCoupon && booking.coupon && booking.couponUsageReserved) {
    const couponUpdate = await Coupon.updateOne(
      { _id: booking.coupon, usedCount: { $gt: 0 } },
      { $inc: { usedCount: -1 } },
      { session }
    );
    if (couponUpdate.modifiedCount !== 1) {
      throw new Error('Coupon usage mismatch; manual review required');
    }
    updates.couponUsageReserved = false;
  }

  const bookingUpdate = await Booking.updateOne(
    { _id: booking._id, status: 'cancelled', seatsReleased: false },
    { $set: updates },
    { session }
  );
  if (bookingUpdate.modifiedCount !== 1) {
    throw new Error('Concurrent inventory reconciliation');
  }
  return { released: true, seats };
}

async function releaseBookingInventory(bookingId, options = {}) {
  if (options.session) return releaseWithinSession(bookingId, options);

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await releaseWithinSession(bookingId, { ...options, session });
    });
    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = { releaseBookingInventory };
