import { z } from 'zod';

export const openSessionSchema = z.object({
  doctor_id:     z.string().uuid(),
  department_id: z.string().uuid().optional(),
  max_tokens:    z.number().int().min(1).max(500),
  session_date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
});

export const giveTokenSchema = z.object({
  session_id:       z.string().uuid(),
  phone:            z.string().min(10).max(20),
  fee_amount:       z.number().min(0),
  idempotency_key:  z.string().min(1), // prevent double click
});

export const markFeeSchema = z.object({
  fee_amount: z.number().min(0),
});

export const doctorBreakSchema = z.object({
  expected_duration: z.number().int().min(1).max(120), // minutes
});

export const updateNotesSchema = z.object({
  notes:         z.string(),
  notes_version: z.number().int().min(0),
});

export type OpenSessionInput  = z.infer<typeof openSessionSchema>;
export type GiveTokenInput    = z.infer<typeof giveTokenSchema>;
export type MarkFeeInput      = z.infer<typeof markFeeSchema>;
export type DoctorBreakInput  = z.infer<typeof doctorBreakSchema>;
export type UpdateNotesInput  = z.infer<typeof updateNotesSchema>;