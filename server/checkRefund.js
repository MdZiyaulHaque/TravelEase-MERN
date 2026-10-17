require("dotenv").config();
const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

async function checkRefund() {
  try {
  const refund = await razorpay.refunds.fetch(
  "rfnd_TnL9mkaz2ZbxXD"
);

    console.log({
      id: refund.id,
      paymentId: refund.payment_id,
      amount: refund.amount,
      status: refund.status
    });
  } catch (error) {
    console.error(
      "Refund verification failed:",
      error.error?.description || error.message
    );
  }
}

checkRefund();