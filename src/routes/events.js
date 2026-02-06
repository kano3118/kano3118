import { requireSession } from '../services/sessionGuard.js';
import { getDeltaChanges } from '../services/mediaService.js';

export default async function eventRoutes(fastify) {
  fastify.get('/api/media/events', { preHandler: requireSession }, async (request, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });

    let deltaToken = request.query.deltaToken;
    const timer = setInterval(async () => {
      try {
        const data = await getDeltaChanges({ accessToken: request.userSession.accessToken, deltaToken });
        deltaToken = data['@odata.deltaLink'] || data['@odata.nextLink'] || deltaToken;
        reply.raw.write(`data: ${JSON.stringify({ items: data.value || [], deltaToken })}\n\n`);
      } catch (err) {
        reply.raw.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
      }
    }, 15000);

    request.raw.on('close', () => clearInterval(timer));
  });
}
