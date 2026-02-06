import { graphRequest } from '../services/graphService.js';
import { requireSession } from '../services/sessionGuard.js';

export default async function streamRoutes(fastify) {
  fastify.get('/api/media/stream/:id', { preHandler: requireSession }, async (request, reply) => {
    const data = await graphRequest(`/me/drive/items/${request.params.id}?$expand=thumbnails`, request.userSession.accessToken);
    const downloadUrl = data['@microsoft.graph.downloadUrl'];
    if (!downloadUrl) {
      return reply.code(404).send({ error: 'No downloadable stream URL found' });
    }

    return reply.send({
      id: data.id,
      name: data.name,
      downloadUrl,
      thumbnails: data.thumbnails || [],
      mimeType: data.file?.mimeType || null,
      size: data.size,
      lastModifiedDateTime: data.lastModifiedDateTime
    });
  });
}
