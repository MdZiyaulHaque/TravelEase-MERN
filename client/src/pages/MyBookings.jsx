
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Users,
  CreditCard,
  Download,
  XCircle,
  Star,
  RefreshCw
} from "lucide-react";

import api from "../services/api";
import {
  payBooking,
  downloadInvoice
} from "./Payments";

export default function MyBookings() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");

  // ==================================
  // Load Customer Bookings
  // ==================================

  async function load() {
    try {
      setError("");

      const response = await api.get("/bookings/my");

      setRows(response.data?.data || []);
    } catch (error) {
      setError(
        error.response?.data?.message ||
        "Unable to load bookings"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // ==================================
  // Payment
  // ==================================

  async function handlePayment(bookingId) {
    setError("");
    setProcessingId(bookingId);

    try {
      await payBooking(
        bookingId,
        load,
        setError
      );
    } finally {
      setProcessingId("");
    }
  }

  // ==================================
  // Invoice Download
  // ==================================

  async function handleInvoice(bookingId) {
    setError("");
    setProcessingId(bookingId);

    try {
      await downloadInvoice(
        bookingId,
        setError
      );
    } finally {
      setProcessingId("");
    }
  }

  // ==================================
  // Cancel Unpaid Booking
  // ==================================

  async function cancelBooking(bookingId) {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this unpaid booking?"
    );

    if (!confirmed) return;

    setError("");
    setProcessingId(bookingId);

    try {
      await api.patch(
        `/bookings/${bookingId}/cancel`,
        {
          reason: "Customer request"
        }
      );

      await load();
    } catch (error) {
      setError(
        error.response?.data?.message ||
        "Cancellation failed"
      );
    } finally {
      setProcessingId("");
    }
  }

  // ==================================
  // Request Refund
  // ==================================

  async function requestRefund(bookingId) {
    const confirmed = window.confirm(
      "Request cancellation and refund review?"
    );

    if (!confirmed) return;

    setError("");
    setProcessingId(bookingId);

    try {
      await api.post(
        `/payments/refund-request/${bookingId}`,
        {
          reason: "Customer cancellation"
        }
      );

      await load();
    } catch (error) {
      setError(
        error.response?.data?.message ||
        "Refund request failed"
      );
    } finally {
      setProcessingId("");
    }
  }

  // ==================================
  // Format Amount
  // ==================================

  function formatAmount(amount) {
    return Number(amount || 0).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    );
  }

  function statusStyle(status) {
    if (
      status === "confirmed" ||
      status === "paid"
    ) {
      return "bg-green-100 text-green-700";
    }

    if (
      status === "pending_payment" ||
      status === "unpaid" ||
      status === "refund_pending"
    ) {
      return "bg-yellow-100 text-yellow-700";
    }

    if (
      status === "cancelled" ||
      status === "failed"
    ) {
      return "bg-red-100 text-red-700";
    }

    return "bg-slate-100 text-slate-700";
  }

  return (
    <main className="container-wide py-12">
      {/* Page Header */}

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            My Bookings
          </h1>

          <p className="mt-2 text-slate-600">
            Manage your tour bookings,
            payments and invoices.
          </p>
        </div>

        <button
          type="button"
          onClick={load}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      {/* Error Message */}

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
        >
          {error}
        </div>
      )}

      {/* Loading */}

      {loading ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          Loading bookings...
        </div>
      ) : (
        <div className="space-y-5">
          {rows.map((booking) => {
            const busy =
              processingId === booking._id;

            const paid =
              booking.paymentStatus === "paid";

            const pending =
              booking.status === "pending_payment";

            const confirmed =
              booking.status === "confirmed";

            const completedTrip =
              booking.travelDate &&
              booking.travelDate <
                new Date().toISOString().slice(0, 10);

            return (
              <article
                key={booking._id}
                className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm"
              >
                {/* Package Name */}

                <h2 className="mb-3 text-xl font-bold text-slate-900">
                  {booking.package?.name ||
                    "Travel Package"}
                </h2>

                {/* Booking Details */}

                <div className="mb-4 flex flex-wrap gap-5 text-sm text-slate-600">
                  <span className="flex items-center gap-2">
                    <CalendarDays size={17} />
                    {booking.travelDate}
                  </span>

                  <span className="flex items-center gap-2">
                    <Users size={17} />
                    {booking.travelers?.length || 0}
                    {" "}Traveler(s)
                  </span>
                </div>

                {/* Amount */}

                <div className="mb-4">
                  <p className="text-2xl font-bold text-blue-700">
                    ₹{formatAmount(booking.totalAmount)}
                  </p>

                  {Number(booking.discountAmount) > 0 && (
                    <p className="mt-1 text-sm text-green-700">
                      Coupon: {booking.couponCode || "Applied"}
                      {" "}· Saved ₹
                      {formatAmount(booking.discountAmount)}
                    </p>
                  )}
                </div>

                {/* Status */}

                <div className="mb-5 flex flex-wrap gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(
                      booking.status
                    )}`}
                  >
                    Booking: {booking.status}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(
                      booking.paymentStatus
                    )}`}
                  >
                    Payment: {booking.paymentStatus}
                  </span>
                </div>

                {/* Actions */}

                <div className="flex flex-wrap gap-3">
                  {pending && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        handlePayment(booking._id)
                      }
                      className="btn-primary flex items-center gap-2 disabled:opacity-50"
                    >
                      <CreditCard size={17} />
                      {busy ? "Please wait..." : "Pay Now"}
                    </button>
                  )}

                  {paid && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        handleInvoice(booking._id)
                      }
                      className="btn-primary flex items-center gap-2 disabled:opacity-50"
                    >
                      <Download size={17} />
                      {busy
                        ? "Downloading..."
                        : "Download Invoice"}
                    </button>
                  )}

                  {pending && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        cancelBooking(booking._id)
                      }
                      className="flex items-center gap-2 rounded-lg border border-red-500 px-4 py-2 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      <XCircle size={17} />
                      Cancel Booking
                    </button>
                  )}

                  {confirmed && paid && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        requestRefund(booking._id)
                      }
                      className="rounded-lg border border-red-500 px-4 py-2 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Request Cancellation
                    </button>
                  )}

                  {confirmed &&
                    paid &&
                    completedTrip && (
                      <Link
                        to={`/bookings/${booking._id}/review`}
                        className="flex items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2 font-semibold text-white hover:bg-cyan-800"
                      >
                        <Star size={17} />
                        Write Review
                      </Link>
                    )}
                </div>

                <p className="mt-4 text-xs text-slate-400">
                  Booking ID: {booking._id}
                </p>
              </article>
            );
          })}

          {rows.length === 0 && (
            <div className="rounded-xl bg-white p-8 text-center shadow-sm">
              <p className="mb-4 text-slate-600">
                No bookings yet.
              </p>

              <Link
                to="/packages"
                className="btn-primary inline-block"
              >
                Explore Tour Packages
              </Link>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
