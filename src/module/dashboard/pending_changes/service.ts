import { db } from "../../../config/db.ts";
import { PendingModel } from "./model.ts";
import type {
  PendingChangeRow,
  MyPendingChangeRow,
  PendingStatus,
  ListPendingFilters,
} from "./model.ts";

// ============================================
// MODULE → TABLE MAP
// When a pending change is approved, we need
// to know which table to apply it to.
// Add new modules here as you build them.
// ============================================

const MODULE_TABLE_MAP: Record<string, string> = {
  cktre:  "public.cktre",
  clie:   "public.clie",
  cgis:   "public.cgis",
  clee:   "public.clee",
  cais:   "public.cais",
  cseme:  "public.cseme",
  crvas:  "public.crvas",
  cms:    "public.cms",
};

// ============================================
// TYPES
// ============================================

export interface ListPendingParams {
  status: PendingStatus | "all";
  module: string | null;
  allowedModules: string[];
}

export interface ResolveParams {
  pendingId: number;
  reviewedBy: number;
  action: "approved" | "rejected";
  reviewNote: string | null;
}

// ============================================
// APPLY CHANGE HELPER
// Applies approved payload to the actual table.
// Uses a db transaction so apply + resolve
// are atomic — either both succeed or neither.
// ============================================

async function applyChange(
  pending: PendingChangeRow
): Promise<void> {
  const table = MODULE_TABLE_MAP[pending.module];

  if (table === undefined) {
    throw new Error(
      `No table mapped for module "${pending.module}". Update MODULE_TABLE_MAP.`
    );
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    if (pending.operation === "create") {
      const newData = pending.payload.new;

      if (newData === null) {
        throw new Error("Payload.new is null for create operation.");
      }

      const columns = Object.keys(newData);
      const values  = Object.values(newData);

      if (columns.length === 0) {
        throw new Error("Payload.new has no fields.");
      }

      const colList    = columns.map((c) => `"${c}"`).join(", ");
      const paramList  = columns.map((_, i) => `$${i + 1}`).join(", ");

      await client.query(
        `INSERT INTO ${table} (${colList}) VALUES (${paramList})`,
        values
      );
    } else if (pending.operation === "update") {
      const newData = pending.payload.new;

      if (newData === null || pending.entity_id === null) {
        throw new Error(
          "Payload.new and entity_id are required for update operation."
        );
      }

      const columns = Object.keys(newData);
      const values  = Object.values(newData);

      if (columns.length === 0) {
        throw new Error("Payload.new has no fields.");
      }

      const setClause = columns
        .map((c, i) => `"${c}" = $${i + 1}`)
        .join(", ");

      await client.query(
        `UPDATE ${table} SET ${setClause} WHERE id = $${columns.length + 1}`,
        [...values, pending.entity_id]
      );
    } else if (pending.operation === "delete") {
      if (pending.entity_id === null) {
        throw new Error("entity_id is required for delete operation.");
      }

      await client.query(
        `DELETE FROM ${table} WHERE id = $1`,
        [pending.entity_id]
      );
    }

    // Mark as approved inside same transaction
    await client.query(
      `
      UPDATE dashboard.pending_changes
      SET
        status      = 'approved',
        reviewed_by = $2,
        reviewed_at = now()
      WHERE id = $1
      `,
      [pending.id, pending.reviewed_by]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ============================================
// PENDING SERVICE
// ============================================

export class PendingService {
  // ── List — approver view ────────────────────

  static async listPending(
    params: ListPendingParams
  ): Promise<PendingChangeRow[]> {
    if (params.allowedModules.length === 0) {
      return [];
    }

    const filters: ListPendingFilters = {
      status: params.status,
      module: params.module,
    };

    // If a specific module filter is requested, verify approver has access
    if (
      params.module !== null &&
      !params.allowedModules.includes(params.module)
    ) {
      throw new Error(
        `You do not have access to view pending changes for module: ${params.module}.`
      );
    }

    return PendingModel.listPending(filters, params.allowedModules);
  }

  // ── List — user's own ───────────────────────

  static async listMyPending(
    userId: number
  ): Promise<MyPendingChangeRow[]> {
    return PendingModel.listMyPending(userId);
  }

  // ── Approve ─────────────────────────────────

  static async approve(params: ResolveParams): Promise<void> {
    const pending = await PendingModel.findById(params.pendingId);

    if (pending === null) {
      throw new Error("Pending change not found.");
    }

    if (pending.status !== "pending") {
      throw new Error(
        `This change has already been ${pending.status}.`
      );
    }

    // Set reviewed_by on the object so applyChange can use it
    pending.reviewed_by = params.reviewedBy;

    await applyChange(pending);
  }

  // ── Reject ──────────────────────────────────

  static async reject(params: ResolveParams): Promise<void> {
    const pending = await PendingModel.findById(params.pendingId);

    if (pending === null) {
      throw new Error("Pending change not found.");
    }

    if (pending.status !== "pending") {
      throw new Error(
        `This change has already been ${pending.status}.`
      );
    }

    await PendingModel.resolve({
      pendingId:  params.pendingId,
      status:     "rejected",
      reviewedBy: params.reviewedBy,
      reviewNote: params.reviewNote,
    });
  }
}