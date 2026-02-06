import { config } from '../config.js';
import { getDelta, listFolder, listMediaRecursive, searchMedia } from './graphService.js';

function enrichMetadata(item) {
  return {
    ...item,
    durationSeconds: item.video?.duration ? Math.floor(item.video.duration / 1000) : null,
    width: item.video?.width || item.image?.width || null,
    height: item.video?.height || item.image?.height || null,
    mimeType: item.file?.mimeType || null
  };
}

export async function getLibrary({ cache, accessToken, forceRefresh = false }) {
  const cacheKey = 'media:library';
  if (!forceRefresh) {
    const cached = await cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  const media = await listMediaRecursive(accessToken);
  const enriched = media.map(enrichMetadata);
  await cache.set(cacheKey, JSON.stringify(enriched), config.cacheTtlSeconds);
  return enriched;
}

export async function getFolderContents({ accessToken, itemId }) {
  return listFolder(accessToken, itemId);
}

export async function getSearchResults({ accessToken, query }) {
  const data = await searchMedia(accessToken, query);
  return (data.value || []).map((item) => ({
    id: item.id,
    name: item.name,
    size: item.size,
    webUrl: item.webUrl,
    downloadUrl: item['@microsoft.graph.downloadUrl'],
    mediaType: item.video ? 'video' : item.image ? 'image' : item.file?.mimeType === 'application/pdf' ? 'document' : 'other'
  })).filter((item) => item.mediaType !== 'other');
}

export async function getDeltaChanges({ accessToken, deltaToken }) {
  return getDelta(accessToken, deltaToken);
}
