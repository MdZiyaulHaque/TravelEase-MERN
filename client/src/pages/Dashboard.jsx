
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export default function Dashboard() {
  const { user } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadBookings() {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/bookings/my");

        if (active) {
          setBookings(
            Array.isArray(response.data?.data)
              ? response.data.data
              : []
          );
        }
      } catch (err) {
        if (active) {
          setError(
            err.userMessage ||
            err.response?.data?.message ||
            "Unable to load bookings."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    if (user?.role === "customer") {
      loadBookings();
    } else {
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [user?.role]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    const confirmed = bookings.filter(
      (b) => b.status === "confirmed"
    );

    const upcoming = confirmed.filter(
      (b) => b.travelDate && b.travelDate >= today
    );

    const totalSpent = bookings
      .filter(
        (b) =>
          b.paymentStatus === "paid" ||
          b.paymentStatus === "completed"
      )
      .reduce(
        (sum, b) => sum + Number(b.totalAmount || 0),
        0
      );

    return {
      total: bookings.length,
      confirmed: confirmed.length,
      upcoming: upcoming.length,
      spent: totalSpent
    };
  }, [bookings]);

  const formatMoney = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(amount || 0);

  const formatDate = (date) => {
    if (!date) return "Not available";

    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime())
      ? String(date)
      : parsed.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        });
  };

  const cards = [
    {
      title: "Total Bookings",
      value: stats.total,
      icon: "📋"
    },
    {
      title: "Confirmed Bookings",
      value: stats.confirmed,
      icon: "✅"
    },
    {
      title: "Upcoming Trips",
      value: stats.upcoming,
      icon: "✈️"
    },
    {
      title: "Total Amount Paid",
      value: formatMoney(stats.spent),
      icon: "💳"
    }
  ];

  if (!user) {
    return (
      <main className="container-wide py-16">
        <p>Please log in to view your dashboard.</p>
      </main>
    );
  }

  return (
    <main className="container-wide py-10 min-h-[70vh]">
      <div className="mb-8">
        <p className="text-sm font-bold uppercase text-blue-700">
          {user.role} Dashboard
        </p>

        <h1 className="text-3xl font-extrabold mt-2">
          Welcome, {user.name}!
        </h1>

        <p className="text-slate-600 mt-2">
          {user.email}
        </p>
      </div>

      {user.role === "admin" ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <h2 className="text-xl font-bold">
            Admin Dashboard
          </h2>

          <p className="text-slate-600 mt-2">
            Manage bookings, customers and reports.
          </p>

          <Link
            to="/admin/dashboard"
            className="btn-primary inline-block mt-5"
          >
            Open Admin Analytics
          </Link>
        </div>
      ) : (
        <>
          {loading && (
            <p className="mb-5 text-blue-700">
              Loading your bookings...
            </p>
          )}

          {error && (
            <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {cards.map((card) => (
              <div
                key={card.title}
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
              >
                <div className="text-3xl mb-4">
                  {card.icon}
                </div>

                <p className="text-sm text-slate-500">
                  {card.title}
                </p>

                <h2 className="text-2xl font-extrabold mt-2 text-slate-900">
                  {loading ? "..." : card.value}
                </h2>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 mt-8 p-6">
            <div className="flex justify-between items-center gap-4 mb-6">
              <h2 className="text-xl font-bold">
                Recent Bookings
              </h2>

              <Link
                to="/my-bookings"
                className="text-blue-700 font-semibold text-sm"
              >
                View All
              </Link>
            </div>

            {!loading && !error && bookings.length === 0 && (
              <div className="text-center py-10">
                <p className="text-slate-500">
                  You haven't booked any trips yet.
                </p>

                <Link
                  to="/packages"
                  className="btn-primary inline-block mt-5"
                >
                  Explore Packages
                </Link>
              </div>
            )}

            {!loading && bookings.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-4">Package</th>
                      <th className="p-4">Travel Date</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {bookings.slice(0, 5).map((booking) => (
                      <tr
                        key={booking._id}
                        className="border-t"
                      >
                        <td className="p-4 font-semibold">
                          {booking.package?.name ||
                            "Tour Package"}
                        </td>

                        <td className="p-4">
                          {formatDate(booking.travelDate)}
                        </td>

                        <td className="p-4">
                          {formatMoney(booking.totalAmount)}
                        </td>

                        <td className="p-4">
                          <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-blue-700 font-semibold">
                            {booking.status?.replaceAll("_", " ") ||
                              "Unknown"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 mt-8">
            <Link to="/packages" className="btn-primary">
              Explore Tour Packages
            </Link>

            <Link to="/my-bookings" className="btn-primary">
              My Bookings
            </Link>

            <Link to="/profile" className="btn-primary">
              My Profile
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
