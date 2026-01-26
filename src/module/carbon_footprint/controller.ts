import type { Request, Response } from "express";
import { CarbonFootprintService } from "./service.ts";
import { CarbonFootprintModel } from "./model.ts";

// Extend Request type to include session
interface RequestWithSession extends Request {
  session?: {
    id?: string;
  };
}

export class CarbonFootprintController {
  /**
   * POST /api/carbon/calculate
   * HYBRID calculator - auto-detects quick or professional mode
   */
  static async calculate(req: RequestWithSession, res: Response): Promise<void> {
    try {
      const params = req.body;
      const userId = (req as any).user?.id;
      const sessionId = req.session?.id || (req.headers['x-session-id'] as string);
      
      const result = await CarbonFootprintService.calculate(params, userId, sessionId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/carbon/compare
   * Compare multiple products
   */
  static async compareProducts(req: RequestWithSession, res: Response): Promise<void> {
    try {
      const { products } = req.body;
      const userId = (req as any).user?.id;
      const sessionId = req.session?.id || (req.headers['x-session-id'] as string);
      
      const result = await CarbonFootprintService.compareProducts(products, userId, sessionId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/carbon/history
   * Get calculation history
   */
  static async getHistory(req: RequestWithSession, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const sessionId = req.session?.id || (req.headers['x-session-id'] as string);
      const limit = parseInt(req.query.limit as string) || 20;
      
      let calculations;
      if (userId) calculations = await CarbonFootprintModel.getUserHistory(userId, limit);
      else if (sessionId) calculations = await CarbonFootprintModel.getSessionHistory(sessionId, limit);
      else { res.status(400).json({ success: false, message: 'No user or session' }); return; }
      
      res.status(200).json({ success: true, data: calculations });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/carbon/statistics
   * Get analytics/statistics
   */
  static async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const stats = await CarbonFootprintModel.getStatistics();
      res.status(200).json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/carbon-factors/config/:key
   * Get configuration data
   */
  static async getConfig(req: Request, res: Response): Promise<void> {
    try {
      const key = req.params.key;
      if (!key) {
        res.status(400).json({ success: false, message: 'Config key is required' });
        return;
      }
      
      const config = await CarbonFootprintModel.getConfig(key);
      res.status(200).json({ success: true, data: config });
    } catch (error: any) {
      if (error.message.includes('not found')) res.status(404).json({ success: false, message: error.message });
      else res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/carbon-factors/baselines
   * Get all baseline comparisons
   */
  static async getBaselines(req: Request, res: Response): Promise<void> {
    try {
      const baselines = await CarbonFootprintModel.getBaselines();
      res.status(200).json({ success: true, data: baselines });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/admin/carbon-factors
   * SMART GET - handles all cases based on query params:
   * - No params: get all
   * - ?type=material: get by type
   * - ?id=123: get by id
   */
  static async getFactors(req: Request, res: Response): Promise<void> {
    try {
      const { id, type, is_active, search, limit, offset } = req.query;

      // Case 1: Get by ID
      if (id) {
        const factorId = parseInt(id as string);
        if (isNaN(factorId)) {
          res.status(400).json({ success: false, message: 'Invalid ID' });
          return;
        }
        const factor = await CarbonFootprintModel.getFactorById(factorId);
        res.status(200).json({ success: true, data: factor });
        return;
      }

      // Case 2: Get by type
      if (type) {
        const activeFilter = is_active === 'true' ? true : is_active === 'false' ? false : undefined;
        const factors = await CarbonFootprintModel.getFactorsByType(type as any, activeFilter);
        res.status(200).json({ success: true, data: factors });
        return;
      }

      // Case 3: Get all with filters
      const filters = {
        is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
        search: search as string,
        limit: parseInt(limit as string) || 100,
        offset: parseInt(offset as string) || 0,
      };
      const factors = await CarbonFootprintModel.getAllFactors(filters);
      res.status(200).json({ success: true, data: factors });
    } catch (error: any) {
      if (error.message === 'Factor not found') res.status(404).json({ success: false, message: error.message });
      else res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/admin/carbon-factors
   * UPSERT carbon factor (create if no id, update if id exists)
   */
  static async upsertFactor(req: Request, res: Response): Promise<void> {
    try {
      const result = await CarbonFootprintModel.upsertFactor(req.body);
      const message = req.body.id ? 'Factor updated successfully' : 'Factor created successfully';
      const statusCode = req.body.id ? 200 : 201;

      res.status(statusCode).json({ success: true, message, data: result });
    } catch (error: any) {
      if (error.message === 'Factor not found') res.status(404).json({ success: false, message: error.message });
      else res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * DELETE /api/admin/carbon-factors/:id
   * Delete a carbon factor
   */
  static async deleteFactor(req: Request, res: Response): Promise<void> {
    try {
      const idParam = req.params.id;
      if (!idParam) {
        res.status(400).json({ success: false, message: 'ID is required' });
        return;
      }
      
      const id = parseInt(idParam);
      if (isNaN(id)) { 
        res.status(400).json({ success: false, message: 'Invalid ID' }); 
        return; 
      }
      
      await CarbonFootprintModel.deleteFactor(id);
      res.status(200).json({ success: true, message: 'Factor deleted' });
    } catch (error: any) {
      if (error.message === 'Factor not found') res.status(404).json({ success: false, message: error.message });
      else res.status(500).json({ success: false, message: error.message });
    }
  }
}