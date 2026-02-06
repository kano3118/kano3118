import { exchangeCodeForToken, getAuthorizeUrl } from '../services/graphService.js';
import { issueLoginState, saveTokenBundle, toBundle, validateLoginState } from '../services/authService.js';

export default async function authRoutes(fastify) {
  fastify.get('/api/auth/login', async (_request, reply) => {
    const state = issueLoginState();
    return reply.send({ authorizeUrl: getAuthorizeUrl(state), state });
  });

  fastify.get('/api/auth/callback', async (request, reply) => {
    const { code, state } = request.query;
    if (!code || !state || !validateLoginState(state)) {
      return reply.code(400).send({ error: 'Invalid OAuth callback state.' });
    }

    const tokenResponse = await exchangeCodeForToken(code);
    const sessionToken = saveTokenBundle(toBundle(tokenResponse));

    return reply.type('text/html').send(`<!doctype html>
      <html><body style="background:#0b0d13;color:#fff;font-family:sans-serif;display:grid;place-items:center;height:100vh;">
      <script>localStorage.setItem('sessionToken', '${sessionToken}');window.location='/'</script>
      <p>Authentication completed. Redirecting…</p></body></html>`);
  });
}
