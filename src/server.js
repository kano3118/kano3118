import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { config } from './config.js';
import { createCache } from './cache/cacheService.js';
import authRoutes from './routes/auth.js';
import mediaRoutes from './routes/media.js';
import streamRoutes from './routes/stream.js';
import eventRoutes from './routes/events.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = Fastify({ logger: true });
app.decorate('cache', createCache(config.redisUrl));

await app.register(cors, {
  origin: config.appBaseUrl,
  credentials: false
});

await app.register(helmet, {
  global: true,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      mediaSrc: ["'self'", 'https:'],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  }
});

await app.register(rateLimit, { max: 180, timeWindow: '1 minute' });
await app.register(fastifyStatic, {
  root: path.join(__dirname, '..', 'public')
});

await app.register(authRoutes);
await app.register(mediaRoutes);
await app.register(streamRoutes);
await app.register(eventRoutes);

app.get('/api/health', async () => ({ status: 'ok' }));

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);
  reply.code(500).send({ error: 'Internal server error', detail: error.message });
});

app.listen({ host: '0.0.0.0', port: config.port })
  .then(() => app.log.info(`Server started on ${config.port}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
