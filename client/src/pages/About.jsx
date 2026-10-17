import React from "react";
import { Link } from "react-router-dom";
import {
  Plane,
  Globe2,
  ShieldCheck,
  Headphones,
  MapPinned,
  HeartHandshake,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const features = [
  {
    icon: Globe2,
    title: "Explore Destinations",
    description:
      "Discover exciting destinations and carefully organized tour packages.",
  },
  {
    icon: ShieldCheck,
    title: "Easy Booking",
    description:
      "Browse packages, select departure dates, and manage your reservations.",
  },
  {
    icon: Headphones,
    title: "Travel Assistance",
    description:
      "Stay informed with booking updates, trip details, and notifications.",
  },
  {
    icon: HeartHandshake,
    title: "Customer Focused",
    description:
      "A simple and convenient travel planning experience for every customer.",
  },
];

export default function About() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-gradient-to-r from-blue-900 via-blue-800 to-sky-700 py-24 text-white">
        <div className="container-wide px-4 text-center">
          <span className="mb-4 inline-block rounded-full bg-white/15 px-5 py-2 text-sm font-semibold">
            Discover Our Story
          </span>

          <h1 className="mb-6 text-4xl font-extrabold md:text-6xl">
            About TravelEase
          </h1>

          <p className="mx-auto max-w-3xl text-lg leading-8 text-blue-100">
            Making travel planning simpler through destination discovery,
            organized tour packages, convenient bookings, and seamless trip
            management.
          </p>
        </div>
      </section>

      <section className="container-wide px-4 py-20">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <span className="font-semibold uppercase tracking-wider text-blue-600">
              Who We Are
            </span>

            <h2 className="mt-3 text-3xl font-bold text-slate-900 md:text-4xl">
              Your Travel Planning Companion
            </h2>

            <p className="mt-6 leading-8 text-slate-600">
              TravelEase is a MERN Stack-based Tour & Travel Organizer
              Management System designed to simplify the complete travel
              booking experience.
            </p>

            <p className="mt-4 leading-8 text-slate-600">
              Our platform brings destinations, tour packages, departure
              schedules, bookings, payments, and trip information together
              in one convenient place.
            </p>

            <div className="mt-6 space-y-3">
              {[
                "Browse destinations and tour packages",
                "Reserve seats for upcoming departures",
                "Manage bookings and travel information",
                "Access booking updates and notifications",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-slate-700">{item}</span>
                </div>
              ))}
            </div>

            <Link
              to="/packages"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Explore Packages <ArrowRight size={18} />
            </Link>
          </div>

          <div className="overflow-hidden rounded-3xl shadow-xl">
            <img
              src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&auto=format&fit=crop"
              alt="Travel destinations"
              className="h-[420px] w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="container-wide px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-slate-900">
              Why Choose TravelEase?
            </h2>
            <p className="mt-3 text-slate-600">
              Everything you need for organized travel planning.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-7 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-5 inline-flex rounded-xl bg-blue-100 p-4 text-blue-600">
                  <Icon size={28} />
                </div>

                <h3 className="mb-3 text-xl font-bold text-slate-900">
                  {title}
                </h3>

                <p className="leading-7 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-wide px-4 py-20">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-3xl bg-blue-50 p-9">
            <MapPinned className="mb-5 text-blue-600" size={36} />
            <h2 className="mb-4 text-2xl font-bold text-slate-900">
              Our Mission
            </h2>
            <p className="leading-8 text-slate-600">
              To make tour planning and booking easier by providing a
              centralized, accessible, and user-friendly travel management
              platform.
            </p>
          </div>

          <div className="rounded-3xl bg-sky-50 p-9">
            <Plane className="mb-5 text-sky-600" size={36} />
            <h2 className="mb-4 text-2xl font-bold text-slate-900">
              Our Vision
            </h2>
            <p className="leading-8 text-slate-600">
              To create a connected travel experience where customers and
              travel organizers can manage every journey with greater ease.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-blue-700 py-16 text-center text-white">
        <div className="container-wide px-4">
          <h2 className="mb-4 text-3xl font-bold">
            Ready for Your Next Adventure?
          </h2>
          <p className="mb-7 text-blue-100">
            Explore our tour packages and start planning your journey.
          </p>
          <Link
            to="/packages"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 font-bold text-blue-700 hover:bg-blue-50"
          >
            <Globe2 size={19} /> Browse Tour Packages
          </Link>
        </div>
      </section>
    </main>
  );
}