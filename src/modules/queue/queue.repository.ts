import { pool } from '../../config/database.js';
import { redis } from '../../config/redis.js';

export const queueRepository = {

  // ─── SESSION ─────────────────────────────────────────────

  async openSession(data: {
    tenant_id:     string;
    doctor_id:     string;
    department_id: string;
    session_date:  string;
    max_tokens:    number;
  }) {
    const result = await pool.query(
      `INSERT INTO queue_sessions
        (tenant_id, doctor_id, department_id, session_date, max_tokens)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.tenant_id,
        data.doctor_id,
        data.department_id,
        data.session_date,
        data.max_tokens,
      ]
    );
    return result.rows[0];
  },

  async findSessionById(sessionId: string) {
    const result = await pool.query(
      `SELECT * FROM queue_sessions WHERE id = $1`,
      [sessionId]
    );
    return result.rows[0] ?? null;
  },

  async findTodaySession(doctorId: string, tenantId: string) {
    const result = await pool.query(
      `SELECT * FROM queue_sessions
       WHERE doctor_id = $1
       AND tenant_id = $2
       AND session_date = CURRENT_DATE
       AND status = 'open'`,
      [doctorId, tenantId]
    );
    return result.rows[0] ?? null;
  },

  async closeSession(sessionId: string) {
    const result = await pool.query(
      `UPDATE queue_sessions
       SET status = 'closed',
           closed_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [sessionId]
    );
    return result.rows[0] ?? null;
  },

  // ─── GIVE TOKEN (with SELECT FOR UPDATE) ─────────────────

  async giveToken(data: {
    session_id:  string;
    patient_id:  string;
    fee_amount:  number;
  }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // LOCK session row — prevents race condition
      const sessionResult = await client.query(
        `SELECT * FROM queue_sessions
         WHERE id = $1
         AND status = 'open'
         FOR UPDATE`,
        [data.session_id]
      );

      const session = sessionResult.rows[0];
      if (!session) throw new Error('SESSION_NOT_FOUND');

      // check queue is not full
      if (session.total_issued >= session.max_tokens) {
        throw new Error('QUEUE_FULL');
      }

      // check patient doesn't already have token today
      const existing = await client.query(
        `SELECT id FROM queue_tokens
         WHERE session_id = $1
         AND patient_id = $2`,
        [data.session_id, data.patient_id]
      );
      if (existing.rows[0]) throw new Error('ALREADY_HAS_TOKEN');

      // assign next token number
      const tokenNumber = session.total_issued + 1;

      // insert token
      const tokenResult = await client.query(
        `INSERT INTO queue_tokens
          (session_id, patient_id, token_number, fee_amount)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [data.session_id, data.patient_id, tokenNumber, data.fee_amount]
      );

      // update session total_issued
      await client.query(
        `UPDATE queue_sessions
         SET total_issued = total_issued + 1,
             updated_at   = NOW()
         WHERE id = $1`,
        [data.session_id]
      );

      await client.query('COMMIT');
      return tokenResult.rows[0];

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // ─── CALL NEXT TOKEN ─────────────────────────────────────

  async callNextToken(sessionId: string) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // lock session
      const sessionResult = await client.query(
        `SELECT * FROM queue_sessions
         WHERE id = $1
         AND status = 'open'
         FOR UPDATE`,
        [sessionId]
      );

      const session = sessionResult.rows[0];
      if (!session) throw new Error('SESSION_NOT_FOUND');

      // find next waiting token
      const nextToken = await client.query(
        `SELECT * FROM queue_tokens
         WHERE session_id = $1
         AND status = 'waiting'
         ORDER BY token_number ASC
         LIMIT 1`,
        [sessionId]
      );

      if (!nextToken.rows[0]) throw new Error('NO_WAITING_TOKENS');

      const token = nextToken.rows[0];

      // update token status to called
      await client.query(
        `UPDATE queue_tokens
         SET status    = 'called',
             called_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [token.id]
      );

      // update session current_token
      await client.query(
        `UPDATE queue_sessions
         SET current_token = $1,
             updated_at    = NOW()
         WHERE id = $2`,
        [token.token_number, sessionId]
      );

      await client.query('COMMIT');
      return token;

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // ─── SKIP TOKEN ──────────────────────────────────────────

  async skipToken(tokenId: string) {
    const result = await pool.query(
      `UPDATE queue_tokens
       SET status     = 'skipped',
           updated_at = NOW()
       WHERE id = $1
       AND status = 'called'
       RETURNING *`,
      [tokenId]
    );
    return result.rows[0] ?? null;
  },

  // ─── COMPLETE TOKEN ──────────────────────────────────────

  async completeToken(tokenId: string) {
    const result = await pool.query(
      `UPDATE queue_tokens
       SET status       = 'completed',
           completed_at = NOW(),
           updated_at   = NOW()
       WHERE id = $1
       AND status IN ('called', 'in_consultation')
       RETURNING *`,
      [tokenId]
    );
    return result.rows[0] ?? null;
  },

  // ─── MARK FEE PAID ───────────────────────────────────────

  async markFeePaid(tokenId: string, feeAmount: number) {
    const result = await pool.query(
      `UPDATE queue_tokens
       SET fee_paid   = TRUE,
           fee_amount = $1,
           fee_paid_at = NOW(),
           updated_at  = NOW()
       WHERE id = $2
       RETURNING *`,
      [feeAmount, tokenId]
    );
    return result.rows[0] ?? null;
  },

  // ─── UPDATE NOTES (optimistic locking) ───────────────────

  async updateNotes(tokenId: string, notes: string, version: number) {
    const result = await pool.query(
      `UPDATE queue_tokens
       SET notes         = $1,
           notes_version = notes_version + 1,
           updated_at    = NOW()
       WHERE id = $2
       AND notes_version = $3
       RETURNING *`,
      [notes, tokenId, version]
    );
    return result.rows[0] ?? null; // null = version mismatch
  },

  // ─── DOCTOR BREAK ────────────────────────────────────────

  async startBreak(data: {
    session_id:        string;
    doctor_id:         string;
    expected_duration: number;
  }) {
    const result = await pool.query(
      `INSERT INTO doctor_breaks
        (session_id, doctor_id, expected_duration)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.session_id, data.doctor_id, data.expected_duration]
    );
    return result.rows[0];
  },

  async endBreak(breakId: string) {
    const result = await pool.query(
      `UPDATE doctor_breaks
       SET ended_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [breakId]
    );
    return result.rows[0] ?? null;
  },

  // ─── QUEUE STATUS (public) ────────────────────────────────

  async getSessionStatus(sessionId: string) {
    const result = await pool.query(
      `SELECT
        qs.*,
        u.full_name  AS doctor_name,
        d.name       AS department_name,
        COUNT(qt.id) FILTER (WHERE qt.status = 'waiting')      AS waiting_count,
        COUNT(qt.id) FILTER (WHERE qt.status = 'completed')    AS completed_count,
        COUNT(qt.id) FILTER (WHERE qt.status = 'skipped')      AS skipped_count
       FROM queue_sessions qs
       INNER JOIN users u        ON u.id = qs.doctor_id
       INNER JOIN departments d  ON d.id = qs.department_id
       LEFT  JOIN queue_tokens qt ON qt.session_id = qs.id
       WHERE qs.id = $1
       GROUP BY qs.id, u.full_name, d.name`,
      [sessionId]
    );
    return result.rows[0] ?? null;
  },

  async getTodaySessionsByTenant(tenantId: string) {
    const result = await pool.query(
      `SELECT
        qs.id,
        qs.status,
        qs.max_tokens,
        qs.current_token,
        qs.total_issued,
        qs.session_date,
        u.full_name  AS doctor_name,
        d.name       AS department_name,
        COUNT(qt.id) FILTER (WHERE qt.status = 'waiting')   AS waiting_count,
        (qs.max_tokens - qs.total_issued)                    AS remaining_tokens
       FROM queue_sessions qs
       INNER JOIN users u         ON u.id = qs.doctor_id
       INNER JOIN departments d   ON d.id = qs.department_id
       LEFT  JOIN queue_tokens qt ON qt.session_id = qs.id
       WHERE qs.tenant_id   = $1
       AND qs.session_date  = CURRENT_DATE
       GROUP BY qs.id, u.full_name, d.name
       ORDER BY d.name ASC`,
      [tenantId]
    );
    return result.rows;
  },

  // ─── PATIENT TOKEN STATUS ────────────────────────────────

  async getPatientToken(sessionId: string, patientId: string) {
    const result = await pool.query(
      `SELECT
        qt.*,
        qt.token_number                                        AS my_token,
        COUNT(ahead.id)                                        AS patients_ahead
       FROM queue_tokens qt
       LEFT JOIN queue_tokens ahead
         ON ahead.session_id  = qt.session_id
         AND ahead.status     = 'waiting'
         AND ahead.token_number < qt.token_number
       WHERE qt.session_id = $1
       AND qt.patient_id   = $2
       GROUP BY qt.id`,
      [sessionId, patientId]
    );
    return result.rows[0] ?? null;
  },

  // ─── FIND PATIENT BY PHONE ───────────────────────────────

  async findPatientByPhone(phone: string) {
    const result = await pool.query(
      `SELECT id, full_name, email, phone
       FROM users
       WHERE phone = $1
       AND role = 'patient'
       AND deleted_at IS NULL`,
      [phone]
    );
    return result.rows[0] ?? null;
  },
};