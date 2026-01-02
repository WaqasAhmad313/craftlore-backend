import type { Request, Response } from "express";
import { CounterfeitReportService } from "./service.ts";
import type {
  CreateOrUpdateReportParams,
  GetAllCounterfeitReportsParams,
} from "./types/types.ts";

function parseJsonField<T>(value: unknown, fieldName: string): T {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${fieldName} is required`);
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${fieldName} contains invalid JSON`);
  }
}

export class CounterfeitReportController {
  // POST /counterfeit-report
  static async createOrUpdate(req: Request, res: Response) {
    try {
      const files =
        (req.files as Record<string, Express.Multer.File[]>) || undefined;

      const params: CreateOrUpdateReportParams = {
        id: req.body.id ?? null,
        verificationCode: req.body.verification_code || null,
        reporterInfo: parseJsonField(req.body.reporter_info, "reporter_info"),
        productInfo: parseJsonField(req.body.product_info, "product_info"),
        sellerInfo: req.body.seller_info
          ? parseJsonField(req.body.seller_info, "seller_info")
          : null,
        resolutionInfo: parseJsonField(
          req.body.resolution_info,
          "resolution_info"
        ),
        status: req.body.status,
        priority: req.body.priority,
        files,
      };

      const result = await CounterfeitReportService.createOrUpdateReport(
        params
      );

      res.status(200).json({
        success: true,
        reportId: result.reportId,
        trackingId: result.trackingId,
        created: result.created,
      });
    } catch (err) {
      console.error("Error in createOrUpdateReport:", err);

      res.status(500).json({
        success: false,
        message: err instanceof Error ? err.message : "Internal server error",
      });
    }
  }

  // GET /counterfeit-report?id=... OR ?trackingId=...
  static async getOne(req: Request, res: Response): Promise<Response> {
    try {
      const { id, trackingId } = req.query;

      if (!id && !trackingId) {
        return res.status(400).json({
          success: false,
          message: "Either id or trackingId must be provided",
        });
      }

      if (id && trackingId) {
        return res.status(400).json({
          success: false,
          message: "Provide only one of id or trackingId",
        });
      }

      const params =
        typeof id === "string"
          ? { id }
          : typeof trackingId === "string"
          ? { trackingId }
          : undefined;

      if (!params) {
        return res.status(400).json({
          success: false,
          message: "Invalid query parameters",
        });
      }

      const report = await CounterfeitReportService.getReport(params);

      return res.status(200).json({
        success: true,
        data: report,
      });
    } catch (err) {
      console.error("Error in getOne:", err);

      return res.status(404).json({
        success: false,
        message: err instanceof Error ? err.message : "Report not found",
      });
    }
  }

  // GET /counterfeit-reports
  static async getAll(req: Request, res: Response): Promise<Response> {
    try {
      const params: GetAllCounterfeitReportsParams = {};

      if (typeof req.query.status === "string") {
        const status = req.query.status as GetAllCounterfeitReportsParams["status"];
        if (status !== undefined) {
          params.status = status;
        }
      }

      if (typeof req.query.limit === "string") {
        const limit = Number(req.query.limit);
        if (!Number.isNaN(limit)) { 
          params.limit = limit;
        }
      }

      if (typeof req.query.offset === "string") {
        const offset = Number(req.query.offset);
        if (!Number.isNaN(offset)) {
          params.offset = offset;
        }
      }

      const reports = await CounterfeitReportService.getReports(params);

      const totalCount = reports.length > 0 && reports[0] ? reports[0].total_count : 0;

      return res.status(200).json({
        success: true,
        totalCount,
        data: reports,
      });
    } catch (err) {
      console.error("Error in getAll:", err);

      return res.status(500).json({
        success: false,
        message: err instanceof Error ? err.message : "Internal server error",
      });
    }
  }

  // PATCH /counterfeit-report/status - NEW METHOD
  static async updateStatus(req: Request, res: Response): Promise<Response> {
    try {
      const { id, status } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "id is required",
        });
      }

      if (!status) {
        return res.status(400).json({
          success: false,
          message: "status is required",
        });
      }

      const validStatuses = ['pending', 'under_review', 'investigating', 'verified', 'rejected', 'closed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        });
      }

      await CounterfeitReportService.updateReportStatus({ id, status });

      return res.status(200).json({
        success: true,
        message: "Status updated successfully",
      });
    } catch (err) {
      console.error("Error in updateStatus:", err);

      return res.status(500).json({
        success: false,
        message: err instanceof Error ? err.message : "Internal server error",
      });
    }
  }
}