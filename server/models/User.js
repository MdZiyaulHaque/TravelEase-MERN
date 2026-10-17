const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
 name:{type:String,required:true,trim:true,maxlength:80},
 email:{type:String,required:true,unique:true,lowercase:true,trim:true},
 phone:{type:String,trim:true,default:''},
 address:{type:String,trim:true,default:'',maxlength:300},
 city:{type:String,trim:true,default:'',maxlength:80},
 country:{type:String,trim:true,default:'',maxlength:80},
 passwordHash:{type:String,required:true,select:false},
 role:{type:String,enum:['customer','admin','vendor'],default:'customer'},
 isActive:{type:Boolean,default:true},
 resetTokenHash:{type:String,select:false},
 resetTokenExpiresAt:{type:Date,select:false},
 passwordChangedAt:{type:Date}
},{timestamps:true});
module.exports = mongoose.model('User',userSchema);
