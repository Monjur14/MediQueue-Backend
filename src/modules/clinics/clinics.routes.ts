import { Router }           from 'express';
import { clinicsController } from './clinics.controller.js';

const router = Router();

// public — no auth required
router.get('/', clinicsController.search);
router.get('/doctors/search', clinicsController.searchDoctors);
router.get('/:slug/queue', clinicsController.getQueue);

export default router;
