import { queueRepository }  from './queue.repository.js';
import { redis }            from '../../config/redis.js';
import type {
  OpenSessionInput,
  GiveTokenInput,
  MarkFeeInput,
  DoctorBreakInput,
  UpdateNotesInput,
} from './queue.schema.js';

export const queueService = {

  // ─── OPEN SESSION ─────────────────────────────────────────

  async openSession(tenantId: string, input: OpenSessionInput) {
    const session = await queueRepository.openSession({
      tenant_id:     tenantId,
      doctor_id:     input.doctor_id,
      department_id: input.department_id,
      session_date:  input.session_date,
      max_tokens:    input.max_tokens,
    });
    return session;
  },

  // ─── CLOSE SESSION ────────────────────────────────────────

  async closeSession(sessionId: string) {
    const session = await queueRepository.closeSession(sessionId);
    if (!session) throw new Error('SESSION_NOT_FOUND');

    // publish to Redis → WebSocket clients will update
    await redis.publish(
      `queue:${sessionId}`,
      JSON.stringify({ event: 'session_closed', sessionId })
    );

    return session;
  },

  // ─── GIVE TOKEN (idempotency + race condition) ────────────

  async giveToken(tenantId: string, input: GiveTokenInput) {

    // idempotency check — prevent double click
    const idempotencyKey = `idempotency:${input.idempotency_key}`;
    const cached = await redis.get(idempotencyKey);
    if (cached) return JSON.parse(cached); // return same result

    // find patient by phone
    const patient = await queueRepository.findPatientByPhone(input.phone);
    if (!patient) throw new Error('PATIENT_NOT_FOUND');

    // give token (SELECT FOR UPDATE inside)
    const token = await queueRepository.giveToken({
      session_id: input.session_id,
      patient_id: patient.id,
      fee_amount: input.fee_amount,
    });

    // save idempotency result for 24 hours
    await redis.setex(idempotencyKey, 86400, JSON.stringify(token));

    // publish to Redis → notify all waiting clients
    await redis.publish(
      `queue:${input.session_id}`,
      JSON.stringify({
        event:           'token_issued',
        session_id:      input.session_id,
        token_number:    token.token_number,
        total_issued:    token.token_number,
      })
    );

    return { token, patient };
  },

  // ─── CALL NEXT TOKEN ──────────────────────────────────────

  async callNextToken(sessionId: string) {
    const token = await queueRepository.callNextToken(sessionId);

    // publish to Redis → all clients update
    await redis.publish(
      `queue:${sessionId}`,
      JSON.stringify({
        event:        'token_called',
        session_id:   sessionId,
        token_number: token.token_number,
        patient_id:   token.patient_id,
      })
    );

    return token;
  },

  // ─── SKIP TOKEN ───────────────────────────────────────────

  async skipToken(tokenId: string, sessionId: string) {
    const token = await queueRepository.skipToken(tokenId);
    if (!token) throw new Error('TOKEN_NOT_FOUND');

    // publish skip event
    await redis.publish(
      `queue:${sessionId}`,
      JSON.stringify({ event: 'token_skipped', tokenId })
    );

    return token;
  },

  // ─── COMPLETE TOKEN ───────────────────────────────────────

  async completeToken(tokenId: string, sessionId: string) {
    const token = await queueRepository.completeToken(tokenId);
    if (!token) throw new Error('TOKEN_NOT_FOUND');

    // publish complete event
    await redis.publish(
      `queue:${sessionId}`,
      JSON.stringify({ event: 'token_completed', tokenId })
    );

    return token;
  },

  // ─── MARK FEE PAID ────────────────────────────────────────

  async markFeePaid(tokenId: string, input: MarkFeeInput) {
    const token = await queueRepository.markFeePaid(tokenId, input.fee_amount);
    if (!token) throw new Error('TOKEN_NOT_FOUND');
    return token;
  },

  // ─── UPDATE NOTES (optimistic locking) ────────────────────

  async updateNotes(tokenId: string, input: UpdateNotesInput) {
    const token = await queueRepository.updateNotes(
      tokenId,
      input.notes,
      input.notes_version
    );

    // null means version mismatch → conflict
    if (!token) throw new Error('VERSION_CONFLICT');
    return token;
  },

  // ─── DOCTOR BREAK ─────────────────────────────────────────

  async startBreak(sessionId: string, doctorId: string, input: DoctorBreakInput) {
    const breakRecord = await queueRepository.startBreak({
      session_id:        sessionId,
      doctor_id:         doctorId,
      expected_duration: input.expected_duration,
    });

    // publish break event → all clients see "Doctor on break"
    await redis.publish(
      `queue:${sessionId}`,
      JSON.stringify({
        event:             'doctor_break_started',
        session_id:        sessionId,
        expected_duration: input.expected_duration,
      })
    );

    return breakRecord;
  },

  async endBreak(breakId: string, sessionId: string) {
    const breakRecord = await queueRepository.endBreak(breakId);
    if (!breakRecord) throw new Error('BREAK_NOT_FOUND');

    // publish break ended → queue resumes
    await redis.publish(
      `queue:${sessionId}`,
      JSON.stringify({
        event:      'doctor_break_ended',
        session_id: sessionId,
      })
    );

    return breakRecord;
  },

  // ─── GET STATUS ───────────────────────────────────────────

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
};