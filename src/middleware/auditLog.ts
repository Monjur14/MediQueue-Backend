import type { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database.js';

// ── Allowed audit actions ────────────────────────────────────────────────────
export type AuditAction =
  // Auth
  | 'user.login'
  | 'user.logout'
  | 'user.register'
  | 'user.password_change'
  // Tenant management
  | 'tenant.created'
  | 'tenant.updated'
  | 'doctor.created'
  | 'doctor.deleted'
  | 'doctor.updated'
  // Queue & appointments
  | 'patient.book'
  | 'patient.cancel'
  | 'patient.no_show'
  | 'queue.call_next'
  | 'queue.skip'
  | 'queue.break_start'
  | 'queue.break_end'
  // Billing
  | 'subscription.upgraded'
  | 'subscription.downgraded'
  | 'subscription.cancelled'
  | 'payment.succeeded'
  | 'payment.failed';

interface AuditEntry {
  action: AuditAction;
  userId?: string | null;
  tenantId?: string | null;
  targetId?: string | null;           // e.g. doctor id, appointment id
  metadata?: Record<string, unknown>; // extra context — serialised as JSONB
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Write an audit log entry directly to the audit_logs table.
 *
 * Fire-and-forget — never awaited in the request path to avoid adding latency.
 * Errors are logged but never bubble up.
 *
 * Usage (from a service or controller):
 *   writeAuditLog({ action: 'doctor.deleted', userId: req.user.id, tenantId: req.user.tenantId, targetId: doctorId });
 */
export const writeAuditLog = (entry: AuditEntry): void => {
  pool
    .query(
      `INSERT INTO audit_logs
         (action, user_id, tenant_id, target_id, metadata, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        entry.action,
        entry.userId   ?? null,
        entry.tenantId ?? null,
        entry.targetId ?? null,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
        entry.ipAddress ?? null,
        entry.userAgent ?? null,
      ]
    )
    .catch((err) => {
      console.error('auditLog write error:', err);
    });
};

/**
 * Express middleware factory — logs the action after the route responds
 * with a 2xx status code.
 *
 * Usage on a router:
 *   router.post('/login',  controller.login,       auditLog('user.login'));
 *   router.delete('/:id',  controller.deleteDoctor, auditLog('doctor.deleted'));
 *
 * For actions that need targetId or metadata, call writeAuditLog() directly
 * from the controller/service instead.
 */
export const auditLog = (action: AuditAction) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = (body: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        writeAuditLog({
          action,
          userId:    req.user?.id    ?? null,
          tenantId:  req.user?.tenantId ?? null,
          ipAddress: req.ip ?? null, 
          userAgent: req.headers['user-agent'] ?? null,
        });
      }
      return originalJson(body);
    };

    next();
  };
};