const express=require('express');
const crypto=require('crypto');
const mongoose=require('mongoose');
const Razorpay=require('razorpay');
const {renderInvoicePdf}=require('../services/invoicePdf');
const {requireAuth,allowRoles}=require('../middleware/auth');
const Booking=require('../models/Booking');
const Payment=require('../models/Payment');
const router=express.Router();
const notifications=require('../services/notifications');
const {releaseBookingInventory}=require('../services/bookingInventory');
const err=(res,status,message)=>res.status(status).json({success:false,message});
const configured=()=>Boolean(process.env.RAZORPAY_KEY_ID&&process.env.RAZORPAY_KEY_SECRET&&!process.env.RAZORPAY_KEY_ID.includes('replace'));
const gateway=()=>new Razorpay({key_id:process.env.RAZORPAY_KEY_ID,key_secret:process.env.RAZORPAY_KEY_SECRET});
const isOwner=(booking,user)=>{
 if(user?.role==='admin')return true;
 const customerId=booking?.customer?._id??booking?.customer;
 return Boolean(customerId&&user?._id&&String(customerId)===String(user._id));
};
const signature=(payload,secret)=>crypto.createHmac('sha256',secret).update(payload).digest('hex');
const safeEqual=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
// Webhook must be mounted before express.json(), with raw request body.
// A temporary refundId claim prevents two admins from creating duplicate refunds.
// Do not automatically retry a claimed refund if the gateway response is uncertain.
const isClaim = (value) => typeof value === 'string' && /^initiating_[a-f0-9-]{36}$/.test(value);
const claimRefund = () => `initiating_${crypto.randomUUID()}`;

async function applyProcessedRefund(payment, refund) {
  if (!payment || !refund || refund.status !== 'processed') return false;
  if (refund.payment_id !== payment.paymentId ||
      (refund.currency && refund.currency !== 'INR') ||
      !Number.isSafeInteger(Number(refund.amount)) ||
      Number(refund.amount) !== payment.amountPaise || !refund.id) return false;

  const session = await mongoose.startSession();
  try {
    let applied = false;
    await session.withTransaction(async () => {
      const current = await Payment.findById(payment._id).session(session);
      if (!current || current.paymentId !== refund.payment_id ||
          current.amountPaise !== Number(refund.amount)) return;

      const booking = await Booking.findById(current.booking).session(session);
      if (!booking || booking.status !== 'cancelled' ||
          !['refund_pending', 'refunded'].includes(booking.paymentStatus)) return;

      if (current.status === 'refunded') {
        if (current.refundId !== refund.id) return;
      } else {
        if (current.status !== 'refund_pending' ||
            (current.refundId && current.refundId !== refund.id &&
             !isClaim(current.refundId))) return;
        const changed = await Payment.updateOne(
          {_id: current._id, status: 'refund_pending', refundId: current.refundId ?? null},
          {$set: {status: 'refunded', refundId: refund.id,
                  refundAmountPaise: Number(refund.amount), refundedAt: new Date()}},
          {session}
        );
        if (changed.modifiedCount !== 1) throw new Error('Refund state changed; retry reconciliation');
      }

      if (booking.paymentStatus === 'refund_pending') {
        const changed = await Booking.updateOne(
          {_id: booking._id, status: 'cancelled', paymentStatus: 'refund_pending'},
          {$set: {paymentStatus: 'refunded'}}, {session}
        );
        if (changed.modifiedCount !== 1) throw new Error('Booking refund state changed');
      }
      const release = await releaseBookingInventory(booking._id, {
        releaseCoupon: false, session
      });
      // Already-released inventory is legitimate for repeated webhooks.
      if (!release.released) {
        const latest = await Booking.findById(booking._id).session(session);
        if (!latest?.seatsReleased) throw new Error('Inventory release needs manual reconciliation');
      }
      applied = true;
    });
    return applied;
  } finally {
    await session.endSession();
  }
}

// Mount this function with express.raw BEFORE express.json() in app.js.
async function webhook(req,res){
  try {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) return err(res,503,'Webhook not configured');
    if (!Buffer.isBuffer(req.body)) return err(res,400,'Raw webhook body required');
    const expected=signature(req.body,process.env.RAZORPAY_WEBHOOK_SECRET);
    if (!safeEqual(expected,req.get('x-razorpay-signature'))) return err(res,401,'Invalid signature');
    const event=JSON.parse(req.body.toString('utf8'));
    const p=event.payload?.payment?.entity;
    if (event.event==='payment.captured' && p?.order_id) {
      const payment=await Payment.findOne({orderId:p.order_id});
      if (payment && p.currency==='INR' && Number(p.amount)===payment.amountPaise && p.status==='captured') {
        await markPaid(payment,p.id);
      }
    }
    if (event.event==='refund.processed') {
      const refund=event.payload?.refund?.entity;
      if (refund?.payment_id && refund?.id) {
        const payment=await Payment.findOne({paymentId:refund.payment_id});
        if (payment) {
          const applied=await applyProcessedRefund(payment,refund);
          if (!applied) console.warn('Refund webhook not applied; check record:', refund.id);
        }
      }
    }
    return res.json({ok:true});
  } catch(e) {
    console.error('Webhook error:',e);
    return err(res,500,'Webhook processing failed');
  }
}

async function markPaid(payment, paymentId) {
  const session = await mongoose.startSession();
  let confirmedBooking = null;
  try {
    await session.withTransaction(async () => {
      const current = await Payment.findById(payment._id).session(session);
      if (!current) throw new Error('Payment record missing');
      if (current.status === 'paid') {
        if (current.paymentId !== paymentId) {
          const e = new Error('Payment ID mismatch'); e.status = 409; throw e;
        }
        // A previous inconsistent state can be repaired safely here.
      } else if (current.status === 'created') {
        const changed = await Payment.updateOne(
          {_id: current._id, status: 'created', amountPaise: payment.amountPaise},
          {$set: {status: 'paid', paymentId, paidAt: new Date()}}, {session}
        );
        if (changed.modifiedCount !== 1) throw new Error('Payment state changed');
      } else {
        const e = new Error('Payment is not eligible for confirmation');
        e.status = 409; throw e;
      }

      const booking = await Booking.findOneAndUpdate(
        {_id: current.booking, status: 'pending_payment', paymentStatus: 'unpaid'},
        {$set: {status: 'confirmed', paymentStatus: 'paid'}},
        {new: true, session}
      );
      if (booking) {
        confirmedBooking = booking;
      } else {
        const existing = await Booking.findById(current.booking).session(session);
        if (!existing || existing.status !== 'confirmed' || existing.paymentStatus !== 'paid') {
          const e = new Error('Booking state does not allow confirmation; manual review required');
          e.status = 409; throw e;
        }
      }
    });
  } finally {
    await session.endSession();
  }
  if (confirmedBooking) {
    void notifications.onPaymentConfirmed(confirmedBooking, payment).catch(console.error);
  }
  return Payment.findById(payment._id);
}

router.use(requireAuth);
// Phase 18.13: a short, atomic booking-level lease serializes order creation.
// Existing legacy `created` payments remain untouched; no destructive migration.
const ORDER_LOCK_MS = 120000;
const orderResponse = (payment, bookingId) => ({
  success: true,
  data: {
    orderId: payment.orderId,
    amount: payment.amountPaise,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID,
    bookingId: String(bookingId)
  }
});

router.post('/create-order', allowRoles('customer'), async (req, res, next) => {
  let lockToken = null;
  let bookingId = null;
  try {
    if (!mongoose.isValidObjectId(req.body?.bookingId)) {
      return err(res, 400, 'Invalid booking ID');
    }
    if (!configured()) return err(res, 503, 'Razorpay credentials not configured');

    bookingId = req.body.bookingId;
    const now = new Date();
    lockToken = crypto.randomUUID();

    // Only one request may acquire this lease for a pending, unpaid booking.
    // Missing fields are supported for existing bookings created before this update.
    const booking = await Booking.findOneAndUpdate(
      {
        _id: bookingId,
        customer: req.user._id,
        status: 'pending_payment',
        paymentStatus: 'unpaid',
        $or: [
          {paymentOrderLockUntil: {$exists: false}},
          {paymentOrderLockUntil: null},
          {paymentOrderLockUntil: {$lte: now}}
        ]
      },
      {$set: {
        paymentOrderLockToken: lockToken,
        paymentOrderLockUntil: new Date(now.getTime() + ORDER_LOCK_MS)
      }},
      {new: true}
    );

    if (!booking) {
      const current = await Booking.findOne({_id: bookingId, customer: req.user._id});
      if (!current || current.status !== 'pending_payment' || current.paymentStatus !== 'unpaid') {
        return err(res, 409, 'Booking is not pending and unpaid');
      }
      res.set('Retry-After', '3');
      return err(res, 409, 'Payment order request already in progress. Retry shortly.');
    }

    const amountPaise = Math.round(booking.totalAmount * 100);
    if (!Number.isSafeInteger(amountPaise) || amountPaise < 100 || amountPaise > 100000000) {
      return err(res, 400, 'Invalid booking amount');
    }

    // Reuse an existing order. This also supports historical duplicate records.
    const existing = await Payment.findOne({
      booking: booking._id,
      status: 'created'
    }).sort({createdAt: -1});

    if (existing) {
      if (existing.amountPaise !== amountPaise || existing.currency !== 'INR') {
        return err(res, 409, 'Existing order amount or currency mismatch');
      }
      return res.json(orderResponse(existing, booking._id));
    }

    // Gateway call occurs outside a MongoDB transaction.
    // The booking lease prevents concurrent requests from creating extra orders.
    const order = await gateway().orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: 'bk_' + String(booking._id),
      notes: {bookingId: String(booking._id)}
    });

    if (!order?.id || Number(order.amount) !== amountPaise || order.currency !== 'INR') {
      throw new Error('Gateway returned an invalid order');
    }

    // Recheck before persisting in case the booking was cancelled while
    // the external gateway call was running.
    const current = await Booking.findOne({
      _id: booking._id,
      customer: req.user._id,
      status: 'pending_payment',
      paymentStatus: 'unpaid',
      paymentOrderLockToken: lockToken
    }).select('+paymentOrderLockToken');

    if (!current) {
      console.error('Orphan gateway order needs reconciliation:', order.id);
      return err(res, 409, 'Booking changed during order creation; contact support');
    }

    const payment = await Payment.create({
      booking: booking._id,
      customer: req.user._id,
      orderId: order.id,
      amountPaise,
      currency: 'INR'
    });

    return res.status(201).json(orderResponse(payment, booking._id));
  } catch (e) {
    return next(e);
  } finally {
    // Release only our own lease. A timed-out request must not clear
    // a newer request's lease.
    if (lockToken && bookingId) {
      try {
        await Booking.updateOne(
          {_id: bookingId, paymentOrderLockToken: lockToken},
          {$set: {paymentOrderLockToken: null, paymentOrderLockUntil: null}}
        );
      } catch (releaseError) {
        console.error('Payment order lock cleanup failed:', releaseError);
      }
    }
  }
});

router.post('/verify',allowRoles('customer'),async(req,res,next)=>{try{
 const {razorpay_order_id:orderId,razorpay_payment_id:paymentId,razorpay_signature:sig}=req.body||{};
 if(![orderId,paymentId,sig].every(x=>typeof x==='string'&&x.length>5))return err(res,400,'Missing payment details');
 if(!configured())return err(res,503,'Payment gateway unavailable');
 const payment=await Payment.findOne({orderId,customer:req.user._id});
 if(!payment)return err(res,404,'Order not found');
 if(!safeEqual(signature(orderId+'|'+paymentId,process.env.RAZORPAY_KEY_SECRET),sig))return err(res,400,'Invalid payment signature');
 const verified=await gateway().payments.fetch(paymentId);
 if(verified.order_id!==orderId||verified.currency!=='INR'||Number(verified.amount)!==payment.amountPaise||!['captured','authorized'].includes(verified.status))return err(res,409,'Payment not captured/authorized or amount mismatch');
 if(verified.status==='authorized')return err(res,409,'Payment authorized but not captured yet; retry shortly');
 const updated=await markPaid(payment,paymentId);
 res.json({success:true,message:'Payment verified',data:updated});
 }catch(e){next(e)}});
router.get('/my',async(req,res,next)=>{try{const rows=await Payment.find({customer:req.user._id}).populate('booking','travelDate totalAmount status').sort({createdAt:-1}).limit(100);res.json({success:true,data:rows})}catch(e){next(e)}});
router.get('/admin',allowRoles('admin'),async(req,res,next)=>{try{const rows=await Payment.find().populate('customer','name email').populate('booking','totalAmount status').sort({createdAt:-1}).limit(300);res.json({success:true,data:rows})}catch(e){next(e)}});
router.get('/invoice/:bookingId',async(req,res,next)=>{try{
 if(!mongoose.isValidObjectId(req.params.bookingId))return err(res,400,'Invalid booking ID');
 const booking=await Booking.findById(req.params.bookingId).populate('customer','name email').populate('package','name');
 if(!booking||!isOwner(booking,req.user))return err(res,404,'Booking not found');
 const payment=await Payment.findOne({booking:booking._id,status:{$in:['paid','refund_pending','refunded','partially_refunded']}});
 if(!payment)return err(res,409,'Invoice available after payment');
 // Stream a branded receipt while preserving the existing authorization checks.
 res.set({
  'Content-Type':'application/pdf',
  'Content-Disposition':`attachment; filename="receipt-${booking._id}.pdf"`,
  'Cache-Control':'private, no-store'
 });
 const pdf=renderInvoicePdf({
  booking,
  payment,
  businessName:process.env.INVOICE_BUSINESS_NAME||'TravelEase Tours',
  businessAddress:process.env.INVOICE_BUSINESS_ADDRESS||'India'
 });
 pdf.on('error',next);
 pdf.pipe(res);
 }catch(e){next(e)}});
// Cancellation request: hold refund for manual admin review, do not claim money returned.
router.post('/refund-request/:bookingId',allowRoles('customer'),async(req,res,next)=>{try{
 const id=req.params.bookingId;if(!mongoose.isValidObjectId(id))return err(res,400,'Invalid booking ID');
 const booking=await Booking.findOneAndUpdate({_id:id,customer:req.user._id,status:'confirmed',paymentStatus:'paid'},{$set:{status:'cancelled',paymentStatus:'refund_pending',cancelledAt:new Date(),cancellationReason:String(req.body?.reason||'Customer requested cancellation').slice(0,300)}},{new:true});
 if(!booking)return err(res,409,'Booking not eligible for cancellation request');
 await Payment.updateMany({booking:id,status:'paid'},{$set:{status:'refund_pending',refundReason:booking.cancellationReason}});
 void notifications.notify({recipient:booking.customer,type:'refund_requested',title:'Refund request received',message:`Your refund request for booking ${booking._id} is awaiting admin review.`,link:'/payments',key:'refund-request:'+booking._id}).catch(console.error);void notifications.notifyAdmins('refund','Refund request',`Refund requested for booking ${booking._id}`,'admin-refund-request:'+booking._id,'/admin/payments').catch(console.error);res.json({success:true,message:'Cancellation recorded; refund pending admin review. Seats remain held until manual reconciliation.',data:booking});
 }catch(e){next(e)}});
// Admin: initiate exactly one full refund per paid payment.
router.post('/admin/refund/:paymentId',allowRoles('admin'),async(req,res,next)=>{
 try {
  const id=req.params.paymentId;
  if (!mongoose.isValidObjectId(id)) return err(res,400,'Invalid payment ID');
  if (!configured()) return err(res,503,'Razorpay not configured');
  const claim=claimRefund();
  const p=await Payment.findOneAndUpdate({
    _id:id, status:'refund_pending',
    paymentId:{$exists:true,$nin:[null,'']},
    $or:[{refundId:{$exists:false}},{refundId:null},{refundId:''}]
  },{$set:{refundId:claim}},{new:true});
  if (!p) return err(res,409,'Refund already initiated or payment not eligible');

  const booking=await Booking.findById(p.booking);
  if (!booking || booking.status!=='cancelled' || booking.paymentStatus!=='refund_pending') {
    await Payment.updateOne({_id:p._id,refundId:claim},{$unset:{refundId:1}});
    return err(res,409,'Booking not eligible for refund');
  }

  let result;
  try {
    result=await gateway().payments.refund(p.paymentId,{
      amount:p.amountPaise,
      notes:{reason:p.refundReason||'Cancellation'}
    });
  } catch (gatewayError) {
    // Intentionally keep claim: a timeout might occur AFTER Razorpay accepted the refund.
    console.error('Refund initiation uncertain:',gatewayError);
    return err(res,502,'Refund result uncertain. Check Razorpay before retrying; do not submit again.');
  }

  if (!result?.id || result.payment_id!==p.paymentId || Number(result.amount)!==p.amountPaise) {
    console.error('Unexpected refund response:',result?.id);
    return err(res,502,'Unexpected gateway refund response; check Razorpay manually');
  }

  // If the processed webhook arrived first, it may have already marked the payment refunded.
  await Payment.updateOne({_id:p._id,refundId:claim,status:'refund_pending'},
    {$set:{refundId:result.id}});

  if (result.status==='processed') {
    const latest=await Payment.findById(p._id);
    await applyProcessedRefund(latest,result);
  } else {
    // Re-fetch in case the refund processed between the gateway response and this update.
    const latestRefund=await gateway().refunds.fetch(result.id);
    if (latestRefund.status==='processed') {
      const latest=await Payment.findById(p._id);
      await applyProcessedRefund(latest,latestRefund);
    }
  }
  const latest=await Payment.findById(p._id);
  return res.json({success:true,message:'Refund initiated; gateway state checked',data:{
    refundId:result.id, gatewayStatus:result.status, paymentStatus:latest.status
  }});
 } catch(e) {next(e)}
});

// Admin: safely reconcile an EXISTING refund; this never creates a refund.
router.post('/admin/reconcile-refund/:paymentId',allowRoles('admin'),async(req,res,next)=>{
 try {
  if (!mongoose.isValidObjectId(req.params.paymentId)) return err(res,400,'Invalid payment ID');
  if (!configured()) return err(res,503,'Razorpay not configured');
  const payment=await Payment.findById(req.params.paymentId);
  if (!payment || !payment.paymentId) return err(res,404,'Payment not found');
  const requestedId=typeof req.body?.refundId==='string'?req.body.refundId.trim():'';
  const refundId=(!payment.refundId || isClaim(payment.refundId))?requestedId:payment.refundId;
  if (!/^rfnd_[a-zA-Z0-9]+$/.test(refundId||'')) return err(res,400,'Valid existing refundId required');
  if (payment.refundId && !isClaim(payment.refundId) && requestedId && requestedId!==payment.refundId) {
    return err(res,409,'Refund ID mismatch');
  }
  const refund=await gateway().refunds.fetch(refundId);
  if (refund.status!=='processed') return res.json({success:true,message:'Refund not yet processed',data:{refundId,status:refund.status}});
  const applied=await applyProcessedRefund(payment,refund);
  if (!applied) return err(res,409,'Refund does not match payment or booking state');
  const updated=await Payment.findById(payment._id);
  return res.json({success:true,message:'Existing refund synchronized',data:{
    refundId:updated.refundId,status:updated.status,refundAmountPaise:updated.refundAmountPaise
  }});
 } catch(e) {next(e)}
});
// Admin-only inventory reconciliation for new bookings; never calls the payment gateway.
router.post('/admin/reconcile-inventory/:bookingId',allowRoles('admin'),async(req,res,next)=>{
 try {
  if(!mongoose.isValidObjectId(req.params.bookingId)) return err(res,400,'Invalid booking ID');
  const booking=await Booking.findById(req.params.bookingId);
  if(!booking || booking.status!=='cancelled' || booking.paymentStatus!=='refunded')
    return err(res,409,'Booking must be cancelled and fully refunded');
  const persisted=await Booking.collection.findOne({_id:booking._id},{projection:{seatsReleased:1}});
  if(!persisted || !Object.prototype.hasOwnProperty.call(persisted,'seatsReleased'))
    return err(res,409,'Legacy booking: inventory history requires manual review');
  const result=await releaseBookingInventory(booking._id,{releaseCoupon:false});
  return res.json({success:true,data:result});
 }catch(e){next(e)}
});
module.exports={router,webhook};
