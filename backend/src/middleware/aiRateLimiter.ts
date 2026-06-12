import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';
import type { AuthRequest } from './auth.js';

/**
 * Per-user AI rate limiter — 20 requests per hour, keyed by authenticated user ID.
 * Falls back to IP-based keying when the request is unauthenticated, which
 * mirrors the behaviour of the standard `express-rate-limit` defaults.
 */
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    if (authReq.user?.id) return `user:${authReq.user.id}`;
    return ipKeyGenerator(req.ip || 'unknown');
  },
  message: {
    error: 'AI hourly limit reached (20/hour). Please wait before making more AI requests.',
  },
});
