import type { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis.js';

const WINDOW_MS = 60 * 1000;       // 1 minute sliding window
const MAX_REQUESTS_IP = 100;        // per IP per minute
const MAX_REQUESTS_USER = 60;       // per authenticated user per minute

export const rateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  try {
    // ── IP-based limit ──────────────────────────────────────────────────────
    const ipKey = `rate_limit:ip:${req.ip}`;

    const ipPipeline = redis.pipeline();
    ipPipeline.zremrangebyscore(ipKey, 0, windowStart);          // remove old entries
    ipPipeline.zadd(ipKey, now, `${now}-${Math.random()}`);      // add current request
    ipPipeline.zcard(ipKey);                                      // count in window
    ipPipeline.pexpire(ipKey, WINDOW_MS);                         // auto-expire key
    const ipResults = await ipPipeline.exec();

    const ipCount = ipResults?.[2]?.[1] as number;

    if (ipCount > MAX_REQUESTS_IP) {
      return res.status(429).json({
        message: 'Too many requests. Please slow down.',
        retryAfter: Math.ceil(WINDOW_MS / 1000),
      });
    }

    // ── User-based limit (authenticated requests only) ──────────────────────
    if (req.user?.id) {
      const userKey = `rate_limit:user:${req.user.id}`;

      const userPipeline = redis.pipeline();
      userPipeline.zremrangebyscore(userKey, 0, windowStart);
      userPipeline.zadd(userKey, now, `${now}-${Math.random()}`);
      userPipeline.zcard(userKey);
      userPipeline.pexpire(userKey, WINDOW_MS);
      const userResults = await userPipeline.exec();

      const userCount = userResults?.[2]?.[1] as number;

      if (userCount > MAX_REQUESTS_USER) {
        return res.status(429).json({
          message: 'Too many requests from this account.',
          retryAfter: Math.ceil(WINDOW_MS / 1000),
        });
      }
    }

    next();
  } catch (err) {
    // Fail open — never block requests because Redis is down
    console.error('rateLimiter error:', err);
    next();
  }
};
