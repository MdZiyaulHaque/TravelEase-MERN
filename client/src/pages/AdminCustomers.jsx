
import { useCallback, useEffect, useState } from "react";
import api from "../services/api";

const blank = {
  name: "",
  email: "",
  password: "",
  phone: "",
  address: "",
  city: "",
  country: "",
};

const phoneRegex = /^[6-9]\d{9}$/;

function validatePhone(phone) {
  const value = String(phone || "").trim();

  if (!value) {
    return "Phone number is required";
  }

  if (!phoneRegex.test(value)) {
    return "Enter a valid 10-digit Indian mobile number";
  }

  return "";
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    pages: 1,
    total: 0,
  });

  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [modal, setModal] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [list, summary] = await Promise.all([
        api.get("/customers", {
          params: {
            page,
            limit: 10,
            search,
            status: filter,
          },
        }),
        api.get("/customers/stats"),
      ]);

      setCustomers(list.data.customers || []);
      setPagination(
        list.data.pagination || { pages: 1, total: 0 }
      );
      setStats(summary.data.stats || null);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load customers"
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, filter]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  function open(customer) {
    setEditing(customer?.id || null);

    setForm(
      customer
        ? {
            name: customer.name || "",
            email: customer.email || "",
            password: "",
            phone: customer.phone || "",
            address: customer.address || "",
            city: customer.city || "",
            country: customer.country || "",
          }
        : { ...blank }
    );

    setError("");
    setModal(true);
  }

  function handleChange(e) {
    const { name, value } = e.target;

    if (name === "phone") {
      // Only allow digits, maximum 10 characters.
      const cleaned = value.replace(/\D/g, "").slice(0, 10);

      setForm((prev) => ({
        ...prev,
        phone: cleaned,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    if (error) {
      setError("");
    }
  }

  async function submit(e) {
    e.preventDefault();

    if (busy) return;

    const phoneError = validatePhone(form.phone);

    if (phoneError) {
      setError(phoneError);
      return;
    }

    setError("");
    setBusy(true);

    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
      };

      if (editing) {
        delete payload.email;
        delete payload.password;

        await api.patch(`/customers/${editing}`, payload);
      } else {
        payload.email = form.email.trim();

        await api.post("/customers", payload);
      }

      setModal(false);
      setEditing(null);
      setForm({ ...blank });

      await load();
    } catch (err) {
      setError(
        err.response?.data?.message || "Save failed"
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggle(customer) {
    const action = customer.isActive
      ? "Deactivate"
      : "Activate";

    if (
      !window.confirm(`${action} ${customer.name}?`)
    ) {
      return;
    }

    try {
      setError("");

      await api.patch(
        `/customers/${customer.id}/status`,
        {
          isActive: !customer.isActive,
        }
      );

      await load();
    } catch (err) {
      setError(
        err.response?.data?.message || "Update failed"
      );
    }
  }

  function closeModal() {
    if (busy) return;

    setModal(false);
    setEditing(null);
    setError("");
    setForm({ ...blank });
  }

  const fields = Object.keys(form).filter(
    (key) =>
      !editing ||
      !["email", "password"].includes(key)
  );

  return (
    <main className="container-wide py-10 min-h-[70vh]">
      {/* Page Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <p className="font-bold text-blue-700">
            ADMIN / CUSTOMERS
          </p>

          <h1 className="text-3xl font-extrabold">
            Customer Management
          </h1>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={() => open(null)}
        >
          + Add Customer
        </button>
      </div>

      {/* Customer Statistics */}
      <div className="grid sm:grid-cols-3 gap-4 my-7">
        {["total", "active", "inactive"].map((key) => (
          <div
            key={key}
            className="bg-white shadow rounded-2xl p-5"
          >
            <p className="capitalize text-slate-500">
              {key} Customers
            </p>

            <p className="text-3xl font-extrabold mt-2">
              {stats?.[key] ?? "—"}
            </p>
          </div>
        ))}
      </div>

      {/* Customer Table */}
      <div className="bg-white shadow rounded-2xl p-5">
        <div className="flex flex-wrap gap-3 mb-5">
          <input
            aria-label="Search customers"
            placeholder="Search name, email or phone"
            className="border rounded-xl p-3 flex-1 min-w-[220px]"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <select
            aria-label="Status filter"
            className="border rounded-xl p-3"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {!modal && error && (
          <p
            role="alert"
            className="text-red-600 mb-3"
          >
            {error}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                {[
                  "Name",
                  "Email",
                  "Phone",
                  "Status",
                  "Actions",
                ].map((title) => (
                  <th
                    key={title}
                    className="p-3"
                  >
                    {title}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {customers.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b"
                >
                  <td className="p-3 font-semibold">
                    {customer.name}
                  </td>

                  <td className="p-3">
                    {customer.email}
                  </td>

                  <td className="p-3">
                    {customer.phone || "—"}
                  </td>

                  <td className="p-3">
                    <span
                      className={
                        customer.isActive
                          ? "text-green-700"
                          : "text-red-600"
                      }
                    >
                      {customer.isActive
                        ? "Active"
                        : "Inactive"}
                    </span>
                  </td>

                  <td className="p-3 whitespace-nowrap">
                    <button
                      type="button"
                      className="text-blue-700 font-semibold mr-3"
                      onClick={() => open(customer)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="text-slate-700"
                      onClick={() => toggle(customer)}
                    >
                      {customer.isActive
                        ? "Deactivate"
                        : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && customers.length === 0 && (
            <p className="text-center p-8 text-slate-500">
              No customers found
            </p>
          )}

          {loading && (
            <p className="p-5">
              Loading...
            </p>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-end gap-4 mt-5">
          <span className="text-sm text-slate-500">
            Page {page} of{" "}
            {Math.max(1, pagination.pages)} ·{" "}
            {pagination.total} customers
          </span>

          <button
            type="button"
            disabled={page <= 1}
            className="border rounded-lg px-3 py-2 disabled:opacity-40"
            onClick={() =>
              setPage((current) => current - 1)
            }
          >
            Previous
          </button>

          <button
            type="button"
            disabled={page >= pagination.pages}
            className="border rounded-lg px-3 py-2 disabled:opacity-40"
            onClick={() =>
              setPage((current) => current + 1)
            }
          >
            Next
          </button>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={
              editing
                ? "Edit customer"
                : "Add customer"
            }
            className="bg-white rounded-2xl p-6 w-full max-w-xl max-h-[90vh] overflow-auto"
          >
            <h2 className="text-2xl font-bold mb-5">
              {editing
                ? "Edit Customer"
                : "Add Customer"}
            </h2>

            <form
              onSubmit={submit}
              className="grid sm:grid-cols-2 gap-3"
            >
              {fields.map((key) => {
                const isPhone = key === "phone";
                const isPassword = key === "password";
                const isEmail = key === "email";

                const required = [
                  "name",
                  "email",
                  "password",
                  "phone",
                ].includes(key);

                return (
                  <label
                    key={key}
                    className="text-sm capitalize"
                  >
                    {key}

                    <input
                      name={key}
                      type={
                        isPassword
                          ? "password"
                          : isEmail
                          ? "email"
                          : "text"
                      }
                      required={required}
                      minLength={
                        isPassword
                          ? 8
                          : isPhone
                          ? 10
                          : undefined
                      }
                      maxLength={
                        isPhone
                          ? 10
                          : key === "address"
                          ? 300
                          : isPassword
                          ? 72
                          : 80
                      }
                      pattern={
                        isPhone
                          ? "[6-9][0-9]{9}"
                          : undefined
                      }
                      inputMode={
                        isPhone
                          ? "numeric"
                          : undefined
                      }
                      title={
                        isPhone
                          ? "Enter a valid 10-digit Indian mobile number"
                          : undefined
                      }
                      placeholder={
                        isPhone
                          ? "Enter 10-digit mobile number"
                          : ""
                      }
                      className="w-full border rounded-lg p-3 mt-1"
                      value={form[key]}
                      onChange={handleChange}
                    />
                  </label>
                );
              })}

              {error && (
                <p
                  role="alert"
                  className="text-red-600 text-sm sm:col-span-2"
                >
                  {error}
                </p>
              )}

              <div className="sm:col-span-2 flex justify-end gap-3 mt-3">
                <button
                  type="button"
                  disabled={busy}
                  className="border rounded-xl px-5 py-3"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={busy}
                  className="btn-primary"
                >
                  {busy
                    ? "Saving..."
                    : editing
                    ? "Update Customer"
                    : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
