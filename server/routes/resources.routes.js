const router=require('express').Router();
const mongoose=require('mongoose');
const {z}=require('zod');
const {requireAuth,allowRoles}=require('../middleware/auth');
const Vendor=require('../models/Vendor');const Hotel=require('../models/Hotel');const Transportation=require('../models/Transportation');const Block=require('../models/ResourceBlock');
const id=z.string().regex(/^[a-f0-9]{24}$/i,'Invalid ID');
const vendorSchema=z.object({name:z.string().trim().min(2).max(120),type:z.enum(['hotel','transport','both']),email:z.union([z.string().email(),z.literal('')]).optional(),phone:z.string().trim().min(6).max(20),city:z.string().trim().min(2),address:z.string().optional(),notes:z.string().max(1000).optional(),isActive:z.boolean().optional()}).strict();
const room=z.object({type:z.string().trim().min(2),totalRooms:z.coerce.number().int().min(1),pricePerNight:z.coerce.number().min(0)});
const hotelSchema=z.object({name:z.string().trim().min(2).max(120),city:z.string().trim().min(2),address:z.string().trim().min(3),vendor:id,stars:z.coerce.number().int().min(1).max(5),amenities:z.array(z.string().trim()).default([]),rooms:z.array(room).min(1),isActive:z.boolean().optional()}).strict();
const vehicleSchema=z.object({name:z.string().trim().min(2),type:z.enum(['car','suv','van','bus','other']),registrationNumber:z.string().trim().min(4),capacity:z.coerce.number().int().min(1),dailyRate:z.coerce.number().min(0),city:z.string().trim().min(2),vendor:id,isActive:z.boolean().optional()}).strict();
const resources={vendors:{Model:Vendor,schema:vendorSchema},hotels:{Model:Hotel,schema:hotelSchema},transportations:{Model:Transportation,schema:vehicleSchema}};
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
router.use(requireAuth,allowRoles('admin'));
async function vendorCheck(type,vendorId){const v=await Vendor.findById(vendorId);return !!(v&&v.isActive&&(v.type===type||v.type==='both'));}
router.get('/availability',wrap(async(req,res)=>{
 const kind=req.query.type;const rid=req.query.resourceId;const start=new Date(req.query.startDate);const end=new Date(req.query.endDate);
 if(!['hotelRoom','vehicle'].includes(kind)||!mongoose.isValidObjectId(rid)||Number.isNaN(+start)||Number.isNaN(+end)||start>=end)return res.status(400).json({success:false,message:'Provide type, resourceId and valid startDate < endDate'});
 let capacity=1,filter={resourceType:kind,resource:rid,startDate:{$lt:end},endDate:{$gt:start}};
 if(kind==='hotelRoom'){
  if(!mongoose.isValidObjectId(req.query.roomTypeId))return res.status(400).json({success:false,message:'roomTypeId required'});
  const hotel=await Hotel.findById(rid);if(!hotel||!hotel.isActive)return res.status(404).json({success:false,message:'Hotel not found'});
  const r=hotel.rooms.id(req.query.roomTypeId);if(!r)return res.status(404).json({success:false,message:'Room type not found'});
  capacity=r.totalRooms;filter.roomTypeId=r._id;
 }else{const vehicle=await Transportation.findById(rid);if(!vehicle||!vehicle.isActive)return res.status(404).json({success:false,message:'Vehicle not found'});}
 const blocks=await Block.find(filter).lean();
 // Conservative: overlapping blocks may represent separate unavailable inventory. Do not treat as booking reservations.
 const unavailable=blocks.reduce((n,b)=>n+b.quantity,0);
 res.json({success:true,data:{capacity,blocked:unavailable,available:Math.max(0,capacity-unavailable),note:'Availability reflects admin blocks only; booking allocations are not implemented yet.'}});
}));
router.post('/availability/blocks',wrap(async(req,res)=>{
 const s=z.object({resourceType:z.enum(['hotelRoom','vehicle']),resource:id,roomTypeId:id.optional(),startDate:z.coerce.date(),endDate:z.coerce.date(),quantity:z.coerce.number().int().min(1),reason:z.string().max(200).optional()}).safeParse(req.body);
 if(!s.success)return res.status(400).json({success:false,errors:s.error.flatten()});const x=s.data;
 if(x.startDate>=x.endDate)return res.status(400).json({success:false,message:'End must be after start'});
 const model=x.resourceType==='hotelRoom'?Hotel:Transportation;const resource=await model.findById(x.resource);
 if(!resource||!resource.isActive)return res.status(404).json({success:false,message:'Resource not found'});
 if(x.resourceType==='hotelRoom'){
  const r=x.roomTypeId&&resource.rooms.id(x.roomTypeId);
  if(!r||x.quantity>r.totalRooms)return res.status(400).json({success:false,message:'Invalid room type or quantity'});
 }else if(x.roomTypeId||x.quantity!==1)return res.status(400).json({success:false,message:'Vehicle blocks require quantity 1 and no roomTypeId'});
 const filter={resourceType:x.resourceType,resource:x.resource,startDate:{$lt:x.endDate},endDate:{$gt:x.startDate}};
 if(x.resourceType==='hotelRoom')filter.roomTypeId=x.roomTypeId;
 const overlaps=await Block.find(filter).lean();const already=overlaps.reduce((sum,b)=>sum+b.quantity,0);
 const max=x.resourceType==='hotelRoom'?resource.rooms.id(x.roomTypeId).totalRooms:1;
 if(already+x.quantity>max)return res.status(409).json({success:false,message:'Insufficient available inventory for this date range'});
 const created=await Block.create(x);res.status(201).json({success:true,data:created});
}));
router.get('/availability/blocks',wrap(async(req,res)=>{const blocks=await Block.find().sort({createdAt:-1}).limit(100).lean();res.json({success:true,data:blocks})}));
router.delete('/availability/blocks/:id',wrap(async(req,res)=>{if(!mongoose.isValidObjectId(req.params.id))return res.status(400).json({success:false,message:'Invalid ID'});const b=await Block.findByIdAndDelete(req.params.id);if(!b)return res.status(404).json({success:false,message:'Not found'});res.json({success:true,message:'Block removed'})}));
router.get('/:kind',wrap(async(req,res)=>{
 const config=resources[req.params.kind];if(!config)return res.status(404).json({success:false,message:'Not found'});
 const page=Math.max(1,Math.min(10000,Number(req.query.page)||1));const limit=20;const filter={};
 if(req.query.search){const q=String(req.query.search).slice(0,80).replace(/[^a-zA-Z0-9 ]/g,'');filter.$or=[{name:{$regex:q,$options:'i'}},{city:{$regex:q,$options:'i'}}];}
 let query=config.Model.find(filter);if(req.params.kind!=='vendors')query=query.populate('vendor','name type');
 const [data,total]=await Promise.all([query.sort({createdAt:-1}).skip((page-1)*limit).limit(limit).lean(),config.Model.countDocuments(filter)]);
 res.json({success:true,data,total,page,pages:Math.ceil(total/limit)});
}));
router.post('/:kind',wrap(async(req,res)=>{const c=resources[req.params.kind];if(!c)return res.status(404).json({success:false,message:'Not found'});const p=c.schema.safeParse(req.body);if(!p.success)return res.status(400).json({success:false,errors:p.error.flatten()});if(req.params.kind==='hotels'&&!await vendorCheck('hotel',p.data.vendor))return res.status(400).json({success:false,message:'Active hotel vendor required'});if(req.params.kind==='transportations'&&!await vendorCheck('transport',p.data.vendor))return res.status(400).json({success:false,message:'Active transport vendor required'});try{const doc=await c.Model.create(p.data);res.status(201).json({success:true,data:doc})}catch(e){if(e.code===11000)return res.status(409).json({success:false,message:'Duplicate registration number'});throw e}}));
router.patch('/:kind/:id',wrap(async(req,res)=>{const c=resources[req.params.kind];if(!c||!mongoose.isValidObjectId(req.params.id))return res.status(400).json({success:false,message:'Invalid resource or ID'});const p=c.schema.partial().safeParse(req.body);if(!p.success)return res.status(400).json({success:false,errors:p.error.flatten()});if(p.data.vendor&&req.params.kind!=='vendors'&&!await vendorCheck(req.params.kind==='hotels'?'hotel':'transport',p.data.vendor))return res.status(400).json({success:false,message:'Active compatible vendor required'});try{const doc=await c.Model.findByIdAndUpdate(req.params.id,{$set:p.data},{new:true,runValidators:true});if(!doc)return res.status(404).json({success:false,message:'Not found'});res.json({success:true,data:doc})}catch(e){if(e.code===11000)return res.status(409).json({success:false,message:'Duplicate registration number'});throw e}}));
router.delete('/:kind/:id',wrap(async(req,res)=>{const c=resources[req.params.kind];if(!c||!mongoose.isValidObjectId(req.params.id))return res.status(400).json({success:false,message:'Invalid resource or ID'});const doc=await c.Model.findByIdAndUpdate(req.params.id,{isActive:false},{new:true});if(!doc)return res.status(404).json({success:false,message:'Not found'});res.json({success:true,message:'Archived',data:doc})}));
module.exports=router;
