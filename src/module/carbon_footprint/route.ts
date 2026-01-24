import { Router } from "express";
import { CarbonFootprintController } from "./controller.ts";

const router = Router();

/**
 * POST /api/carbon/calculate
 * HYBRID calculator - works as both quick estimate AND professional assessment
 * Automatically detects mode based on input data
 */
router.post('/carbon/calculate', CarbonFootprintController.calculate);

/**
 * POST /api/carbon/compare
 * Compare multiple products
 */
router.post('/carbon/compare', CarbonFootprintController.compareProducts);

/**
 * GET /api/carbon/history
 * Get calculation history for user/session
 */
router.get('/carbon/history', CarbonFootprintController.getHistory);

/**
 * GET /api/carbon/statistics
 * Get analytics/statistics
 */
router.get('/carbon/statistics', CarbonFootprintController.getStatistics);

/**
 * GET /api/carbon-factors/config/:key
 * Get configuration data (product_weights, etc.)
 */
router.get('/carbon-factors/config/:key', CarbonFootprintController.getConfig);

/**
 * GET /api/carbon-factors/baselines
 * Get all baseline comparisons
 */
router.get('/carbon-factors/baselines', CarbonFootprintController.getBaselines);

/**
 * GET /api/admin/carbon-factors
 * Get carbon factors - smart route that handles:
 * - GET /api/admin/carbon-factors (all factors)
 * - GET /api/admin/carbon-factors?type=material (by type)
 * - GET /api/admin/carbon-factors?id=123 (by ID)
 */
router.get('/admin/carbon-factors', CarbonFootprintController.getFactors);

/**
 * POST /api/admin/carbon-factors
 * UPSERT carbon factor (create or update based on presence of ID)
 */
router.post('/admin/carbon-factors', CarbonFootprintController.upsertFactor);

/**
 * DELETE /api/admin/carbon-factors/:id
 * Delete a carbon factor
 */
router.delete('/admin/carbon-factors/:id', CarbonFootprintController.deleteFactor);

/**
 * POST /api/admin/gi-products/:id/carbon/baseline
 * Create or update baseline for a GI product
 */
router.post('/admin/gi-products/:id/carbon/baseline', CarbonFootprintController.upsertBaseline);

/**
 * PUT /api/admin/gi-products/carbon/baselines/:baseline_id/activate
 * Set a baseline as active
 */
router.put('/admin/gi-products/carbon/baselines/:baseline_id/activate', CarbonFootprintController.activateBaseline);

/**
 * DELETE /api/admin/gi-products/carbon/baselines/:baseline_id
 * Delete a baseline
 */
router.delete('/admin/gi-products/carbon/baselines/:baseline_id', CarbonFootprintController.deleteBaseline);

export default router;