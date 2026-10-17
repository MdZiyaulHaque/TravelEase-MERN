const mongoose=require('mongoose');
const schema=new mongoose.Schema({name:{type:String,required:true,trim:true},destination:{type:mongoose.Schema.Types.ObjectId,ref:'Destination',required:true},description:{type:String,default:''},durationDays:{type:Number,required:true,min:1},durationNights:{type:Number,required:true,min:0},price:{type:Number,required:true,min:0},capacity:{type:Number,required:true,min:1},image:{type:String,default:''},inclusions:{type:[String],default:[]},exclusions:{type:[String],default:[]},isActive:{type:Boolean,default:true}},{timestamps:true});
schema.index({name:'text',description:'text'});
module.exports=mongoose.model('TourPackage',schema);
