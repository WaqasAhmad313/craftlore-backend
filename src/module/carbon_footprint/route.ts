import { Router } from "express";
import {
  CategoryController,
  SubcategoryController,
  ProductController,
  CalculatorController,
  CarbonFactorLibraryController,
  PublicCalculatorController,
  productImageMiddleware,
} from "./controller.ts";

const router = Router();

// =============================================================
// PUBLIC — User-facing calculator
// =============================================================

router.get("/calculator/categories", PublicCalculatorController.getCategories);
router.get("/calculator/subcategories/:categoryId", PublicCalculatorController.getSubcategories);
router.get("/calculator/products/:subcategoryId", PublicCalculatorController.getProducts);
router.get("/calculator/config/:productId", PublicCalculatorController.getConfig);
router.post("/calculator/calculate/:productId", PublicCalculatorController.calculate);

// =============================================================
// ADMIN — Categories
// =============================================================
router.post("/admin/categories", CategoryController.create);
router.get("/admin/categories", CategoryController.list);
router.get("/admin/categories/:id", CategoryController.getById);
router.put("/admin/categories/:id", CategoryController.update);
router.delete("/admin/categories/:id", CategoryController.remove);

// =============================================================
// ADMIN — Subcategories
// =============================================================
router.post("/admin/subcategories", SubcategoryController.create);
router.get("/admin/subcategories/by-category/:categoryId", SubcategoryController.listByCategoryId);
router.get("/admin/subcategories/:id", SubcategoryController.getById);
router.put("/admin/subcategories/:id", SubcategoryController.update);
router.delete("/admin/subcategories/:id", SubcategoryController.remove);

// =============================================================
// ADMIN — Products
// =============================================================
router.post("/admin/products", productImageMiddleware, ProductController.create);
router.get("/admin/products/by-subcategory/:subcategoryId", ProductController.listBySubcategoryId);
router.get("/admin/products/detail/:id", ProductController.getById);
router.put("/admin/products/:id", productImageMiddleware, ProductController.update);
router.delete("/admin/products/:id", ProductController.remove);

// =============================================================
// ADMIN — Calculators
// =============================================================
router.post("/admin/calculators", CalculatorController.create);
router.get("/admin/calculators/by-product/:productId", CalculatorController.listByProductId);
router.get("/admin/calculators/:id", CalculatorController.getById);
router.put("/admin/calculators/:id", CalculatorController.update);
router.patch("/admin/calculators/:id/fields", CalculatorController.patchFields);
router.patch("/admin/calculators/:id/formula", CalculatorController.patchFormula);
router.patch("/admin/calculators/:id/placements", CalculatorController.patchPlacements);
router.delete("/admin/calculators/:id", CalculatorController.remove);

// =============================================================
// ADMIN — Carbon Factors Library
// =============================================================
router.post("/admin/carbon-factors", CarbonFactorLibraryController.create);
router.get("/admin/carbon-factors", CarbonFactorLibraryController.list);
router.get("/admin/carbon-factors/:id", CarbonFactorLibraryController.getById);
router.put("/admin/carbon-factors/:id", CarbonFactorLibraryController.update);
router.delete("/admin/carbon-factors/:id", CarbonFactorLibraryController.remove);

export default router;