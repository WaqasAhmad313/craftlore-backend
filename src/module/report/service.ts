import { CounterfeitReportModel } from './model.ts';
import { CounterfeitReportMailer } from './mail/mailer.ts';
import { EvidenceUploader } from './upload/uploader.ts';
import type {
  CreateOrUpdateReportParams,
  UpsertCounterfeitReportResult,
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
      evidenceFiles, // null or structured JSON
    };

    // Step 3: Upsert report
    const result = await CounterfeitReportModel.upsert(upsertParams);

    // Step 4: Extract reporter email
    const reporterInfo = params.reporterInfo as { email?: string };
    const reporterEmail = reporterInfo.email;
    if (!reporterEmail) throw new Error('Reporter email is required');

    // Step 5: Send mail
    if (result.created) {
      await CounterfeitReportMailer.sendReportReceived({
        to: reporterEmail,
        trackingId: result.trackingId,
      });
    }

    // If status is provided and not 'pending', assume it's updated and send status mail
    if (!result.created && params.status && params.status !== 'pending') {
      await CounterfeitReportMailer.sendStatusUpdated({
        to: reporterEmail,
        trackingId: result.trackingId,
        oldStatus: 'pending', // default old status for new updates
        newStatus: params.status,
      });
    }

    return result;
  }
}
