import type { Request, Response } from "express";
import { createGIProduct } from "./service.ts";

export async function createGIProductController(
  req: Request,
  res: Response
) {
  const productId = await createGIProduct(req.body);

  res.status(201).json({
    success: true,
    productId,
  });
}
