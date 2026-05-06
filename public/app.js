const socket = io();

let player = null;
let playerReady = false;
let applyingRemote = false;
let pendingState = null;
let lastTickTime = null;
let userJoined = false;

const dot = document.getElementById('connection-dot');
const userCountEl = document.getElementById('user-count');
const urlInput = document.getElementById('url-input');
const loadBtn = document.getElementById('load-btn');
const emptyState = document.getElementById('empty-state');
const joinOverlay = document.getElementById('join-overlay');
const joinBtn = document.getElementById('join-btn');

joinBtn.addEventListener('click', () => {
  userJoined = true;
  joinOverlay.classList.add('hidden');
  const stateToApply = pendingState;
  pendingState = null;
  if (stateToApply) applyState(stateToApply);
});

// --- Load YouTube IFrame API ---
const tag = document.createElement('script');
tag.src = 'https://www.youtube.com/iframe_api';
document.head.appendChild(tag);

window.onYouTubeIframeAPIReady = () => {
  player = new YT.Player('player', {
    height: '100%',
    width: '100%',
    videoId: '',
    playerVars: { playsinline: 1, rel: 0 },
    events: {
      onReady: () => {
        playerReady = true;
        window.__musikPlayer = player;
        const stateToApply = pendingState;
        pendingState = null;
        if (stateToApply) applyState(stateToApply);
      },
      onStateChange: onPlayerStateChange,
    },
  });
};

function onPlayerStateChange(event) {
  if (applyingRemote) return;
  if (!playerReady) return;

  const time = player.getCurrentTime();
  if (event.data === YT.PlayerState.PLAYING) {
    socket.emit('play', { currentTime: time });
  } else if (event.data === YT.PlayerState.PAUSED) {
    socket.emit('pause', { currentTime: time });
  }
}

// --- Extract YouTube video ID ---
function extractVideoId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/|youtube\.com\/v\/)([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  if (/^[\w-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

// --- Apply remote state ---
function applyState(state) {
  if (!playerReady || !userJoined) {
    pendingState = state;
    return;
  }
  if (!state.videoId) return;

  applyingRemote = true;
  player.loadVideoById({
    videoId: state.videoId,
    startSeconds: state.currentTime || 0,
  });
  emptyState.style.display = 'none';

  if (!state.isPlaying) {
    setTimeout(() => {
      player.pauseVideo();
      applyingRemote = false;
    }, 800);
  } else {
    setTimeout(() => { applyingRemote = false; }, 1200);
  }
}

// --- UI handlers ---
loadBtn.addEventListener('click', () => {
  if (!userJoined || !playerReady) {
    flashError(urlInput);
    return;
  }
  const url = urlInput.value.trim();
  const id = extractVideoId(url);
  if (!id) {
    flashError(urlInput);
    return;
  }
  socket.emit('loadVideo', { videoId: id });

  applyingRemote = true;
  player.loadVideoById(id);
  emptyState.style.display = 'none';
  setTimeout(() => { applyingRemote = false; }, 1000);
  urlInput.value = '';
});

urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loadBtn.click();
});

function flashError(el) {
  el.classList.add('error');
  setTimeout(() => el.classList.remove('error'), 600);
}

// --- Socket events ---
socket.on('connect', () => {
  dot.classList.add('connected');
  dot.title = 'Connecté';
});

socket.on('disconnect', () => {
  dot.classList.remove('connected');
  dot.title = 'Déconnecté';
});

socket.on('state', applyState);

socket.on('loadVideo', ({ videoId }) => {
  if (!playerReady || !userJoined) {
    pendingState = { videoId, isPlaying: true, currentTime: 0 };
    return;
  }
  applyingRemote = true;
  player.loadVideoById(videoId);
  emptyState.style.display = 'none';
  setTimeout(() => { applyingRemote = false; }, 1000);
});

socket.on('play', ({ currentTime }) => {
  if (!playerReady || !userJoined) return;
  applyingRemote = true;
  player.seekTo(currentTime, true);
  player.playVideo();
  setTimeout(() => { applyingRemote = false; }, 800);
});

socket.on('pause', ({ currentTime }) => {
  if (!playerReady || !userJoined) return;
  applyingRemote = true;
  player.seekTo(currentTime, true);
  player.pauseVideo();
  setTimeout(() => { applyingRemote = false; }, 800);
});

socket.on('seek', ({ currentTime }) => {
  if (!playerReady || !userJoined) return;
  applyingRemote = true;
  player.seekTo(currentTime, true);
  setTimeout(() => { applyingRemote = false; }, 800);
});

socket.on('userCount', ({ count }) => {
  userCountEl.textContent = `🎧 ${count}`;
});

// --- Seek detection (every 1s while playing) ---
setInterval(() => {
  if (!playerReady || applyingRemote) {
    lastTickTime = null;
    return;
  }
  if (player.getPlayerState() !== YT.PlayerState.PLAYING) {
    lastTickTime = null;
    return;
  }
  const now = player.getCurrentTime();
  if (lastTickTime !== null) {
    const delta = now - lastTickTime;
    // Expected ~1s; jump > 1.5s means user seeked
    if (delta < -0.5 || delta > 2.5) {
      socket.emit('seek', { currentTime: now });
    }
  }
  lastTickTime = now;
}, 1000);
