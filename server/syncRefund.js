
require("dotenv").config();

const mongoose = require("mongoose");
const Razorpay = require("razorpay");

const Payment = require("./models/Payment");
const Booking = require("./models/Booking");
const REFUND_ID = "rfnd_TnL9mkaz2ZbxXD";

const PAYMENT_ID = "6acde8bbb14f0ec5cb8c0bfa";

const BOOKING_ID = "6acde8a9b14f0ec5cb8c0bd3";

async function syncRefund() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error("MongoDB connection URI missing in .env");
    }

    await mongoose.connect(mongoUri);
    console.log("MongoDB Connected");

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    // Fetch existing refund only. Never create another refund.
    const refund = await razorpay.refunds.fetch(REFUND_ID);

    if (refund.status !== "processed") {
      throw new Error("Refund is not processed yet");
    }

    const payment = await Payment.findById(PAYMENT_ID);

    if (!payment) {
      throw new Error("Payment not found");
    }

    if (
      String(payment.booking) !== BOOKING_ID ||
      payment.paymentId !== refund.payment_id ||
      payment.refundId !== refund.id ||
      refund.currency !== "INR" ||
      Number(refund.amount) !== payment.amountPaise
    ) {
      throw new Error("Refund details do not match payment");
    }

    if (!["refund_pending", "refunded"].includes(payment.status)) {
      throw new Error("Payment is not eligible for synchronization");
    }

    // Only synchronize the verified payment.
    await Payment.updateOne(
      {
        _id: PAYMENT_ID,
        booking: BOOKING_ID,
        refundId: REFUND_ID,
        status: { $in: ["refund_pending", "refunded"] }
      },
      {
        $set: {
          status: "refunded",
          refundAmountPaise: Number(refund.amount),
          refundedAt: new Date(
            Number(refund.created_at) * 1000 || Date.now()
          )
        }
      }
    );

    // Update corresponding booking.
    await Booking.updateOne(
      {
        _id: BOOKING_ID,
        status: "cancelled",
        paymentStatus: { $in: ["refund_pending", "refunded"] }
      },
      {
        $set: {
          paymentStatus: "refunded"
        }
      }
    );

    console.log("Refund synchronized successfully");

    const updatedPayment = await Payment.findById(PAYMENT_ID);
    const updatedBooking = await Booking.findById(BOOKING_ID);

    console.log({
      paymentStatus: updatedPayment.status,
      refundAmountPaise: updatedPayment.refundAmountPaise,
      refundId: updatedPayment.refundId,
      bookingStatus: updatedBooking.status,
      bookingPaymentStatus: updatedBooking.paymentStatus
    });
  } catch (error) {
    console.error("Refund sync failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

syncRefund();
