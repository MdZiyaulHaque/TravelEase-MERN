const nodemailer=require('nodemailer');
const Notification=require('../models/Notification');
const User=require('../models/User');
const Booking=require('../models/Booking');
const Trip=require('../models/Trip');
const crypto=require('crypto');
const escapeHtml=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let transporter;
function mailer(){if(!process.env.SMTP_HOST||!process.env.SMTP_FROM)return null;if(!transporter)transporter=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_SECURE==='true',auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}:undefined});return transporter;}
async function sendEmail(record){
 if(record.emailStatus==='sent'||record.emailStatus==='skipped')return record;
 const recipient=await User.findById(record.recipient).select('email name');
 const transport=mailer();
 if(!recipient?.email||!transport){await Notification.updateOne({_id:record._id,emailStatus:{$ne:'sent'}},{$set:{emailStatus:'skipped',emailError:'SMTP not configured or recipient missing'}});return;}
 try{
  const url=record.link&&record.link.startsWith('/')?(process.env.CLIENT_URL||'http://localhost:5173')+record.link:'';
  await transport.sendMail({from:process.env.SMTP_FROM,to:recipient.email,subject:'TravelEase | '+record.title,text:record.message+(url?'\n\nView: '+url:''),html:`<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px"><h2 style="color:#164e63">TravelEase</h2><h3>${escapeHtml(record.title)}</h3><p style="line-height:1.6">${escapeHtml(record.message)}</p>${url?`<p><a href="${escapeHtml(url)}">View details</a></p>`:''}<hr/><small>This is an automated travel notification.</small></div>`});
  await Notification.updateOne({_id:record._id},{$set:{emailStatus:'sent',sentAt:new Date(),emailError:''},$inc:{emailAttempts:1}});
 }catch(e){await Notification.updateOne({_id:record._id},{$set:{emailStatus:'failed',emailError:String(e.message||e).slice(0,200)},$inc:{emailAttempts:1}});console.error('Notification mail error:',e.message)}
}
async function notify({recipient,type,title,message,link='',key,meta={}}){
 if(!recipient||!key)return;
 const record=await Notification.findOneAndUpdate({dedupeKey:key},{$setOnInsert:{recipient,type,title,message,link,meta,dedupeKey:key}},{upsert:true,new:true,setDefaultsOnInsert:true});
 if(record.emailStatus==='pending')await sendEmail(record);
 return record;
}
async function notifyAdmins(type,title,message,key,link='/admin/dashboard'){
 const admins=await User.find({role:'admin',isActive:true}).select('_id');
 await Promise.allSettled(admins.map(a=>notify({recipient:a._id,type:'admin_alert',title,message,link,key:key+':admin:'+a._id,meta:{sourceType:type}})));
}
async function onBookingCreated(booking){
 await Promise.allSettled([notify({recipient:booking.customer,type:'booking_created',title:'Booking reserved',message:`Your booking ${booking._id} is reserved. Please complete payment to confirm your trip.`,link:'/my-bookings',key:'booking-created:'+booking._id}),notifyAdmins('booking','New booking reserved',`New booking ${booking._id} is awaiting payment.`,'admin-booking:'+booking._id,'/admin/bookings')]);
}
async function onPaymentConfirmed(booking,payment){
 await Promise.allSettled([notify({recipient:booking.customer,type:'payment_received',title:'Payment received and booking confirmed',message:`Payment received for booking ${booking._id}. Amount: INR ${(payment.amountPaise/100).toFixed(2)}. Your booking is confirmed.`,link:'/payments',key:'payment-paid:'+payment._id}),notifyAdmins('payment','Payment received',`Booking ${booking._id} payment has been captured.`,'admin-payment:'+payment._id,'/admin/payments')]);
}
async function onTripEvent(trip,kind){const booking=await Booking.findById(trip.booking);if(!booking)return;
 const title=kind==='created'?'Trip scheduled':'Trip details updated';
 await Promise.allSettled([notify({recipient:booking.customer,type:kind==='created'?'trip_created':'trip_updated',title,message:`Your trip for booking ${booking._id} is ${trip.status.replaceAll('_',' ')}. View your trip for pickup and travel details.`,link:'/my-trips',key:'trip-'+kind+':'+trip._id+':'+trip.updatedAt.getTime()}),notifyAdmins('trip',title,`Trip ${trip._id}: ${trip.status}`,'admin-trip-'+kind+':'+trip._id+':'+trip.updatedAt.getTime(),'/admin/trips')]);
}
async function processReminders({daysAhead=1}={}){
 const d=new Date();d.setUTCDate(d.getUTCDate()+daysAhead);const date=d.toISOString().slice(0,10);
 const bookings=await Booking.find({travelDate:date,status:'confirmed',paymentStatus:'paid'}).select('_id customer travelDate').limit(1000);
 let processed=0;
 for(const b of bookings){const trip=await Trip.findOne({booking:b._id}).select('pickupLocation pickupTime');const details=trip?` Pickup: ${trip.pickupLocation||'check trip details'} ${trip.pickupTime||''}.`:'';
  await notify({recipient:b.customer,type:'trip_reminder',title:'Your trip is coming up',message:`Your TravelEase trip starts on ${b.travelDate}.${details} Please check your travel details.`,link:'/my-trips',key:'trip-reminder:'+b._id+':'+date});processed++;
 }
 return {date,processed};
}
module.exports={notify,notifyAdmins,onBookingCreated,onPaymentConfirmed,onTripEvent,processReminders,sendEmail};
