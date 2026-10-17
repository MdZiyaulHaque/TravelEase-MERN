const mongoose = require('mongoose');
const ReviewSchema = new mongoose.Schema({
  package: {type:mongoose.Schema.Types.ObjectId,ref:'TourPackage',required:true,index:true},
  booking: {type:mongoose.Schema.Types.ObjectId,ref:'Booking',required:true,unique:true},
  customer: {type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
  rating: {type:Number,required:true,min:1,max:5},
  title: {type:String,required:true,trim:true,maxlength:120},
  comment: {type:String,required:true,trim:true,maxlength:2000},
  verified: {type:Boolean,default:true,immutable:true},
  status: {type:String,enum:['pending','approved','rejected','hidden'],default:'pending',index:true},
  moderationNote: {type:String,default:'',maxlength:500},
  moderatedBy: {type:mongoose.Schema.Types.ObjectId,ref:'User',default:null},
  moderatedAt: {type:Date,default:null}
},{timestamps:true});
ReviewSchema.index({package:1,status:1,createdAt:-1});
module.exports=mongoose.models.Review||mongoose.model('Review',ReviewSchema);
