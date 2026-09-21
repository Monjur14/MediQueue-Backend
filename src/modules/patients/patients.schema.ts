import { z } from 'zod';

export const updatePatientSchema = z.object({
  full_name:         z.string().min(2).max(100).optional(),
  phone:             z.string().min(10).max(20).optional(),
  preferred_channel: z.enum(['whatsapp', 'sms', 'both']).optional(),
});

export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;