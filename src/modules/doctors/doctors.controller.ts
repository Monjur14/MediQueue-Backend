import type { Request, Response }       from 'express';
import { updateDoctorProfileSchema, createDoctorSchema } from './doctors.schema.js';
import { doctorsService }               from './doctors.service.js';
import { doctorsRepository }            from './doctors.repository.js';

export const doctorsController = {

  async listAll(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId!;
      const doctors = await doctorsService.listByTenant(tenantId);
      return res.status(200).json({ doctors });
    } catch {
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  async create(req: Request, res: Response) {
    const parsed = createDoctorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors:  parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const tenantId = req.user!.tenantId!;
      const doctor = await doctorsService.createDoctor(tenantId, parsed.data);
      return res.status(201).json({ doctor });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('unique') || msg.includes('duplicate')) {
        return res.status(409).json({ message: 'A doctor with that email already exists' });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  async updateMe(req: Request, res: Response) {
    const parsed = updateDoctorProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors:  parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const doctor = await doctorsService.updateProfile(req.user!.id, parsed.data);
      return res.status(200).json({ doctor });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'NO_FIELDS_TO_UPDATE') {
        return res.status(400).json({ message: 'No fields to update' });
      }
      if (msg === 'DOCTOR_NOT_FOUND') {
        return res.status(404).json({ message: 'Doctor not found' });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  async getMyDepartments(req: Request, res: Response) {
    try {
      const doctorId = req.user!.id;
      const tenantId = req.user!.tenantId!;
      const departments = await doctorsRepository.getMyDepartments(doctorId, tenantId);
      return res.status(200).json({ departments });
    } catch {
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

};
