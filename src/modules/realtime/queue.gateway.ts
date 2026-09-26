import { io }   from './socket.server.js';
import { redis } from '../../config/redis.js';

export const initQueueGateway = async () => {
  const subscriber = redis.duplicate();
  await subscriber.psubscribe('queue:*');

  subscriber.on('pmessage', (_pattern, channel, message) => {
    const sessionId = channel.replace('queue:', '');
    const data      = JSON.parse(message) as Record<string, unknown>;
    const room      = `session:${sessionId}`;

    switch (data['event']) {

      case 'token_issued':
        io.to(room).emit('queue:token_issued', {
          token_number: data['token_number'],
          total_issued: data['total_issued'],
          session_id:   sessionId,
        });
        break;

      case 'token_called':
        // Broadcast to session room (doctor / admin / all patients see current token change)
        io.to(room).emit('queue:token_called', {
          token_number: data['token_number'],
          patient_id:   data['patient_id'],
          session_id:   sessionId,
        });
        // Also notify the called patient directly — they may have left the session room
        // or need an immediate status change without waiting for the ETA recalc
        io.to(`patient:${data['patient_id']}`).emit('queue:you_are_called', {
          session_id:   sessionId,
          token_number: data['token_number'],
        });
        break;

      case 'token_skipped':
        io.to(room).emit('queue:token_skipped', {
          token_id:   data['tokenId'],
          session_id: sessionId,
        });
        // Notify the skipped patient directly
        if (data['patient_id']) {
          io.to(`patient:${data['patient_id']}`).emit('queue:you_were_skipped', {
            session_id: sessionId,
          });
        }
        break;

      case 'token_completed':
        io.to(room).emit('queue:token_completed', {
          token_id:   data['tokenId'],
          session_id: sessionId,
        });
        break;

      case 'token_checkin':
        io.to(room).emit('queue:token_checkin', {
          token_id:   data['tokenId'],
          session_id: sessionId,
        });
        break;

      case 'session_closed':
        io.to(room).emit('queue:session_closed', {
          session_id: sessionId,
        });
        break;

      case 'session_reopened':
        io.to(room).emit('queue:session_reopened', {
          session_id: sessionId,
        });
        break;

      case 'doctor_break_started':
        io.to(room).emit('queue:break_started', {
          session_id:        sessionId,
          expected_duration: data['expected_duration'],
          break_started_at:  new Date().toISOString(),
        });
        break;

      case 'doctor_break_ended':
        io.to(room).emit('queue:break_ended', {
          session_id: sessionId,
        });
        break;

      case 'eta_update':
        handleETAUpdate(sessionId, data);
        break;

      default:
        break;
    }
  });

  console.log('✅ Queue gateway initialized');
};

// ─── ETA UPDATE — emit to every patient's personal room ───────────
// No batching delay — queue position updates must be immediate.
// The thundering-herd concern is mitigated by routing to personal rooms
// instead of broadcasting to the session room.

const handleETAUpdate = (
  sessionId: string,
  data:      Record<string, unknown>,
) => {
  type ETAEntry = { patient_id: string; token_number: number; eta_minutes: number };
  const etas = (data['etas'] as ETAEntry[]) ?? [];
  const avgTime     = data['avg_consultation_time'] as number;
  const waitingCount = data['waiting_count'] as number;

  etas.forEach((eta, index) => {
    io.to(`patient:${eta.patient_id}`).emit('queue:eta_update', {
      session_id:            sessionId,
      eta_minutes:           eta.eta_minutes,
      patients_ahead:        index,          // 0 = next up, 1 = one person ahead, etc.
      avg_consultation_time: avgTime,
      waiting_count:         waitingCount,
    });
  });
};
