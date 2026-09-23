import { io }   from './socket.server.js';
import { redis } from '../../config/redis.js';

// store batch update timers per session
const batchTimers = new Map<string, NodeJS.Timeout>();

const PRIORITY_WINDOW  = 5;  // notify top 5 immediately
const BATCH_DELAY_MS   = 30 * 1000; // 30 seconds for rest

export const initQueueGateway = async () => {
  const subscriber = redis.duplicate();
  await subscriber.psubscribe('queue:*');

  subscriber.on('pmessage', (pattern, channel, message) => {
    const sessionId = channel.replace('queue:', '');
    const data      = JSON.parse(message);
    const room      = `session:${sessionId}`;

    switch (data.event) {

      case 'token_issued':
        io.to(room).emit('queue:token_issued', {
          token_number: data.token_number,
          total_issued: data.total_issued,
          session_id:   sessionId,
        });
        break;

      case 'token_called':
        io.to(room).emit('queue:token_called', {
          token_number: data.token_number,
          patient_id:   data.patient_id,
          session_id:   sessionId,
        });
        break;

      case 'token_skipped':
        io.to(room).emit('queue:token_skipped', {
          token_id:   data.tokenId,
          session_id: sessionId,
        });
        break;

      case 'token_completed':
        io.to(room).emit('queue:token_completed', {
          token_id:   data.tokenId,
          session_id: sessionId,
        });
        break;

      case 'token_checkin':
        io.to(room).emit('queue:token_checkin', {
          token_id:   data.tokenId,
          session_id: sessionId,
        });
        break;

      case 'session_closed':
        io.to(room).emit('queue:session_closed', {
          session_id: sessionId,
          message:    'Queue is now closed for today',
        });
        break;

      case 'doctor_break_started':
        io.to(room).emit('queue:break_started', {
          session_id:        sessionId,
          expected_duration: data.expected_duration,
          message:           `Doctor is on a ${data.expected_duration} minute break`,
        });
        break;

      case 'doctor_break_ended':
        io.to(room).emit('queue:break_ended', {
          session_id: sessionId,
          message:    'Doctor is back. Queue resuming.',
        });
        break;

      // ─── THUNDERING HERD FIX ──────────────────────────────
      case 'eta_update':
        handleETAUpdate(sessionId, room, data);
        break;

      default:
        console.log(`Unknown queue event: ${data.event}`);
    }
  });

  console.log('✅ Queue gateway initialized');
};

// ─── THUNDERING HERD HANDLER ──────────────────────────────────

const handleETAUpdate = (
  sessionId: string,
  room:      string,
  data:      any
) => {
  const etas: Array<{ patient_id: string; token_number: number; eta_minutes: number }> = data.etas ?? [];

  // split into priority and non-priority
  const priorityETAs    = etas.slice(0, PRIORITY_WINDOW);   // top 5
  const nonPriorityETAs = etas.slice(PRIORITY_WINDOW);       // rest

  // immediately notify top 5 patients
  priorityETAs.forEach((eta) => {
    // emit to specific patient's room
    io.to(`patient:${eta.patient_id}`).emit('queue:eta_update', {
      session_id:            sessionId,
      eta_minutes:           eta.eta_minutes,
      token_number:          eta.token_number,
      priority:              true,
      avg_consultation_time: data.avg_consultation_time,
      waiting_count:         data.waiting_count,
    });
  });

  // batch update for non-priority patients
  // cancel existing timer if any
  const existingTimer = batchTimers.get(sessionId);
  if (existingTimer) clearTimeout(existingTimer);

  // schedule batch update after 30 seconds
  const timer = setTimeout(() => {
    nonPriorityETAs.forEach((eta) => {
      io.to(`patient:${eta.patient_id}`).emit('queue:eta_update', {
        session_id:            sessionId,
        eta_minutes:           eta.eta_minutes,
        token_number:          eta.token_number,
        priority:              false,
        avg_consultation_time: data.avg_consultation_time,
        waiting_count:         data.waiting_count,
      });
    });

    batchTimers.delete(sessionId);
  }, BATCH_DELAY_MS);

  batchTimers.set(sessionId, timer);
};