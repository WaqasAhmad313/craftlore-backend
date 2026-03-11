import { resendClient, mailConfig } from "../../report/mail/client.ts";

// ============================================
// TYPES
// ============================================

interface SendAccessCreatedParams {
  to: string;
  name: string;
  magicLinkUrl: string;
  otp: string;
  expiresAt: Date;
}

interface SendExtensionResolvedParams {
  to: string;
  name: string;
  action: "approved" | "rejected";
  newExpiresAt?: Date;
}

type ResendResponse = {
  id?: string;
  error?: {
    message: string;
    name?: string;
  };
};

// ============================================
// ACCESS MAILER
// ============================================

export class AccessMailer {
  private static logContext(context: string, data: unknown): void {
    console.log(`[ACCESS_MAILER:${context}]`, JSON.stringify(data, null, 2));
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

  // ── Access Created ──────────────────────────

  static async sendAccessCreated(
    params: SendAccessCreatedParams
  ): Promise<void> {
    const expiryFormatted = params.expiresAt.toUTCString();

    await this.sendMail({
      to:      params.to,
      subject: "You have been granted dashboard access",
      html:    `
        <p>Hi ${params.name},</p>
        <p>You have been granted access to the dashboard.</p>
        <p>Click the button below to get started:</p>
        <p>
          <a
            href="${params.magicLinkUrl}"
            style="
              display:inline-block;
              padding:12px 24px;
              background:#000;
              color:#fff;
              text-decoration:none;
              border-radius:6px;
              font-weight:bold;
              font-size:16px;
            "
          >
            Access Dashboard
          </a>
        </p>
        <p>After clicking the link, enter this one-time code when prompted:</p>
        <p style="font-size:36px;font-weight:bold;letter-spacing:10px;margin:16px 0;">
          ${params.otp}
        </p>
        <p><strong>This code expires in 10 minutes.</strong></p>
        <p>Your dashboard access expires on: <strong>${expiryFormatted}</strong></p>
        <hr style="margin:24px 0;border:none;border-top:1px solid #eee;" />
        <p style="color:#999;font-size:12px;">
          Do not share this link or code with anyone.
          If you did not expect this email, please ignore it.
        </p>
      `,
    });
  }

  // ── Extension Request Resolved ──────────────

  static async sendExtensionResolved(
    params: SendExtensionResolvedParams
  ): Promise<void> {
    const isApproved = params.action === "approved";

    const expiryLine =
      isApproved && params.newExpiresAt !== undefined
        ? `<p>Your access has been extended until: <strong>${params.newExpiresAt.toUTCString()}</strong></p>`
        : "";

    await this.sendMail({
      to:      params.to,
      subject: isApproved
        ? "Your access extension has been approved"
        : "Your access extension request was not approved",
      html: `
        <p>Hi ${params.name},</p>
        ${
          isApproved
            ? `<p>Your request for additional dashboard access time has been approved.</p>
               ${expiryLine}`
            : `<p>Your request for additional dashboard access time was reviewed but not approved.</p>
               <p>Please contact the administrator if you need further assistance.</p>`
        }
      `,
    });
  }
}