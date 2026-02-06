import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

const stateStore = new Map();
const tokenStore = new Map();

function now() {
  return Math.floor(Date.now() / 1000);
}

export function issueLoginState() {
  const state = crypto.randomUUID();
  stateStore.set(state, Date.now() + 10 * 60 * 1000);
  return state;
}

export function validateLoginState(state) {
  const expiry = stateStore.get(state);
  stateStore.delete(state);
  return Boolean(expiry && expiry > Date.now());
}

export function saveTokenBundle(bundle) {
  const sid = crypto.randomUUID();
  tokenStore.set(sid, bundle);
  return jwt.sign({ sid }, config.jwtSecret, { expiresIn: '7d' });
}

export function getTokenBundle(sessionToken) {
  const payload = jwt.verify(sessionToken, config.jwtSecret);
  return { sid: payload.sid, bundle: tokenStore.get(payload.sid) };
}

export function updateTokenBundle(sid, bundle) {
  tokenStore.set(sid, bundle);
}

export function isAccessTokenValid(bundle) {
  return bundle?.expiresAt && bundle.expiresAt > now() + 45;
}

export function toBundle(tokenResponse) {
  return {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    expiresAt: now() + Number(tokenResponse.expires_in || 3600),
    scope: tokenResponse.scope,
    tokenType: tokenResponse.token_type || 'Bearer'
  };
}
