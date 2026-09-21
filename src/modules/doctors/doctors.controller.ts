import type { Request, Response }       from 'express';
import { updateDoctorProfileSchema }    from './doctors.schema.js';
import { doctorsService }               from './doctors.service.js';

export const doctorsController = {

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
    } catch (err: any) {
      if (err.message === 'NO_FIELDS_TO_UPDATE') {
        return res.status(400).json({ message: 'No fields to update' });
      }
      if (err.message === 'DOCTOR_NOT_FOUND') {
        return res.status(404).json({ message: 'Doctor not found' });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
};