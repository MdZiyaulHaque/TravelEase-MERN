import React, { useState } from 'react';
import { Mail, MapPin, MessageCircle, Send, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

const initialForm = { name: '', email: '', subject: '', message: '' };

export default function Contact() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState('');

  function handleChange(event) {
    const { name, value } = event.target;
    setForm(previous => ({ ...previous, [name]: value }));
    setErrors(previous => ({ ...previous, [name]: '' }));
    setSubmitted(false);
    setServerError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (sending) return;
    const values = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]));
    const nextErrors = {};
    if (values.name.length < 2 || values.name.length > 80) nextErrors.name = 'Name must be 2–80 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) || values.email.length > 254) nextErrors.email = 'Please enter a valid email.';
    if (values.subject.length < 3 || values.subject.length > 150) nextErrors.subject = 'Subject must be 3–150 characters.';
    if (values.message.length < 10 || values.message.length > 5000) nextErrors.message = 'Message must be 10–5000 characters.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSending(true);
    setSubmitted(false);
    setServerError('');
    try {
      const response = await api.post('/contact', values);
      if (!response.data?.success) throw new Error('Unable to send your enquiry.');
      setSubmitted(true);
      setForm(initialForm);
    } catch (error) {
      setServerError(error.response?.data?.message || error.userMessage || error.message || 'Unable to send your enquiry. Please try again.');
    } finally {
      setSending(false);
    }
  }

  const info = [
    { icon: Mail, title: 'Email Support', description: 'Send your enquiry using the form.' },
    { icon: MapPin, title: 'Our Location', description: 'TravelEase online travel platform' },
    { icon: MessageCircle, title: 'Booking Enquiries', description: 'For questions about packages, reservations, and trips.' },
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-gradient-to-r from-blue-900 to-sky-700 px-4 py-20 text-center text-white">
        <h1 className="text-4xl font-extrabold md:text-5xl">Contact Us</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-blue-100">Have questions about tour packages, bookings, or your travel plans? We'd love to hear from you.</p>
      </section>
      <section className="container-wide px-4 py-16">
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">Get in Touch</h2>
            <p className="leading-7 text-slate-600">Send your enquiry using the form. Our team can review your message.</p>
            {info.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600"><Icon size={23} /></div>
                <div><h3 className="font-bold text-slate-900">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{description}</p></div>
              </div>
            ))}
          </div>
          <div className="lg:col-span-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm md:p-10">
              <h2 className="text-2xl font-bold text-slate-900">Send Us a Message</h2>
              <p className="mt-2 text-slate-600">Fill out the details below.</p>
              {submitted && <div role="status" className="mt-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800"><CheckCircle2 size={22} /><p>Your enquiry has been received successfully.</p></div>}
              {serverError && <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{serverError}</div>}
              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div><label htmlFor="contact-name" className="mb-2 block font-semibold text-slate-700">Full Name</label><input id="contact-name" name="name" value={form.name} onChange={handleChange} maxLength={80} placeholder="Enter your name" className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />{errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}</div>
                  <div><label htmlFor="contact-email" className="mb-2 block font-semibold text-slate-700">Email Address</label><input id="contact-email" type="email" name="email" value={form.email} onChange={handleChange} maxLength={254} placeholder="Enter your email" className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />{errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}</div>
                </div>
                <div><label htmlFor="contact-subject" className="mb-2 block font-semibold text-slate-700">Subject</label><input id="contact-subject" name="subject" value={form.subject} onChange={handleChange} maxLength={150} placeholder="How can we help?" className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />{errors.subject && <p className="mt-1 text-sm text-red-600">{errors.subject}</p>}</div>
                <div><label htmlFor="contact-message" className="mb-2 block font-semibold text-slate-700">Your Message</label><textarea id="contact-message" name="message" rows={6} value={form.message} onChange={handleChange} maxLength={5000} placeholder="Write your message here..." className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />{errors.message && <p className="mt-1 text-sm text-red-600">{errors.message}</p>}</div>
                <button type="submit" disabled={sending} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"><Send size={18} />{sending ? 'Sending...' : 'Send Message'}</button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
