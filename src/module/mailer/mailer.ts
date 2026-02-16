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
    const messageHtml = this.escapeHtml(payload.message).replaceAll(
      "\n",
      "<br/>",
    );

    // Preheader: shows in inbox preview in many clients
    const preheader = `New contact message: ${topic} from ${name}`.slice(
      0,
      140,
    );

    return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>New Contact Message</title>
  </head>

  <body style="margin:0;padding:0;background-color:#070a12;">
    <!-- Preheader (hidden) -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${this.escapeHtml(preheader)}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="border-collapse:collapse;background-color:#070a12;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <!-- Outer container -->
          <table role="presentation" width="680" cellpadding="0" cellspacing="0" border="0"
            style="width:100%;max-width:680px;border-collapse:collapse;">
            <tr>
              <td
                style="
                  background-color:#0b1020;
                  border:1px solid rgba(255,255,255,0.12);
                  border-radius:16px;
                  overflow:hidden;
                "
              >
                <!-- Top accent bar -->
                <div style="height:3px;background:linear-gradient(90deg,#0ea5e9,#22d3ee);"></div>

                <!-- Header -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                  style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:22px 22px 10px 22px;">
                      <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
                                  font-size:18px;line-height:26px;color:#ffffff;font-weight:700;">
                        New Contact Message
                      </div>
                      <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
                                  font-size:13px;line-height:20px;color:rgba(255,255,255,0.75);">
                        Someone filled out your contact form.
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- Body -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                  style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:12px 22px 22px 22px;">
                      <!-- Meta grid-ish (safe) -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                        style="border-collapse:collapse;">
                        <tr>
                          <td style="padding:10px 0;border-top:1px solid rgba(255,255,255,0.08);">
                            <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
                                        font-size:13px;line-height:20px;color:rgba(255,255,255,0.75);">
                              <strong style="color:#ffffff;">Topic:</strong> ${topic}
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:10px 0;border-top:1px solid rgba(255,255,255,0.08);">
                            <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
                                        font-size:13px;line-height:20px;color:rgba(255,255,255,0.75);">
                              <strong style="color:#ffffff;">Name:</strong> ${name}
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:10px 0;border-top:1px solid rgba(255,255,255,0.08);">
                            <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
                                        font-size:13px;line-height:20px;color:rgba(255,255,255,0.75);">
                              <strong style="color:#ffffff;">Email:</strong>
                              <a href="mailto:${email}" style="color:#22d3ee;text-decoration:none;">
                                ${email}
                              </a>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:10px 0;border-top:1px solid rgba(255,255,255,0.08);">
                            <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
                                        font-size:13px;line-height:20px;color:rgba(255,255,255,0.75);">
                              <strong style="color:#ffffff;">Organization:</strong> ${org}
                            </div>
                          </td>
                        </tr>
                      </table>

                      <!-- Message card -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                        style="border-collapse:collapse;margin-top:16px;">
                        <tr>
                          <td
                            style="
                              background-color:rgba(255,255,255,0.03);
                              border:1px solid rgba(255,255,255,0.08);
                              border-radius:12px;
                              padding:16px;
                            "
                          >
                            <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
                                        font-size:12px;letter-spacing:0.08em;text-transform:uppercase;
                                        color:rgba(255,255,255,0.55);margin-bottom:10px;">
                              Message
                            </div>

                            <div style="border-left:3px solid #0ea5e9;padding-left:12px;">
                              <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
                                          font-size:14px;line-height:22px;color:#ffffff;">
                                ${messageHtml}
                              </div>
                            </div>
                          </td>
                        </tr>
                      </table>

                      <!-- Footer note -->
                      <div style="margin-top:16px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
                                  font-size:12px;line-height:18px;color:rgba(255,255,255,0.55);">
                        Tip: reply directly to this email to respond. (Your backend sets <span style="color:#ffffff;">Reply-To</span> to the sender.)
                      </div>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>

            <!-- Footer spacing -->
            <tr>
              <td style="padding-top:12px;text-align:center;">
                <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
                            font-size:11px;line-height:16px;color:rgba(255,255,255,0.35);">
                  Sent by your contact form system.
                </div>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
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
