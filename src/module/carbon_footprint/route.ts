import { Router } from "express";
import { CarbonFootprintController } from "./controller.ts";
import { authenticate } from "../../middleware/auth.ts";

const router = Router();
/**
 * POST /api/carbon/calculate
 * HYBRID calculator - works as both quick estimate AND professional assessment
 * Automatically detects mode based on input data
 */
router.post('/carbon/calculate', CarbonFootprintController.calculate);

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
 * GET /api/carbon-factors/dropdown-data
 * Get all carbon factors formatted for dropdowns (PUBLIC - no auth required)
 */
router.get('/carbon-factors/dropdown-data', CarbonFootprintController.getDropdownData);

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
 * Requires: Admin authentication
 */
router.get('/admin/carbon-factors', authenticate, CarbonFootprintController.getFactors);

/**
 * POST /api/admin/carbon-factors
 * UPSERT carbon factor (create or update based on presence of ID)
 * Requires: Admin authentication
 */
router.post('/admin/carbon-factors', authenticate, CarbonFootprintController.upsertFactor);

/**
 * DELETE /api/admin/carbon-factors/:id
 * Delete a carbon factor
 * Requires: Admin authentication
 */
router.delete('/admin/carbon-factors/:id', authenticate, CarbonFootprintController.deleteFactor);

export default router;