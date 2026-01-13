import type { Request, Response, NextFunction } from "express";
import BlacklistService from "./service.ts";
import type { BlacklistStatus } from "./model.ts";

interface BlockEntityRequest {
  blacklist_reason: string;
  reason_code: string;
  blacklisted_by: string;
  blacklist_until?: string;
}

class BlacklistController {
  /**
   * Block entity and create blacklist entry (COMBINED)
   * POST /api/craft-entities/:id/block
   */
  static async blockEntity(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const {
        blacklist_reason,
        reason_code,
        blacklisted_by,
        blacklist_until
      } = req.body as BlockEntityRequest;

      // Validate required fields
      if (!blacklist_reason || !reason_code || !blacklisted_by) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: blacklist_reason, reason_code, blacklisted_by'
        });
        return;
      }

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Entity ID is required in URL params'
        });
        return;
      }

      const result = await BlacklistService.blockEntity(id, {
        blacklist_reason,
        reason_code,
        blacklisted_by,
        blacklist_until: blacklist_until || null
      });

      res.status(200).json({
        success: true,
        message: 'Entity blocked successfully',
        data: result
      });
      return;
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          error: error.message
        });
        return;
      }
      next(error);
    }
  }

  /**
   * Unblock entity (revoke blacklist)
   * POST /api/craft-entities/:id/unblock
   */
  static async unblockEntity(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Entity ID is required in URL params'
        });
        return;
      }

      const result = await BlacklistService.unblockEntity(id);

      res.status(200).json({
        success: true,
        message: 'Entity unblocked successfully',
        data: result
      });
      return;
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          error: error.message
        });
        return;
      }
      next(error);
    }
  }

  /**
   * Get all blacklist entries
   * GET /api/blacklist
   */
  static async getAllBlacklist(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        status,
        craft_id,
        page,
        limit
      } = req.query;

      const filters: {
        status?: BlacklistStatus | 'all';
        craft_id?: string;
        page?: number;
        limit?: number;
      } = {};

      if (status) filters.status = status as BlacklistStatus | 'all';
      if (craft_id) filters.craft_id = craft_id as string;
      if (page) filters.page = parseInt(page as string);
      if (limit) filters.limit = parseInt(limit as string);

      const result = await BlacklistService.getAllBlacklist(
        Object.keys(filters).length > 0 ? filters : undefined
      );

      res.status(200).json({
        success: true,
        data: result
      });
      return;
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          error: error.message
        });
        return;
      }
      next(error);
    }
  }

  /**
   * Get blacklist entry by ID
   * GET /api/blacklist/:id
   */
  static async getBlacklistById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Blacklist entry ID is required'
        });
        return;
      }

      const entry = await BlacklistService.getBlacklistById(id);

      res.status(200).json({
        success: true,
        data: entry
      });
      return;
    } catch (error) {
      if (error instanceof Error) {
        res.status(404).json({
          success: false,
          error: error.message
        });
        return;
      }
      next(error);
    }
  }

  /**
   * Get blacklist entry by craft_id
   * GET /api/blacklist/craft/:craft_id
   */
  static async getBlacklistByCraftId(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { craft_id } = req.params;

      if (!craft_id) {
        res.status(400).json({
          success: false,
          error: 'Craft ID is required'
        });
        return;
      }

      const entry = await BlacklistService.getBlacklistByCraftId(craft_id);

      if (!entry) {
        res.status(404).json({
          success: false,
          error: 'No active blacklist entry found for this entity'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: entry
      });
      return;
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          error: error.message
        });
        return;
      }
      next(error);
    }
  }

  /**
   * Update blacklist status
   * PATCH /api/blacklist/:id/status
   */
  static async updateBlacklistStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body as { status?: BlacklistStatus };

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Blacklist entry ID is required'
        });
        return;
      }

      if (!status) {
        res.status(400).json({
          success: false,
          error: 'Status is required in request body'
        });
        return;
      }

      const validStatuses: BlacklistStatus[] = ['ACTIVE', 'REVOKED', 'UNDER_REVIEW'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Invalid status. Must be ACTIVE, REVOKED, or UNDER_REVIEW'
        });
        return;
      }

      const entry = await BlacklistService.updateBlacklistStatus(id, status);

      res.status(200).json({
        success: true,
        message: 'Blacklist status updated successfully',
        data: entry
      });
      return;
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          error: error.message
        });
        return;
      }
      next(error);
    }
  }

  /**
   * Delete blacklist entry (sets entity status to pending)
   * DELETE /api/blacklist/:id
   */
  static async deleteBlacklist(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Blacklist entry ID is required'
        });
        return;
      }

      const result = await BlacklistService.deleteBlacklist(id);

      res.status(200).json({
        success: true,
        message: 'Blacklist entry deleted successfully. Entity status set to pending.',
        data: result
      });
      return;
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          error: error.message
        });
        return;
      }
      next(error);
    }
  }
}

export default BlacklistController;