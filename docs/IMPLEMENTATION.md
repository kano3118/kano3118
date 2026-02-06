# OneDrive Cinema Streaming Platform

## 1) System Architecture Diagram

```mermaid
flowchart LR
    U[Browser SPA\nHTML/CSS/Vanilla JS] -->|OAuth start| A[Fastify API]
    A -->|Auth Code + Refresh| IDP[Microsoft Identity Platform]
    A -->|Graph REST| G[Microsoft Graph API\n/me/drive/...]
    A -->|Metadata cache| R[(Redis)]
    A -->|Playback state / session| J[(JWT + in-memory session map)]
    A -->|Static assets| S[Frontend bundle]
    A -->|Delta events SSE| U
    U -->|Direct stream URL| D[@microsoft.graph.downloadUrl]
```

## 2) Frontend Folder Structure

```text
public/
  index.html          # Dashboard + modal + layout shell
  styles.css          # Dark cinematic UI, responsive grid, skeletons
  app.js              # OAuth flow, library loading, search, preview/player
```

## 3) Backend API Design

### Auth
- `GET /api/auth/login` → returns OAuth authorize URL.
- `GET /api/auth/callback?code&state` → exchanges code for tokens and stores signed session JWT.

### Media Discovery
- `GET /api/media/library?refresh=1` → recursive traversal of OneDrive folders, paginated Graph reads, normalized media metadata.
- `GET /api/media/folder/:id` → folder-level navigation.
- `GET /api/media/search?q=...` → Graph search endpoint.
- `GET /api/media/delta?deltaToken=...` → delta sync for change tracking.
- `GET /api/media/events?sessionToken=...` → SSE stream pushing delta updates.

### Playback
- `GET /api/media/stream/:id` → resolves `@microsoft.graph.downloadUrl` for low-latency HTML5 playback.

## 4) OneDrive Graph API Integration

Real Microsoft Graph endpoints used:
- OAuth authorize: `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize`
- OAuth token: `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token`
- List children: `GET /me/drive/items/{id}/children`
- Search: `GET /me/drive/root/search(q='...')`
- Delta: `GET /me/drive/root/delta`
- Stream item detail: `GET /me/drive/items/{id}`

All calls are centralized in `src/services/graphService.js` with concurrency limiting and error surfacing.

## 5) Media Player Implementation

- Video: native HTML5 `<video controls>` backed directly by Graph download URL.
- Resume playback persisted in `localStorage` using `resume:{itemId}` keys.
- Image preview: modal `<img>` with responsive sizing.
- PDF preview: modal `<iframe>`.

## 6) Caching & Performance Strategy

- Redis-first metadata cache with in-memory fallback (zero downtime).
- Cached full library snapshot (`media:library`) with configurable TTL.
- Graph traversal uses bounded concurrency (`p-limit`) for high-volume libraries.
- Delta sync endpoint avoids full rescans.
- Lazy-loaded thumbnails (`loading="lazy"`) and progressive skeleton render.
- Fastify rate-limits and strict CSP/headers for secure low-latency operation.

## 7) Deployment Strategy

- Containerize Fastify service (Node 20+) and run on Azure Container Apps / App Service.
- Attach Azure Cache for Redis for shared cache across replicas.
- Use horizontal autoscaling based on CPU + request latency.
- Frontend served by same Fastify instance or split to CDN/static hosting.
- Configure reverse proxy/CDN with cache-control for static assets.

## 8) Quality Targets Mapping

- **Sub-200ms API**: cache hits served from Redis/in-memory; no full scan on every request.
- **60fps UI**: lightweight vanilla JS, CSS transitions, lazy image loading.
- **100k+ files**: paginated Graph traversal + concurrency bounds + delta refresh.
- **Fail-safe refresh**: automatic token refresh in pre-handler before Graph calls.
- **Enterprise errors**: centralized Fastify error handler with structured messages.
