const mongoose=require('mongoose');
const roomSchema=new mongoose.Schema({type:{type:String,required:true,trim:true},totalRooms:{type:Number,required:true,min:1},pricePerNight:{type:Number,required:true,min:0}},{_id:true});
const schema=new mongoose.Schema({name:{type:String,required:true,trim:true,maxlength:120},city:{type:String,required:true,trim:true},address:{type:String,required:true,trim:true},vendor:{type:mongoose.Schema.Types.ObjectId,ref:'Vendor',required:true},stars:{type:Number,min:1,max:5,default:3},amenities:[{type:String,trim:true}],rooms:{type:[roomSchema],validate:{validator:v=>v.length>0,message:'At least one room type required'}},isActive:{type:Boolean,default:true}},{timestamps:true});
module.exports=mongoose.model('Hotel',schema);
