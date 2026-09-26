import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { pool } from '../../config/database.js';
import { queueRepository } from '../../modules/queue/queue.repository.js';

// test data
let sessionId: string;
let tenantId: string;
let doctorId: string;
let deptId: string;
let patientIds: string[] = [];

beforeAll(async () => {
    const timestamp = Date.now();

    // create test tenant
    const tenantResult = await pool.query(
        `INSERT INTO tenants (name, slug, email, phone)
   VALUES ('Test Clinic', $1, 'test@concurrent.com', $2)
   RETURNING id`,
        [`test-clinic-${timestamp}`, `+880170${timestamp}`.slice(0, 20)]
    );

    // create test patients
    for (let i = 0; i < 3; i++) {
        const patientResult = await pool.query(
            `INSERT INTO users
      (full_name, email, phone, password_hash, role, status)
     VALUES ($1, $2, $3, 'hash', 'patient', 'active')
     RETURNING id`,
            [
                `Patient ${i}`,
                `patient${i}${timestamp}@concurrent.com`,
                `+8801${timestamp}${i}`.slice(0, 20),
            ]
        );
        patientIds.push(patientResult.rows[0].id);
    }
    tenantId = tenantResult.rows[0].id;

    // create test doctor
    const doctorResult = await pool.query(
        `INSERT INTO users (full_name, email, phone, password_hash, role, tenant_id, status)
     VALUES ('Test Doctor', 'doctor@concurrent.com', '+8801700000002', 'hash', 'doctor', $1, 'active')
     RETURNING id`,
        [tenantId]
    );
    doctorId = doctorResult.rows[0].id;

    // create test department
    const deptResult = await pool.query(
        `INSERT INTO departments (tenant_id, name)
     VALUES ($1, 'Test Department')
     RETURNING id`,
        [tenantId]
    );
    deptId = deptResult.rows[0].id;

    // create test session with only 1 token available
    const sessionResult = await pool.query(
        `INSERT INTO queue_sessions
      (tenant_id, doctor_id, department_id, session_date, max_tokens, total_issued)
     VALUES ($1, $2, $3, CURRENT_DATE, 1, 0)
     RETURNING id`,
        [tenantId, doctorId, deptId]
    );
    sessionId = sessionResult.rows[0].id;

    // create 3 test patients
    for (let i = 0; i < 3; i++) {
        const patientResult = await pool.query(
            `INSERT INTO users
        (full_name, email, phone, password_hash, role, status)
       VALUES ($1, $2, $3, 'hash', 'patient', 'active')
       RETURNING id`,
            [
                `Patient ${i}`,
                `patient${i}@concurrent.com`,
                `+880170000000${i}`,
            ]
        );
        patientIds.push(patientResult.rows[0].id);
    }
});

afterAll(async () => {
    // clean up test data in reverse order
    await pool.query(`DELETE FROM queue_tokens    WHERE session_id = $1`, [sessionId]);
    await pool.query(`DELETE FROM queue_sessions  WHERE id = $1`, [sessionId]);
    await pool.query(`DELETE FROM departments     WHERE id = $1`, [deptId]);
    await pool.query(
        `DELETE FROM users WHERE email IN (
      'doctor@concurrent.com',
      'patient0@concurrent.com',
      'patient1@concurrent.com',
      'patient2@concurrent.com'
    )`
    );
    await pool.query(`DELETE FROM tenants WHERE id = $1`, [tenantId]);
    await pool.end();
});

describe('Concurrent Token Assignment', () => {

    it('should assign exactly 1 token when 3 requests fire simultaneously', async () => {
        // fire 3 concurrent requests for the last token
        const results = await Promise.allSettled([
            queueRepository.giveToken({
                session_id: sessionId,
                patient_id: patientIds[0]!,
                fee_amount: 500,
            }),
            queueRepository.giveToken({
                session_id: sessionId,
                patient_id: patientIds[1]!,
                fee_amount: 500,
            }),
            queueRepository.giveToken({
                session_id: sessionId,
                patient_id: patientIds[2]!,
                fee_amount: 500,
            }),
        ]);

        const successful = results.filter(r => r.status === 'fulfilled');
        const failed = results.filter(r => r.status === 'rejected');

        // exactly 1 should succeed
        expect(successful.length).toBe(1);

        // exactly 2 should fail with QUEUE_FULL
        expect(failed.length).toBe(2);
        failed.forEach(r => {
            expect((r as PromiseRejectedResult).reason.message).toBe('QUEUE_FULL');
        });

        // verify in database — only 1 token exists
        const tokenCount = await pool.query(
            `SELECT COUNT(*) FROM queue_tokens WHERE session_id = $1`,
            [sessionId]
        );
        expect(parseInt(tokenCount.rows[0].count)).toBe(1);

        // verify token number is exactly 1 (no duplicates)
        const tokens = await pool.query(
            `SELECT token_number FROM queue_tokens WHERE session_id = $1`,
            [sessionId]
        );
        expect(tokens.rows[0].token_number).toBe(1);
    });

    it('should prevent same patient from getting two tokens', async () => {
        // create new session for this test
        const newSessionResult = await pool.query(
            `INSERT INTO queue_sessions
        (tenant_id, doctor_id, department_id, session_date, max_tokens, total_issued)
       VALUES ($1, $2, $3, CURRENT_DATE + 1, 30, 0)
       RETURNING id`,
            [tenantId, doctorId, deptId]
        );
        const newSessionId = newSessionResult.rows[0].id;

        // fire same patient twice simultaneously
        const results = await Promise.allSettled([
            queueRepository.giveToken({
                session_id: newSessionId,
                patient_id: patientIds[0]!,
                fee_amount: 500,
            }),
            queueRepository.giveToken({
                session_id: newSessionId,
                patient_id: patientIds[0]!, // same patient
                fee_amount: 500,
            }),
        ]);

        const successful = results.filter(r => r.status === 'fulfilled');

        // only 1 should succeed even for same patient
        expect(successful.length).toBe(1);

        // verify only 1 token in DB for this patient
        const tokenCount = await pool.query(
            `SELECT COUNT(*) FROM queue_tokens
       WHERE session_id = $1 AND patient_id = $2`,
            [newSessionId, patientIds[0]]
        );
        expect(parseInt(tokenCount.rows[0].count)).toBe(1);

        // cleanup
        await pool.query(`DELETE FROM queue_tokens   WHERE session_id = $1`, [newSessionId]);
        await pool.query(`DELETE FROM queue_sessions WHERE id = $1`, [newSessionId]);
    });

});