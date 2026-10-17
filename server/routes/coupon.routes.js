const router=require('express').Router();
const mongoose=require('mongoose');
const {z}=require('zod');
const Coupon=require('../models/Coupon');
const TourPackage=require('../models/TourPackage');
const {requireAuth,allowRoles}=require('../middleware/auth');
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const fail=(res,status,message,errors)=>res.status(status).json({success:false,message,...(errors?{errors}:{})});
const oid=z.string().refine(mongoose.isValidObjectId,'Invalid package ID');
const date=z.string().datetime({offset:true});
const body=z.object({code:z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/),description:z.string().trim().max(300).default(''),discountType:z.enum(['percentage','fixed']),discountValue:z.number().positive(),maxDiscount:z.number().nonnegative().nullable().default(null),minBookingAmount:z.number().nonnegative().default(0),startsAt:date,expiresAt:date,usageLimit:z.number().int().positive().default(100),perCustomerLimit:z.number().int().positive().default(1),packageIds:z.array(oid).default([]),isActive:z.boolean().default(true)}).strict();
function check(d){if(new Date(d.startsAt)>=new Date(d.expiresAt))return 'Expiry must be after start';if(d.discountType==='percentage'&&d.discountValue>100)return 'Percentage cannot exceed 100';return null;}
router.use(requireAuth);
router.post('/validate',allowRoles('customer'),wrap(async(req,res)=>{
 const p=z.object({code:z.string().trim().min(3),packageId:oid,bookingAmount:z.number().positive()}).strict().safeParse(req.body);
 if(!p.success)return fail(res,400,'Invalid coupon request',p.error.flatten().fieldErrors);
 const {code,packageId,bookingAmount}=p.data;
 const pkg=await TourPackage.findById(packageId).select('_id isActive');if(!pkg?.isActive)return fail(res,404,'Package unavailable');
 const c=await Coupon.findOne({code:code.toUpperCase()});
 if(!c||!c.isActive)return fail(res,404,'Coupon unavailable');
 const now=new Date();if(now<c.startsAt||now>=c.expiresAt)return fail(res,409,'Coupon is not currently valid');
 if(c.usedCount>=c.usageLimit)return fail(res,409,'Coupon usage limit reached');
 if(c.packageIds.length&&!c.packageIds.some(x=>String(x)===packageId))return fail(res,409,'Coupon not valid for this package');
 if(bookingAmount<c.minBookingAmount)return fail(res,409,'Minimum booking amount not met');
 // Preview only: server must calculate from package price at booking/payment time.
 let discount=c.discountType==='percentage'?bookingAmount*c.discountValue/100:c.discountValue;
 if(c.maxDiscount!=null)discount=Math.min(discount,c.maxDiscount);
 discount=Math.round(Math.min(bookingAmount,discount)*100)/100;
 res.json({success:true,message:'Coupon preview only; not yet applied to booking',data:{code:c.code,discount,estimatedTotal:Math.round((bookingAmount-discount)*100)/100}});
}));
router.get('/admin',allowRoles('admin'),wrap(async(req,res)=>{res.json({success:true,data:await Coupon.find().sort({createdAt:-1}).limit(200).lean()});}));
router.post('/admin',allowRoles('admin'),wrap(async(req,res)=>{
 const p=body.safeParse(req.body);if(!p.success)return fail(res,400,'Invalid coupon',p.error.flatten().fieldErrors);
 const error=check(p.data);if(error)return fail(res,400,error);
 try{const data=await Coupon.create({...p.data,startsAt:new Date(p.data.startsAt),expiresAt:new Date(p.data.expiresAt),createdBy:req.user._id});res.status(201).json({success:true,data});}
 catch(e){if(e.code===11000)return fail(res,409,'Coupon code already exists');throw e;}
}));
router.patch('/admin/:id',allowRoles('admin'),wrap(async(req,res)=>{
 if(!mongoose.isValidObjectId(req.params.id))return fail(res,400,'Invalid coupon ID');
 const p=body.partial().safeParse(req.body);if(!p.success)return fail(res,400,'Invalid coupon update',p.error.flatten().fieldErrors);
 const old=await Coupon.findById(req.params.id);if(!old)return fail(res,404,'Coupon not found');
 const merged={...old.toObject(),...p.data};const error=check(merged);if(error)return fail(res,400,error);
 try{const data=await Coupon.findByIdAndUpdate(req.params.id,{$set:p.data},{new:true,runValidators:true});res.json({success:true,data});}
 catch(e){if(e.code===11000)return fail(res,409,'Coupon code already exists');throw e;}
}));
module.exports=router;
