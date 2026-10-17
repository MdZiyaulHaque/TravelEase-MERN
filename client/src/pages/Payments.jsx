
import { useEffect, useState } from "react";
import api from "../services/api";

// =====================================
// Common API Error Helper
// =====================================

async function getErrorMessage(error, fallback) {
  const data = error?.response?.data;

  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const json = JSON.parse(text);
      return json.message || fallback;
    } catch {
      return fallback;
    }
  }

  return data?.message || error?.message || fallback;
}

// =====================================
// Load Razorpay Checkout
// =====================================

let scriptPromise = null;

function loadRazorpay() {
  if (window.Razorpay) {
    return Promise.resolve();
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");

    script.src =
      "https://checkout.razorpay.com/v1/checkout.js";

    script.async = true;

    script.onload = () => {
      if (window.Razorpay) {
        resolve();
      } else {
        reject(new Error("Razorpay Checkout unavailable"));
      }
    };

    script.onerror = () => {
      reject(new Error("Unable to load Razorpay Checkout"));
    };

    document.body.appendChild(script);
  }).catch((error) => {
    scriptPromise = null;
    throw error;
  });

  return scriptPromise;
}

// =====================================
// Pay Booking - Named Export
// =====================================

export async function payBooking(
  bookingId,
  onSuccess,
  onError
) {
  try {
    onError?.("");

    if (!bookingId) {
      throw new Error("Booking ID is missing");
    }

    const response = await api.post(
      "/payments/create-order",
      { bookingId }
    );

    const order = response.data?.data;

    if (!order?.orderId || !order?.keyId) {
      throw new Error("Invalid Razorpay order");
    }

    await loadRazorpay();

    const razorpay = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency || "INR",
      order_id: order.orderId,
      name: "TravelEase",
      description: "Tour Booking Payment",
      theme: {
        color: "#0866b1"
      },

      handler: async (paymentResponse) => {
        try {
          await api.post("/payments/verify", {
            razorpay_order_id:
              paymentResponse.razorpay_order_id,

            razorpay_payment_id:
              paymentResponse.razorpay_payment_id,

            razorpay_signature:
              paymentResponse.razorpay_signature
          });

          onError?.("");
          await onSuccess?.();
        } catch (error) {
          onError?.(
            await getErrorMessage(
              error,
              "Payment verification pending"
            )
          );
        }
      },

      modal: {
        ondismiss: () => {
          console.log("Razorpay checkout closed");
        }
      }
    });

    razorpay.on("payment.failed", (response) => {
      onError?.(
        response.error?.description || "Payment failed"
      );
    });

    razorpay.open();
  } catch (error) {
    onError?.(
      await getErrorMessage(
        error,
        "Unable to start payment"
      )
    );
  }
}

// =====================================
// Download Invoice - Named Export
// =====================================

export async function downloadInvoice(
  bookingId,
  onError
) {
  try {
    onError?.("");

    if (!bookingId) {
      throw new Error("Booking ID is missing");
    }

    console.log("Invoice Booking ID:", bookingId);

    const response = await api.get(
      `/payments/invoice/${bookingId}`,
      {
        responseType: "blob",
        headers: {
          Accept: "application/pdf"
        }
      }
    );

    const blob = response.data;

    const contentType = (
      response.headers?.["content-type"] ||
      blob.type ||
      ""
    ).toLowerCase();

    if (!contentType.includes("application/pdf")) {
      throw new Error(
        "Server returned an invalid invoice format"
      );
    }

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `invoice-${bookingId}.pdf`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);

    return true;
  } catch (error) {
    console.error("Invoice Download Error:", error);

    const message = await getErrorMessage(
      error,
      "Invoice download failed"
    );

    const status = error?.response?.status;

    onError?.(
      status
        ? `${message} (HTTP ${status})`
        : message
    );

    return false;
  }
}

// =====================================
// Payment History Page - Default Export
// =====================================

export default function Payments() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState("");

  useEffect(() => {
    let active = true;

    async function fetchPayments() {
      try {
        const response = await api.get("/payments/my");

        if (active) {
          setRows(response.data?.data || []);
        }
      } catch (error) {
        if (active) {
          setError(
            await getErrorMessage(
              error,
              "Unable to load payment history"
            )
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchPayments();

    return () => {
      active = false;
    };
  }, []);

  async function handleDownload(bookingId) {
    setDownloading(bookingId);

    try {
      await downloadInvoice(bookingId, setError);
    } finally {
      setDownloading("");
    }
  }

  const money = (amount) =>
    Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  return (
    <main className="container-wide py-12">
      <h1 className="mb-6 text-3xl font-bold">
        My Payments
      </h1>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
        >
          {error}
        </div>
      )}

      {loading ? (
        <p>Loading payment history...</p>
      ) : (
        <div className="space-y-4">
          {rows.map((payment) => {
            const bookingId =
              typeof payment.booking === "object"
                ? payment.booking?._id
                : payment.booking;

            const canDownload = [
              "paid",
              "refund_pending",
              "refunded",
              "partially_refunded"
            ].includes(payment.status);

            return (
              <article
                key={payment._id}
                className="rounded-xl bg-white p-5 shadow"
              >
                <h2 className="text-xl font-bold">
                  ₹{money(payment.amountPaise / 100)}
                </h2>

                <p className="mt-2">
                  Payment Status:{" "}
                  <span className="font-semibold">
                    {payment.status}
                  </span>
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  Order ID: {payment.orderId}
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  Booking ID: {bookingId || "N/A"}
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  Payment ID: {payment.paymentId || "Pending"}
                </p>

                {canDownload && bookingId && (
                  <button
                    type="button"
                    disabled={downloading === bookingId}
                    onClick={() =>
                      handleDownload(bookingId)
                    }
                    className="btn-primary mt-4 disabled:opacity-50"
                  >
                    {downloading === bookingId
                      ? "Downloading..."
                      : "Download Invoice"}
                  </button>
                )}
              </article>
            );
          })}

          {rows.length === 0 && (
            <p className="rounded-xl bg-white p-6">
              No payment history yet.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
