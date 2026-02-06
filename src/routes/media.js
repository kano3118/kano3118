import { getDeltaChanges, getFolderContents, getLibrary, getSearchResults } from '../services/mediaService.js';
import { requireSession } from '../services/sessionGuard.js';

export default async function mediaRoutes(fastify) {
  fastify.get('/api/media/library', { preHandler: requireSession }, async (request) => {
    const forceRefresh = request.query.refresh === '1';
    return getLibrary({ cache: fastify.cache, accessToken: request.userSession.accessToken, forceRefresh });
  });

  fastify.get('/api/media/folder/:id', { preHandler: requireSession }, async (request) => {
    return getFolderContents({ accessToken: request.userSession.accessToken, itemId: request.params.id });
  });

  fastify.get('/api/media/search', { preHandler: requireSession }, async (request, reply) => {
    if (!request.query.q) return reply.code(400).send({ error: 'q query required' });
    return getSearchResults({ accessToken: request.userSession.accessToken, query: request.query.q });
  });

  fastify.get('/api/media/delta', { preHandler: requireSession }, async (request) => {
    return getDeltaChanges({ accessToken: request.userSession.accessToken, deltaToken: request.query.deltaToken });
  });
}
