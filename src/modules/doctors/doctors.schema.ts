import { z } from 'zod';

export const updateDoctorProfileSchema = z.object({
  full_name:         z.string().min(2).max(100).optional(),
  phone:             z.string().min(10).max(20).optional(),
  preferred_channel: z.enum(['whatsapp', 'sms', 'both']).optional(),
});

export const createDoctorSchema = z.object({
  full_name: z.string().min(2).max(100),
  email:     z.string().email(),
  phone:     z.string().min(10).max(20).optional(),
});

export type UpdateDoctorProfileInput = z.infer<typeof updateDoctorProfileSchema>;
export type CreateDoctorInput        = z.infer<typeof createDoctorSchema>;
