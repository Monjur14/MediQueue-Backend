import { Router }            from 'express';
import { doctorsController } from './doctors.controller.js';
import { authenticate }      from '../../middleware/authenticate.js';
import { requireRole }       from '../../middleware/requireRole.js';

const router = Router();

router.put(
  '/me',
  authenticate,
  requireRole('doctor'),
  doctorsController.updateMe
);

export default router;