import { Router } from "express";
import { asyncHandler } from "../../util/asyncHandler.ts";
import {
  createGIProductController,
  getGIProductsController,
  deleteGIProductController,
  searchProducts,
} from "./controller.ts";

const router = Router();

router.post("/products", asyncHandler(createGIProductController));
router.get("/products", getGIProductsController);
router.delete("/products/:id", deleteGIProductController);
router.get("/products/search", searchProducts);

export default router;
