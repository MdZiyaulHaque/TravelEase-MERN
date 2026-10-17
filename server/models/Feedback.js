const mongoose=require('mongoose');
const FeedbackSchema=new mongoose.Schema({
 customer:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
 category:{type:String,enum:['suggestion','complaint','compliment','other'],required:true},
 subject:{type:String,required:true,trim:true,maxlength:150},
 message:{type:String,required:true,trim:true,maxlength:2000},
 status:{type:String,enum:['open','in_progress','resolved'],default:'open',index:true},
 adminReply:{type:String,default:'',maxlength:2000},
 handledBy:{type:mongoose.Schema.Types.ObjectId,ref:'User',default:null}
},{timestamps:true});
module.exports=mongoose.models.Feedback||mongoose.model('Feedback',FeedbackSchema);
