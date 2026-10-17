require('dotenv').config();
const mongoose=require('mongoose');const bcrypt=require('bcryptjs');
const User=require('../models/User');
(async()=>{try{
 const role=process.argv[2],email=process.env.STAFF_EMAIL,password=process.env.STAFF_PASSWORD,name=process.env.STAFF_NAME||'Staff Member';
 if(!['admin','vendor'].includes(role)||!email||!password||password.length<12)throw Error('Usage: set STAFF_EMAIL and STAFF_PASSWORD (12+ chars), then node scripts/createStaff.js admin|vendor');
 await mongoose.connect(process.env.MONGODB_URI);
 if(await User.exists({email:email.toLowerCase()}))throw Error('Email already exists; refusing to overwrite');
 await User.create({name,email:email.toLowerCase(),role,passwordHash:await bcrypt.hash(password,12)});
 console.log(role+' account created for '+email);
 }catch(e){console.error(e.message);process.exitCode=1;}finally{await mongoose.disconnect();}})();
