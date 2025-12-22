import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request, Response } from "express";

export const scraperLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 50,

  standardHeaders: true,
  legacyHeaders: false,

  // ✅ TS + IPv4 + IPv6 safe
  keyGenerator: (req: Request): string => {
    return ipKeyGenerator(req.ip ?? "unknown");
  },

  handler: (req: Request, res: Response) => {
    console.warn(
      `[RateLimit] BLOCKED | IP=${req.ip} | Daily limit exceeded`
    );

    res.status(429).json({
      success: false,
      error: "Daily verification limit reached. Try again tomorrow.",
    });
  },
});
