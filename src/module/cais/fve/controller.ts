import type { Request, Response } from "express";
import { z } from "zod";
import FveService from "./service.ts";

const RecalcSchema = z.object({
  appraisal_id: z.coerce.number().int().positive(),
  pam_payload: z.unknown(),
});

export default class FveController {
  /** Optional admin endpoint if you want manual recalculation. */
  static async recalculate(req: Request, res: Response): Promise<Response> {
    const parsed = RecalcSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Invalid payload", issues: parsed.error.issues });
    }

    try {
      const valuation = await FveService.computeAndSaveValuation({
        appraisalId: String(parsed.data.appraisal_id),
        pamPayload: parsed.data.pam_payload,
      });
      return res.status(200).json({ success: true, data: valuation });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to recalculate";
      return res.status(500).json({ success: false, message });
    }
  }

  static async getByAppraisal(req: Request, res: Response): Promise<Response> {
    try {
      const appraisalId = req.params.appraisalId as string;
      const valuation = await FveService.getValuationByAppraisalId(appraisalId);
      return res.status(200).json({ success: true, data: valuation });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load valuation";
      return res.status(500).json({ success: false, message });
    }
  }
}
