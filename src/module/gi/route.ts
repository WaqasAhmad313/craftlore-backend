import { Router } from "express";
import { asyncHandler } from "../../util/asyncHandler.ts";
import { createGIProductController } from "./controller.ts";

const router = Router();

router.post("/products", asyncHandler(createGIProductController));

export default router;
