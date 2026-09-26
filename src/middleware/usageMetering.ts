import type { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis.js';

const USAGE_TTL_SECONDS = 48 * 60 * 60; // 48 hours — covers today + tomorrow flush window

/**
 * Increments the daily patient counter for a tenant in Redis.
 *
 * Key pattern: usage:tenant:{tenantId}:patients:{YYYY-MM-DD}
 * TTL:         48 hours (nightly BullMQ job flushes to PostgreSQL for billing)
 *
 * Call this AFTER a successful booking — not before.
 * Fire-and-forget: never awaited in the request path.
 */
export const meterUsage = (tenantId: string): void => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD UTC
  const key = `usage:tenant:${tenantId}:patients:${today}`;

  redis
    .pipeline()
    .incr(key)
    .expire(key, USAGE_TTL_SECONDS)
    .exec()
    .catch((err) => {
      // Non-critical — log but never fail the booking
      console.error('usageMetering increment error:', err);
    });
};

/**
 * Returns today's patient count for a tenant from Redis.
 * Falls back to 0 on any Redis error.
 */
export const getTodayUsage = async (tenantId: string): Promise<number> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const key = `usage:tenant:${tenantId}:patients:${today}`;
    const val = await redis.get(key);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
};

/**
 * Express middleware — increments usage counter after the route responds
 * with a 2xx status code.
 *
 * Attach this to booking routes:
 *   router.post('/book', authenticate, featureGate('daily_patients'), usageMeteringMiddleware, controller.book);
 *
 * NOTE: This hooks res.json to detect success. It fires after the response
 * is sent so it never adds latency to the booking request.
 */
export const usageMeteringMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    return next();
  }

  const originalJson = res.json.bind(res);

  res.json = (body: unknown) => {
    // Only meter on successful (2xx) responses
    if (res.statusCode >= 200 && res.statusCode < 300) {
      meterUsage(tenantId);
    }
    return originalJson(body);
  };

  next();
};
