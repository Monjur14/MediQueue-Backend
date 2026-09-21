import type { Request, Response } from 'express';
import {
    createDepartmentSchema,
    updateDepartmentSchema,
} from './departments.schema.js';
import { departmentsService } from './departments.service.js';

export const departmentsController = {

    async create(req: Request, res: Response) {
        const parsed = createDepartmentSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: parsed.error.flatten().fieldErrors,
            });
        }
        try {
            const tenantId = req.user!.tenantId!;
            const department = await departmentsService.create(tenantId, parsed.data);
            return res.status(201).json({ department });
        } catch (err: any) {
            if (err.message === 'DEPARTMENT_LIMIT_REACHED') {
                return res.status(403).json({ message: 'Department limit reached for your plan. Please upgrade.' });
            }
            return res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getAll(req: Request, res: Response) {
        try {
            const tenantId = req.user!.tenantId!;
            const departments = await departmentsService.getAll(tenantId);
            return res.status(200).json({ departments });
        } catch {
            return res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getById(req: Request, res: Response) {
        try {
            const tenantId = req.user!.tenantId!;
            const rawId = req.params['id'];

            const id = Array.isArray(rawId) ? rawId[0] : rawId;

            if (!id) {
                return res.status(400).json({ message: 'Invalid or missing ID parameter' });
            }

            const department = await departmentsService.getById(id as string, tenantId);
            return res.status(200).json({ department });

        } catch (err: any) {
            if (err.message === 'DEPARTMENT_NOT_FOUND') {
                return res.status(404).json({ message: 'Department not found' });
            }
            return res.status(500).json({ message: 'Internal server error' });
        }
    },

    async update(req: Request, res: Response) {
        const parsed = updateDepartmentSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: parsed.error.flatten().fieldErrors,
            });
        }

        try {
            const tenantId = req.user!.tenantId!;
            const rawId = req.params['id'];

            const id = Array.isArray(rawId) ? rawId[0] : rawId;

            if (!id) {
                return res.status(400).json({ message: 'Invalid or missing ID parameter' });
            }

            const department = await departmentsService.update(id as string, tenantId, parsed.data);
            return res.status(200).json({ department });

        } catch (err: any) {
            if (err.message === 'NO_FIELDS_TO_UPDATE') {
                return res.status(400).json({ message: 'No fields to update' });
            }
            if (err.message === 'DEPARTMENT_NOT_FOUND') {
                return res.status(404).json({ message: 'Department not found' });
            }
            return res.status(500).json({ message: 'Internal server error' });
        }
    },

    async remove(req: Request, res: Response) {
        try {
            const tenantId = req.user!.tenantId!;
            const rawId = req.params['id'];

            const id = Array.isArray(rawId) ? rawId[0] : rawId;

            if (!id) {
                return res.status(400).json({ message: 'Invalid or missing ID parameter' });
            }

            await departmentsService.remove(id as string, tenantId);

            return res.status(200).json({ message: 'Department deleted successfully' });
        } catch (err: any) {
            if (err.message === 'DEPARTMENT_NOT_FOUND') {
                return res.status(404).json({ message: 'Department not found' });
            }
            return res.status(500).json({ message: 'Internal server error' });
        }
    },
    async assignDoctor(req: Request, res: Response) {
        const { doctorId } = req.body;
        if (!doctorId) {
            return res.status(400).json({ message: 'doctorId is required' });
        }
        try {
            const tenantId = req.user!.tenantId!;
            const rawId = req.params['id'];

            const departmentId = Array.isArray(rawId) ? rawId[0] : rawId;

            if (!departmentId) {
                return res.status(400).json({ message: 'Invalid or missing ID parameter' });
            }

            const result = await departmentsService.assignDoctor(departmentId as string, doctorId, tenantId);
            return res.status(201).json({
                message: 'Doctor assigned to department successfully',
                result,
            });
        } catch (err: any) {
            if (err.message === 'DEPARTMENT_NOT_FOUND') return res.status(404).json({ message: 'Department not found' });
            if (err.message === 'DOCTOR_NOT_FOUND') return res.status(404).json({ message: 'Doctor not found' });
            if (err.message === 'DOCTOR_ALREADY_ASSIGNED') return res.status(409).json({ message: 'Doctor already assigned to this department' });
            return res.status(500).json({ message: 'Internal server error' });
        }
    },

    async removeDoctor(req: Request, res: Response) {
        try {
            const tenantId = req.user!.tenantId!;

            const rawDeptId = req.params['id'];
            const rawDoctorId = req.params['doctorId'];

            const departmentId = Array.isArray(rawDeptId) ? rawDeptId[0] : rawDeptId;
            const doctorId = Array.isArray(rawDoctorId) ? rawDoctorId[0] : rawDoctorId;

            if (!departmentId || !doctorId) {
                return res.status(400).json({ message: 'Invalid or missing ID parameters' });
            }

            await departmentsService.removeDoctor(
                departmentId as string,
                doctorId as string,
                tenantId
            );

            return res.status(200).json({ message: 'Doctor removed from department successfully' });
        } catch (err: any) {
            if (err.message === 'DEPARTMENT_NOT_FOUND') {
                return res.status(404).json({ message: 'Department not found' });
            }
            if (err.message === 'DOCTOR_NOT_ASSIGNED') {
                return res.status(404).json({ message: 'Doctor not assigned to this department' });
            }
            return res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getDoctorsInDepartment(req: Request, res: Response) {
        try {
            const tenantId = req.user!.tenantId!;
            const rawId = req.params['id'];

            const departmentId = Array.isArray(rawId) ? rawId[0] : rawId;

            if (!departmentId) {
                return res.status(400).json({ message: 'Invalid or missing ID parameter' });
            }

            const doctors = await departmentsService.getDoctorsInDepartment(departmentId as string, tenantId);
            return res.status(200).json({ doctors });

        } catch (err: any) {
            if (err.message === 'DEPARTMENT_NOT_FOUND') {
                return res.status(404).json({ message: 'Department not found' });
            }
            return res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getOverview(req: Request, res: Response) {
        try {
            console.log('Fetching overview for tenant:', req.user!.tenantId!); // ← add this
            const tenantId = req.user!.tenantId!;
            const overview = await departmentsService.getOverview(tenantId);
            return res.status(200).json({ overview });
        } catch (err: any) {
            console.error('OVERVIEW ERROR:', err); // ← add this
            return res.status(500).json({ message: 'Internal server error' });
        }
    },
    async getPublicDepartments(req: Request, res: Response) {
        try {
            const rawSlug = req.params['slug'];

            const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;

            if (!slug) {
                return res.status(400).json({ message: 'Invalid or missing slug parameter' });
            }

            const result = await departmentsService.getPublicDepartments(slug as string);
            return res.status(200).json(result);

        } catch (err: any) {
            if (err.message === 'CLINIC_NOT_FOUND') {
                return res.status(404).json({ message: 'Clinic not found' });
            }
            return res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getPublicDoctorsInDepartment(req: Request, res: Response) {
        try {
            const rawSlug = req.params['slug'];
            const rawDeptId = req.params['departmentId'];

            const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
            const departmentId = Array.isArray(rawDeptId) ? rawDeptId[0] : rawDeptId;

            if (!slug || !departmentId) {
                return res.status(400).json({ message: 'Invalid or missing parameters' });
            }

            const result = await departmentsService.getPublicDoctorsInDepartment(
                slug as string,
                departmentId as string
            );

            return res.status(200).json(result);

        } catch (err: any) {
            if (err.message === 'CLINIC_NOT_FOUND') {
                return res.status(404).json({ message: 'Clinic not found' });
            }
            if (err.message === 'DEPARTMENT_NOT_FOUND') {
                return res.status(404).json({ message: 'Department not found' });
            }
            return res.status(500).json({ message: 'Internal server error' });
        }
    },
};