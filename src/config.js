import dotenv from 'dotenv';

dotenv.config();

const required = ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET', 'MICROSOFT_REDIRECT_URI', 'JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    console.warn(`[config] Missing env var: ${key}`);
  }
}

export const config = {
  port: Number(process.env.PORT || 3000),
  appBaseUrl: process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  microsoft: {
    tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    redirectUri: process.env.MICROSOFT_REDIRECT_URI,
    scopes: ['offline_access', 'openid', 'profile', 'User.Read', 'Files.Read', 'Files.Read.All']
  },
  jwtSecret: process.env.JWT_SECRET || 'local-dev-secret',
  redisUrl: process.env.REDIS_URL,
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS || 300),
  graphConcurrency: Number(process.env.GRAPH_CONCURRENCY || 8),
  graphPageSize: Number(process.env.GRAPH_PAGE_SIZE || 200)
};
