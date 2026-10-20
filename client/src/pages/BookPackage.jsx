
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

function getTodayIndia() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type) =>
    parts.find((part) => part.type === type)?.value;

  return `${get("year")}-${get("month")}-${get("day")}`;
}

export default function BookPackage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pkg, setPkg] = useState(null);
  const [departures, setDepartures] = useState([]);
  const [departureId, setDepartureId] = useState("");
  const [travelers, setTravelers] = useState([
    { name: "", age: "" },
  ]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const todayString = getTodayIndia();

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError("");
      setDepartureId("");

      try {
        const [packageResponse, departureResponse] =
          await Promise.all([
            api.get(`/packages/${id}`),
            api.get(`/bookings/departures/${id}`),
          ]);

        if (!active) return;

        console.log(
          "DEPARTURES API RESPONSE:",
          departureResponse.data
        );

        setPkg(packageResponse.data?.data || null);

        const departureData =
          departureResponse.data?.data;

        setDepartures(
          Array.isArray(departureData)
            ? departureData
            : []
        );
      } catch (err) {
        if (!active) return;

        console.error("BOOKING PAGE API ERROR:", err);

        setError(
          err.response?.data?.message ||
            err.userMessage ||
            "Unable to load package details."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [id]);

  // Allow today and future departures
  const availableDepartures = useMemo(() => {
    return departures
      .filter((departure) => {
        if (!departure.date) return false;

        const date = String(departure.date).slice(0, 10);

        // IMPORTANT: >= allows today's date
        const isValidDate = date >= todayString;

        const availableSeats = Number(
          departure.availableSeats ??
            Number(departure.capacity || 0) -
              Number(departure.reserved || 0)
        );

        const hasEnoughSeats =
          availableSeats >= travelers.length;

        const isActive =
          departure.isActive !== false;

        if (
          !isValidDate ||
          !hasEnoughSeats ||
          !isActive
        ) {
          console.log("DEPARTURE FILTERED:", {
            date,
            todayString,
            isValidDate,
            availableSeats,
            travelers: travelers.length,
            isActive,
          });
        }

        return (
          isValidDate &&
          hasEnoughSeats &&
          isActive
        );
      })
      .sort((a, b) =>
        String(a.date).localeCompare(String(b.date))
      );
  }, [departures, travelers.length, todayString]);

  useEffect(() => {
    if (
      departureId &&
      !availableDepartures.some(
        (departure) => departure._id === departureId
      )
    ) {
      setDepartureId("");
    }
  }, [departureId, availableDepartures]);

  function changeTraveler(index, field, value) {
    setTravelers((previous) =>
      previous.map((traveler, i) =>
        i === index
          ? { ...traveler, [field]: value }
          : traveler
      )
    );
  }

  function addTraveler() {
    if (travelers.length >= 10) return;

    setTravelers((previous) => [
      ...previous,
      { name: "", age: "" },
    ]);
  }

  function removeTraveler() {
    if (travelers.length <= 1) return;

    setTravelers((previous) =>
      previous.slice(0, -1)
    );
  }

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (!departureId) {
      setError(
        "Please select an available departure."
      );
      return;
    }

    const selectedDeparture =
      availableDepartures.find(
        (departure) =>
          departure._id === departureId
      );

    if (!selectedDeparture) {
      setError(
        "Selected departure is no longer available."
      );
      return;
    }

    setSaving(true);

    try {
      await api.post("/bookings", {
        packageId: id,
        departureId,
        travelers: travelers.map((traveler) => ({
          name: traveler.name.trim(),
          age: Number(traveler.age),
        })),
      });

      navigate("/my-bookings");
    } catch (err) {
      console.error("BOOKING ERROR:", err);

      setError(
        err.response?.data?.message ||
          err.userMessage ||
          "Booking failed. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  const totalAmount =
    Number(pkg?.price || 0) * travelers.length;

  return (
    <main className="container-wide py-12 max-w-3xl">
      <h1 className="text-3xl font-bold text-slate-900">
        Book {pkg?.name || "Package"}
      </h1>

      <p className="text-slate-600 my-3">
        Select an available departure and enter
        traveler details to reserve your booking.
      </p>

      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-5"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl shadow p-8">
          Loading available departures...
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="bg-white rounded-xl shadow p-6 space-y-5"
        >
          <label className="block font-semibold">
            Departure date

            <select
              required
              className="w-full border rounded-lg p-3 mt-2"
              value={departureId}
              onChange={(event) =>
                setDepartureId(event.target.value)
              }
            >
              <option value="">
                Select available departure
              </option>

              {availableDepartures.map(
                (departure) => {
                  const seats = Number(
                    departure.availableSeats ??
                      Number(
                        departure.capacity || 0
                      ) -
                        Number(
                          departure.reserved || 0
                        )
                  );

                  return (
                    <option
                      key={departure._id}
                      value={departure._id}
                    >
                      {String(
                        departure.date
                      ).slice(0, 10)}
                      {" — "}
                      {seats} seats available
                    </option>
                  );
                }
              )}
            </select>
          </label>

          {availableDepartures.length === 0 && (
            <p className="text-amber-700 bg-amber-50 p-3 rounded-lg">
              No available departures for today
              or upcoming dates. Please choose
              another package or contact the
              organizer.
            </p>
          )}

          {travelers.map(
            (traveler, index) => (
              <div
                key={index}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <label className="block">
                  Traveler {index + 1} name

                  <input
                    required
                    minLength={2}
                    maxLength={80}
                    className="w-full border rounded-lg p-3 mt-2"
                    value={traveler.name}
                    onChange={(event) =>
                      changeTraveler(
                        index,
                        "name",
                        event.target.value
                      )
                    }
                    placeholder="Enter full name"
                  />
                </label>

                <label className="block">
                  Age

                  <input
                    required
                    type="number"
                    min="1"
                    max="120"
                    className="w-full border rounded-lg p-3 mt-2"
                    value={traveler.age}
                    onChange={(event) =>
                      changeTraveler(
                        index,
                        "age",
                        event.target.value
                      )
                    }
                    placeholder="Enter age"
                  />
                </label>
              </div>
            )
          )}

          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              className="btn-primary"
              disabled={travelers.length >= 10}
              onClick={addTraveler}
            >
              Add traveler
            </button>

            <button
              type="button"
              className="border rounded-lg px-4 py-2"
              disabled={travelers.length <= 1}
              onClick={removeTraveler}
            >
              Remove
            </button>
          </div>

          <div className="border-t pt-4">
            <p className="font-bold text-xl">
              Total: ₹
              {totalAmount.toLocaleString(
                "en-IN"
              )}
            </p>

            <p className="text-sm text-slate-500 mt-1">
              {travelers.length} traveler(s)
            </p>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={
              saving ||
              !departureId ||
              availableDepartures.length === 0
            }
          >
            {saving
              ? "Submitting..."
              : "Reserve Booking"}
          </button>
        </form>
      )}

      <Link
        className="block mt-5 text-blue-700"
        to={`/packages/${id}`}
      >
        Back to package
      </Link>
    </main>
  );
}
