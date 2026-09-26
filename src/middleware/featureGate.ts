import type { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database.js';
import { redis } from '../config/redis.js';

// Fallback limits if DB plan doesn't have daily_patient_limit column
// (matches the spec: Solo=50, Clinic=300, Hospital=unlimited)
const PLAN_FALLBACK_LIMITS: Record<string, number | null> = {
  solo_doctor: 50,
  clinic: 300,
  hospital: null, // null = unlimited
};

type GatedFeature = 'daily_patients';

/**
 * Middleware factory that gates a route behind plan limits.
 *
 * Usage:
 *   router.post('/book', authenticate, featureGate('daily_patients'), controller.book);
 */
export const featureGate = (feature: GatedFeature) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(403).json({ message: 'Tenant context required' });
    }

    try {
      if (feature === 'daily_patients') {
        // 1. Fetch tenant's active subscription plan
        const planResult = await pool.query<{
          name: string;
          daily_patient_limit: number | null;
        }>(
          `SELECT sp.name, sp.daily_patient_limit
           FROM subscription_plans sp
           INNER JOIN subscriptions s ON s.plan_id = sp.id
           WHERE s.tenant_id = $1
             AND s.status IN ('active', 'trial')
           LIMIT 1`,
          [tenantId]
        );

        const plan = planResult.rows[0];

        if (!plan) {
          return res.status(403).json({
            message:
              'No active subscription found. Please subscribe to continue.',
          });
        }

        // 2. Resolve the limit (DB column wins, fallback to hardcoded map)
        const limit: number | null =
          plan.daily_patient_limit ??
          PLAN_FALLBACK_LIMITS[plan.name] ??
          null;

        // Unlimited plan — skip counter check entirely
        if (limit === null) {
          return next();
        }

        // 3. Check today's Redis counter (key set by usageMetering.ts)
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD UTC
        const usageKey = `usage:tenant:${tenantId}:patients:${today}`;
        const raw = await redis.get(usageKey);
        const count = raw ? parseInt(raw, 10) : 0;

        if (count >= limit) {
          return res.status(429).json({
            message: `Daily patient limit of ${limit} reached. Please upgrade your plan to continue.`,
            limit,
            current: count,
            upgrade: true,
          });
        }
      }

      next();
    } catch (err) {
      // Fail open — a DB/Redis outage should never block patient bookings
      console.error('featureGate error:', err);
      next();
    }
  };
};
