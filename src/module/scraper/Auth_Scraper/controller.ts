import type { Request, Response } from 'express';
import { ipIndiaScraperService, type ScraperResult } from './service.ts';

interface ScrapeSingleRequestBody {
  applicationNumber: string;
}

interface SuccessResponse {
  success: true;
  data: ScraperResult;
}

interface ErrorResponse {
  success: false;
  error: string;
}

interface HealthCheckResponse {
  success: true;
  message: string;
  timestamp: string;
}

type ApiResponse = SuccessResponse | ErrorResponse | HealthCheckResponse;

/**
 * Controller for handling IP India scraping requests
 */
class ScraperController {
  /**
   * Scrape single application
   * POST /api/scrape
   * Body: { applicationNumber: string }
   */
  async scrapeApplication(req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      console.log('\n📨 Received scrape request');
      console.log('Request Body:', JSON.stringify(req.body, null, 2));

      const body = req.body as Partial<ScrapeSingleRequestBody>;
      const { applicationNumber } = body;

      // Validation
      if (!applicationNumber) {
        console.error('❌ Validation Error: Application number is missing');
        res.status(400).json({
          success: false,
          error: 'Application number is required'
        });
        return;
      }

      if (typeof applicationNumber !== 'string') {
        console.error('❌ Validation Error: Application number must be a string');
        res.status(400).json({
          success: false,
          error: 'Application number must be a string'
        });
        return;
      }

      if (applicationNumber.trim().length === 0) {
        console.error('❌ Validation Error: Application number cannot be empty');
        res.status(400).json({
          success: false,
          error: 'Application number cannot be empty'
        });
        return;
      }

      console.log(`✅ Validation passed for application: ${applicationNumber}`);

      // Scrape data
      console.log('🔄 Calling scraper service...');
      const result: ScraperResult = await ipIndiaScraperService.scrapeApplicationData(
        applicationNumber.trim()
      );

      console.log('✅ Scraping completed successfully');
      console.log('\n📤 Sending response to client...');

      res.status(200).json({
        success: true,
        data: result
      });

      console.log('✅ Response sent successfully\n');

    } catch (error) {
      console.error('\n❌ Controller Error:');
      console.error('═══════════════════════════════════════════════════════════');
      
      if (error instanceof Error) {
        console.error(`Error Message: ${error.message}`);
        console.error(`Error Stack: ${error.stack || 'No stack trace available'}`);
      } else {
        console.error('Unknown error:', error);
      }
      
      console.error('═══════════════════════════════════════════════════════════\n');

      const errorMessage = error instanceof Error ? error.message : 'Failed to scrape data';

      res.status(500).json({
        success: false,
        error: errorMessage
      });

      console.log('📤 Error response sent to client\n');
    }
  }

  /**
   * Health check endpoint
   * GET /api/scrape/health
   */
  async healthCheck(req: Request, res: Response<HealthCheckResponse>): Promise<void> {
    console.log('🏥 Health check requested');
    
    const response: HealthCheckResponse = {
      success: true,
      message: 'Scraper service is running',
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
    
    console.log('✅ Health check response sent\n');
  }
}

// Export singleton instance
export const scraperController = new ScraperController();