import { z } from 'zod';

export const inviteDoctorSchema = z.object({
  full_name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(10).max(20).optional(),
});

export const updateTenantSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().min(10).max(20).optional(),
  logo_url: z.string().url().optional(),
});

export const updateDoctorSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  phone: z.string().min(10).max(20).optional(),
});

export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;

export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;

export type InviteDoctorInput = z.infer<typeof inviteDoctorSchema>;