import { Router } from 'express';
import { queueController } from './queue.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/requireRole.js';
import { featureGate } from '../../middleware/featureGate.js';
import { usageMeteringMiddleware } from '../../middleware/usageMetering.js';
import { auditLog } from '../../middleware/auditLog.js';

const router = Router();

// ─── PUBLIC ──────────────────────────────────────────────────
router.get('/sessions/:id/status', queueController.getSessionStatus);

// ─── PATIENT ─────────────────────────────────────────────────
router.get(
  '/sessions/:id/my-token',
  authenticate,
  requireRole('patient'),
  queueController.getMyToken
);



// ─── SESSION TOKENS (doctor/admin view) ──────────────────────
router.get(
  '/sessions/:id/tokens',
  authenticate,
  requireRole('doctor', 'tenant_admin'),
  queueController.getSessionTokens
);

// ─── PATIENT: my active token (auto-detect, no session ID) ───
router.get(
  '/my-active-token',
  authenticate,
  requireRole('patient'),
  queueController.getMyActiveToken
);

// ─── TENANT ADMIN ─────────────────────────────────────────────
router.post(
  '/sessions',
  authenticate,
  requireRole('tenant_admin'),
  queueController.openSession
);

router.get(
  '/sessions/today',
  authenticate,
  requireRole('tenant_admin', 'doctor'),
  queueController.getTodaySessions
);

router.put(
  '/sessions/:id/close',
  authenticate,
  requireRole('tenant_admin'),
  queueController.closeSession
);

router.put(
  '/sessions/:id/reopen',
  authenticate,
  requireRole('tenant_admin', 'doctor'),
  queueController.reopenSession
);

// ─── BOOKING: Give a queue token to a patient ─────────────────
// featureGate  → checks if tenant has hit their daily patient limit BEFORE creating the token
// usageMetering → increments the Redis counter AFTER the token is successfully created
// auditLog     → writes an immutable record of this booking to audit_logs
router.post(
  '/tokens/give',
  authenticate,
  requireRole('tenant_admin'),
  featureGate('daily_patients'),
  usageMeteringMiddleware,
  auditLog('patient.book'),
  queueController.giveToken
);

router.put(
  '/tokens/:id/fee',
  authenticate,
  requireRole('tenant_admin'),
  queueController.markFeePaid
);

// ─── DOCTOR ───────────────────────────────────────────────────
router.put(
  '/sessions/:id/next',
  authenticate,
  requireRole('doctor', 'tenant_admin'),
  auditLog('queue.call_next'),
  queueController.callNextToken
);

router.put(
  '/tokens/:id/skip',
  authenticate,
  requireRole('doctor', 'tenant_admin'),
  auditLog('queue.skip'),
  queueController.skipToken
);

router.put(
  '/tokens/:id/complete',
  authenticate,
  requireRole('doctor', 'tenant_admin'),
  queueController.completeToken
);

router.put(
  '/tokens/:id/notes',
  authenticate,
  requireRole('doctor'),
  queueController.updateNotes
);

router.post(
  '/sessions/:id/break',
  authenticate,
  requireRole('doctor', 'tenant_admin'),
  auditLog('queue.break_start'),
  queueController.startBreak
);

router.put(
  '/sessions/:id/break/:breakId/end',
  authenticate,
  requireRole('doctor', 'tenant_admin'),
  auditLog('queue.break_end'),
  queueController.endBreak
);

router.put(
  '/tokens/:id/checkin',
  authenticate,
  requireRole('doctor', 'tenant_admin'),
  queueController.checkinToken
);

export default router;
