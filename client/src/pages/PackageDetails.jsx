import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PackageReviews from './PackageReviews';
import ItineraryTimeline from '../components/ItineraryTimeline';
import api from '../services/api';
import { imageUrl } from '../utils/catalog';

const formatPrice = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(Number(value) || 0);

function Icon({ name, className = 'h-5 w-5' }) {
  const common = { className, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', viewBox: '0 0 24 24', 'aria-hidden': true };
  if (name === 'pin') return <svg {...common}><path d="m20 10-8 11-8-11a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>;
  if (name === 'calendar') return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></svg>;
  if (name === 'check') return <svg {...common}><path d="m5 12 4 4L19 6"/></svg>;
  if (name === 'close') return <svg {...common}><path d="M6 6l12 12M18 6 6 18"/></svg>;
  if (name === 'arrow') return <svg {...common}><path d="M5 12h14m-6-6 6 6-6 6"/></svg>;
  if (name === 'shield') return <svg {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>;
  return null;
}

export default function PackageDetails() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState([]);
  const [dayError, setDayError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setP(null);
    setError('');
    setDays([]);
    setDayError('');
    api.get('/packages/' + id)
      .then((r) => { if (active) setP(r.data.data); })
      .catch(() => { if (active) setError('Package not found.'); })
      .finally(() => { if (active) setLoading(false); });
    api.get('/packages/' + id + '/itinerary')
      .then((r) => { if (active) setDays(Array.isArray(r.data.data) ? r.data.data : []); })
      .catch(() => { if (active) setDayError('Itinerary could not be loaded.'); });
    return () => { active = false; };
  }, [id]);

  if (loading) return (
    <main className="container-wide min-h-[65vh] py-16" aria-busy="true">
      <div className="h-72 animate-pulse rounded-3xl bg-slate-200 md:h-96" />
      <div className="mt-8 h-9 w-2/3 animate-pulse rounded-lg bg-slate-200" />
      <div className="mt-4 h-5 w-1/3 animate-pulse rounded-lg bg-slate-100" />
    </main>
  );
  if (error || !p) return (
    <main className="container-wide min-h-[60vh] py-24 text-center">
      <h1 className="text-3xl font-extrabold text-slate-900">Package unavailable</h1>
      <p className="mt-3 text-slate-600">{error || 'This package could not be loaded.'}</p>
      <Link to="/packages" className="mt-6 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700">Browse packages</Link>
    </main>
  );

  const inclusions = Array.isArray(p.inclusions) ? p.inclusions : [];
  const exclusions = Array.isArray(p.exclusions) ? p.exclusions : [];
  const location = [p.destination?.name, p.destination?.state, p.destination?.country].filter(Boolean).join(', ');

  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-900 md:pb-16">
      <div className="container-wide pt-7 md:pt-10">
        <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link to="/" className="hover:text-blue-700">Home</Link><span>/</span>
          <Link to="/packages" className="hover:text-blue-700">Tour Packages</Link><span>/</span>
          <span className="font-medium text-slate-800">{p.name}</span>
        </nav>

        <div className="relative overflow-hidden rounded-3xl bg-slate-200 shadow-sm">
          <img src={imageUrl(p.image)} alt={p.name} className="h-64 w-full object-cover sm:h-80 lg:h-[440px]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-900/55 to-transparent" />
          <span className="absolute bottom-5 left-5 rounded-full border border-white/30 bg-white/95 px-4 py-2 text-xs font-bold text-blue-700 shadow-sm sm:left-7">Explore • Relax • Discover</span>
        </div>

        <div className="mt-8 grid grid-cols-1 items-start gap-7 lg:grid-cols-[minmax(0,1fr)_340px] xl:gap-10">
          <div className="min-w-0 space-y-7">
            <section>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700">
                <span className="rounded-full bg-blue-50 px-3 py-1.5">Curated travel experience</span>
              </div>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{p.name}</h1>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-slate-600">
                <span className="inline-flex items-center gap-2"><Icon name="pin" className="h-4 w-4 text-blue-600" />{location || 'Destination details available on booking'}</span>
                <span className="inline-flex items-center gap-2"><Icon name="calendar" className="h-4 w-4 text-blue-600" />{p.durationDays} Days / {p.durationNights} Nights</span>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-bold text-slate-900">About this experience</h2>
              <div className="mt-3 h-1 w-12 rounded-full bg-blue-600" />
              <p className="mt-5 whitespace-pre-line leading-8 text-slate-600">{p.description || 'Discover a memorable travel experience with TravelEase.'}</p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-blue-50 p-4"><Icon name="pin" className="h-6 w-6 text-blue-700" /><p className="mt-2 text-xs text-slate-500">Destination</p><p className="mt-1 font-semibold text-slate-900">{p.destination?.name || 'Explore'}</p></div>
                <div className="rounded-xl bg-blue-50 p-4"><Icon name="calendar" className="h-6 w-6 text-blue-700" /><p className="mt-2 text-xs text-slate-500">Duration</p><p className="mt-1 font-semibold text-slate-900">{p.durationDays} days</p></div>
                <div className="rounded-xl bg-blue-50 p-4"><Icon name="shield" className="h-6 w-6 text-blue-700" /><p className="mt-2 text-xs text-slate-500">Booking</p><p className="mt-1 font-semibold text-slate-900">Online reservation</p></div>
              </div>
            </section>

            <section className="grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-3 text-xl font-bold"><span className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><Icon name="check" /></span> What's included</h2>
                <ul className="mt-5 space-y-3">{inclusions.length ? inclusions.map((item, i) => <li key={i} className="flex items-start gap-3 text-sm leading-6 text-slate-700"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{item}</span></li>) : <li className="text-sm text-slate-500">Details will be shared soon.</li>}</ul>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-3 text-xl font-bold"><span className="rounded-xl bg-rose-50 p-2 text-rose-600"><Icon name="close" /></span> Not included</h2>
                <ul className="mt-5 space-y-3">{exclusions.length ? exclusions.map((item, i) => <li key={i} className="flex items-start gap-3 text-sm leading-6 text-slate-700"><Icon name="close" className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" /><span>{item}</span></li>) : <li className="text-sm text-slate-500">No exclusions listed.</li>}</ul>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-blue-700">Your journey</p>
              <ItineraryTimeline days={days} />
              {dayError && <p role="alert" className="mt-3 text-sm text-red-600">{dayError}</p>}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-blue-700">Traveler feedback</p>
              <PackageReviews packageId={id} />
            </section>
            <Link to="/packages" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline">← Back to all packages</Link>
          </div>

          <aside className="lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60">
              <div className="border-b border-slate-100 bg-gradient-to-br from-blue-50 to-white p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Starting from</p>
                <p className="mt-2 text-4xl font-extrabold tracking-tight text-blue-700">{formatPrice(p.price)}</p>
                <p className="mt-1 text-sm text-slate-500">per person</p>
              </div>
              <div className="space-y-5 p-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 text-sm"><span className="text-slate-500">Duration</span><span className="font-semibold">{p.durationDays} Days / {p.durationNights} Nights</span></div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 text-sm"><span className="text-slate-500">Destination</span><span className="max-w-[55%] text-right font-semibold">{p.destination?.name || '—'}</span></div>
                <p className="text-sm leading-6 text-slate-600">Choose your departure and traveler details in the next step.</p>
                <Link to={'/book/' + id} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-4 text-center font-bold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Book this package <Icon name="arrow" className="h-5 w-5" /></Link>
                <p className="flex items-center justify-center gap-2 text-center text-xs text-slate-500"><Icon name="shield" className="h-4 w-4 text-emerald-600" /> Secure booking process</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur lg:hidden">
        <div><p className="text-xs text-slate-500">From / person</p><p className="text-xl font-extrabold text-blue-700">{formatPrice(p.price)}</p></div>
        <Link to={'/book/' + id} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700">Book now →</Link>
      </div>
    </main>
  );
}
