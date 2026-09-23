import { Router } from 'express';
import { queueController } from './queue.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/requireRole.js';

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

router.post(
  '/tokens/give',
  authenticate,
  requireRole('tenant_admin'),
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
  queueController.callNextToken
);

router.put(
  '/tokens/:id/skip',
  authenticate,
  requireRole('doctor', 'tenant_admin'),
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
  requireRole('doctor'),
  queueController.startBreak
);

router.put(
  '/sessions/:id/break/:breakId/end',
  authenticate,
  requireRole('doctor'),
  queueController.endBreak
);

router.put(
  '/tokens/:id/checkin',
  authenticate,
  requireRole('doctor', 'tenant_admin'),
  queueController.checkinToken
);

export default router;