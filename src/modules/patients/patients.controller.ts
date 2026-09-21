import type { Request, Response }  from 'express';
import { updatePatientSchema }     from './patients.schema.js';
import { patientsService }         from './patients.service.js';

export const patientsController = {

  async updateMe(req: Request, res: Response) {
    const parsed = updatePatientSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors:  parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const user = await patientsService.updateProfile(req.user!.id, parsed.data);
      return res.status(200).json({ user });
    } catch (err: any) {
      if (err.message === 'NO_FIELDS_TO_UPDATE') {
        return res.status(400).json({ message: 'No fields to update' });
      }
      if (err.message === 'USER_NOT_FOUND') {
        return res.status(404).json({ message: 'User not found' });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
};