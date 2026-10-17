import React, { useState } from "react";
import {
  Mail,
  MapPin,
  MessageCircle,
  Send,
  CheckCircle2,
} from "lucide-react";

const initialForm = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

export default function Contact() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setSubmitted(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const newErrors = {};

    if (form.name.trim().length < 2) {
      newErrors.name = "Please enter your name.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Please enter a valid email.";
    }

    if (form.subject.trim().length < 3) {
      newErrors.subject = "Please enter a subject.";
    }

    if (form.message.trim().length < 10) {
      newErrors.message = "Message must contain at least 10 characters.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Frontend-only form until the contact API is integrated.
    // Do not show a success message implying the message was delivered.
    const subject = encodeURIComponent(form.subject);
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`
    );

    // Replace the placeholder with a verified support email
    // before enabling actual email submission.
    setSubmitted(true);
    setErrors({});
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-gradient-to-r from-blue-900 to-sky-700 px-4 py-20 text-center text-white">
        <h1 className="text-4xl font-extrabold md:text-5xl">
          Contact Us
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-lg text-blue-100">
          Have questions about tour packages, bookings, or your travel
          plans? We'd love to hear from you.
        </p>
      </section>

      <section className="container-wide px-4 py-16">
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">
              Get in Touch
            </h2>

            <p className="leading-7 text-slate-600">
              Use the form to prepare your enquiry. Our online contact
              submission service is currently being integrated.
            </p>

            {[
              {
                icon: Mail,
                title: "Email Support",
                description: "Contact email will be available soon.",
              },
              {
                icon: MapPin,
                title: "Our Location",
                description: "TravelEase online travel platform",
              },
              {
                icon: MessageCircle,
                title: "Booking Enquiries",
                description:
                  "For questions about packages, reservations, and trips.",
              },
            ].map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <Icon size={23} />
                </div>

                <div>
                  <h3 className="font-bold text-slate-900">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm md:p-10">
              <h2 className="text-2xl font-bold text-slate-900">
                Send Us a Message
              </h2>

              <p className="mt-2 text-slate-600">
                Fill out the details below.
              </p>

              {submitted && (
                <div
                  role="status"
                  className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900"
                >
                  <CheckCircle2 size={22} />
                  <p>
                    Your form is valid. Online message delivery is not
                    enabled yet, so your enquiry has not been sent.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="mb-2 block font-semibold text-slate-700"
                    >
                      Full Name
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Enter your name"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="contact-email"
                      className="mb-2 block font-semibold text-slate-700"
                    >
                      Email Address
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.email}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="contact-subject"
                    className="mb-2 block font-semibold text-slate-700"
                  >
                    Subject
                  </label>
                  <input
                    id="contact-subject"
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    placeholder="How can we help?"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  {errors.subject && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.subject}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="contact-message"
                    className="mb-2 block font-semibold text-slate-700"
                  >
                    Your Message
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={6}
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Write your message here..."
                    className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  {errors.message && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3 font-semibold text-white transition hover:bg-blue-700"
                >
                  <Send size={18} />
                  Validate Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}