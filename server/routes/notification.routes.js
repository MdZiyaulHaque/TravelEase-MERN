const router=require('express').Router();
const mongoose=require('mongoose');
const {z}=require('zod');
const crypto=require('crypto');
const User=require('../models/User');
const Notification=require('../models/Notification');
const {requireAuth,allowRoles}=require('../middleware/auth');
const {processReminders,sendEmail,notify}=require('../services/notifications');
router.use(requireAuth);
router.get('/',async(req,res,next)=>{try{const limit=Math.min(Math.max(Number(req.query.limit)||30,1),100);const [data,unread]=await Promise.all([Notification.find({recipient:req.user._id}).sort({createdAt:-1}).limit(limit).lean(),Notification.countDocuments({recipient:req.user._id,readAt:null})]);res.json({success:true,data,unread})}catch(e){next(e)}});
router.patch('/read-all',async(req,res,next)=>{try{await Notification.updateMany({recipient:req.user._id,readAt:null},{$set:{readAt:new Date()}});res.json({success:true})}catch(e){next(e)}});
router.patch('/:id/read',async(req,res,next)=>{try{if(!mongoose.isValidObjectId(req.params.id))return res.status(400).json({message:'Invalid notification ID'});const data=await Notification.findOneAndUpdate({_id:req.params.id,recipient:req.user._id},{$set:{readAt:new Date()}},{new:true});if(!data)return res.status(404).json({message:'Notification not found'});res.json({success:true,data})}catch(e){next(e)}});
// Admin-only manual notification. Uses the same persistence/email service as booking/payment events.
const manualSchema=z.object({
 userId:z.string().refine(v=>mongoose.isValidObjectId(v),'Invalid userId'),
 title:z.string().trim().min(3).max(150),
 message:z.string().trim().min(3).max(1500),
 link:z.string().trim().max(300).refine(v=>v===''||(v.startsWith('/')&&!v.startsWith('//')&&!v.includes('\\')),'Use an internal /path').default(''),
 requestId:z.string().trim().min(8).max(100).regex(/^[a-zA-Z0-9_-]+$/).optional()
}).strict();
router.post('/admin/create',allowRoles('admin'),async(req,res,next)=>{
 try{
  const parsed=manualSchema.safeParse(req.body);
  if(!parsed.success)return res.status(400).json({success:false,message:'Invalid notification data',errors:parsed.error.flatten().fieldErrors});
  const {userId,title,message,link,requestId}=parsed.data;
  const recipient=await User.findOne({_id:userId,isActive:true}).select('_id role');
  if(!recipient)return res.status(404).json({success:false,message:'Active recipient not found'});
  // Optional requestId prevents accidental duplicates when Postman retries the same request.
  const key=requestId?`manual:${req.user._id}:${requestId}`:`manual:${crypto.randomUUID()}`;
  if(requestId){
   const existing=await Notification.findOne({dedupeKey:key});
   if(existing&&String(existing.recipient)!==String(recipient._id))return res.status(409).json({success:false,message:'requestId already used for a different recipient'});
  }
  const data=await notify({recipient:recipient._id,type:'admin_alert',title,message,link,key,meta:{createdBy:req.user._id,source:'admin_manual'}});
  res.status(201).json({success:true,message:'Notification created',data:await Notification.findById(data._id)});
 }catch(e){next(e)}
});
router.post('/admin/reminders',allowRoles('admin'),async(req,res,next)=>{try{const daysAhead=Number(req.body?.daysAhead??1);if(!Number.isInteger(daysAhead)||daysAhead<0||daysAhead>7)return res.status(400).json({message:'daysAhead must be 0 to 7'});res.json({success:true,data:await processReminders({daysAhead})})}catch(e){next(e)}});
router.get('/admin',allowRoles('admin'),async(req,res,next)=>{try{const data=await Notification.find().populate('recipient','name email').sort({createdAt:-1}).limit(200);res.json({success:true,data})}catch(e){next(e)}});
router.post('/admin/:id/retry-email',allowRoles('admin'),async(req,res,next)=>{try{if(!mongoose.isValidObjectId(req.params.id))return res.status(400).json({message:'Invalid ID'});const record=await Notification.findById(req.params.id);if(!record)return res.status(404).json({message:'Not found'});if(record.emailStatus==='sent')return res.status(409).json({message:'Already sent'});if(record.emailAttempts>=5)return res.status(409).json({message:'Retry limit reached'});await Notification.updateOne({_id:record._id},{$set:{emailStatus:'pending'}});await sendEmail(record);res.json({success:true,data:await Notification.findById(record._id)})}catch(e){next(e)}});
module.exports=router;
