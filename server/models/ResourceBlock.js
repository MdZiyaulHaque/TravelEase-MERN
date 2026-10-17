const mongoose=require('mongoose');
const schema=new mongoose.Schema({resourceType:{type:String,enum:['hotelRoom','vehicle'],required:true},resource:{type:mongoose.Schema.Types.ObjectId,required:true},roomTypeId:{type:mongoose.Schema.Types.ObjectId},startDate:{type:Date,required:true},endDate:{type:Date,required:true},quantity:{type:Number,required:true,min:1},reason:{type:String,trim:true,maxlength:200,default:'Maintenance / unavailable'}},{timestamps:true});
schema.index({resourceType:1,resource:1,startDate:1,endDate:1});
module.exports=mongoose.model('ResourceBlock',schema);
