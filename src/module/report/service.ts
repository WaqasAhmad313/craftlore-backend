import { CounterfeitReportModel } from './model.ts';
import { CounterfeitReportMailer } from './mail/mailer.ts';
import { EvidenceUploader } from './upload/uploader.ts';
import type {
  CreateOrUpdateReportParams,
  UpsertCounterfeitReportResult,
  BaseCounterfeitReport,
  CounterfeitReportWithCount,
  GetCounterfeitReportParams,
  GetAllCounterfeitReportsParams,
  ReportStatus,
} from './types/types.ts';

export class CounterfeitReportService {
  static async createOrUpdateReport(
    params: CreateOrUpdateReportParams
  ): Promise<UpsertCounterfeitReportResult> {
    // Step 1: Upload files
    const evidenceFiles = await EvidenceUploader.upload(params.files);

    // Step 2: Prepare upsert params
    const upsertParams = {
      ...params,
      evidenceFiles,
    };

    // Step 3: Upsert report
    const result = await CounterfeitReportModel.upsert(upsertParams);

    // Step 4: Extract reporter email
    const reporterInfo = params.reporterInfo as { email?: string };
    const reporterEmail = reporterInfo.email;

    if (!reporterEmail) {
      throw new Error('Reporter email is required');
    }

    // Step 5: Send mail
    if (result.created) {
      await CounterfeitReportMailer.sendReportReceived({
        to: reporterEmail,
        trackingId: result.trackingId,
      });
    }

    if (!result.created && params.status && params.status !== 'pending') {
      await CounterfeitReportMailer.sendStatusUpdated({
        to: reporterEmail,
        trackingId: result.trackingId,
        oldStatus: 'pending',
        newStatus: params.status,
      });
    }

    return result;
  }

  static async getReport(
    params: GetCounterfeitReportParams
  ): Promise<BaseCounterfeitReport> {
    return CounterfeitReportModel.getByIdOrTracking(params);
  }

  static async getReports(
    params: GetAllCounterfeitReportsParams
  ): Promise<CounterfeitReportWithCount[]> {
    return CounterfeitReportModel.getAll(params);
  }

  // NEW METHOD - Update status only
  static async updateReportStatus(params: {
    id: string;
    status: string;
  }): Promise<void> {
    // Step 1: Get current report to get reporter email and tracking ID
    const report = await CounterfeitReportModel.getByIdOrTracking({ id: params.id });

    const oldStatus = report.status;

    // Step 2: Update status in database
    await CounterfeitReportModel.updateStatus(params.id, params.status);

    // Step 3: Send status update email
    const reporterInfo = report.reporter_info as { email?: string };
    const reporterEmail = reporterInfo.email;

    if (reporterEmail && params.status !== oldStatus) {
      await CounterfeitReportMailer.sendStatusUpdated({
        to: reporterEmail,
        trackingId: report.tracking_id,
        oldStatus,
        newStatus: params.status as ReportStatus,
      });
    } 
  }
}