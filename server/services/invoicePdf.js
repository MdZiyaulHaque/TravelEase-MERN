const PDFDocument = require('pdfkit');

const C = {
  navy: '#102A50', blue: '#0866B1', pale: '#EFF6FF', ink: '#1B2C44',
  muted: '#64748B', line: '#DCE5F0', white: '#FFFFFF', green: '#16803C',
  greenPale: '#EAF8EF', amber: '#A45A0A', amberPale: '#FFF6E5',
  red: '#B42332', redPale: '#FFF0F0',
};
const money = n => 'INR ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateText = d => {
  if (!d) return 'N/A';
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const parsed = new Date(d);
  return Number.isNaN(parsed.getTime()) ? String(d) : parsed.toISOString().slice(0, 10);
};
const safe = (v, fallback = 'N/A') => v == null || String(v).trim() === '' ? fallback : String(v);

/** Creates a one-page A4 payment receipt. Does not infer tax/GST values. */
function renderInvoicePdf({ booking, payment, businessName, businessAddress }) {
  const doc = new PDFDocument({ size: 'A4', margin: 0, info: {
    Title: `TravelEase Payment Receipt - ${booking._id}`,
    Author: safe(businessName, 'TravelEase Tours'),
    Subject: 'Payment receipt',
  }});
  const W = 595.28, margin = 43, inner = W - margin * 2;
  const text = (value, x, y, opts = {}) => doc.text(safe(value), x, y, { lineBreak: false, ellipsis: true, ...opts });
  const line = (y) => doc.moveTo(margin, y).lineTo(W - margin, y).strokeColor(C.line).lineWidth(0.8).stroke();
  const section = (name, y) => {
    doc.font('Helvetica-Bold').fontSize(11).fillColor(C.navy);
    text(name.toUpperCase(), margin + 15, y);
    line(y + 25);
  };
  const field = (label, value, x, y, width = 220) => {
    doc.font('Helvetica').fontSize(8).fillColor(C.muted);
    text(label.toUpperCase(), x, y, { width });
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.ink);
    text(value, x, y + 16, { width });
  };

  doc.rect(0, 0, W, 125).fill(C.navy);
  doc.roundedRect(margin, 29, 42, 42, 9).fill(C.blue);
  doc.font('Helvetica-Bold').fontSize(22).fillColor(C.white);
  text('T', margin + 14, 36);
  doc.font('Helvetica-Bold').fontSize(21).fillColor(C.white);
  text(safe(businessName, 'TravelEase Tours'), margin + 54, 27, { width: 390 });
  doc.font('Helvetica').fontSize(9).fillColor('#C9DDF4');
  text(safe(businessAddress, 'India'), margin + 55, 57, { width: 370 });
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#DCEBFC');
  text('PAYMENT RECEIPT', margin, 96);

  const status = String(payment.status || 'paid').toLowerCase();
  const statusStyle = status === 'paid'
    ? { label: 'PAID', bg: C.greenPale, fg: C.green }
    : status === 'refunded'
      ? { label: 'REFUNDED', bg: C.redPale, fg: C.red }
      : { label: status.replace(/_/g, ' ').toUpperCase(), bg: C.amberPale, fg: C.amber };
  doc.roundedRect(W - margin - 148, 146, 148, 32, 9).fill(statusStyle.bg);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(statusStyle.fg);
  text(statusStyle.label, W - margin - 139, 155, { width: 130, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(24).fillColor(C.navy);
  text(money(payment.amountPaise / 100), margin, 145, { width: 330 });
  doc.font('Helvetica').fontSize(9).fillColor(C.muted);
  text('Payment amount', margin, 177);

  doc.roundedRect(margin, 204, inner, 91, 11).fill(C.pale);
  field('Receipt reference', String(payment._id), margin + 16, 219, 235);
  field('Booking ID', String(booking._id), margin + 267, 219, 222);
  field('Payment date', dateText(payment.paidAt || payment.createdAt), margin + 16, 259, 235);
  field('Travel date', dateText(booking.travelDate), margin + 267, 259, 222);

  section('Customer & journey', 318);
  field('Customer', booking.customer?.name || 'Customer', margin + 15, 353, 218);
  field('Email', booking.customer?.email || 'N/A', margin + 265, 353, 218);
  field('Tour package', booking.package?.name || 'Travel Package', margin + 15, 396, 218);
  field('Travelers', Array.isArray(booking.travelers) ? booking.travelers.length : 0, margin + 265, 396, 218);
  field('Razorpay order ID', payment.orderId || 'N/A', margin + 15, 439, 218);
  field('Razorpay payment ID', payment.paymentId || 'N/A', margin + 265, 439, 218);

  section('Payment summary', 494);
  const amountRow = (label, value, y, bold = false) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 12 : 10);
    doc.fillColor(bold ? C.navy : C.muted);
    text(label, margin + 15, y, { width: 285 });
    doc.fillColor(bold ? C.navy : C.ink);
    text(value, W - margin - 188, y, { width: 173, align: 'right' });
  };
  amountRow('Original amount', money(booking.originalAmount ?? booking.totalAmount), 533);
  amountRow('Coupon', safe(booking.couponCode, 'None'), 558);
  amountRow('Discount', '- ' + money(booking.discountAmount), 583);
  line(612);
  amountRow('Total paid', money(payment.amountPaise / 100), 626, true);

  if (status === 'refunded' || status === 'partially_refunded') {
    amountRow('Refund recorded', money((payment.refundAmountPaise || 0) / 100), 658);
  }

  doc.roundedRect(margin, 700, inner, 64, 9).fill('#F7F9FC');
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.navy);
  text('IMPORTANT INFORMATION', margin + 13, 712);
  doc.font('Helvetica').fontSize(8).fillColor(C.muted);
  doc.text('This document confirms the recorded payment status. It is a payment receipt, not a GST tax invoice. Tax registration details and tax breakup must be configured separately where applicable.', margin + 13, 729, { width: inner - 26, lineGap: 2 });

  line(790);
  doc.font('Helvetica').fontSize(8).fillColor(C.muted);
  text('Generated by TravelEase  |  Keep this receipt for your records', margin, 804, { width: inner, align: 'center' });
  doc.end();
  return doc;
}

module.exports = { renderInvoicePdf };
