const router = require('express').Router();
const { requireAuth, allowRoles } = require('../middleware/auth');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Payment = require('../models/Payment');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

router.use(requireAuth, allowRoles('admin'));
const types = ['bookings', 'customers', 'payments', 'revenue'];
const formats = ['json', 'csv', 'xlsx', 'pdf'];

function filters(req) {
  const { from = '', to = '', format = 'json', status = '', search = '' } = req.query;
  const type = req.params.type;
  if (!types.includes(type)) throw Object.assign(new Error('Invalid report type'), { status: 400 });
  if (!formats.includes(format)) throw Object.assign(new Error('Invalid export format'), { status: 400 });
  const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z')) && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s;
  if ([from, to].some(s => s && !validDate(s))) throw Object.assign(new Error('Use valid YYYY-MM-DD dates'), { status: 400 });
  if (from && to && from > to) throw Object.assign(new Error('from must be before to'), { status: 400 });
  if (typeof search !== 'string' || typeof status !== 'string' || search.length > 100 || status.length > 40) throw Object.assign(new Error('Filter too long'), { status: 400 });
  const date = {};
  if (from) date.$gte = new Date(from + 'T00:00:00Z');
  if (to) date.$lt = new Date(new Date(to + 'T00:00:00Z').getTime() + 86400000);
  return { type, format, status, search, date };
}
function dateStr(v) { return v instanceof Date ? v.toISOString().slice(0, 10) : v ? new Date(v).toISOString().slice(0, 10) : ''; }
const clean = v => String(v ?? '').replace(/[\r\n\t]+/g, ' ').slice(0, 500);
function safeCell(v) { const s = clean(v); return /^[=+@\-]/.test(s) ? "'" + s : s; }
const esc = v => '"' + safeCell(v).replace(/"/g, '""') + '"';
function columns(type) {
  return {
    bookings: [['id', 'Booking ID'], ['createdAt', 'Booked On'], ['customer', 'Customer'], ['email', 'Email'], ['package', 'Package'], ['travelDate', 'Travel Date'], ['travelers', 'Travelers'], ['amount', 'Amount INR'], ['status', 'Booking Status'], ['paymentStatus', 'Payment Status']],
    customers: [['id', 'Customer ID'], ['createdAt', 'Registered On'], ['name', 'Name'], ['email', 'Email'], ['phone', 'Phone'], ['city', 'City'], ['isActive', 'Active']],
    payments: [['id', 'Payment ID'], ['createdAt', 'Created On'], ['paidAt', 'Paid On'], ['customer', 'Customer'], ['orderId', 'Order ID'], ['paymentId', 'Gateway Payment ID'], ['amount', 'Gross INR'], ['refund', 'Refund INR'], ['net', 'Net INR'], ['status', 'Status']],
    revenue: [['period', 'Month (UTC)'], ['transactions', 'Paid Transactions'], ['gross', 'Gross INR'], ['refunds', 'Refunds INR'], ['net', 'Net INR']]
  }[type];
}
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
async function getData({ type, status, search, date }) {
  const range = Object.keys(date).length ? { createdAt: date } : {};
  if (type === 'bookings') {
    const q = { ...range }; if (status) q.status = status;
    const docs = await Booking.find(q).sort({ createdAt: -1 }).limit(10000).populate('customer', 'name email').populate('package', 'name').lean();
    return docs.filter(x => !search || [x.customer?.name, x.customer?.email, x.package?.name].some(v => String(v || '').toLowerCase().includes(search.toLowerCase())))
      .map(x => ({ id: String(x._id), createdAt: dateStr(x.createdAt), customer: x.customer?.name || '', email: x.customer?.email || '', package: x.package?.name || '', travelDate: x.travelDate, travelers: x.travelers?.length || 0, amount: x.totalAmount, status: x.status, paymentStatus: x.paymentStatus }));
  }
  if (type === 'customers') {
    const q = { role: 'customer', ...range };
    if (status === 'active') q.isActive = true;
    if (status === 'inactive') q.isActive = false;
    if (search) q.$or = [{ name: { $regex: escapeRegex(search), $options: 'i' } }, { email: { $regex: escapeRegex(search), $options: 'i' } }];
    const docs = await User.find(q).sort({ createdAt: -1 }).limit(10000).lean();
    return docs.map(x => ({ id: String(x._id), createdAt: dateStr(x.createdAt), name: x.name, email: x.email, phone: x.phone, city: x.city, isActive: x.isActive ? 'Yes' : 'No' }));
  }
  if (type === 'payments') {
    const q = { ...range }; if (status) q.status = status;
    const docs = await Payment.find(q).sort({ createdAt: -1 }).limit(10000).populate('customer', 'name').lean();
    return docs.filter(x => !search || [x.customer?.name, x.orderId, x.paymentId].some(v => String(v || '').toLowerCase().includes(search.toLowerCase())))
      .map(x => ({ id: String(x._id), createdAt: dateStr(x.createdAt), paidAt: dateStr(x.paidAt), customer: x.customer?.name || '', orderId: x.orderId, paymentId: x.paymentId || '', amount: x.amountPaise / 100, refund: (x.refundAmountPaise || 0) / 100, net: (x.amountPaise - (x.refundAmountPaise || 0)) / 100, status: x.status }));
  }
  // Revenue is based on captured payments, grouped by UTC month of payment.
  const eligible = await Payment.find({ paidAt: { $type: 'date', ...date }, status: { $in: ['paid', 'refund_pending', 'partially_refunded', 'refunded'] } }).sort({ paidAt: -1 }).limit(10000).lean();
  const groups = new Map();
  for (const x of eligible) {
    const period = x.paidAt.toISOString().slice(0, 7);
    const r = groups.get(period) || { period, transactions: 0, gross: 0, refunds: 0, net: 0 };
    r.transactions++; r.gross += x.amountPaise / 100; r.refunds += (x.refundAmountPaise || 0) / 100; r.net = r.gross - r.refunds;
    groups.set(period, r);
  }
  return [...groups.values()].sort((a, b) => b.period.localeCompare(a.period));
}

// PDF presentation only. All data retrieval and other export formats stay unchanged.
function renderProfessionalPDF(res, f, rows, cols, query) {
  const doc = new PDFDocument({ size: 'A3', layout: 'landscape', margins: { top: 34, bottom: 44, left: 36, right: 36 }, bufferPages: true, autoFirstPage: true, info: { Title: `TravelEase ${f.type} Report`, Author: 'TravelEase', Subject: 'Admin export' } });
  doc.pipe(res);
  const W = doc.page.width, H = doc.page.height, L = 36, R = W - 36, usable = R - L;
  const navy = '#123C65', blue = '#0B69B4', ink = '#172B46', muted = '#61758D', light = '#F2F6FA', border = '#E0E8F0';
  const title = f.type.charAt(0).toUpperCase() + f.type.slice(1);
  const date = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const numericKeys = new Set(['amount', 'refund', 'net', 'gross', 'refunds', 'transactions', 'travelers']);
  const money = n => 'INR ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sum = key => rows.reduce((total, r) => total + (Number(r[key]) || 0), 0);
  const metrics = f.type === 'bookings'
    ? [['TOTAL BOOKINGS', rows.length], ['CONFIRMED', rows.filter(r => r.status === 'confirmed').length], ['CANCELLED', rows.filter(r => r.status === 'cancelled').length], ['PENDING', rows.filter(r => r.status === 'pending_payment').length]]
    : f.type === 'customers'
      ? [['TOTAL CUSTOMERS', rows.length], ['ACTIVE', rows.filter(r => r.isActive === 'Yes').length], ['INACTIVE', rows.filter(r => r.isActive === 'No').length]]
      : f.type === 'payments'
        ? [['PAYMENT RECORDS', rows.length], ['GROSS ORDERS', money(sum('amount'))], ['REFUNDS', money(sum('refund'))]]
        : [['MONTHS', rows.length], ['GROSS', money(sum('gross'))], ['REFUNDS', money(sum('refunds'))], ['NET', money(sum('net'))]];
  // Width ratios give descriptive fields enough space while keeping identifiers readable.
  const ratios = {
    bookings: [1.13, .82, 1.02, 1.54, 1.57, .82, .53, .84, 1.00, .91],
    customers: [1.35, .95, 1.30, 1.85, 1.08, 1.10, .66],
    payments: [1.00, .75, .75, 1.02, 1.26, 1.28, .78, .78, .78, .91],
    revenue: [1.25, 1.15, 1.30, 1.30, 1.30]
  }[f.type];
  const ratioSum = ratios.reduce((a, b) => a + b, 0);
  const widths = ratios.map(r => usable * r / ratioSum);
  const xs = []; let running = L;
  widths.forEach(w => { xs.push(running); running += w; });
  const headerHeight = 30, rowHeight = 31, tableTop = 211, bottomLimit = H - 60;

  function drawHeader() {
    doc.rect(0, 0, W, 92).fill(navy);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(22).text('TravelEase', L, 25, { lineBreak: false });
    doc.fillColor('#C5DEEF').font('Helvetica').fontSize(10).text('TOUR & TRAVEL MANAGEMENT', L, 56, { lineBreak: false });
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(19).text(`${title.toUpperCase()} REPORT`, W - 415, 31, { width: 379, align: 'right', lineBreak: false });
    doc.fillColor(muted).font('Helvetica').fontSize(9).text(`Generated: ${date}`, L, 106, { lineBreak: false });
    const rangeText = `From: ${query.from || 'Any'}    To: ${query.to || 'Any'}    Status: ${f.status || 'Any'}    Search: ${f.search || 'Any'}`;
    doc.fontSize(8.5).text(rangeText, L, 124, { width: usable, height: 13, ellipsis: true, lineBreak: false });
    const gap = 12, count = metrics.length, boxW = (usable - gap * (count - 1)) / count;
    metrics.forEach(([label, value], i) => {
      const x = L + i * (boxW + gap);
      doc.roundedRect(x, 145, boxW, 49, 7).fill(light);
      doc.fillColor(muted).font('Helvetica-Bold').fontSize(8).text(label, x + 12, 154, { width: boxW - 24, lineBreak: false });
      doc.fillColor(ink).font('Helvetica-Bold').fontSize(14).text(String(value), x + 12, 168, { width: boxW - 24, ellipsis: true, lineBreak: false });
    });
  }
  function drawTableHeader(y) {
    doc.rect(L, y, usable, headerHeight).fill(blue);
    cols.forEach(([key, label], i) => {
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.2)
        .text(label, xs[i] + 6, y + 9, { width: widths[i] - 12, height: 15, ellipsis: true, lineBreak: false });
    });
  }
  function drawRow(row, y, index) {
    if (index % 2 === 0) doc.rect(L, y, usable, rowHeight).fill('#F5F8FC');
    doc.moveTo(L, y + rowHeight).lineTo(R, y + rowHeight).strokeColor(border).lineWidth(.5).stroke();
    cols.forEach(([key], i) => {
      let value = row[key];
      if (typeof value === 'number' && !['travelers', 'transactions'].includes(key)) value = Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 });
      const raw = clean(value);
      // IDs are shortened visually; CSV/XLSX and database keep the complete value.
      const display = key === 'id' && raw.length > 16 ? raw.slice(0, 12) + '...' : raw;
      const align = numericKeys.has(key) ? 'right' : 'left';
      const color = ['status', 'paymentStatus'].includes(key)
        ? (/^(paid|confirmed|active)$/i.test(raw) ? '#087D56' : /^(cancelled|refunded)$/i.test(raw) ? '#AF4D38' : ink)
        : ink;
      doc.fillColor(color).font('Helvetica').fontSize(8.4)
        .text(display, xs[i] + 6, y + 9, { width: widths[i] - 12, height: 15, ellipsis: true, lineBreak: false, align });
    });
  }
  function drawContinuedHeader() {
    doc.rect(0, 0, W, 57).fill(navy);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(15).text(`TravelEase  /  ${title} Report`, L, 20, { lineBreak: false });
    doc.fillColor(muted).font('Helvetica').fontSize(9).text('Continued report', L, 68, { lineBreak: false });
    drawTableHeader(88);
    return 88 + headerHeight;
  }
  drawHeader();
  drawTableHeader(tableTop);
  let y = tableTop + headerHeight;
  if (!rows.length) {
    doc.fillColor(muted).font('Helvetica').fontSize(12).text('No records found for the selected filters.', L, y + 30, { width: usable, align: 'center' });
  }
  rows.forEach((row, i) => {
    if (y + rowHeight > bottomLimit) { doc.addPage(); y = drawContinuedHeader(); }
    drawRow(row, y, i); y += rowHeight;
  });
  const pageRange = doc.bufferedPageRange();
  for (let i = 0; i < pageRange.count; i++) {
    doc.switchToPage(pageRange.start + i);
    doc.moveTo(L, H - 43).lineTo(R, H - 43).strokeColor(border).lineWidth(1).stroke();
    doc.fillColor(muted).font('Helvetica').fontSize(8)
      .text('TravelEase  |  Confidential Admin Report', L, H - 32, { width: usable / 2, lineBreak: false })
      .text(`Page ${i + 1} of ${pageRange.count}  |  ${rows.length} records`, L + usable / 2, H - 32, { width: usable / 2, align: 'right', lineBreak: false });
  }
  doc.end();
}

router.get('/:type', async (req, res, next) => {
  try {
    const f = filters(req), rows = await getData(f), cols = columns(f.type);
    if (f.format === 'json') return res.json({ success: true, type: f.type, count: rows.length, limit: 10000, filters: { from: req.query.from || '', to: req.query.to || '', status: f.status, search: f.search }, data: rows });
    const stamp = new Date().toISOString().slice(0, 10), file = `travelease-${f.type}-${stamp}.${f.format}`;
    res.setHeader('Content-Disposition', `attachment; filename="${file}"`);
    res.setHeader('Cache-Control', 'no-store');
    if (f.format === 'csv') {
      res.type('text/csv; charset=utf-8');
      return res.send('\uFEFF' + cols.map(x => esc(x[1])).join(',') + '\r\n' + rows.map(r => cols.map(c => esc(r[c[0]])).join(',')).join('\r\n'));
    }
    if (f.format === 'xlsx') {
      const book = new ExcelJS.Workbook(); book.creator = 'TravelEase'; const sheet = book.addWorksheet(f.type);
      sheet.columns = cols.map(([key, header]) => ({ header, key, width: Math.min(38, Math.max(16, header.length + 5)) }));
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF123C65' } };
      rows.forEach(r => sheet.addRow(Object.fromEntries(cols.map(([key]) => [key, typeof r[key] === 'number' ? r[key] : safeCell(r[key])]))));
      sheet.views = [{ state: 'frozen', ySplit: 1 }];
      sheet.autoFilter = { from: 'A1', to: sheet.getRow(1).getCell(cols.length).address };
      res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      await book.xlsx.write(res); return res.end();
    }
    res.type('application/pdf');
    renderProfessionalPDF(res, f, rows, cols, req.query);
  } catch (e) { next(e); }
});
module.exports = router;
