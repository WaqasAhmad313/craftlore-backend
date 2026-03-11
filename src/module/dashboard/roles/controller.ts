import type { Request, Response } from "express";
import { RolesService } from "./service.ts";

// ============================================
// TYPES
// ============================================

interface CreateRoleBody {
  name: string;
  description: string | null;
  permissions: Record<string, Record<string, boolean>>;
  is_high_risk: boolean;
}

interface UpdateRoleBody {
  name: string;
  description: string | null;
  permissions: Record<string, Record<string, boolean>>;
  is_high_risk: boolean;
}

interface ToggleActiveBody {
  is_active: boolean;
}

// ============================================
// ROLES CONTROLLER
// ============================================

export class RolesController {
  // ── POST /dashboard/roles ───────────────────

  static async createRole(req: Request, res: Response): Promise<Response> {
    try {
      const body = req.body as CreateRoleBody;

      const { name, description, permissions, is_high_risk } = body;

      if (
        typeof name         !== "string"  || name.trim()  === "" ||
        typeof is_high_risk !== "boolean" ||
        typeof permissions  !== "object"  || permissions === null
      ) {
        return res.status(400).json({
          message: "name, permissions and is_high_risk are required.",
        });
      }

      const role = await RolesService.createRole({
        name,
        description:  typeof description === "string" ? description : null,
        permissions,
        isHighRisk:   is_high_risk,
      });

      return res.status(201).json({ role });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create role.";
      return res.status(400).json({ message });
    }
  }

  // ── GET /dashboard/roles ────────────────────

  static async listRoles(req: Request, res: Response): Promise<Response> {
    try {
      const roles = await RolesService.listRoles();
      return res.status(200).json({ roles });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch roles.";
      return res.status(500).json({ message });
    }
  }

  // ── GET /dashboard/roles/:id ────────────────

  static async getRole(req: Request, res: Response): Promise<Response> {
    try {
      const roleId = parseInt(req.params["id"] ?? "", 10);

      if (isNaN(roleId)) {
        return res.status(400).json({ message: "Invalid role id." });
      }

      const role = await RolesService.getRole(roleId);
      return res.status(200).json({ role });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch role.";
      return res.status(404).json({ message });
    }
  }

  // ── PATCH /dashboard/roles/:id ──────────────

  static async updateRole(req: Request, res: Response): Promise<Response> {
    try {
      const roleId = parseInt(req.params["id"] ?? "", 10);

      if (isNaN(roleId)) {
        return res.status(400).json({ message: "Invalid role id." });
      }

      const body = req.body as UpdateRoleBody;

      const { name, description, permissions, is_high_risk } = body;

      if (
        typeof name         !== "string"  || name.trim()  === "" ||
        typeof is_high_risk !== "boolean" ||
        typeof permissions  !== "object"  || permissions === null
      ) {
        return res.status(400).json({
          message: "name, permissions and is_high_risk are required.",
        });
      }

      const role = await RolesService.updateRole({
        roleId,
        name,
        description:  typeof description === "string" ? description : null,
        permissions,
        isHighRisk:   is_high_risk,
      });

      return res.status(200).json({ role });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update role.";
      return res.status(400).json({ message });
    }
  }

  // ── DELETE /dashboard/roles/:id ─────────────

  static async deleteRole(req: Request, res: Response): Promise<Response> {
    try {
      const roleId = parseInt(req.params["id"] ?? "", 10);

      if (isNaN(roleId)) {
        return res.status(400).json({ message: "Invalid role id." });
      }

      await RolesService.deleteRole(roleId);

      return res.status(200).json({ message: "Role deleted." });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to delete role.";
      return res.status(400).json({ message });
    }
  }

  // ── PATCH /dashboard/roles/:id/toggle ───────

  static async toggleActive(req: Request, res: Response): Promise<Response> {
    try {
      const roleId = parseInt(req.params["id"] ?? "", 10);

      if (isNaN(roleId)) {
        return res.status(400).json({ message: "Invalid role id." });
      }

      const body = req.body as ToggleActiveBody;

      if (typeof body.is_active !== "boolean") {
        return res.status(400).json({
          message: "is_active (boolean) is required.",
        });
      }

      await RolesService.toggleRoleActive(roleId, body.is_active);

      return res.status(200).json({
        message: `Role ${body.is_active ? "activated" : "deactivated"}.`,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update role.";
      return res.status(400).json({ message });
    }
  }
}