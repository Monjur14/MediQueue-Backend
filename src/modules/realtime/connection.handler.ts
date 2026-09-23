import type { Socket } from 'socket.io';
import { jwtUtil }     from '../../utils/jwt.js';

export const handleConnection = (socket: Socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('join:session', async (data: {
    sessionId: string;
    token?:    string;
  }) => {
    const room = `session:${data.sessionId}`;
    socket.join(room);
    console.log(`📺 Client ${socket.id} joined room: ${room}`);

    // if token provided → verify and join personal room
    if (data.token) {
      try {
        const decoded = jwtUtil.verifyAccessToken(data.token);
        socket.data.user = decoded;

        // join personal room for targeted ETA updates
        const personalRoom = `patient:${decoded.userId}`;
        socket.join(personalRoom);
        console.log(`👤 Patient joined personal room: ${personalRoom}`);

      } catch {
        console.log(`⚠️ Invalid token — joined as anonymous`);
      }
    }

    socket.emit('joined:session', {
      sessionId: data.sessionId,
      message:   'Successfully joined queue session',
    });
  });

  socket.on('leave:session', (data: { sessionId: string }) => {
    const room = `session:${data.sessionId}`;
    socket.leave(room);
    console.log(`👋 Client ${socket.id} left room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
};