import type { Request, Response } from 'express';
import { CounterfeitReportService } from './service.ts';
import type { CreateOrUpdateReportParams } from './types/types.ts';

export class CounterfeitReportController {
  // POST /counterfeit-report
  static async createOrUpdate(req: Request, res: Response) {
    try {
      const files = (req.files as Record<string, Express.Multer.File[]>) || undefined;

      const params: CreateOrUpdateReportParams = {
        id: req.body.id, // optional for update
        verificationCode: req.body.verificationCode,
        reporterInfo: req.body.reporterInfo,
        productInfo: req.body.productInfo,
        sellerInfo: req.body.sellerInfo,
        resolutionInfo: req.body.resolutionInfo,
        status: req.body.status,
        priority: req.body.priority,
        files,
      };

      const result = await CounterfeitReportService.createOrUpdateReport(params);

      res.status(200).json({
        success: true,
        reportId: result.reportId,
        trackingId: result.trackingId,
        created: result.created,
      });
    } catch (err: unknown) {
      console.error('Error in createOrUpdateReport:', err);

      res.status(500).json({
        success: false,
        message: (err as Error).message || 'Internal server error',
      });
    }
  }
}
