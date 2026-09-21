import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();

router.post('/register',        authController.register);
router.post('/register/tenant', authController.registerTenant);
router.post('/login',           authController.login);
router.post('/refresh',         authController.refresh);
router.post('/logout',          authenticate, authController.logout);
router.post('/setup-password', authController.setupPassword);
router.get('/me', authenticate, authController.getMe);

export default router;