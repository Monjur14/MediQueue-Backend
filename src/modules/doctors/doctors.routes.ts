import { Router }            from 'express';
import { doctorsController } from './doctors.controller.js';
import { authenticate }      from '../../middleware/authenticate.js';
import { requireRole }       from '../../middleware/requireRole.js';

const router = Router();

// ── Tenant admin: manage doctors ────────────────────────────────────
router.get(
  '/',
  authenticate,
  requireRole('tenant_admin'),
  doctorsController.listAll
);

router.post(
  '/',
  authenticate,
  requireRole('tenant_admin'),
  doctorsController.create
);

// ── Doctor self-service ─────────────────────────────────────────────
router.put(
  '/me',
  authenticate,
  requireRole('doctor'),
  doctorsController.updateMe
);

router.get(
  '/my-departments',
  authenticate,
  requireRole('doctor'),
  doctorsController.getMyDepartments
);

export default router;
