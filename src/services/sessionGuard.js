import { getTokenBundle, isAccessTokenValid, toBundle, updateTokenBundle } from './authService.js';
import { refreshAccessToken } from './graphService.js';

export async function requireSession(request, reply) {
  const auth = request.headers.authorization;
  const sessionToken = auth?.startsWith('Bearer ') ? auth.slice(7) : request.query?.sessionToken;
  if (!sessionToken) {
    return reply.code(401).send({ error: 'Missing bearer token' });
  }
  try {
    const { sid, bundle } = getTokenBundle(sessionToken);
    if (!bundle) {
      return reply.code(401).send({ error: 'Session not found' });
    }

    if (!isAccessTokenValid(bundle)) {
      const refreshed = await refreshAccessToken(bundle.refreshToken);
      const newBundle = {
        ...toBundle(refreshed),
        refreshToken: refreshed.refresh_token || bundle.refreshToken
      };
      updateTokenBundle(sid, newBundle);
      request.userSession = { sid, accessToken: newBundle.accessToken };
      return;
    }

    request.userSession = { sid, accessToken: bundle.accessToken };
  } catch {
    return reply.code(401).send({ error: 'Invalid session token' });
  }
}
