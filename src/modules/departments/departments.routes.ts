import { Router }                  from 'express';
import { departmentsController }   from './departments.controller.js';
import { authenticate }            from '../../middleware/authenticate.js';
import { requireRole }             from '../../middleware/requireRole.js';

const router = Router();

// ✅ public routes — no auth required
router.get('/clinics/:slug/departments',                          departmentsController.getPublicDepartments);
router.get('/clinics/:slug/departments/:departmentId/doctors',    departmentsController.getPublicDoctorsInDepartment);

// 🔒 protected routes — tenant_admin only
router.use(authenticate);
router.use(requireRole('tenant_admin'));

router.post('/',                        departmentsController.create);
router.get('/overview',                 departmentsController.getOverview);
router.get('/',                         departmentsController.getAll);
router.get('/:id',                      departmentsController.getById);
router.put('/:id',                      departmentsController.update);
router.delete('/:id',                   departmentsController.remove);
router.post('/:id/doctors',             departmentsController.assignDoctor);
router.get('/:id/doctors',              departmentsController.getDoctorsInDepartment);
router.delete('/:id/doctors/:doctorId', departmentsController.removeDoctor);

export default router;