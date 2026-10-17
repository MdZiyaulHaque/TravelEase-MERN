
require("dotenv").config();

const crypto = require("crypto");

const WEBHOOK_URL =
  "https://clerk-matador-glisten.ngrok-free.dev/api/payments/webhook";

async function testWebhook() {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret) {
      throw new Error("RAZORPAY_WEBHOOK_SECRET missing");
    }

    // Existing processed refund: no new refund created.
    const event = {
      event: "refund.processed",
      payload: {
        refund: {
          entity: {
            id: "rfnd_ToHpHUixqUdgAG",
            payment_id: "pay_ToHJI60nX2tPqY",
            amount: 959920,
            currency: "INR",
            status: "processed"
          }
        }
      }
    };

    const body = JSON.stringify(event);

    const signature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": signature
      },
      body
    });

    console.log("HTTP Status:", response.status);
    console.log("Response:", await response.text());
  } catch (error) {
    console.error("Webhook test failed:", error.message);
  }
}

testWebhook();
