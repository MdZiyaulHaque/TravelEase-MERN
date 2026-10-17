const mongoose=require('mongoose');
const schema=new mongoose.Schema({
 code:{type:String,required:true,unique:true,uppercase:true,trim:true,match:/^[A-Z0-9_-]{3,30}$/},
 description:{type:String,default:'',maxlength:300},
 discountType:{type:String,enum:['percentage','fixed'],required:true},
 discountValue:{type:Number,required:true,min:0.01},
 maxDiscount:{type:Number,default:null,min:0},
 minBookingAmount:{type:Number,default:0,min:0},
 startsAt:{type:Date,required:true},expiresAt:{type:Date,required:true},
 usageLimit:{type:Number,default:100,min:1},usedCount:{type:Number,default:0,min:0},
 perCustomerLimit:{type:Number,default:1,min:1},
 packageIds:[{type:mongoose.Schema.Types.ObjectId,ref:'TourPackage'}],
 isActive:{type:Boolean,default:true},
 createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'}
},{timestamps:true});
module.exports=mongoose.model('Coupon',schema);
