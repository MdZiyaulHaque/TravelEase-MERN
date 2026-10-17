"use strict";
const {test}=require('node:test');
const assert=require('node:assert/strict');
const BASE=(process.env.TEST_BASE_URL||'http://127.0.0.1:8000').replace(/\/$/,'');
const COOKIE=process.env.TEST_CUSTOMER_COOKIE||'';
const ADMIN_COOKIE=process.env.TEST_ADMIN_COOKIE||'';
const PACKAGE_ID=process.env.TEST_PACKAGE_ID||'';
async function get(path,cookie=''){
 const headers={Accept:'application/json'};
 if(cookie)headers.Cookie=cookie;
 const response=await fetch(BASE+path,{method:'GET',headers,signal:AbortSignal.timeout(10000)});
 const body=await response.json();
 return {response,body};
}
function status(result,expected){assert.equal(result.response.status,expected,JSON.stringify(result.body));}
test('Anonymous cannot read customer bookings',async()=>status(await get('/api/bookings/my'),401));
test('Anonymous cannot read admin coupons',async()=>status(await get('/api/coupons/admin'),401));
test('Public package listing responds with JSON',async()=>{
 const result=await get('/api/packages');status(result,200);
 assert.equal(result.body.success,true);
 assert.ok(Array.isArray(result.body.data),'Package list must be an array');
});
test('Invalid departure package id cannot return successful inventory',async()=>{
 const result=await get('/api/bookings/departures/not-a-valid-id');
 assert.notEqual(result.response.status,200,JSON.stringify(result.body));
});
test('Customer can read own bookings and statuses',{skip:!COOKIE&&'Set TEST_CUSTOMER_COOKIE'},async()=>{
 const result=await get('/api/bookings/my',COOKIE);status(result,200);
 assert.equal(result.body.success,true);
 assert.ok(Array.isArray(result.body.data));
 for(const b of result.body.data){
   assert.ok(['pending_payment','confirmed','cancelled','completed'].includes(b.status),`Unexpected booking status: ${b.status}`);
   if(b.status==='cancelled' && b.seatsReleased!==undefined) assert.equal(b.seatsReleased,true,`Cancelled booking ${b._id} has unreleased seats`);
   if(b.originalAmount!==undefined && b.discountAmount!==undefined){
     assert.ok(Math.abs((b.originalAmount-b.discountAmount)-b.totalAmount)<0.011,`Amount mismatch on ${b._id}`);
   }
 }
});
test('Departure seats stay within capacity',{skip:!PACKAGE_ID&&'Set TEST_PACKAGE_ID'},async()=>{
 const result=await get('/api/bookings/departures/'+encodeURIComponent(PACKAGE_ID));status(result,200);
 assert.equal(result.body.success,true);
 assert.ok(Array.isArray(result.body.data));
 for(const d of result.body.data){
  assert.ok(Number.isFinite(d.capacity)&&Number.isFinite(d.reserved));
  assert.ok(d.capacity>=0&&d.reserved>=0&&d.reserved<=d.capacity,`Invalid seat counts on ${d._id}`);
  if(d.availableSeats!==undefined)assert.equal(d.availableSeats,d.capacity-d.reserved);
 }
});
test('Customer cannot list admin coupons',{skip:!COOKIE&&'Set TEST_CUSTOMER_COOKIE'},async()=>status(await get('/api/coupons/admin',COOKIE),403));
test('Admin can list coupons',{skip:!ADMIN_COOKIE&&'Set TEST_ADMIN_COOKIE'},async()=>{
 const result=await get('/api/coupons/admin',ADMIN_COOKIE);status(result,200);
 assert.equal(result.body.success,true);assert.ok(Array.isArray(result.body.data));
});
