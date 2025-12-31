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

export interface UpsertCounterfeitReportResult {
  reportId: string;
  trackingId: string;
  created: boolean;
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
