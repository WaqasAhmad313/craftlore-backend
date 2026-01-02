import type { Multer } from 'multer';

export type ReportStatus =
  | 'pending'
  | 'under_review'
  | 'investigating'
  | 'verified'
  | 'rejected'
  | 'closed';

export type ReportPriority = 'low' | 'medium' | 'high';

export interface UpsertCounterfeitReportParams {
  id?: string; // UUID
  verificationCode?: string | null;
  reporterInfo: Record<string, unknown>;
  productInfo: Record<string, unknown>;
  sellerInfo?: Record<string, unknown> | null;
  resolutionInfo: Record<string, unknown>;
  evidenceFiles: Record<string, unknown> | null;
  status?: ReportStatus;
  priority?: ReportPriority;
}

export interface BaseCounterfeitReport {
  id: string;
  tracking_id: string;
  verification_code: string | null;

  reporter_info: Record<string, unknown>;
  product_info: Record<string, unknown>;
  seller_info: Record<string, unknown> | null;
  resolution_info: Record<string, unknown> | null;
  evidence_files: Record<string, unknown> | null;

  status: ReportStatus;
  priority: ReportPriority;

  admin_actions: Record<string, unknown> | null;

  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  resolved_at: string | null;
}

export interface CounterfeitReportWithCount extends BaseCounterfeitReport {
  total_count: number;
}


export interface UpsertCounterfeitReportResult {
  reportId: string;
  trackingId: string;
  created: boolean;
}

export interface GetCounterfeitReportParams {
  id?: string;
  trackingId?: string;
}

export interface GetAllCounterfeitReportsParams {
  status?: ReportStatus;
  limit?: number;
  offset?: number;
}


export type MulterFile = Express.Multer.File;

export type EvidenceFilesResult = {
  receipt?: string | null;
  gi_QRcode_closeups?: string[] | null;
  product_photos?: string[] | null;
  packaging_photos?: string[] | null;
  certificates?: string[] | null;
  listing_screenshots?: string[] | null;
  gi_tag_photos?: string[] | null;
  gi_code_closeups?: string[] | null;
};

export interface CreateOrUpdateReportParams extends Omit<UpsertCounterfeitReportParams, 'evidenceFiles'> {
  files?: Record<string, MulterFile[]>;
}
