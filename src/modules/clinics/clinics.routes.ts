import { Router }           from 'express';
import { clinicsController } from './clinics.controller.js';

const router = Router();

// public — no auth required
router.get('/', clinicsController.search);

export default router;