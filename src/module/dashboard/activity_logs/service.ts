import { ActivityLogsModel } from "./model.ts";
import type {
  ActivityLogRow,
  ListLogsFilters,
  LogsPage,
} from "./model.ts";

// ============================================
// TYPES
// ============================================

export interface ListLogsParams {
  isOwner: boolean;
  allowedModules: string[];
  module: string | null;
  action: string | null;
  userId: number | null;
  entityId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  page: number;
  pageSize: number;
}

export interface LogsResult {
  logs: ActivityLogRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// CONSTANTS
// ============================================

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;

// ============================================
// HELPERS
// ============================================

function parseDateOrNull(value: string | null): Date | null {
  if (value === null || value.trim() === "") return null;
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return null;
  return parsed;
}

// ============================================
// ACTIVITY LOGS SERVICE
// ============================================

export class ActivityLogsService {
  // ── List Logs ───────────────────────────────

  static async listLogs(params: ListLogsParams): Promise<LogsResult> {
    const pageSize = Math.min(
      Math.max(1, params.pageSize || DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE
    );
    const page   = Math.max(1, params.page || 1);
    const offset = (page - 1) * pageSize;

    // If specific module filter is set, validate access
    if (params.module !== null && !params.isOwner) {
      if (!params.allowedModules.includes(params.module)) {
        throw new Error(
          `Access denied. You cannot view logs for module: ${params.module}.`
        );
      }
    }

    const filters: ListLogsFilters = {
      module:   params.module,
      action:   params.action,
      userId:   params.userId,
      entityId: params.entityId,
      dateFrom: parseDateOrNull(params.dateFrom),
      dateTo:   parseDateOrNull(params.dateTo),
      limit:    pageSize,
      offset,
    };

    // Owner → null means no module scope restriction
    // Approver → pass their allowed modules to restrict query
    const allowedModules = params.isOwner ? null : params.allowedModules;

    const { logs, total } = await ActivityLogsModel.listLogs(
      filters,
      allowedModules
    );

    const totalPages = Math.ceil(total / pageSize);

    return { logs, total, page, pageSize, totalPages };
  }

  // ── Entity History ──────────────────────────

  static async getEntityHistory(
    entityId: string,
    module: string | null,
    isOwner: boolean,
    allowedModules: string[]
  ): Promise<ActivityLogRow[]> {
    // If module filter provided, validate access
    if (module !== null && !isOwner) {
      if (!allowedModules.includes(module)) {
        throw new Error(
          `Access denied. You cannot view logs for module: ${module}.`
        );
      }
    }

    return ActivityLogsModel.getEntityHistory(entityId, module);
  }
}