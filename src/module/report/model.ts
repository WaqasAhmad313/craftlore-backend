import { db } from '../../config/db.ts';
import type { UpsertCounterfeitReportParams, UpsertCounterfeitReportResult } from './types/types.ts';



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
      params.status ?? 'pending',
      params.priority ?? 'medium',
    ];

    const result = await db.query(sql, values);

    const row = result.rows[0] as {
      report_id: string;
      tracking_id: string;
      created: boolean;
    } | undefined;

    if (!row) {
      throw new Error('upsert_counterfeit_report returned no result');
    }

    return {
      reportId: row.report_id,
      trackingId: row.tracking_id,
      created: row.created,
    };
  }
}
