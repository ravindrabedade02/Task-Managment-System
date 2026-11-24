import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';

// Starts the real Express app on a random port. No database connection is needed for these routes.
let server, base;
before(() => new Promise((resolve) => {
  server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; resolve(); });
}));
after(() => new Promise((resolve) => server.close(resolve)));

test('GET /api/health reports the API is up (and that the database is not connected in this test)', async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok', database: 'disconnected' });
});

test('unknown route returns a JSON 404', async () => {
  const res = await fetch(`${base}/api/nothing-here`);
  assert.equal(res.status, 404);
  assert.match((await res.json()).message, /Route not found/);
});

test('malformed JSON body returns 400, not 500', async () => {
  const res = await fetch(`${base}/api/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"title": ' });
  assert.equal(res.status, 400);
  assert.match((await res.json()).message, /not valid JSON/);
});

test('the X-Powered-By header is not exposed', async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.headers.get('x-powered-by'), null);
});
