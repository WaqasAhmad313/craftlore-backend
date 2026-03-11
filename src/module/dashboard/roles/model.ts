import { db } from "../../../config/db.ts";

// ============================================
// TYPES
// ============================================

export interface RoleRow {
  id: number;
  name: string;
  description: string | null;
  permissions: Record<string, Record<string, boolean>>;
  is_high_risk: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface InsertRoleParams {
  name: string;
  description: string | null;
  permissions: Record<string, Record<string, boolean>>;
  isHighRisk: boolean;
}

export interface UpdateRoleParams {
  roleId: number;
  name: string;
  description: string | null;
  permissions: Record<string, Record<string, boolean>>;
  isHighRisk: boolean;
}

// ============================================
// ROLES MODEL
// ============================================

export class RolesModel {
  static async insertRole(params: InsertRoleParams): Promise<RoleRow> {
    const result = await db.query<RoleRow>(
      `
      INSERT INTO dashboard.roles
        (name, description, permissions, is_high_risk)
      VALUES
        ($1, $2, $3, $4)
      RETURNING *
      `,
      [
        params.name,
        params.description,
        JSON.stringify(params.permissions),
        params.isHighRisk,
      ]
    );

    const row = result.rows[0];

    if (row === undefined) {
      throw new Error("Failed to create role.");
    }

    return row;
  }

  static async findRoleById(roleId: number): Promise<RoleRow | null> {
    const result = await db.query<RoleRow>(
      `
      SELECT *
      FROM   dashboard.roles
      WHERE  id = $1
      LIMIT  1
      `,
      [roleId]
    );

    return result.rows[0] ?? null;
  }

  static async findRoleByName(name: string): Promise<RoleRow | null> {
    const result = await db.query<RoleRow>(
      `
      SELECT *
      FROM   dashboard.roles
      WHERE  LOWER(name) = LOWER($1)
      LIMIT  1
      `,
      [name]
    );

    return result.rows[0] ?? null;
  }

  static async listRoles(): Promise<RoleRow[]> {
    const result = await db.query<RoleRow>(
      `
      SELECT *
      FROM   dashboard.roles
      ORDER  BY created_at DESC
      `
    );

    return result.rows;
  }

  static async updateRole(params: UpdateRoleParams): Promise<RoleRow> {
    const result = await db.query<RoleRow>(
      `
      UPDATE dashboard.roles
      SET
        name         = $2,
        description  = $3,
        permissions  = $4,
        is_high_risk = $5,
        updated_at   = now()
      WHERE id = $1
      RETURNING *
      `,
      [
        params.roleId,
        params.name,
        params.description,
        JSON.stringify(params.permissions),
        params.isHighRisk,
      ]
    );

    const row = result.rows[0];

    if (row === undefined) {
      throw new Error("Failed to update role.");
    }

    return row;
  }

  static async toggleRoleActive(
    roleId: number,
    isActive: boolean
  ): Promise<void> {
    await db.query(
      `
      UPDATE dashboard.roles
      SET    is_active  = $2,
             updated_at = now()
      WHERE  id = $1
      `,
      [roleId, isActive]
    );
  }

  static async deleteRole(roleId: number): Promise<void> {
    await db.query(
      `DELETE FROM dashboard.roles WHERE id = $1`,
      [roleId]
    );
  }

  // Check if any active users are assigned to this role
  static async countActiveUsersOnRole(roleId: number): Promise<number> {
    const result = await db.query<{ count: string }>(
      `
      SELECT COUNT(*) AS count
      FROM   dashboard.users
      WHERE  role_id   = $1
        AND  is_active = true
      `,
      [roleId]
    );

    const row = result.rows[0];
    return row !== undefined ? parseInt(row.count, 10) : 0;
  }
}