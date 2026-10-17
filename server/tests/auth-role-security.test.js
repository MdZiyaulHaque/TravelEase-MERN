'use strict';
// Phase 19.2: read-only auth/role tests; Node.js 18+; no database mutations.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const BASE = (process.env.TEST_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const customerCookie = process.env.TEST_CUSTOMER_COOKIE || '';
const adminCookie = process.env.TEST_ADMIN_COOKIE || '';

async function request(path, cookie) {
  const headers = {Accept: 'application/json'};
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(BASE + path, {
    method:'GET', headers, redirect:'manual', signal:AbortSignal.timeout(8000)
  });
  let body;
  try { body=await res.json(); }
  catch { assert.fail(`Expected JSON from ${path}, got HTTP ${res.status}`); }
  return {res,body};
}
function expectStatus({res,body}, status) {
  assert.equal(res.status,status,`HTTP ${res.status}: ${JSON.stringify(body)}`);
  assert.equal(body.success,status===200);
}
test('Auth /me denies anonymous',async()=>{
  expectStatus(await request('/api/auth/me'),401);
});
test('Admin-only denies anonymous',async()=>{
  expectStatus(await request('/api/auth/admin-only'),401);
});
test('Vendor-only denies anonymous',async()=>{
  expectStatus(await request('/api/auth/vendor-only'),401);
});
test('Admin payment listing denies anonymous',async()=>{
  expectStatus(await request('/api/payments/admin'),401);
});
test('Malformed JWT cookie is rejected',async()=>{
  expectStatus(await request('/api/auth/me','access_token=invalid.jwt.token'),401);
});
test('Unsigned JWT cookie is rejected',async()=>{
  const head=Buffer.from(JSON.stringify({alg:'none',typ:'JWT'})).toString('base64url');
  const payload=Buffer.from(JSON.stringify({sub:'507f1f77bcf86cd799439011',iat:1})).toString('base64url');
  expectStatus(await request('/api/auth/me',`access_token=${head}.${payload}.`),401);
});
test('Bearer header alone cannot bypass cookie auth',async()=>{
  const res=await fetch(BASE+'/api/auth/me',{
    method:'GET',headers:{Authorization:'Bearer invalid.jwt.token',Accept:'application/json'},
    redirect:'manual',signal:AbortSignal.timeout(8000)
  });
  assert.equal(res.status,401);
});
test('Unknown API route is not publicly exposed',async()=>{
  expectStatus(await request('/api/__phase19_2_unknown__'),404);
});

test('Customer cookie can access own profile', {skip:!customerCookie && 'Set TEST_CUSTOMER_COOKIE to enable'},async()=>{
  const {res,body}=await request('/api/auth/me',customerCookie);
  assert.equal(res.status,200,JSON.stringify(body));
  assert.equal(body.success,true);
});
test('Customer cookie cannot access admin-only route',{skip:!customerCookie && 'Set TEST_CUSTOMER_COOKIE to enable'},async()=>{
  expectStatus(await request('/api/auth/admin-only',customerCookie),403);
});
test('Customer cookie cannot access admin payments',{skip:!customerCookie && 'Set TEST_CUSTOMER_COOKIE to enable'},async()=>{
  expectStatus(await request('/api/payments/admin',customerCookie),403);
});
test('Admin cookie can access admin-only route',{skip:!adminCookie && 'Set TEST_ADMIN_COOKIE to enable'},async()=>{
  const {res,body}=await request('/api/auth/admin-only',adminCookie);
  assert.equal(res.status,200,JSON.stringify(body));
  assert.equal(body.success,true);
});
test('Admin cookie can access admin payment list',{skip:!adminCookie && 'Set TEST_ADMIN_COOKIE to enable'},async()=>{
  const {res,body}=await request('/api/payments/admin',adminCookie);
  assert.equal(res.status,200,JSON.stringify(body));
  assert.equal(body.success,true);
});
