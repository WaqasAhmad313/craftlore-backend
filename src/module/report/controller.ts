// import type { Request, Response } from "express";
// import { CounterfeitReportService } from "./service.ts";
// import type { CreateOrUpdateReportParams } from "./types/types.ts";

// export class CounterfeitReportController {
//   // POST /counterfeit-report
//   static async createOrUpdate(req: Request, res: Response) {
//     console.log("BODY:", req.body);
//     console.log("FILES:", Object.keys(req.files ?? {}));
//     try {
//       const files =
//         (req.files as Record<string, Express.Multer.File[]>) || undefined;

//       const params: CreateOrUpdateReportParams = {
//         id: req.body.id, // optional for update
//         verificationCode: req.body.verificationCode,
//         reporterInfo: req.body.reporterInfo,
//         productInfo: req.body.productInfo,
//         sellerInfo: req.body.sellerInfo,
//         resolutionInfo: req.body.resolutionInfo,
//         status: req.body.status,
//         priority: req.body.priority,
//         files,
//       };

//       const result = await CounterfeitReportService.createOrUpdateReport(
//         params
//       );

//       res.status(200).json({
//         success: true,
//         reportId: result.reportId,
//         trackingId: result.trackingId,
//         created: result.created,
//       });
//     } catch (err: unknown) {
//       console.error("Error in createOrUpdateReport:", err);

//       res.status(500).json({
//         success: false,
//         message: (err as Error).message || "Internal server error",
//       });
//     }
//   }
// }

import type { Request, Response } from "express";
import { CounterfeitReportService } from "./service.ts";
import type { CreateOrUpdateReportParams } from "./types/types.ts";

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
}
