'use strict';
// Node 18+ built-in test runner; only read-only GET requests; no credentials.
const test = require('node:test');
const assert = require('node:assert/strict');

const BASE_URL = (process.env.TEST_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const TIMEOUT_MS = 7000;
async function get(path) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: {Accept: 'application/json'},
    redirect: 'manual',
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  let data;
  try { data = await response.json(); }
  catch { assert.fail(`${path} did not return valid JSON (HTTP ${response.status})`); }
  return {response, data};
}

for (const [name, path] of [
  ['Admin payments require login', '/api/payments/admin'],
  ['Customer stats require login', '/api/customers/stats'],
  ['Customer bookings require login', '/api/bookings/my'],
  ['Customer payments require login', '/api/payments/my']
]) {
  test(name, async () => {
    const {response, data} = await get(path);
    assert.equal(response.status, 401, `Expected 401 for ${path}, got ${response.status}: ${JSON.stringify(data)}`);
    assert.equal(data.success, false);
    assert.equal(typeof data.message, 'string');
  });
}

test('Unknown API endpoint returns 404', async () => {
  const {response, data} = await get('/api/__phase19_unknown_route__');
  assert.equal(response.status, 404);
  assert.equal(data.success, false);
});

test('Security headers are present', async () => {
  const {response} = await get('/api/__phase19_unknown_route__');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.equal(response.headers.get('x-powered-by'), null);
});
