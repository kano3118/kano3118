const state = {
  token: localStorage.getItem('sessionToken'),
  media: [],
  filter: ''
};

const grid = document.querySelector('#grid');
const stats = document.querySelector('#stats');
const loginBtn = document.querySelector('#loginBtn');
const searchInput = document.querySelector('#searchInput');
const modal = document.querySelector('#previewModal');
const previewBody = document.querySelector('#previewBody');

authButtonState();
if (state.token) loadLibrary();
renderSkeletons();

loginBtn.addEventListener('click', async () => {
  if (state.token) {
    localStorage.removeItem('sessionToken');
    state.token = null;
    state.media = [];
    render();
    authButtonState();
    return;
  }

  const response = await fetch('/api/auth/login');
  const data = await response.json();
  window.location.href = data.authorizeUrl;
});

searchInput.addEventListener('input', () => {
  state.filter = searchInput.value.trim().toLowerCase();
  render();
});

document.querySelector('#closeModal').addEventListener('click', () => modal.close());

function authButtonState() {
  loginBtn.textContent = state.token ? 'Disconnect' : 'Connect OneDrive';
}

function renderSkeletons() {
  if (state.media.length) return;
  grid.innerHTML = '';
  const template = document.querySelector('#skeletonTemplate');
  for (let i = 0; i < 8; i += 1) {
    grid.appendChild(template.content.cloneNode(true));
  }
}

function formatBytes(bytes = 0) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
}

function render() {
  const filtered = state.media.filter((m) => {
    if (!state.filter) return true;
    return m.name.toLowerCase().includes(state.filter) || m.mediaType.includes(state.filter);
  });

  stats.innerHTML = [
    ['Total', filtered.length],
    ['Videos', filtered.filter((m) => m.mediaType === 'video').length],
    ['Images', filtered.filter((m) => m.mediaType === 'image').length],
    ['Docs', filtered.filter((m) => m.mediaType === 'document').length]
  ].map(([k, v]) => `<span class="pill">${k}: ${v}</span>`).join('');

  grid.innerHTML = filtered.map((item) => `
    <article class="card" data-id="${item.id}">
      ${item.thumbnailUrl ? `<img class="thumb" loading="lazy" src="${item.thumbnailUrl}" alt="${item.name}"/>` : '<div class="thumb"></div>'}
      <div class="meta">
        <div class="name">${item.name}</div>
        <div class="sub">${item.mediaType.toUpperCase()} · ${formatBytes(item.size)}</div>
      </div>
    </article>
  `).join('');

  for (const card of grid.querySelectorAll('.card')) {
    card.addEventListener('click', () => openPreview(card.dataset.id));
  }
}

async function loadLibrary() {
  renderSkeletons();
  const response = await fetch('/api/media/library', {
    headers: { Authorization: `Bearer ${state.token}` }
  });

  if (response.status === 401) {
    localStorage.removeItem('sessionToken');
    state.token = null;
    authButtonState();
    render();
    return;
  }

  state.media = await response.json();
  render();
  startEventStream();
}

function startEventStream() {
  const eventSource = new EventSource(`/api/media/events?sessionToken=${encodeURIComponent(state.token)}`);
  eventSource.onmessage = (event) => {
    const payload = JSON.parse(event.data);
    if (payload.items?.length) {
      loadLibrary();
    }
  };
  eventSource.onerror = () => eventSource.close();
}

async function openPreview(id) {
  const item = state.media.find((m) => m.id === id);
  if (!item) return;

  if (item.mediaType === 'video') {
    const response = await fetch(`/api/media/stream/${id}`, { headers: { Authorization: `Bearer ${state.token}` } });
    const stream = await response.json();
    const resumeKey = `resume:${id}`;
    previewBody.innerHTML = `<video controls autoplay src="${stream.downloadUrl}"></video>`;
    const video = previewBody.querySelector('video');
    video.currentTime = Number(localStorage.getItem(resumeKey) || 0);
    video.addEventListener('timeupdate', () => localStorage.setItem(resumeKey, video.currentTime.toString()));
  } else if (item.mediaType === 'image') {
    previewBody.innerHTML = `<img src="${item.downloadUrl}" alt="${item.name}"/>`;
  } else {
    previewBody.innerHTML = `<iframe src="${item.downloadUrl}"></iframe>`;
  }
  modal.showModal();
}
