const router=require('express').Router();
const {requireAuth,allowRoles}=require('../middleware/auth');
const User=require('../models/User');
const TourPackage=require('../models/TourPackage');
const Booking=require('../models/Booking');
const Payment=require('../models/Payment');
const Trip=require('../models/Trip');
router.use(requireAuth,allowRoles('admin'));
router.get('/overview',async(req,res,next)=>{try{
 const [customers,packages,bookings,confirmed,cancelled,activeTrips,paidTotals,refundedTotals,bookingBreakdown,tripBreakdown,monthly,recentBookings,recentPayments]=await Promise.all([
  User.countDocuments({role:'customer'}),TourPackage.countDocuments({isActive:true}),Booking.countDocuments(),Booking.countDocuments({status:'confirmed'}),Booking.countDocuments({status:'cancelled'}),Trip.countDocuments({status:{$in:['scheduled','pickup_ready','in_progress']}}),
  Payment.aggregate([{$match:{status:{$in:['paid','refund_pending','partially_refunded','refunded']}}},{$group:{_id:null,amount:{$sum:'$amountPaise'},count:{$sum:1}}}]),
  Payment.aggregate([{$match:{refundAmountPaise:{$gt:0}}},{$group:{_id:null,amount:{$sum:'$refundAmountPaise'}}}]),
  Booking.aggregate([{$group:{_id:'$status',count:{$sum:1}}}]),Trip.aggregate([{$group:{_id:'$status',count:{$sum:1}}}]),
  Payment.aggregate([{$match:{paidAt:{$type:'date'},status:{$in:['paid','refund_pending','partially_refunded','refunded']}}},{$group:{_id:{$dateToString:{format:'%Y-%m',date:'$paidAt',timezone:'Asia/Kolkata'}},grossPaise:{$sum:'$amountPaise'},refundPaise:{$sum:'$refundAmountPaise'},payments:{$sum:1}}},{$sort:{_id:-1}},{$limit:12}]),
  Booking.find().sort({createdAt:-1}).limit(8).populate('customer','name email').populate('package','name').lean(),
  Payment.find().sort({createdAt:-1}).limit(8).populate('customer','name').populate('booking','status').lean()
 ]);
 const gross=paidTotals[0]?.amount||0,refunds=refundedTotals[0]?.amount||0;
 const currentMonth=new Date();const months=[];
 for(let i=11;i>=0;i--){const d=new Date(Date.UTC(currentMonth.getUTCFullYear(),currentMonth.getUTCMonth()-i,1));const key=d.toISOString().slice(0,7);const found=monthly.find(x=>x._id===key);months.push({month:key,gross:(found?.grossPaise||0)/100,refunds:(found?.refundPaise||0)/100,net:((found?.grossPaise||0)-(found?.refundPaise||0))/100,payments:found?.payments||0});}
 res.json({success:true,data:{stats:{customers,packages,bookings,confirmed,cancelled,activeTrips,grossRevenue:gross/100,refunded:refunds/100,netRevenue:(gross-refunds)/100,paidTransactions:paidTotals[0]?.count||0},bookingBreakdown:bookingBreakdown.map(x=>({name:x._id||'unknown',value:x.count})),tripBreakdown:tripBreakdown.map(x=>({name:x._id||'unknown',value:x.count})),monthly:months,recentBookings,recentPayments,generatedAt:new Date().toISOString()}});
 }catch(e){next(e)}});

// Phase 14: filtered insights. All monetary figures are derived from successful payments in paise.
router.get('/insights',async(req,res,next)=>{try{
 const {from='',to=''}=req.query;
 const valid=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
 if((from&&!valid(from))||(to&&!valid(to))||(from&&to&&from>to))return res.status(400).json({success:false,message:'Use valid from/to dates (YYYY-MM-DD), with from <= to'});
 const range={};if(from)range.$gte=new Date(from+'T00:00:00Z');if(to)range.$lt=new Date(Date.parse(to+'T00:00:00Z')+86400000);
 const bookingMatch=Object.keys(range).length?{createdAt:range}:{};
 const paymentMatch={status:{$in:['paid','refund_pending','partially_refunded','refunded']},paidAt:{$type:'date',...range}};
 const [bookings,bookingStatuses,payments,topPackages,customerGrowth]=await Promise.all([
  Booking.countDocuments(bookingMatch),
  Booking.aggregate([{$match:bookingMatch},{$group:{_id:'$status',count:{$sum:1}}}]),
  Payment.aggregate([{$match:paymentMatch},{$group:{_id:null,transactions:{$sum:1},grossPaise:{$sum:'$amountPaise'},refundPaise:{$sum:'$refundAmountPaise'}}}]),
  Booking.aggregate([{$match:{...bookingMatch,status:'confirmed'}},{$group:{_id:'$package',bookings:{$sum:1},bookedValue:{$sum:'$totalAmount'}}},{$sort:{bookings:-1}},{$limit:8},{$lookup:{from:TourPackage.collection.name,localField:'_id',foreignField:'_id',as:'packageDoc'}},{$project:{_id:1,bookings:1,bookedValue:1,name:{$ifNull:[{$arrayElemAt:['$packageDoc.name',0]},'Deleted package']}}}]),
  User.aggregate([{$match:{role:'customer',...bookingMatch}},{$group:{_id:{$dateToString:{format:'%Y-%m',date:'$createdAt',timezone:'Asia/Kolkata'}},count:{$sum:1}}},{$sort:{_id:1}}])
 ]);
 const p=payments[0]||{};const gross=(p.grossPaise||0)/100,refunds=(p.refundPaise||0)/100;
 res.set('Cache-Control','no-store').json({success:true,data:{filters:{from,to},bookings,bookingStatuses:bookingStatuses.map(x=>({name:x._id||'unknown',value:x.count})),transactions:p.transactions||0,grossRevenue:gross,refunded:refunds,netRevenue:gross-refunds,topPackages,customerGrowth:customerGrowth.map(x=>({month:x._id,customers:x.count})),generatedAt:new Date().toISOString()}});
 }catch(e){next(e)}});

// Phase 16: read-only inventory health and booking conversion metrics.
router.get('/operations',async(req,res,next)=>{try{
 const Departure=require('../models/Departure');
 const [departures,bookingsByDeparture,bookingFunnel]=await Promise.all([
  Departure.find().select('date capacity reserved isActive package').sort({date:1}).lean(),
  Booking.aggregate([{$match:{status:{$in:['pending_payment','confirmed']}}},{$group:{_id:'$departure',activeTravelers:{$sum:{$size:'$travelers'}},activeBookings:{$sum:1}}}]),
  Booking.aggregate([{$group:{_id:'$status',count:{$sum:1}}}])
 ]);
 const counts=new Map(bookingsByDeparture.map(x=>[String(x._id),x]));
 const inventory=departures.map(d=>{
  const active=counts.get(String(d._id))||{activeTravelers:0,activeBookings:0};
  return {_id:d._id,date:d.date,capacity:d.capacity,reserved:d.reserved,
   activeTravelers:active.activeTravelers,activeBookings:active.activeBookings,
   availableSeats:d.capacity-d.reserved,isActive:d.isActive,
   mismatch:d.reserved!==active.activeTravelers||d.reserved<0||d.reserved>d.capacity};
 });
 res.set('Cache-Control','no-store').json({success:true,data:{inventory,
  mismatches:inventory.filter(x=>x.mismatch).length,
  bookingFunnel:bookingFunnel.map(x=>({status:x._id,count:x.count})),generatedAt:new Date().toISOString()}});
 }catch(e){next(e)}});

module.exports=router;
