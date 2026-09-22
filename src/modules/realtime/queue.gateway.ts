import { io } from './socket.server.js';
import { redis } from '../../config/redis.js';

// subscribe to Redis channels and forward to Socket.io
export const initQueueGateway = async () => {
  const subscriber = redis.duplicate();

  // subscribe to all queue channels
  await subscriber.psubscribe('queue:*');

  subscriber.on('pmessage', (pattern, channel, message) => {
    const sessionId = channel.replace('queue:', '');
    const data = JSON.parse(message);

    // forward to all clients in that session room
    const room = `session:${sessionId}`;

    switch (data.event) {
      case 'token_issued':
        io.to(room).emit('queue:token_issued', {
          token_number: data.token_number,
          total_issued: data.total_issued,
          session_id: sessionId,
        });
        break;

      case 'token_called':
        io.to(room).emit('queue:token_called', {
          token_number: data.token_number,
          patient_id: data.patient_id,
          session_id: sessionId,
        });
        break;

      case 'token_skipped':
        io.to(room).emit('queue:token_skipped', {
          token_id: data.tokenId,
          session_id: sessionId,
        });
        break;

      case 'token_completed':
        io.to(room).emit('queue:token_completed', {
          token_id: data.tokenId,
          session_id: sessionId,
        });
        break;

      case 'session_closed':
        io.to(room).emit('queue:session_closed', {
          session_id: sessionId,
          message: 'Queue is now closed for today',
        });
        break;

      case 'doctor_break_started':
        io.to(room).emit('queue:break_started', {
          session_id: sessionId,
          expected_duration: data.expected_duration,
          message: `Doctor is on a ${data.expected_duration} minute break`,
        });
        break;

      case 'doctor_break_ended':
        io.to(room).emit('queue:break_ended', {
          session_id: sessionId,
          message: 'Doctor is back. Queue resuming.',
        });
        break;

      default:
        console.log(`Unknown queue event: ${data.event}`);
    }
  });

  console.log('✅ Queue gateway initialized');
};