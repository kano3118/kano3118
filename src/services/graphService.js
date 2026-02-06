import pLimit from 'p-limit';
import { config } from '../config.js';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const tokenEndpoint = `https://login.microsoftonline.com/${config.microsoft.tenantId}/oauth2/v2.0/token`;
const authorizeEndpoint = `https://login.microsoftonline.com/${config.microsoft.tenantId}/oauth2/v2.0/authorize`;
const mediaExtensions = {
  video: ['.mp4', '.mkv', '.webm'],
  image: ['.jpg', '.jpeg', '.png', '.webp'],
  doc: ['.pdf']
};

export function getAuthorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: config.microsoft.clientId,
    response_type: 'code',
    redirect_uri: config.microsoft.redirectUri,
    response_mode: 'query',
    scope: config.microsoft.scopes.join(' '),
    state
  });
  return `${authorizeEndpoint}?${params.toString()}`;
}

export async function exchangeCodeForToken(code) {
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.microsoft.clientId,
      client_secret: config.microsoft.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.microsoft.redirectUri,
      scope: config.microsoft.scopes.join(' ')
    })
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

export async function refreshAccessToken(refreshToken) {
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.microsoft.clientId,
      client_secret: config.microsoft.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      redirect_uri: config.microsoft.redirectUri,
      scope: config.microsoft.scopes.join(' ')
    })
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

export async function graphRequest(path, accessToken, options = {}) {
  const url = path.startsWith('http') ? path : `${GRAPH_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Graph API error (${response.status}): ${body}`);
  }

  return response.json();
}

function classifyMedia(name = '') {
  const lower = name.toLowerCase();
  if (mediaExtensions.video.some((ext) => lower.endsWith(ext))) return 'video';
  if (mediaExtensions.image.some((ext) => lower.endsWith(ext))) return 'image';
  if (mediaExtensions.doc.some((ext) => lower.endsWith(ext))) return 'document';
  return 'other';
}

function normalizeItem(item) {
  const mediaType = classifyMedia(item.name);
  if (mediaType === 'other') return null;
  return {
    id: item.id,
    name: item.name,
    mediaType,
    webUrl: item.webUrl,
    downloadUrl: item['@microsoft.graph.downloadUrl'],
    thumbnailUrl: item.thumbnails?.[0]?.medium?.url || item.thumbnails?.[0]?.small?.url || null,
    parentPath: item.parentReference?.path || '',
    size: item.size,
    createdDateTime: item.createdDateTime,
    lastModifiedDateTime: item.lastModifiedDateTime,
    file: item.file || {},
    video: item.video || null,
    image: item.image || null
  };
}

export async function listMediaRecursive(accessToken, itemId = 'root') {
  const limit = pLimit(config.graphConcurrency);
  const mediaItems = [];

  async function walk(folderId) {
    let nextUrl = `${GRAPH_BASE}/me/drive/items/${folderId}/children?$top=${config.graphPageSize}&$select=id,name,size,webUrl,parentReference,createdDateTime,lastModifiedDateTime,file,folder,video,image,thumbnails,@microsoft.graph.downloadUrl`;
    while (nextUrl) {
      const data = await graphRequest(nextUrl, accessToken);
      const tasks = [];
      for (const item of data.value || []) {
        if (item.folder) {
          tasks.push(limit(() => walk(item.id)));
        } else {
          const normalized = normalizeItem(item);
          if (normalized) mediaItems.push(normalized);
        }
      }
      await Promise.all(tasks);
      nextUrl = data['@odata.nextLink'];
    }
  }

  await walk(itemId);
  return mediaItems;
}

export async function listFolder(accessToken, itemId = 'root') {
  const path = `/me/drive/items/${itemId}/children?$top=${config.graphPageSize}&$expand=thumbnails`;
  return graphRequest(path, accessToken);
}

export async function searchMedia(accessToken, query) {
  const path = `/me/drive/root/search(q='${encodeURIComponent(query)}')?$expand=thumbnails`;
  return graphRequest(path, accessToken);
}

export async function getDelta(accessToken, deltaToken) {
  const path = deltaToken ? deltaToken : '/me/drive/root/delta';
  return graphRequest(path, accessToken);
}
