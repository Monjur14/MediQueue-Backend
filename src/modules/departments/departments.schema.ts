import { z } from 'zod';

export const createDepartmentSchema = z.object({
    name: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
});

export const updateDepartmentSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(500).optional(),
    is_active: z.boolean().optional(),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;