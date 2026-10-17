
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

import {
  Users,
  MapPinned,
  CalendarCheck,
  IndianRupee,
  Wallet,
  Plane,
  RefreshCcw,
  ArrowUpRight,
  AlertCircle,
} from "lucide-react";

import InventoryHealth from "../components/InventoryHealth";
import api from "../services/api";

// FIXED: Show accurate INR amounts with 2 decimal places
const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0);

const colors = [
  "#2563eb",
  "#0d9488",
  "#f59e0b",
  "#e11d48",
  "#7c3aed",
];

function Stat({ label, value, icon: Icon, sub }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold text-slate-500">
          {label}
        </span>

        <span className="rounded-xl bg-blue-50 p-2 text-blue-700">
          <Icon size={20} />
        </span>
      </div>

      <div className="mt-3 text-2xl font-extrabold text-slate-900">
        {value}
      </div>

      {sub && (
        <p className="text-xs text-slate-500 mt-2">
          {sub}
        </p>
      )}
    </div>
  );
}

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/dashboard/overview");
      setData(response.data.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 py-9">
      <div className="container-wide space-y-7">

        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-blue-700">
              TravelEase Analytics
            </p>

            <h1 className="text-3xl font-extrabold text-slate-900 mt-1">
              Admin Dashboard
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Live MongoDB statistics · Revenue in INR
            </p>
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-white font-semibold disabled:opacity-60"
          >
            <RefreshCcw size={17} />
            Refresh
          </button>
        </div>

        {/* NAVIGATION */}
        <div className="flex flex-wrap gap-2">
          {[
            ["Customers", "/admin/customers"],
            ["Packages", "/admin/catalog"],
            ["Bookings", "/admin/bookings"],
            ["Payments", "/admin/payments"],
            ["Trips", "/admin/trips"],
            ["Resources", "/admin/resources"],
            ["Reports", "/admin/reports"],
            ["Advanced Insights", "/admin/insights"],
          ].map(([name, url]) => (
            <Link
              key={url}
              to={url}
              className="flex items-center gap-1 rounded-full bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-blue-500"
            >
              {name}
              <ArrowUpRight size={14} />
            </Link>
          ))}
        </div>

        {/* ERROR */}
        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800"
          >
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* LOADING */}
        {loading ? (
          <div className="rounded-2xl bg-white p-12 text-center">
            Loading dashboard data...
          </div>
        ) : (
          data && (
            <>
              {/* STATISTICS */}
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat
                  label="Total Customers"
                  value={data.stats.customers}
                  icon={Users}
                />

                <Stat
                  label="Active Packages"
                  value={data.stats.packages}
                  icon={MapPinned}
                />

                <Stat
                  label="Total Bookings"
                  value={data.stats.bookings}
                  icon={CalendarCheck}
                  sub={`${data.stats.confirmed} confirmed · ${data.stats.cancelled} cancelled`}
                />

                <Stat
                  label="Net Revenue"
                  value={money(data.stats.netRevenue)}
                  icon={IndianRupee}
                  sub="Paid amount minus recorded refunds"
                />

                <Stat
                  label="Gross Collections"
                  value={money(data.stats.grossRevenue)}
                  icon={Wallet}
                />

                <Stat
                  label="Recorded Refunds"
                  value={money(data.stats.refunded)}
                  icon={RefreshCcw}
                />

                <Stat
                  label="Active Trips"
                  value={data.stats.activeTrips}
                  icon={Plane}
                />

                <Stat
                  label="Paid Transactions"
                  value={data.stats.paidTransactions}
                  icon={CalendarCheck}
                />
              </section>

              {/* INVENTORY */}
              <InventoryHealth />

              {/* MONTHLY REVENUE + BOOKING STATUS */}
              <section className="grid gap-5 lg:grid-cols-3">

                <div className="rounded-2xl bg-white p-5 border shadow-sm lg:col-span-2">
                  <h2 className="font-bold text-lg mb-1">
                    Monthly Revenue
                  </h2>

                  <p className="text-xs text-slate-500 mb-5">
                    Last 12 calendar months · Gross, refunds and net
                  </p>

                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.monthly}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 10 }}
                        />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value) => money(value)} />
                        <Legend />

                        <Area
                          name="Gross"
                          dataKey="gross"
                          type="monotone"
                          stroke="#2563eb"
                          fill="#bfdbfe"
                        />

                        <Area
                          name="Net"
                          dataKey="net"
                          type="monotone"
                          stroke="#0d9488"
                          fill="#ccfbf1"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-5 border shadow-sm">
                  <h2 className="font-bold text-lg">
                    Booking Status
                  </h2>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.bookingBreakdown}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={82}
                          label
                        >
                          {data.bookingBreakdown.map((item, index) => (
                            <Cell
                              key={item.name}
                              fill={colors[index % colors.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs">
                    {data.bookingBreakdown.map((item, index) => (
                      <span key={item.name}>
                        <span
                          style={{
                            color: colors[index % colors.length],
                          }}
                        >
                          ●
                        </span>{" "}
                        {item.name}: {item.value}
                      </span>
                    ))}
                  </div>
                </div>
              </section>

              {/* TRIP STATUS + QUICK INSIGHTS */}
              <section className="grid gap-5 lg:grid-cols-2">

                <div className="rounded-2xl bg-white border p-5 shadow-sm">
                  <h2 className="text-lg font-bold mb-4">
                    Trip Status Breakdown
                  </h2>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.tripBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10 }}
                        />
                        <YAxis allowDecimals={false} />
                        <Tooltip />

                        <Bar
                          dataKey="value"
                          name="Trips"
                          fill="#2563eb"
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl bg-white border p-5 shadow-sm">
                  <h2 className="text-lg font-bold mb-4">
                    Quick Insights
                  </h2>

                  <div className="space-y-4">
                    {[
                      [
                        "Booking confirmation rate",
                        data.stats.bookings
                          ? `${(
                              (100 * data.stats.confirmed) /
                              data.stats.bookings
                            ).toFixed(1)}%`
                          : "0%",
                      ],
                      [
                        "Payments successfully recorded",
                        data.stats.paidTransactions,
                      ],
                      [
                        "Refund total",
                        money(data.stats.refunded),
                      ],
                      [
                        "Last refreshed",
                        new Date(
                          data.generatedAt
                        ).toLocaleString("en-IN"),
                      ],
                    ].map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-3 border-b pb-3"
                      >
                        <span className="text-slate-500 text-sm">
                          {key}
                        </span>

                        <strong className="text-sm text-slate-900 text-right">
                          {value}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* RECENT BOOKINGS + PAYMENTS */}
              <section className="grid gap-5 lg:grid-cols-2">

                <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
                  <h2 className="font-bold text-lg p-5">
                    Recent Bookings
                  </h2>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          {[
                            "Customer",
                            "Package",
                            "Amount",
                            "Status",
                          ].map((heading) => (
                            <th
                              key={heading}
                              className="text-left p-3"
                            >
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {data.recentBookings.map((booking) => (
                          <tr
                            key={booking._id}
                            className="border-t"
                          >
                            <td className="p-3">
                              {booking.customer?.name || "—"}
                            </td>

                            <td className="p-3">
                              {booking.package?.name || "—"}
                            </td>

                            <td className="p-3 whitespace-nowrap">
                              {money(booking.totalAmount)}
                            </td>

                            <td className="p-3">
                              {booking.status}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {!data.recentBookings.length && (
                      <p className="p-5 text-slate-500">
                        No bookings yet.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
                  <h2 className="font-bold text-lg p-5">
                    Recent Payments
                  </h2>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          {[
                            "Customer",
                            "Amount",
                            "Status",
                            "Date",
                          ].map((heading) => (
                            <th
                              key={heading}
                              className="text-left p-3"
                            >
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {data.recentPayments.map((payment) => (
                          <tr
                            key={payment._id}
                            className="border-t"
                          >
                            <td className="p-3">
                              {payment.customer?.name || "—"}
                            </td>

                            <td className="p-3 whitespace-nowrap">
                              {money(payment.amountPaise / 100)}
                            </td>

                            <td className="p-3">
                              {payment.status}
                            </td>

                            <td className="p-3 whitespace-nowrap">
                              {formatDate(payment.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {!data.recentPayments.length && (
                      <p className="p-5 text-slate-500">
                        No payments yet.
                      </p>
                    )}
                  </div>
                </div>
              </section>
            </>
          )
        )}
      </div>
    </main>
  );
}
