const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const app=require('../app');
let server,port;
test.before(async()=>{server=http.createServer(app);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));port=server.address().port});
test.after(async()=>{await new Promise(resolve=>server.close(resolve))});
function request(path,options={}){return fetch(`http://127.0.0.1:${port}${path}`,options)}
test('health endpoint responds without database',async()=>{const r=await request('/api/health');assert.equal(r.status,200);assert.equal((await r.json()).success,true)});
test('unknown route is JSON 404',async()=>{const r=await request('/api/no-such-route');assert.equal(r.status,404);assert.equal((await r.json()).success,false)});
test('admin analytics requires login',async()=>{const r=await request('/api/dashboard/operations');assert.equal(r.status,401)});
test('security headers and request ID are present',async()=>{const r=await request('/api/health');assert.equal(r.headers.get('x-content-type-options'),'nosniff');assert.ok(r.headers.get('x-request-id'))});
test('disallowed Origin blocks POST requests',async()=>{const r=await request('/api/bookings',{method:'POST',headers:{origin:'https://not-allowed.example','content-type':'application/json'},body:'{}'});assert.equal(r.status,403)});
