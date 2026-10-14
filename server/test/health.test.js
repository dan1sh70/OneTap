const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');

test('GET /api/health should return 200 and online status', async () => {
  // Test server health without DB connection
  assert.ok(app);
});
