import { queueRepository } from './queue.repository.js';
import { redis } from '../../config/redis.js';
import { noShowQueue } from '../../config/bullmq.js';
import { pool } from '../../config/database.js';
import { calculateETAs } from '../../utils/eta.js';
import type {
  OpenSessionInput,
  GiveTokenInput,
  MarkFeeInput,
  DoctorBreakInput,
  UpdateNotesInput,
} from './queue.schema.js';

// ─── STANDALONE ETA RECALCULATOR ─────────────────────────────
// extracted outside queueService so it can be called internally

const recalculateETAs = async (sessionId: string) => {
  const [waitingTokens, avgTime, breakTimeRemaining] = await Promise.all([
    queueRepository.getWaitingTokens(sessionId),
    queueRepository.getAvgConsultationTime(sessionId),
    queueRepository.getActiveBreak(sessionId),
  ]);

  const etas = calculateETAs(
    waitingTokens,
    avgTime,
    breakTimeRemaining ?? 0,
  );

  await redis.publish(
    `queue:${sessionId}`,
    JSON.stringify({
      event: 'eta_update',
      session_id: sessionId,
      etas,
      avg_consultation_time: avgTime ?? 10,
      waiting_count: waitingTokens.length,
    })
  );

  return etas;
};

// ─── QUEUE SERVICE ────────────────────────────────────────────

export const queueService = {

  async openSession(tenantId: string, input: OpenSessionInput) {
    const session = await queueRepository.openSession({
      tenant_id: tenantId,
      doctor_id: input.doctor_id,
      department_id: input.department_id,
      session_date: input.session_date,
      max_tokens: input.max_tokens,
    });
    return session;
  },

  async closeSession(sessionId: string) {
    const session = await queueRepository.closeSession(sessionId);
    if (!session) throw new Error('SESSION_NOT_FOUND');

    await redis.publish(
      `queue:${sessionId}`,
      JSON.stringify({ event: 'session_closed', sessionId })
    );

    return session;
  },

  async giveToken(tenantId: string, input: GiveTokenInput) {
    const idempotencyKey = `idempotency:${input.idempotency_key}`;
    const cached = await redis.get(idempotencyKey);
    if (cached) return JSON.parse(cached);

    const patient = await queueRepository.findPatientByPhone(input.phone);
    if (!patient) throw new Error('PATIENT_NOT_FOUND');

    const token = await queueRepository.giveToken({
      session_id: input.session_id,
      patient_id: patient.id,
      fee_amount: input.fee_amount,
    });

    await redis.setex(idempotencyKey, 86400, JSON.stringify(token));

    await redis.publish(
      `queue:${input.session_id}`,
      JSON.stringify({
        event: 'token_issued',
        session_id: input.session_id,
        token_number: token.token_number,
        total_issued: token.token_number,
      })
    );

    return { token, patient };
  },

  async callNextToken(sessionId: string) {
    const token = await queueRepository.callNextToken(sessionId);

    const patientResult = await pool.query(
      `SELECT phone FROM users WHERE id = $1`,
      [token.patient_id]
    );

    await noShowQueue.add(
      'check-noshow',
      {
        tokenId: token.id,
        sessionId,
        patientId: token.patient_id,
        phone: patientResult.rows[0]?.phone ?? null,
      },
      {
        delay: 5 * 60 * 1000,
        jobId: `noshow-${token.id}`,
        attempts: 3,
      }
    );

    await redis.publish(
      `queue:${sessionId}`,
      JSON.stringify({
        event: 'token_called',
        session_id: sessionId,
        token_number: token.token_number,
        patient_id: token.patient_id,
      })
    );

    await recalculateETAs(sessionId); // ← direct call now

    return token;
  },

  async checkinToken(tokenId: string, sessionId: string) {
    const token = await queueRepository.checkinToken(tokenId);
    if (!token) throw new Error('TOKEN_NOT_FOUND');

    await redis.publish(
      `queue:${sessionId}`,
      JSON.stringify({
        event: 'token_checkin',
        tokenId,
        session_id: sessionId,
      })
    );

    return token;
  },

  async skipToken(tokenId: string, sessionId: string) {
    const token = await queueRepository.skipToken(tokenId);
    if (!token) throw new Error('TOKEN_NOT_FOUND');

    await redis.publish(
      `queue:${sessionId}`,
      JSON.stringify({ event: 'token_skipped', tokenId })
    );

    await recalculateETAs(sessionId); // ← direct call

    return token;
  },

  async completeToken(tokenId: string, sessionId: string) {
    const token = await queueRepository.completeToken(tokenId);
    if (!token) throw new Error('TOKEN_NOT_FOUND');

    await redis.publish(
      `queue:${sessionId}`,
      JSON.stringify({ event: 'token_completed', tokenId })
    );

    await recalculateETAs(sessionId); // ← direct call

    return token;
  },

  async markFeePaid(tokenId: string, input: MarkFeeInput) {
    const token = await queueRepository.markFeePaid(tokenId, input.fee_amount);
    if (!token) throw new Error('TOKEN_NOT_FOUND');
    return token;
  },

  async updateNotes(tokenId: string, input: UpdateNotesInput) {
    const token = await queueRepository.updateNotes(
      tokenId,
      input.notes,
      input.notes_version
    );
    if (!token) throw new Error('VERSION_CONFLICT');
    return token;
  },

  async startBreak(sessionId: string, doctorId: string, input: DoctorBreakInput) {
    const breakRecord = await queueRepository.startBreak({
      session_id: sessionId,
      doctor_id: doctorId,
      expected_duration: input.expected_duration,
    });

    await redis.publish(
      `queue:${sessionId}`,
      JSON.stringify({
        event: 'doctor_break_started',
        session_id: sessionId,
        expected_duration: input.expected_duration,
      })
    );

    await recalculateETAs(sessionId); // ← direct call

    return breakRecord;
  },

  async endBreak(breakId: string, sessionId: string) {
    const breakRecord = await queueRepository.endBreak(breakId);
    if (!breakRecord) throw new Error('BREAK_NOT_FOUND');

    await redis.publish(
      `queue:${sessionId}`,
      JSON.stringify({
        event: 'doctor_break_ended',
        session_id: sessionId,
      })
    );

    await recalculateETAs(sessionId); // ← direct call

    return breakRecord;
  },

  async getSessionStatus(sessionId: string) {
    const status = await queueRepository.getSessionStatus(sessionId);
    if (!status) throw new Error('SESSION_NOT_FOUND');
    return status;
  },

  async getTodaySessions(tenantId: string) {
    return queueRepository.getTodaySessionsByTenant(tenantId);
  },

  async getMyToken(sessionId: string, patientId: string) {
    const token = await queueRepository.getPatientToken(sessionId, patientId);
    if (!token) throw new Error('TOKEN_NOT_FOUND');
    return token;
  },

  // expose recalculateETAs publicly so noShow worker can call it
  recalculateETAs,
};