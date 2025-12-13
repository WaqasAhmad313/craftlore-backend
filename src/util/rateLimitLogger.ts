import type { Request, Response, NextFunction } from "express";

export function rateLimitLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.on("finish", () => {
    const limit = res.getHeader("RateLimit-Limit");
    const remaining = res.getHeader("RateLimit-Remaining");
    const reset = res.getHeader("RateLimit-Reset");

    if (limit !== undefined) {
      console.log(
        `[RateLimit] IP=${req.ip} | Remaining=${remaining}/${limit} | Reset=${reset}`
      );
    }
  });

  next();
}
