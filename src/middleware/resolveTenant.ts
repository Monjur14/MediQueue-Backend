import type { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database.js';

export const resolveTenant = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const client = await pool.connect();

    try {
        if (req.user) {
            // set tenant context for RLS
            await client.query(
                `SELECT
    set_config('app.current_tenant_id',  $1, TRUE),
    set_config('app.current_user_id',    $2, TRUE),
    set_config('app.current_user_role',  $3, TRUE)`,  
                [
                    req.user.tenantId ?? '',
                    req.user.id,
                    req.user.role,
                ]
            );
        }

        next();
    } catch (err) {
        console.error('resolveTenant error:', err);
        next();
    } finally {
        client.release();
    }
};