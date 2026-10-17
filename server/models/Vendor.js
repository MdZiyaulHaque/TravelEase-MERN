const mongoose=require('mongoose');
const schema=new mongoose.Schema({name:{type:String,required:true,trim:true,maxlength:120},type:{type:String,enum:['hotel','transport','both'],required:true},email:{type:String,trim:true,lowercase:true},phone:{type:String,required:true,trim:true},city:{type:String,required:true,trim:true},address:{type:String,trim:true},notes:{type:String,trim:true,maxlength:1000},isActive:{type:Boolean,default:true}},{timestamps:true});
module.exports=mongoose.model('Vendor',schema);
