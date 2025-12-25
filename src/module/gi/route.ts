import express, { Router } from 'express';
import GICraftController from "./controller.ts";

const router: Router = express.Router();

router.get('/', GICraftController.getAllCrafts);
router.get('/categories', GICraftController.getAllCategories);
router.get('/:id', GICraftController.getCraftById);

export default router;



// import { Router } from "express";
// import { asyncHandler } from "../../util/asyncHandler.ts";
// import {
//   createGIProductController,
//   getGIProductsController,
//   deleteGIProductController,
//   searchProducts,
// } from "./controller.ts";

// const router = Router();

// router.post("/products", asyncHandler(createGIProductController));
// router.get("/products", getGIProductsController);
// router.delete("/products/:id", deleteGIProductController);
// router.get("/products/search", searchProducts);

// export default router;
