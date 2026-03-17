import type { Request, Response, NextFunction } from "express";

export function isInternalRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const secret = req.headers["x-internal-request"];
  const expected = process.env["INTERNAL_REQUEST_SECRET"] ?? "";

  if (
    typeof secret === "string" &&
    secret !== "" &&
    secret === expected
  ) {
    // Internal call — skip all middleware, go straight to handler
    res.locals["skipAuth"] = true;
  }

  next();
}