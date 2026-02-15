import { resendClient, mailConfig } from "../report/mail/client.ts";

type ResendResponse = {
  id?: string;
  error?: { message: string };
};

export interface ContactPayload {
  name: string;
  email: string;
  organization?: string;
  topic: string;
  message: string;
  submissionEmail: string;
}

export class ContactMailer {
  private static escapeHtml(input: string): string {
    return input
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  private static buildHtml(payload: ContactPayload): string {
    const name = this.escapeHtml(payload.name);
    const email = this.escapeHtml(payload.email);
    const topic = this.escapeHtml(payload.topic);
    const org = payload.organization
      ? this.escapeHtml(payload.organization)
      : "Not provided";
    const message = this.escapeHtml(payload.message).replaceAll("\n", "<br/>");

    return `
      <div style="background:#0b0f1a;padding:32px;font-family:system-ui;color:#eaeef7;">
        <div style="max-width:680px;margin:auto;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:24px;">
          <h2 style="margin:0 0 16px 0;color:#ffffff;">New Contact Message</h2>

          <p><strong>Topic:</strong> ${topic}</p>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}" style="color:#7da2ff;">${email}</a></p>
          <p><strong>Organization:</strong> ${org}</p>

          <div style="margin-top:16px;padding:16px;background:rgba(0,0,0,0.3);border-radius:8px;">
            ${message}
          </div>

          <p style="margin-top:20px;font-size:12px;opacity:0.6;">
            Reply directly to this email to respond.
          </p>
        </div>
      </div>
    `;
  }

  static async send(payload: ContactPayload): Promise<string> {
    const html = this.buildHtml(payload);

    const response = (await resendClient.emails.send({
      from: mailConfig.from,
      to: payload.submissionEmail,
      subject: `Contact: ${payload.topic} (${payload.name})`,
      html,
      replyTo: payload.email,
    })) as ResendResponse;

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.id ?? "unknown";
  }
}
