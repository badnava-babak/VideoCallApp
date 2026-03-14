const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Serve built client in production
app.use(express.static(path.join(__dirname, '../client/dist')));

// roomId -> [socketId, ...]
const rooms = new Map();

io.on('connection', (socket) => {
  socket.on('join-room', (roomId) => {
    const peers = rooms.get(roomId) ?? [];

    if (peers.length >= 2) {
      socket.emit('room-full');
      return;
    }

    peers.push(socket.id);
    rooms.set(roomId, peers);
    socket.join(roomId);

    // isInitiator = first person in the room (they wait and create the offer)
    socket.emit('joined', { isInitiator: peers.length === 1 });

    if (peers.length === 2) {
      // Tell the first peer to start the WebRTC handshake
      socket.to(roomId).emit('peer-joined');
    }
  });

  socket.on('offer', ({ roomId, offer }) => socket.to(roomId).emit('offer', offer));
  socket.on('answer', ({ roomId, answer }) => socket.to(roomId).emit('answer', answer));
  socket.on('ice-candidate', ({ roomId, candidate }) => socket.to(roomId).emit('ice-candidate', candidate));

  socket.on('disconnecting', () => {
    for (const roomId of socket.rooms) {
      if (!rooms.has(roomId)) continue;
      const remaining = rooms.get(roomId).filter((id) => id !== socket.id);
      if (remaining.length === 0) {
        rooms.delete(roomId);
      } else {
        rooms.set(roomId, remaining);
        socket.to(roomId).emit('peer-left');
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server → http://localhost:${PORT}`));
