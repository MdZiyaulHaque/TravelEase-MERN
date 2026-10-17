'use strict';
// Read-only audit. Uses GET /api/payments/admin; does not mutate records.
const BASE = (process.env.TEST_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
const COOKIE = process.env.TEST_ADMIN_COOKIE || '';
async function main() {
  if (!COOKIE) {
    console.error('TEST_ADMIN_COOKIE missing. Use an Admin session cookie; do not share it.');
    process.exitCode = 2;
    return;
  }
  const response = await fetch(BASE + '/api/payments/admin', {
    headers: { Accept: 'application/json', Cookie: COOKIE },
    redirect: 'manual', signal: AbortSignal.timeout(10000)
  });
  const payload = await response.json();
  if (response.status !== 200 || payload.success !== true || !Array.isArray(payload.data)) {
    console.error(`Admin payments API failed (HTTP ${response.status}):`, payload.message || 'Unexpected response');
    process.exitCode = 1;
    return;
  }
  const rows = payload.data;
  const byBooking = new Map();
  const byOrder = new Map();
  const issues = [];
  for (const p of rows) {
    const bookingId = typeof p.booking === 'object' ? p.booking?._id : p.booking;
    if (!bookingId) issues.push(`Payment ${p._id}: missing booking reference`);
    else {
      if (!byBooking.has(bookingId)) byBooking.set(bookingId, []);
      byBooking.get(bookingId).push(p);
    }
    if (p.orderId) {
      if (byOrder.has(p.orderId)) issues.push(`Duplicate orderId ${p.orderId}`);
      byOrder.set(p.orderId, p._id);
    }
    if (!Number.isSafeInteger(p.amountPaise) || p.amountPaise <= 0) issues.push(`Invalid amountPaise: ${p._id}`);
    if (p.booking && typeof p.booking === 'object' && typeof p.booking.totalAmount === 'number' &&
      Math.round(p.booking.totalAmount * 100) !== p.amountPaise) issues.push(`Amount mismatch: ${p._id}`);
    if (p.status === 'paid' && p.booking?.status !== 'confirmed') issues.push(`Paid payment with non-confirmed booking: ${p._id}`);
    if (p.status === 'refunded' && p.booking?.status !== 'cancelled') issues.push(`Refunded payment with non-cancelled booking: ${p._id}`);
  }
  const counts = {};
  for (const p of rows) counts[p.status] = (counts[p.status] || 0) + 1;
  console.log('AUDIT (read-only): API returns at most 300 latest payments');
  console.log('Payments scanned:', rows.length, '| Status counts:', counts);
  let duplicateBookings = 0;
  for (const [id, group] of byBooking) {
    if (group.length < 2) continue;
    duplicateBookings++;
    const statuses = {};
    for (const p of group) statuses[p.status] = (statuses[p.status] || 0) + 1;
    console.log(`Booking ${id}: ${group.length} orders; statuses: ${JSON.stringify(statuses)}`);
    if (group.filter(p => p.status === 'paid').length > 1) issues.push(`Multiple paid payments for booking ${id}`);
    if (group.filter(p => p.status === 'created').length > 1) console.log('  WARNING: multiple created orders (may be historical)');
  }
  console.log('Bookings with multiple orders:', duplicateBookings);
  console.log('Consistency issues:', issues.length);
  for (const issue of issues) console.log('ISSUE:', issue);
  console.log('No records changed. Historical duplicates are not automatically deleted.');
  if (issues.length) process.exitCode = 1;
}
main().catch(e => { console.error('Audit failed:', e.message); process.exitCode = 1; });
