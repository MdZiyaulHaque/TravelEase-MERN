const mongoose=require('mongoose');
const schema=new mongoose.Schema({name:{type:String,required:true,trim:true,maxlength:100},state:{type:String,required:true,trim:true},country:{type:String,default:'India'},description:{type:String,default:''},image:{type:String,default:''},isActive:{type:Boolean,default:true}},{timestamps:true});
schema.index({name:1,state:1},{unique:true});
module.exports=mongoose.model('Destination',schema);
