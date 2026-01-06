import type { Request, Response } from 'express';
import { AuthorizedUserService } from './service.ts';
import type { ScrapeAndSaveResponse } from './service.ts';
import type { AuthorizedUserWithCategory } from './model.ts';

interface ScrapeRequestBody {
  applicationNumber: string;
}

interface SearchByAuthNumberBody {
  searchValue: string;
}

interface GetByApplicationNumberParams {
  applicationNumber?: string;
}

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: string;
}

type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

/**
 * Controller for handling Authorized Users operations
 */
class AuthorizedUserController {
  /**
   * Scrape and save authorized users
   * POST /api/authorized-users/scrape
   * Body: { applicationNumber: string }
   */
  async scrapeAndSave(req: Request, res: Response<ApiResponse<ScrapeAndSaveResponse>>): Promise<void> {
    try {
      const body = req.body as Partial<ScrapeRequestBody>;
      const { applicationNumber } = body;

      // Validation
      if (!applicationNumber) {
        res.status(400).json({
          success: false,
          error: 'Application number is required'
        });
        return;
      }

      if (typeof applicationNumber !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Application number must be a string'
        });
        return;
      }

      if (applicationNumber.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Application number cannot be empty'
        });
        return;
      }

      // Scrape and save
      const result = await AuthorizedUserService.scrapeAndSave(applicationNumber.trim());

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to scrape and save data';

      res.status(500).json({
        success: false,
        error: errorMessage
      });
    }
  }

  /**
   * Get authorized user by auth number or full pattern
   * POST /api/authorized-users/search
   * Body: { searchValue: string }
   */
  async getByAuthNumber(req: Request, res: Response<ApiResponse<AuthorizedUserWithCategory>>): Promise<void> {
    try {
      const body = req.body as Partial<SearchByAuthNumberBody>;
      const { searchValue } = body;

      // Validation
      if (!searchValue) {
        res.status(400).json({
          success: false,
          error: 'Search value is required'
        });
        return;
      }

      if (typeof searchValue !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Search value must be a string'
        });
        return;
      }

      if (searchValue.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Search value cannot be empty'
        });
        return;
      }

      // Search
      const result = await AuthorizedUserService.getByAuthNumber(searchValue.trim());

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to find authorized user';

      // Return 404 if user not found
      const statusCode = error instanceof Error && error.message === 'Authorized user not found' ? 404 : 500;

      res.status(statusCode).json({
        success: false,
        error: errorMessage
      });
    }
  }

  /**
   * Get all authorized users for an application
   * GET /api/authorized-users/:applicationNumber
   */
  async getByApplicationNumber(req: Request, res: Response<ApiResponse<any[]>>): Promise<void> {
    try {
      const { applicationNumber } = req.params;

      // Validation
      if (!applicationNumber) {
        res.status(400).json({
          success: false,
          error: 'Application number is required'
        });
        return;
      }

      const appNumber = parseInt(applicationNumber);

      if (isNaN(appNumber)) {
        res.status(400).json({
          success: false,
          error: 'Application number must be a valid number'
        });
        return;
      }

      // Get users
      const result = await AuthorizedUserService.getByApplicationNumber(appNumber);

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch authorized users';

      res.status(500).json({
        success: false,
        error: errorMessage
      });
    }
  }
}

// Export singleton instance
export const authorizedUserController = new AuthorizedUserController();