import PamModel, { type AppraisalStatus, type CreatePamAppraisalInput, type PamAppraisalRow } from "./model.ts";
import FveService from "../fve/service.ts";

class PamService {
  static async create(payload: CreatePamAppraisalInput): Promise<PamAppraisalRow> {
    return PamModel.create(payload);
  }

  static async list(params: {
    status?: AppraisalStatus;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: PamAppraisalRow[]; page: number; pageSize: number }> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
    const offset = (page - 1) * pageSize;

    const data = await PamModel.list({
      status: params.status,
      limit: pageSize,
      offset,
    });

    return { data, page, pageSize };
  }

  static async getDetails(id: string): Promise<{
    appraisal: PamAppraisalRow;
    valuation: unknown | null;
  } | null> {
    const appraisal = await PamModel.getById(id);
    if (!appraisal) return null;

    const valuation = await FveService.getValuationByAppraisalId(id);
    return { appraisal, valuation };
  }

  /** Approve: updates status + computes valuation (this replaces the Supabase trigger behavior). */
  static async approve(id: string): Promise<{ appraisal: PamAppraisalRow; valuation: unknown }> {
    const appraisal = await PamModel.getById(id);
    if (!appraisal) throw new Error("Appraisal not found");

    const updated = await PamModel.updateStatus({
      id,
      status: "approved",
      reviewed_at: new Date().toISOString(),
      admin_notes: null,
    });

    if (!updated) throw new Error("Failed to approve appraisal");

    const valuation = await FveService.computeAndSaveValuation({
      appraisalId: id,
      pamPayload: updated.pam_payload,
    });

    return { appraisal: updated, valuation };
  }

  static async reject(id: string, reason: string): Promise<PamAppraisalRow> {
    const updated = await PamModel.updateStatus({
      id,
      status: "rejected",
      admin_notes: reason,
      reviewed_at: new Date().toISOString(),
    });

    if (!updated) throw new Error("Appraisal not found or failed to reject");
    return updated;
  }

  static async editPamPayload(id: string, pamPayload: unknown): Promise<PamAppraisalRow> {
    const updated = await PamModel.updatePayload(id, pamPayload);
    if (!updated) throw new Error("Appraisal not found");
    return updated;
  }

  static async delete(id: string): Promise<void> {
    // Also delete valuation if exists (best-effort).
    await FveService.deleteValuationByAppraisalId(id);
    const ok = await PamModel.deleteById(id);
    if (!ok) throw new Error("Appraisal not found");
  }

  static async stats(): Promise<{ pending: number; approved: number; rejected: number; total: number }> {
    return PamModel.stats();
  }
}

export default PamService;
