// import { Router } from "express";
// import {
//   CategoryController,
//   SubcategoryController,
//   ProductController,
//   CalculatorController,
//   PublicCalculatorController,
//   productImageMiddleware,
// } from "./controller.ts";

// const router = Router();

// // =============================================================
// // PUBLIC — User-facing calculator
// // =============================================================

// router.get("/calculator/categories", PublicCalculatorController.getCategories);
// router.get("/calculator/subcategories/:categoryId", PublicCalculatorController.getSubcategories);
// router.get("/calculator/products/:subcategoryId", PublicCalculatorController.getProducts);
// router.get("/calculator/config/:productId", PublicCalculatorController.getConfig);
// router.post("/calculator/calculate/:productId", PublicCalculatorController.calculate);

// // =============================================================
// // ADMIN — Categories
// // =============================================================
// router.post("/admin/categories", CategoryController.create);
// router.get("/admin/categories", CategoryController.list);
// router.get("/admin/categories/:id", CategoryController.getById);
// router.put("/admin/categories/:id", CategoryController.update);
// router.delete("/admin/categories/:id", CategoryController.remove);

// // =============================================================
// // ADMIN — Subcategories
// // =============================================================
// router.post("/admin/subcategories", SubcategoryController.create);
// router.get("/admin/subcategories/by-category/:categoryId", SubcategoryController.listByCategoryId);
// router.get("/admin/subcategories/:id", SubcategoryController.getById);
// router.put("/admin/subcategories/:id", SubcategoryController.update);
// router.delete("/admin/subcategories/:id", SubcategoryController.remove);

// // =============================================================
// // ADMIN — Products
// // =============================================================
// router.post("/admin/products", productImageMiddleware, ProductController.create);
// router.get("/admin/products/by-subcategory/:subcategoryId", ProductController.listBySubcategoryId);
// router.get("/admin/products/detail/:id", ProductController.getById);
// router.put("/admin/products/:id", productImageMiddleware, ProductController.update);
// router.delete("/admin/products/:id", ProductController.remove);

// // =============================================================
// // ADMIN — Calculators
// // =============================================================
// router.post("/admin/calculators", CalculatorController.create);
// router.get("/admin/calculators/by-product/:productId", CalculatorController.listByProductId);
// router.get("/admin/calculators/:id", CalculatorController.getById);
// router.put("/admin/calculators/:id", CalculatorController.update);
// router.patch("/admin/calculators/:id/fields", CalculatorController.patchFields);
// router.delete("/admin/calculators/:id", CalculatorController.remove);

// export default router;

import { Router } from "express";
import {
  CategoryController,
  SubcategoryController,
  ProductController,
  CalculatorController,
  PublicCalculatorController,
  productImageMiddleware,
} from "./controller.ts";
import { isInternalRequest } from "../../middleware/internalMiddleware.ts";
import { authMiddleware } from "../../middleware/authMiddleware.ts";
import { requirePermission } from "../../middleware/permissionMiddleware.ts";
import { pendingInterceptor } from "../../middleware/pendingMiddleware.ts";
import { logActivity } from "../../middleware/activityLogMiddleware.ts";

const router = Router();

// ── Untouched — public calculator ────────────────────────────
router.get("/calculator/categories", PublicCalculatorController.getCategories);
router.get("/calculator/subcategories/:categoryId", PublicCalculatorController.getSubcategories);
router.get("/calculator/products/:subcategoryId", PublicCalculatorController.getProducts);
router.get("/calculator/config/:productId", PublicCalculatorController.getConfig);
router.post("/calculator/calculate/:productId", PublicCalculatorController.calculate);

// ── Untouched — admin GET routes ─────────────────────────────
router.get("/admin/categories", CategoryController.list);
router.get("/admin/categories/:id", CategoryController.getById);
router.get("/admin/subcategories/by-category/:categoryId", SubcategoryController.listByCategoryId);
router.get("/admin/subcategories/:id", SubcategoryController.getById);
router.get("/admin/products/by-subcategory/:subcategoryId", ProductController.listBySubcategoryId);
router.get("/admin/products/detail/:id", ProductController.getById);
router.get("/admin/calculators/by-product/:productId", CalculatorController.listByProductId);
router.get("/admin/calculators/:id", CalculatorController.getById);

// ── Dashboard: POST /admin/categories ───────────────────────
router.post(
  "/admin/categories",
  isInternalRequest,
  authMiddleware,
  requirePermission("clee", "create"),
  pendingInterceptor({
    module:    "clee",
    operation: "create",
    extractPayload: async (req) => ({
      entityId: null,
      payload: { new: req.body as Record<string, unknown> },
    }),
  }),
  logActivity({
    module: "clee",
    action: "create",
    extractMeta: (req) => ({
      entityId: null,
      diff: { new: req.body as Record<string, unknown> },
    }),
  }),
  CategoryController.create
);

// ── Dashboard: PUT /admin/categories/:id ────────────────────
router.put(
  "/admin/categories/:id",
  isInternalRequest,
  authMiddleware,
  requirePermission("clee", "update"),
  pendingInterceptor({
    module:    "clee",
    operation: "update",
    extractPayload: async (req) => ({
      entityId: req.params["id"] ?? null,
      payload: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  logActivity({
    module: "clee",
    action: "update",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
      diff: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  CategoryController.update
);

// ── Dashboard: DELETE /admin/categories/:id ─────────────────
router.delete(
  "/admin/categories/:id",
  isInternalRequest,
  authMiddleware,
  requirePermission("clee", "delete"),
  pendingInterceptor({
    module:    "clee",
    operation: "delete",
    extractPayload: async (req) => ({
      entityId: req.params["id"] ?? null,
      payload: {
        new: null,
      },
    }),
  }),
  logActivity({
    module: "clee",
    action: "delete",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
    }),
  }),
  CategoryController.remove
);

// ── Dashboard: POST /admin/subcategories ────────────────────
router.post(
  "/admin/subcategories",
  isInternalRequest,
  authMiddleware,
  requirePermission("clee", "create"),
  pendingInterceptor({
    module:    "clee",
    operation: "create",
    extractPayload: async (req) => ({
      entityId: null,
      payload: { new: req.body as Record<string, unknown> },
    }),
  }),
  logActivity({
    module: "clee",
    action: "create",
    extractMeta: (req) => ({
      entityId: null,
      diff: { new: req.body as Record<string, unknown> },
    }),
  }),
  SubcategoryController.create
);

// ── Dashboard: PUT /admin/subcategories/:id ─────────────────
router.put(
  "/admin/subcategories/:id",
  isInternalRequest,
  authMiddleware,
  requirePermission("clee", "update"),
  pendingInterceptor({
    module:    "clee",
    operation: "update",
    extractPayload: async (req) => ({
      entityId: req.params["id"] ?? null,
      payload: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  logActivity({
    module: "clee",
    action: "update",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
      diff: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  SubcategoryController.update
);

// ── Dashboard: DELETE /admin/subcategories/:id ──────────────
router.delete(
  "/admin/subcategories/:id",
  isInternalRequest,
  authMiddleware,
  requirePermission("clee", "delete"),
  pendingInterceptor({
    module:    "clee",
    operation: "delete",
    extractPayload: async (req) => ({
      entityId: req.params["id"] ?? null,
      payload: {
        new: null,
      },
    }),
  }),
  logActivity({
    module: "clee",
    action: "delete",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
    }),
  }),
  SubcategoryController.remove
);

// ── Dashboard: POST /admin/products ─────────────────────────
router.post(
  "/admin/products",
  isInternalRequest,
  authMiddleware,
  requirePermission("clee", "create"),
  productImageMiddleware,
  pendingInterceptor({
    module:    "clee",
    operation: "create",
    extractPayload: async (req) => ({
      entityId: null,
      payload: { new: req.body as Record<string, unknown> },
    }),
  }),
  logActivity({
    module: "clee",
    action: "create",
    extractMeta: (req) => ({
      entityId: null,
      diff: { new: req.body as Record<string, unknown> },
    }),
  }),
  ProductController.create
);

// ── Dashboard: PUT /admin/products/:id ──────────────────────
router.put(
  "/admin/products/:id",
  isInternalRequest,
  authMiddleware,
  requirePermission("clee", "update"),
  productImageMiddleware,
  pendingInterceptor({
    module:    "clee",
    operation: "update",
    extractPayload: async (req) => ({
      entityId: req.params["id"] ?? null,
      payload: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  logActivity({
    module: "clee",
    action: "update",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
      diff: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  ProductController.update
);

// ── Dashboard: DELETE /admin/products/:id ───────────────────
router.delete(
  "/admin/products/:id",
  isInternalRequest,
  authMiddleware,
  requirePermission("clee", "delete"),
  pendingInterceptor({
    module:    "clee",
    operation: "delete",
    extractPayload: async (req) => ({
      entityId: req.params["id"] ?? null,
      payload: {
        new: null,
      },
    }),
  }),
  logActivity({
    module: "clee",
    action: "delete",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
    }),
  }),
  ProductController.remove
);

// ── Dashboard: POST /admin/calculators ──────────────────────
router.post(
  "/admin/calculators",
  isInternalRequest,
  authMiddleware,
  requirePermission("clee", "create"),
  pendingInterceptor({
    module:    "clee",
    operation: "create",
    extractPayload: async (req) => ({
      entityId: null,
      payload: { new: req.body as Record<string, unknown> },
    }),
  }),
  logActivity({
    module: "clee",
    action: "create",
    extractMeta: (req) => ({
      entityId: null,
      diff: { new: req.body as Record<string, unknown> },
    }),
  }),
  CalculatorController.create
);

// ── Dashboard: PUT /admin/calculators/:id ───────────────────
router.put(
  "/admin/calculators/:id",
  isInternalRequest,
  authMiddleware,
  requirePermission("clee", "update"),
  pendingInterceptor({
    module:    "clee",
    operation: "update",
    extractPayload: async (req) => ({
      entityId: req.params["id"] ?? null,
      payload: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  logActivity({
    module: "clee",
    action: "update",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
      diff: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  CalculatorController.update
);

// ── Dashboard: PATCH /admin/calculators/:id/fields ──────────
router.patch(
  "/admin/calculators/:id/fields",
  isInternalRequest,
  authMiddleware,
  requirePermission("clee", "update"),
  pendingInterceptor({
    module:    "clee",
    operation: "update",
    extractPayload: async (req) => ({
      entityId: req.params["id"] ?? null,
      payload: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  logActivity({
    module: "clee",
    action: "update",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
      diff: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  CalculatorController.patchFields
);

// ── Dashboard: DELETE /admin/calculators/:id ────────────────
router.delete(
  "/admin/calculators/:id",
  isInternalRequest,
  authMiddleware,
  requirePermission("clee", "delete"),
  pendingInterceptor({
    module:    "clee",
    operation: "delete",
    extractPayload: async (req) => ({
      entityId: req.params["id"] ?? null,
      payload: {
        new: null,
      },
    }),
  }),
  logActivity({
    module: "clee",
    action: "delete",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
    }),
  }),
  CalculatorController.remove
);

export default router;