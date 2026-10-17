const router=require('express').Router();
const mongoose=require('mongoose');
const {z}=require('zod');
const Feedback=require('../models/Feedback');
const {requireAuth,allowRoles}=require('../middleware/auth');
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const schema=z.object({category:z.enum(['suggestion','complaint','compliment','other']),subject:z.string().trim().min(3).max(150),message:z.string().trim().min(10).max(2000)}).strict();
const moderation=z.object({status:z.enum(['open','in_progress','resolved']),adminReply:z.string().trim().max(2000).optional()}).strict();
router.use(requireAuth);
router.post('/',allowRoles('customer'),wrap(async(req,res)=>{
 const p=schema.safeParse(req.body);
 if(!p.success)return res.status(400).json({success:false,message:'Invalid feedback',errors:p.error.flatten().fieldErrors});
 const data=await Feedback.create({...p.data,customer:req.user._id});
 res.status(201).json({success:true,message:'Feedback received',data});
}));
router.get('/my',allowRoles('customer'),wrap(async(req,res)=>{
 res.json({success:true,data:await Feedback.find({customer:req.user._id}).sort({createdAt:-1}).lean()});
}));
router.get('/admin',allowRoles('admin'),wrap(async(req,res)=>{
 const filter=['open','in_progress','resolved'].includes(req.query.status)?{status:req.query.status}:{};
 const data=await Feedback.find(filter).populate('customer','name email').sort({createdAt:-1}).limit(200).lean();
 res.json({success:true,data});
}));
router.patch('/admin/:id',allowRoles('admin'),wrap(async(req,res)=>{
 if(!mongoose.isValidObjectId(req.params.id))return res.status(400).json({success:false,message:'Invalid ID'});
 const p=moderation.safeParse(req.body);
 if(!p.success)return res.status(400).json({success:false,message:'Invalid feedback update'});
 const data=await Feedback.findByIdAndUpdate(req.params.id,{$set:{...p.data,handledBy:req.user._id}},{new:true,runValidators:true});
 if(!data)return res.status(404).json({success:false,message:'Feedback not found'});
 res.json({success:true,data});
}));
module.exports=router;
