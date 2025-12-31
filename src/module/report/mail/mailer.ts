import { resendClient, mailConfig } from "./client.ts";
import type { ReportStatus } from "../types/types.ts";

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

type ResendResponse = {
  id?: string;
  error?: {
    message: string;
    name?: string;
  };
};

export class CounterfeitReportMailer {
  private static logContext(context: string, data: unknown) {
    console.log(`[MAILER:${context}]`, JSON.stringify(data, null, 2));
  }

  private static extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as { message: unknown }).message === "string"
    ) {
      return (error as { message: string }).message;
    }

    return "Unknown mailer error";
  }

  private static async sendMail(payload: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    this.logContext("OUTGOING_REQUEST", {
      from: mailConfig.from,
      to: payload.to,
      subject: payload.subject,
    });

    try {
      const response = (await resendClient.emails.send({
        from: mailConfig.from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      })) as ResendResponse;

      if (response.error) {
        this.logContext("RESEND_REJECTED", response.error);
        throw new Error(`Resend rejected email: ${response.error.message}`);
      }

      this.logContext("MAIL_SENT", {
        messageId: response.id,
        to: payload.to,
      });
    } catch (error: unknown) {
      const message = this.extractErrorMessage(error);

      this.logContext("MAIL_SEND_FAILED", {
        message,
      });

      throw new Error(`Mail sending failed at backend layer: ${message}`);
    }
  }

  static async sendReportReceived(
    params: SendReportReceivedParams
  ): Promise<void> {
    await this.sendMail({
      to: params.to,
      subject: "Your counterfeit report has been received",
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
    await this.sendMail({
      to: params.to,
      subject: "Update on your counterfeit report",
      html: `
        <p>The status of your report has changed.</p>
        <p><strong>Tracking ID:</strong> ${params.trackingId}</p>
        <p><strong>Previous status:</strong> ${params.oldStatus}</p>
        <p><strong>Current status:</strong> ${params.newStatus}</p>
      `,
    });
  }
}
