import { Router }              from 'express';
import { patientsController }  from './patients.controller.js';
import { authenticate }        from '../../middleware/authenticate.js';
import { requireRole }         from '../../middleware/requireRole.js';

const router = Router();

router.put(
  '/me',
  authenticate,
  requireRole('patient'),
  patientsController.updateMe
);

export default router;