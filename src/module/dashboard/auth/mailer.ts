import { resendClient, mailConfig } from "../../report/mail/client.ts";
import type { DeviceMetadata } from "./service.ts";

// ============================================
// TYPES
// ============================================

interface SendMagicLinkParams {
  to: string;
  magicLinkUrl: string;
  otp: string;
  expiresAt: Date;
}

interface SendDeviceApprovalParams {
  to: string;
  approvalToken: string;
  deviceMetadata: DeviceMetadata;
}

type ResendResponse = {
  id?: string;
  error?: {
    message: string;
    name?: string;
  };
};

// ============================================
// AUTH MAILER
// ============================================

export class AuthMailer {
  private static logContext(context: string, data: unknown): void {
    console.log(`[AUTH_MAILER:${context}]`, JSON.stringify(data, null, 2));
  }

  private static extractErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;

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
      from:    mailConfig.from,
      to:      payload.to,
      subject: payload.subject,
    });

    try {
      const response = (await resendClient.emails.send({
        from:    mailConfig.from,
        to:      payload.to,
        subject: payload.subject,
        html:    payload.html,
      })) as ResendResponse;

      if (response.error !== undefined) {
        this.logContext("RESEND_REJECTED", response.error);
        throw new Error(`Resend rejected email: ${response.error.message}`);
      }

      this.logContext("MAIL_SENT", { messageId: response.id, to: payload.to });
    } catch (error: unknown) {
      const message = this.extractErrorMessage(error);
      this.logContext("MAIL_SEND_FAILED", { message });
      throw new Error(`Mail sending failed: ${message}`);
    }
  }

  // ── Magic Link + OTP Email ──────────────────

  static async sendMagicLink(params: SendMagicLinkParams): Promise<void> {
    const expiryFormatted = params.expiresAt.toUTCString();

    await this.sendMail({
      to:      params.to,
      subject: "Your dashboard access link",
      html:    `
        <p>You have been granted access to the dashboard.</p>
        <p>Click the link below to get started:</p>
        <p>
          <a href="${params.magicLinkUrl}" style="font-size:16px;font-weight:bold;">
            Access Dashboard
          </a>
        </p>
        <p>Once you open the link, enter this one-time code:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:8px;">
          ${params.otp}
        </p>
        <p><strong>This code expires in 10 minutes.</strong></p>
        <p>Your access link expires on: ${expiryFormatted}</p>
        <p style="color:#999;font-size:12px;">
          Do not share this link or code with anyone.
          If you did not expect this email, ignore it.
        </p>
      `,
    });
  }

  // ── Device Approval Email (owner only) ──────

  static async sendDeviceApprovalRequest(
    params: SendDeviceApprovalParams
  ): Promise<void> {
    const approvalUrl = `${process.env["DASHBOARD_BASE_URL"] ?? ""}/dashboard/auth/device/approve/${params.approvalToken}`;

    await this.sendMail({
      to:      params.to,
      subject: "New device login attempt on your dashboard account",
      html:    `
        <p>A login attempt was made from an unrecognized device.</p>
        <table style="border-collapse:collapse;margin:16px 0;">
          <tr>
            <td style="padding:4px 12px 4px 0;font-weight:bold;">Browser</td>
            <td>${params.deviceMetadata.browser ?? "Unknown"}</td>
          </tr>
          <tr>
            <td style="padding:4px 12px 4px 0;font-weight:bold;">OS</td>
            <td>${params.deviceMetadata.os ?? "Unknown"}</td>
          </tr>
          <tr>
            <td style="padding:4px 12px 4px 0;font-weight:bold;">IP Address</td>
            <td>${params.deviceMetadata.ip ?? "Unknown"}</td>
          </tr>
        </table>
        <p>If this was you, click below to approve this device:</p>
        <p>
          <a href="${approvalUrl}" style="font-size:16px;font-weight:bold;">
            Approve Device
          </a>
        </p>
        <p><strong>This link expires in 24 hours.</strong></p>
        <p style="color:#c00;font-weight:bold;">
          If this was NOT you, do not click the link and secure your account immediately.
        </p>
      `,
    });
  }
}