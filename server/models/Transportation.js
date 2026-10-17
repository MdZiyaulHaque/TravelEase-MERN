const mongoose=require('mongoose');
const schema=new mongoose.Schema({name:{type:String,required:true,trim:true},type:{type:String,enum:['car','suv','van','bus','other'],required:true},registrationNumber:{type:String,required:true,trim:true,uppercase:true,unique:true},capacity:{type:Number,required:true,min:1},dailyRate:{type:Number,required:true,min:0},city:{type:String,required:true,trim:true},vendor:{type:mongoose.Schema.Types.ObjectId,ref:'Vendor',required:true},isActive:{type:Boolean,default:true}},{timestamps:true});
module.exports=mongoose.model('Transportation',schema);
