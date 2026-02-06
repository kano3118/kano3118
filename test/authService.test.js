import test from 'node:test';
import assert from 'node:assert/strict';
import { isAccessTokenValid, toBundle } from '../src/services/authService.js';

test('toBundle maps oauth response to internal shape', () => {
  const bundle = toBundle({ access_token: 'a', refresh_token: 'r', expires_in: 3600, scope: 'x', token_type: 'Bearer' });
  assert.equal(bundle.accessToken, 'a');
  assert.equal(bundle.refreshToken, 'r');
  assert.equal(bundle.scope, 'x');
  assert.equal(bundle.tokenType, 'Bearer');
  assert.ok(bundle.expiresAt > 0);
});

test('isAccessTokenValid returns false for near-expiry tokens', () => {
  assert.equal(isAccessTokenValid({ expiresAt: Math.floor(Date.now() / 1000) + 20 }), false);
  assert.equal(isAccessTokenValid({ expiresAt: Math.floor(Date.now() / 1000) + 120 }), true);
});
