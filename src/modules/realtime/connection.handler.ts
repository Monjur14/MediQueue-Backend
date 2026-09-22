import type { Socket } from 'socket.io';
import { jwtUtil } from '../../utils/jwt.js';

export const handleConnection = (socket: Socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // join a queue session room
  // client sends: socket.emit('join:session', { sessionId, token? })
  socket.on('join:session', async (data: { sessionId: string; token?: string }) => {
    const room = `session:${data.sessionId}`;
    socket.join(room);
    console.log(`📺 Client ${socket.id} joined room: ${room}`);

    // if token provided → verify and attach user
    if (data.token) {
      try {
        const decoded = jwtUtil.verifyAccessToken(data.token);
        socket.data.user = decoded;
        console.log(`👤 Authenticated user in room: ${decoded.userId}`);
      } catch {
        console.log(`⚠️ Invalid token — joined as anonymous`);
      }
    }

    // confirm join
    socket.emit('joined:session', {
      sessionId: data.sessionId,
      message: 'Successfully joined queue session',
    });
  });

  // leave a session room
  socket.on('leave:session', (data: { sessionId: string }) => {
    const room = `session:${data.sessionId}`;
    socket.leave(room);
    console.log(`👋 Client ${socket.id} left room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
};