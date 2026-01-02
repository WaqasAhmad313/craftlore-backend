import { db } from "../../config/db.ts";
import type {
  UpsertCounterfeitReportParams,
  UpsertCounterfeitReportResult,
  BaseCounterfeitReport,
  CounterfeitReportWithCount,
  GetCounterfeitReportParams,
  GetAllCounterfeitReportsParams,
} from "./types/types.ts";

export class CounterfeitReportModel {
  static async upsert(
    params: UpsertCounterfeitReportParams
  ): Promise<UpsertCounterfeitReportResult> {
    const sql = `
      SELECT * FROM upsert_counterfeit_report(
        $1::uuid,
        $2::varchar,
        $3::jsonb,
        $4::jsonb,
        $5::jsonb,
        $6::jsonb,
        $7::jsonb,
        $8::varchar,
        $9::varchar
      )
    `;

    const values: (string | Record<string, unknown> | null)[] = [
      params.id ?? null,
      params.verificationCode ?? null,
      params.reporterInfo,
      params.productInfo,
      params.sellerInfo ?? null,
      params.resolutionInfo,
      params.evidenceFiles,
      params.status ?? "pending",
      params.priority ?? "medium",
    ];

    const result = await db.query(sql, values);

    const row = result.rows[0] as
      | { report_id: string; tracking_id: string; created: boolean }
      | undefined;

    if (!row) {
      throw new Error("upsert_counterfeit_report returned no result");
    }

    return {
      reportId: row.report_id,
      trackingId: row.tracking_id,
      created: row.created,
    };
  }

  static async getByIdOrTracking(
    params: GetCounterfeitReportParams
  ): Promise<BaseCounterfeitReport> {
    const sql = `
      SELECT * FROM get_counterfeit_report(
        $1::uuid,
        $2::varchar
      )
    `;

    const values: (string | null)[] = [
      params.id ?? null,
      params.trackingId ?? null,
    ];

    const result = await db.query(sql, values);

    const row = result.rows[0] as BaseCounterfeitReport | undefined;

    if (!row) {
      throw new Error("Counterfeit report not found");
    }

    return row;
  }

  static async getAll(
    params: GetAllCounterfeitReportsParams
  ): Promise<CounterfeitReportWithCount[]> {
    const sql = `
      SELECT * FROM get_all_counterfeit_reports(
        $1::varchar,
        $2::int,
        $3::int
      )
    `;

    const values: (string | number | null)[] = [
      params.status ?? null,
      params.limit ?? 50,
      params.offset ?? 0,
    ];
    const result = await db.query(sql, values);

    return result.rows as CounterfeitReportWithCount[];
  }

  // NEW METHOD - Update status only
  static async updateStatus(id: string, status: string): Promise<void> {
    const sql = `
      UPDATE counterfeit_reports
      SET 
        status = $1::varchar,
        updated_at = CURRENT_TIMESTAMP,
        reviewed_at = CASE 
          WHEN status = 'pending' AND $1::varchar != 'pending' THEN CURRENT_TIMESTAMP 
          ELSE reviewed_at 
        END,
        resolved_at = CASE 
          WHEN $1::varchar IN ('verified', 'rejected', 'closed') THEN CURRENT_TIMESTAMP 
          ELSE resolved_at 
        END
      WHERE id = $2::uuid
    `;

    const result = await db.query(sql, [status, id]);

    if (result.rowCount === 0) {
      throw new Error("Report not found");
    }
  }
}