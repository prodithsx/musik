import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(express.static(join(__dirname, 'public')));

const state = {
  videoId: null,
  isPlaying: false,
  currentTime: 0,
  updatedAt: Date.now(),
};

let userCount = 0;

function getProjectedTime() {
  if (!state.isPlaying) return state.currentTime;
  return state.currentTime + (Date.now() - state.updatedAt) / 1000;
}

io.on('connection', (socket) => {
  userCount++;
  io.emit('userCount', { count: userCount });

  socket.emit('state', {
    videoId: state.videoId,
    isPlaying: state.isPlaying,
    currentTime: getProjectedTime(),
  });

  socket.on('loadVideo', ({ videoId }) => {
    if (typeof videoId !== 'string' || videoId.length > 32) return;
    state.videoId = videoId;
    state.isPlaying = true;
    state.currentTime = 0;
    state.updatedAt = Date.now();
    socket.broadcast.emit('loadVideo', { videoId });
  });

  socket.on('play', ({ currentTime }) => {
    if (typeof currentTime !== 'number') return;
    state.isPlaying = true;
    state.currentTime = currentTime;
    state.updatedAt = Date.now();
    socket.broadcast.emit('play', { currentTime });
  });

  socket.on('pause', ({ currentTime }) => {
    if (typeof currentTime !== 'number') return;
    state.isPlaying = false;
    state.currentTime = currentTime;
    state.updatedAt = Date.now();
    socket.broadcast.emit('pause', { currentTime });
  });

  socket.on('seek', ({ currentTime }) => {
    if (typeof currentTime !== 'number') return;
    state.currentTime = currentTime;
    state.updatedAt = Date.now();
    socket.broadcast.emit('seek', { currentTime });
  });

  socket.on('disconnect', () => {
    userCount = Math.max(0, userCount - 1);
    io.emit('userCount', { count: userCount });
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Musik server listening on http://localhost:${PORT}`);
});
