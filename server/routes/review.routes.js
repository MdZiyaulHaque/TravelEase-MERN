const router=require('express').Router();
const mongoose=require('mongoose');
const {z}=require('zod');
const Review=require('../models/Review');
const Booking=require('../models/Booking');
const {requireAuth,allowRoles}=require('../middleware/auth');
const id=v=>mongoose.isValidObjectId(v);
const bad=(res,code,message,errors)=>res.status(code).json({success:false,message,...(errors?{errors}:{})});
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const reviewBody=z.object({bookingId:z.string().refine(id),rating:z.number().int().min(1).max(5),title:z.string().trim().min(3).max(120),comment:z.string().trim().min(10).max(2000)}).strict();
const editBody=z.object({rating:z.number().int().min(1).max(5).optional(),title:z.string().trim().min(3).max(120).optional(),comment:z.string().trim().min(10).max(2000).optional()}).strict();
const moderationBody=z.object({status:z.enum(['approved','rejected','hidden']),moderationNote:z.string().trim().max(500).optional()}).strict();
const dateOnly=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''))?String(v):null;
const todayUTC=()=>new Date().toISOString().slice(0,10);
// Public endpoints: only approved reviews are visible.
router.get('/packages/:packageId',wrap(async(req,res)=>{
 if(!id(req.params.packageId))return bad(res,400,'Invalid package ID');
 const page=Math.max(1,Math.min(10000,Number.parseInt(req.query.page)||1));
 const limit=Math.max(1,Math.min(30,Number.parseInt(req.query.limit)||10));
 const filter={package:req.params.packageId,status:'approved'};
 const [data,total]=await Promise.all([Review.find(filter).populate('customer','name').select('-moderationNote -moderatedBy').sort({createdAt:-1}).skip((page-1)*limit).limit(limit).lean(),Review.countDocuments(filter)]);
 res.json({success:true,data,total,page,pages:Math.ceil(total/limit)});
}));
router.get('/packages/:packageId/summary',wrap(async(req,res)=>{
 if(!id(req.params.packageId))return bad(res,400,'Invalid package ID');
 const packageId=new mongoose.Types.ObjectId(req.params.packageId);
 const rows=await Review.aggregate([{$match:{package:packageId,status:'approved'}},{$group:{_id:'$rating',count:{$sum:1}}}]);
 const distribution={1:0,2:0,3:0,4:0,5:0};let total=0,weighted=0;
 for(const r of rows){distribution[r._id]=r.count;total+=r.count;weighted+=r._id*r.count;}
 res.json({success:true,data:{packageId:req.params.packageId,total,average:total?Number((weighted/total).toFixed(2)):0,distribution}});
}));
router.use(requireAuth);
router.get('/my',wrap(async(req,res)=>{
 const data=await Review.find({customer:req.user._id}).populate('package','name title').sort({createdAt:-1}).lean();
 res.json({success:true,data});
}));
router.post('/',allowRoles('customer'),wrap(async(req,res)=>{
 const parsed=reviewBody.safeParse(req.body);
 if(!parsed.success)return bad(res,400,'Invalid review',parsed.error.flatten().fieldErrors);
 const {bookingId,rating,title,comment}=parsed.data;
 const booking=await Booking.findOne({_id:bookingId,customer:req.user._id});
 if(!booking)return bad(res,404,'Your booking was not found');
 if(booking.status!=='confirmed'||booking.paymentStatus!=='paid')return bad(res,403,'Only confirmed paid bookings can be reviewed');
 if(!dateOnly(booking.travelDate)||dateOnly(booking.travelDate)>=todayUTC())return bad(res,403,'Review allowed only after the trip date');
 if(!booking.package)return bad(res,409,'Booking has no package');
 try{
 const data=await Review.create({booking:booking._id,package:booking.package,customer:req.user._id,rating,title,comment,verified:true});
 res.status(201).json({success:true,message:'Review submitted for moderation',data});
 }catch(e){if(e.code===11000)return bad(res,409,'A review already exists for this booking');throw e;}
}));
router.patch('/:id',allowRoles('customer'),wrap(async(req,res)=>{
 if(!id(req.params.id))return bad(res,400,'Invalid review ID');
 const parsed=editBody.safeParse(req.body);
 if(!parsed.success||!Object.keys(parsed.data||{}).length)return bad(res,400,'Invalid review changes');
 const data=await Review.findOneAndUpdate({_id:req.params.id,customer:req.user._id,status:{$in:['pending','rejected']}},{$set:{...parsed.data,status:'pending',moderationNote:'',moderatedBy:null,moderatedAt:null}},{new:true,runValidators:true});
 if(!data)return bad(res,404,'Editable review not found');
 res.json({success:true,data});
}));
router.get('/admin/analytics',allowRoles('admin'),wrap(async(req,res)=>{
 const [status,stars,top]=await Promise.all([
 Review.aggregate([{$group:{_id:'$status',count:{$sum:1}}}]),
 Review.aggregate([{$match:{status:'approved'}},{$group:{_id:'$rating',count:{$sum:1}}}]),
 Review.aggregate([{$match:{status:'approved'}},{$group:{_id:'$package',count:{$sum:1},average:{$avg:'$rating'}}},{$sort:{count:-1}},{$limit:10},{$lookup:{from:'tourpackages',localField:'_id',foreignField:'_id',as:'package'}},{$project:{count:1,average:{$round:['$average',2]},packageName:{$ifNull:[{$arrayElemAt:['$package.name',0]},'Unknown']}}}])
 ]);
 res.json({success:true,data:{status,stars,topPackages:top}});
}));
router.get('/admin',allowRoles('admin'),wrap(async(req,res)=>{
 const page=Math.max(1,Number.parseInt(req.query.page)||1),limit=20;
 const filter=['pending','approved','rejected','hidden'].includes(req.query.status)?{status:req.query.status}:{};
 const [data,total]=await Promise.all([Review.find(filter).populate('customer','name email').populate('package','name title').sort({createdAt:-1}).skip((page-1)*limit).limit(limit).lean(),Review.countDocuments(filter)]);
 res.json({success:true,data,total,page,pages:Math.ceil(total/limit)});
}));
router.patch('/admin/:id/moderate',allowRoles('admin'),wrap(async(req,res)=>{
 if(!id(req.params.id))return bad(res,400,'Invalid review ID');
 const parsed=moderationBody.safeParse(req.body);
 if(!parsed.success)return bad(res,400,'Invalid moderation request',parsed.error.flatten().fieldErrors);
 const data=await Review.findByIdAndUpdate(req.params.id,{$set:{...parsed.data,moderatedBy:req.user._id,moderatedAt:new Date()}},{new:true,runValidators:true});
 if(!data)return bad(res,404,'Review not found');
 res.json({success:true,message:'Review moderated',data});
}));
module.exports=router;
