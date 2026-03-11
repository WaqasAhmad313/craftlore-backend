import { RolesModel } from "./model.ts";
import type { RoleRow, InsertRoleParams, UpdateRoleParams } from "./model.ts";

// ============================================
// TYPES
// ============================================

export interface CreateRoleParams {
  name: string;
  description: string | null;
  permissions: Record<string, Record<string, boolean>>;
  isHighRisk: boolean;
}

export interface UpdateRoleParams2 {
  roleId: number;
  name: string;
  description: string | null;
  permissions: Record<string, Record<string, boolean>>;
  isHighRisk: boolean;
}

// ============================================
// PERMISSION STRUCTURE VALIDATOR
// Ensures permissions JSONB matches expected shape:
// { [moduleKey]: { view, create, update, delete } }
// All keys must be boolean.
// Unknown action keys are rejected.
// ============================================

const VALID_ACTIONS = new Set(["view", "create", "update", "delete"]);

function validatePermissions(
  permissions: unknown
): Record<string, Record<string, boolean>> {
  if (
    typeof permissions !== "object" ||
    permissions === null ||
    Array.isArray(permissions)
  ) {
    throw new Error("permissions must be a non-null object.");
  }

  const perms = permissions as Record<string, unknown>;

  for (const [module, actions] of Object.entries(perms)) {
    if (module.trim() === "") {
      throw new Error("Module key cannot be empty.");
    }

    if (
      typeof actions !== "object" ||
      actions === null ||
      Array.isArray(actions)
    ) {
      throw new Error(
        `Permissions for module "${module}" must be an object.`
      );
    }

    const actionsObj = actions as Record<string, unknown>;

    for (const [action, value] of Object.entries(actionsObj)) {
      if (!VALID_ACTIONS.has(action)) {
        throw new Error(
          `Invalid action "${action}" on module "${module}". Allowed: view, create, update, delete.`
        );
      }

      if (typeof value !== "boolean") {
        throw new Error(
          `Permission value for "${module}.${action}" must be a boolean.`
        );
      }
    }
  }

  return perms as Record<string, Record<string, boolean>>;
}

// ============================================
// ROLES SERVICE
// ============================================

export class RolesService {
  // ── Create Role ─────────────────────────────

  static async createRole(params: CreateRoleParams): Promise<RoleRow> {
    const existing = await RolesModel.findRoleByName(params.name);

    if (existing !== null) {
      throw new Error(`A role named "${params.name}" already exists.`);
    }

    const validatedPermissions = validatePermissions(params.permissions);

    const insertParams: InsertRoleParams = {
      name:        params.name.trim(),
      description: params.description,
      permissions: validatedPermissions,
      isHighRisk:  params.isHighRisk,
    };

    return RolesModel.insertRole(insertParams);
  }

  // ── List Roles ──────────────────────────────

  static async listRoles(): Promise<RoleRow[]> {
    return RolesModel.listRoles();
  }

  // ── Get Role ────────────────────────────────

  static async getRole(roleId: number): Promise<RoleRow> {
    const role = await RolesModel.findRoleById(roleId);

    if (role === null) {
      throw new Error("Role not found.");
    }

    return role;
  }

  // ── Update Role ─────────────────────────────

  static async updateRole(params: UpdateRoleParams2): Promise<RoleRow> {
    const role = await RolesModel.findRoleById(params.roleId);

    if (role === null) {
      throw new Error("Role not found.");
    }

    // Check name conflict only if name is changing
    if (params.name.trim().toLowerCase() !== role.name.toLowerCase()) {
      const existing = await RolesModel.findRoleByName(params.name);

      if (existing !== null) {
        throw new Error(`A role named "${params.name}" already exists.`);
      }
    }

    const validatedPermissions = validatePermissions(params.permissions);

    const updateParams: UpdateRoleParams = {
      roleId:      params.roleId,
      name:        params.name.trim(),
      description: params.description,
      permissions: validatedPermissions,
      isHighRisk:  params.isHighRisk,
    };

    return RolesModel.updateRole(updateParams);
  }

  // ── Delete Role ─────────────────────────────

  static async deleteRole(roleId: number): Promise<void> {
    const role = await RolesModel.findRoleById(roleId);

    if (role === null) {
      throw new Error("Role not found.");
    }

    // Block deletion if active users are on this role
    const activeUsers = await RolesModel.countActiveUsersOnRole(roleId);

    if (activeUsers > 0) {
      throw new Error(
        `Cannot delete role. ${activeUsers} active user(s) are assigned to it. Reassign or deactivate them first.`
      );
    }

    await RolesModel.deleteRole(roleId);
  }

  // ── Toggle Active ───────────────────────────

  static async toggleRoleActive(
    roleId: number,
    isActive: boolean
  ): Promise<void> {
    const role = await RolesModel.findRoleById(roleId);

    if (role === null) {
      throw new Error("Role not found.");
    }

    if (!isActive) {
      // Warn if active users will be affected
      const activeUsers = await RolesModel.countActiveUsersOnRole(roleId);

      if (activeUsers > 0) {
        throw new Error(
          `Cannot deactivate role. ${activeUsers} active user(s) are assigned to it.`
        );
      }
    }

    await RolesModel.toggleRoleActive(roleId, isActive);
  }
}