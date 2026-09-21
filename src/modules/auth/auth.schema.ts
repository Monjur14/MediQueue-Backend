import { z } from 'zod';

export const registerSchema = z.object({
  full_name: z.string().min(2).max(100),
  email:     z.string().email(),
  phone:     z.string().min(10).max(20).optional(),
  password:  z.string().min(8).max(100),
});

export const registerTenantSchema = z.object({
  // clinic/hospital info
  clinic_name:  z.string().min(2).max(100),
  clinic_phone: z.string().min(10).max(20),
  plan_name:    z.enum(['solo', 'clinic', 'hospital']),

  // admin user info
  full_name: z.string().min(2).max(100),
  email:     z.string().email(),
  phone:     z.string().min(10).max(20).optional(),
  password:  z.string().min(8).max(100),
});

export const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

export type RegisterInput       = z.infer<typeof registerSchema>;
export type RegisterTenantInput = z.infer<typeof registerTenantSchema>;
export type LoginInput          = z.infer<typeof loginSchema>;
export type RefreshInput        = z.infer<typeof refreshSchema>;