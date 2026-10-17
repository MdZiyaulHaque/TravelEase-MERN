const mongoose=require('mongoose');
const schema=new mongoose.Schema({package:{type:mongoose.Schema.Types.ObjectId,ref:'TourPackage',required:true},date:{type:String,required:true,match:/^\d{4}-\d{2}-\d{2}$/},capacity:{type:Number,required:true,min:1},reserved:{type:Number,default:0,min:0},isActive:{type:Boolean,default:true}},{timestamps:true});
schema.index({package:1,date:1},{unique:true});
module.exports=mongoose.model('Departure',schema);
