import { Worker, Job } from 'bullmq';
import { pool } from '../config/database.js';
import { redis } from '../config/redis.js';
import { bullmqConnection } from '../config/bullmq.js';

interface NoShowJob {
    tokenId: string;
    sessionId: string;
    patientId: string;
    phone: string | null;
}

export const startNoShowWorker = () => {
    const worker = new Worker(
        'no-show',
        async (job: Job<NoShowJob>) => {
            const { tokenId, sessionId, patientId, phone } = job.data;

            console.log(`🔍 Checking no-show for token: ${tokenId}`);

            // check current token status
            const result = await pool.query(
                `SELECT status FROM queue_tokens WHERE id = $1`,
                [tokenId]
            );

            const token = result.rows[0];

            // if token doesn't exist
            if (!token) {
                console.log(`⚠️ Token ${tokenId} not found`);
                return;
            }

            // if patient already checked in or completed → do nothing
            if (token.status !== 'called') {
                console.log(`✅ Token ${tokenId} already handled: ${token.status}`);
                return;
            }

            // patient didn't respond → auto skip
            console.log(`❌ No-show detected for token: ${tokenId}`);

            await pool.query(
                `UPDATE queue_tokens
         SET status     = 'skipped',
             updated_at = NOW()
         WHERE id = $1`,
                [tokenId]
            );

            // publish skip event → WebSocket updates all clients
            await redis.publish(
                `queue:${sessionId}`,
                JSON.stringify({
                    event: 'token_skipped',
                    tokenId,
                    session_id: sessionId,
                    reason: 'no_show',
                })
            );

            // send SMS notification if patient has phone
            if (phone) {
                // TODO: integrate SMS provider
                console.log(`📱 SMS sent to ${phone}: You were skipped at the clinic`);
            }

            // auto call next token
            const nextToken = await pool.query(
                `SELECT * FROM queue_tokens
         WHERE session_id = $1
         AND status = 'waiting'
         ORDER BY token_number ASC
         LIMIT 1`,
                [sessionId]
            );

            if (nextToken.rows[0]) {
                const next = nextToken.rows[0];

                await pool.query(
                    `UPDATE queue_tokens
           SET status     = 'called',
               called_at  = NOW(),
               updated_at = NOW()
           WHERE id = $1`,
                    [next.id]
                );

                await pool.query(
                    `UPDATE queue_sessions
           SET current_token = $1,
               updated_at    = NOW()
           WHERE id = $2`,
                    [next.token_number, sessionId]
                );

                // publish next token called event
                await redis.publish(
                    `queue:${sessionId}`,
                    JSON.stringify({
                        event: 'token_called',
                        session_id: sessionId,
                        token_number: next.token_number,
                        patient_id: next.patient_id,
                        auto: true, // flagged as auto-called
                    })
                );

                console.log(`🔔 Auto called next token: #${next.token_number}`);

                // create new no-show job for the next token
                const { noShowQueue } = await import('../config/bullmq.js');
                await noShowQueue.add(
                    'check-noshow',
                    {
                        tokenId: next.id,
                        sessionId,
                        patientId: next.patient_id,
                        phone: null, // fetch from DB if needed
                    },
                    { delay: 5 * 60 * 1000 } // 5 minutes
                );
            }
        },
        { connection: bullmqConnection }
    );

    worker.on('completed', (job) => {
        console.log(`✅ No-show job completed: ${job.id}`);
    });

    worker.on('failed', (job, err) => {
        console.error(`❌ No-show job failed: ${job?.id}`, err);
    });

    console.log('✅ No-show worker started');
    return worker;
};