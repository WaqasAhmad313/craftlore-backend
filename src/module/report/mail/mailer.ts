import { resendClient, mailConfig } from './client.ts';
import type { ReportStatus } from '../types/types.ts';

interface SendReportReceivedParams {
  to: string;
  trackingId: string;
}

interface SendStatusUpdatedParams {
  to: string;
  trackingId: string;
  oldStatus: ReportStatus;
  newStatus: ReportStatus;
}

export class CounterfeitReportMailer {
  static async sendReportReceived(
    params: SendReportReceivedParams
  ): Promise<void> {
    await resendClient.emails.send({
      from: mailConfig.from,
      to: params.to,
      subject: 'Your counterfeit report has been received',
      html: `
        <p>Your report has been successfully submitted.</p>
        <p><strong>Tracking ID:</strong> ${params.trackingId}</p>
        <p>Please keep this ID for future reference.</p>
      `,
    });
  }

  static async sendStatusUpdated(
    params: SendStatusUpdatedParams
  ): Promise<void> {
    await resendClient.emails.send({
      from: mailConfig.from,
      to: params.to,
      subject: 'Update on your counterfeit report',
      html: `
        <p>The status of your report has changed.</p>
        <p><strong>Tracking ID:</strong> ${params.trackingId}</p>
        <p><strong>Previous status:</strong> ${params.oldStatus}</p>
        <p><strong>Current status:</strong> ${params.newStatus}</p>
      `,
    });
  }
}
