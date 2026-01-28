import type { Request, Response } from "express";
import { z } from "zod";
import PamService from "./service.ts";

const MaterialSchema = z.object({
  material_type: z.string().min(1),
  material_grade: z.string().min(1),
  quantity: z.number().finite().nonnegative(),
  unit: z.string().min(1),
  unit_cost: z.number().finite().nonnegative(),
  source_region: z.string().min(1),
  certification_available: z.boolean(),
});

const LaborSchema = z.object({
  artisan_name: z.string().min(1),
  skill_tier: z.string().min(1),
  hours_spent: z.number().finite().nonnegative(),
  technique_difficulty: z.string().min(1),
  specialized_technique: z.string().optional().default(""),
  years_of_experience: z.number().finite().int().nonnegative(),
});

const CraftsmanshipSchema = z.object({
  complexity_score: z.number().finite().min(0).max(10),
  density_level: z.string().min(1),
  density_value: z.number().finite().nonnegative(),
  density_unit: z.string().min(1),
  finish_quality: z.string().min(1),
  technique_mastery_score: z.number().finite().min(0).max(10),
  innovation_factor: z.number().finite().min(0),
});

const ProvenanceSchema = z.object({
  gi_verified: z.boolean(),
  gi_certificate_number: z.string().optional().default(""),
  gi_verification_date: z.string().optional().default(""),
  artisan_certification: z.string().optional().default(""),
  workshop_registration_number: z.string().optional().default(""),
  chain_of_custody_documented: z.boolean(),
  raw_material_traceability: z.boolean(),
});

const CraftIdentitySchema = z.object({
  craft_type: z.string().min(1),
  craft_name: z.string().min(1),
  gi_number: z.string().optional().nullable(),
  gi_verified: z.boolean(),
  region: z.string().min(1),
  vendor_name: z.string().min(1),
  vendor_email: z.string().email(),
  vendor_phone: z.string().optional().nullable(),
  product_description: z.string().optional().nullable(),
});

const CreatePamSchema = z.object({
  craft_identity: CraftIdentitySchema,
  materials: z.array(MaterialSchema).min(1),
  labor: LaborSchema,
  craftsmanship: CraftsmanshipSchema,
  provenance: ProvenanceSchema,
});

const ListSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

const RejectSchema = z.object({
  reason: z.string().min(1),
});

export default class PamController {
  static async create(req: Request, res: Response): Promise<Response> {
    const parsed = CreatePamSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid PAM payload",
        issues: parsed.error.issues,
      });
    }

    try {
      const created = await PamService.create(parsed.data);
      return res.status(201).json({ success: true, data: created });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create appraisal";
      return res.status(500).json({ success: false, message });
    }
  }

  static async list(req: Request, res: Response): Promise<Response> {
    const parsed = ListSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid query params",
        issues: parsed.error.issues,
      });
    }

    try {
      const result = await PamService.list(parsed.data);
      return res.status(200).json({ success: true, ...result });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to list appraisals";
      return res.status(500).json({ success: false, message });
    }
  }

  static async stats(_req: Request, res: Response): Promise<Response> {
    try {
      const stats = await PamService.stats();
      return res.status(200).json({ success: true, data: stats });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load stats";
      return res.status(500).json({ success: false, message });
    }
  }

  static async getDetails(req: Request, res: Response): Promise<Response> {
    try {
      const id = req.params.id as string;
      const result = await PamService.getDetails(id);
      if (!result) {
        return res.status(404).json({ success: false, message: "Appraisal not found" });
      }
      return res.status(200).json({ success: true, data: result });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load appraisal";
      return res.status(500).json({ success: false, message });
    }
  }

  static async approve(req: Request, res: Response): Promise<Response> {
    try {
      const id = req.params.id as string;
      const result = await PamService.approve(id);
      return res.status(200).json({ success: true, data: result });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to approve appraisal";
      return res.status(500).json({ success: false, message });
    }
  }

  static async reject(req: Request, res: Response): Promise<Response> {
    const parsed = RejectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid rejection payload",
        issues: parsed.error.issues,
      });
    }

    try {
      const id = req.params.id as string;
      const updated = await PamService.reject(id, parsed.data.reason);
      return res.status(200).json({ success: true, data: updated });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to reject appraisal";
      return res.status(500).json({ success: false, message });
    }
  }

  /** Edit appraisal request (your requested “edit appraisal”). */
  static async editPayload(req: Request, res: Response): Promise<Response> {
    try {
      const id = req.params.id as string;
      // Keep this loose: it’s JSONB and your UI might evolve.
      const pamPayload = req.body as unknown;
      const updated = await PamService.editPamPayload(id, pamPayload);
      return res.status(200).json({ success: true, data: updated });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update appraisal";
      return res.status(500).json({ success: false, message });
    }
  }

  static async delete(req: Request, res: Response): Promise<Response> {
    try {
      const id = req.params.id as string;
      await PamService.delete(id);
      return res.status(200).json({ success: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete appraisal";
      return res.status(500).json({ success: false, message });
    }
  }
}
