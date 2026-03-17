import { PendingModel } from "./model.ts";
import type {
  PendingChangeRow,
  MyPendingChangeRow,
  PendingStatus,
  ListPendingFilters,
} from "./model.ts";

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
// Reads endpoint + method captured at intercept
// time from payload._meta.
// Calls the original API endpoint with the
// stored payload — reusing all existing
// validation and business logic.
// On success  -> marks pending as approved.
// On failure  -> throws, status stays pending.
// ============================================

async function applyChange(
  pending: PendingChangeRow,
  reviewedBy: number
): Promise<void> {
  const { endpoint, method } = pending.payload._meta;

  const baseUrl = process.env["INTERNAL_API_URL"] ?? "http://localhost:3000";
  const url     = `${baseUrl}${endpoint}`;

  // For delete operations body is not needed
  const body =
    pending.operation !== "delete" ? pending.payload.new : null;

  const internalSecret = process.env["INTERNAL_REQUEST_SECRET"] ?? "";

  const fetchOptions: RequestInit = {
    method,
    headers: {
      "Content-Type":       "application/json",
      "x-internal-request": internalSecret,
    },
    ...(body !== null && { body: JSON.stringify(body) }),
  };

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const text = await response.text().catch(() => "unknown error");
    throw new Error(
      `Failed to apply change: ${response.status} ${text}`
    );
  }

  // Mark as approved only after successful API call
  await PendingModel.resolve({
    pendingId:  pending.id,
    status:     "approved",
    reviewedBy,
    reviewNote: null,
  });
}

// ============================================
// PENDING SERVICE
// ============================================

export class PendingService {
  // -- List -- approver view ------------------

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

  // -- List -- user's own ---------------------

  static async listMyPending(
    userId: number
  ): Promise<MyPendingChangeRow[]> {
    return PendingModel.listMyPending(userId);
  }

  // -- Approve --------------------------------

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

    await applyChange(pending, params.reviewedBy);
  }

  // -- Reject ---------------------------------

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