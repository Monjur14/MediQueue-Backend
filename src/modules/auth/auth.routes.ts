import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { auditLog } from '../../middleware/auditLog.js';

const router = Router();

router.post('/register',        authController.register);
router.post('/register/tenant', auditLog('tenant.created'), authController.registerTenant);
router.post('/login',           auditLog('user.login'),     authController.login);
router.post('/refresh',         authController.refresh);
router.post('/logout',          authenticate, auditLog('user.logout'), authController.logout);
router.post('/setup-password',  authController.setupPassword);
router.get('/me',               authenticate, authController.getMe);

export default router;
