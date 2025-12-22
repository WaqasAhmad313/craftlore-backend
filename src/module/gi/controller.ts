import type { Request, Response } from "express";
import { createGIProduct } from "./service.ts";

export async function createGIProductController(
  req: Request,
  res: Response
) {
  const payload = req.body;

  const productId = await createGIProduct(payload);

  res.status(201).json({
    success: true,
    productId
  });
}
