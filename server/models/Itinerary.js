const mongoose=require('mongoose');
const activitySchema=new mongoose.Schema({time:{type:String,default:''},title:{type:String,required:true,trim:true,maxlength:120},description:{type:String,default:'',maxlength:1000},location:{type:String,default:'',maxlength:160}},{_id:false});
const schema=new mongoose.Schema({package:{type:mongoose.Schema.Types.ObjectId,ref:'TourPackage',required:true,index:true},day:{type:Number,required:true,min:1},title:{type:String,required:true,trim:true,maxlength:160},description:{type:String,default:'',maxlength:2000},activities:{type:[activitySchema],default:[]},pickupLocation:{type:String,default:'',maxlength:200},pickupTime:{type:String,default:''},dropLocation:{type:String,default:'',maxlength:200},dropTime:{type:String,default:''},meals:{type:[String],default:[]},overnightStay:{type:String,default:'',maxlength:200}},{timestamps:true});
schema.index({package:1,day:1},{unique:true});
module.exports=mongoose.model('Itinerary',schema);
