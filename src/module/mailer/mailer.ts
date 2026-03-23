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
    const submittedAt = new Date().toUTCString();
    const f = "'Inter','Helvetica Neue',Arial,sans-serif";
    const sf = "'Merriweather',Georgia,'Times New Roman',serif";

    // Priority badge by topic
    const priorityMap: Record<
      string,
      { label: string; color: string; border: string; bg: string }
    > = {
      "Institutional Partnership": {
        label: "HIGH",
        color: "#38bdf8",
        border: "#0e4a6e",
        bg: "rgba(14,165,233,0.12)",
      },
      "Verification / Registry": {
        label: "HIGH",
        color: "#38bdf8",
        border: "#0e4a6e",
        bg: "rgba(14,165,233,0.12)",
      },
      "Research / Media": {
        label: "NORMAL",
        color: "#22d3ee",
        border: "#0e7490",
        bg: "rgba(6,182,212,0.10)",
      },
      "Technical Support": {
        label: "NORMAL",
        color: "#fbbf24",
        border: "#92400e",
        bg: "rgba(251,191,36,0.10)",
      },
      "General Inquiry": {
        label: "LOW",
        color: "#7eacc8",
        border: "#1e2e3e",
        bg: "rgba(14,165,233,0.05)",
      },
    };
    const p = priorityMap[payload.topic] ?? {
      label: "NORMAL",
      color: "#22d3ee",
      border: "#0e7490",
      bg: "rgba(6,182,212,0.10)",
    };

    const preheader =
      `[${p.label} PRIORITY] New ${topic} submission from ${name}`.slice(
        0,
        140,
      );

    return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <title>Craftlore — New Contact Submission</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Merriweather:wght@700&display=swap" rel="stylesheet"/>
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
    a{color:#0ea5e9;text-decoration:none;}
    a:hover{text-decoration:underline;}
    @media only screen and (max-width:620px){
      .email-container{width:100%!important;}
      .mobile-pad{padding:24px 16px!important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#04040f;font-family:${f};-webkit-font-smoothing:antialiased;">

  <!-- Preview text -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#04040f;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- ── Outer card ── -->
        <table role="presentation" class="email-container" cellpadding="0" cellspacing="0" width="600"
          style="background-color:#0d1117;border-radius:16px;border:1px solid #1e2e3e;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,0.7);">

          <!-- Accent stripe -->
          <tr><td style="background:linear-gradient(90deg,#0369a1,#fbbf24,#22d3ee);height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- Brand header -->
          <tr>
            <td style="background:linear-gradient(135deg,#071e2e 0%,#0c2a3f 50%,#071e2e 100%);padding:28px 40px;border-bottom:1px solid #0e4a6e;" class="mobile-pad">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <p style="margin:0;font-family:${sf};font-size:24px;font-weight:700;letter-spacing:-0.02em;color:#ffffff;">
                      Craft<span style="color:#0ea5e9;">lore</span>
                    </p>
                    <p style="margin:4px 0 0;font-family:${f};font-size:10px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#7eacc8;">
                      Internal — New Contact Submission
                    </p>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display:inline-block;padding:4px 12px;background:${p.bg};border:1px solid ${p.border};border-radius:999px;font-family:${f};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${p.color};">
                      ${p.label}&nbsp;PRIORITY
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Alert banner -->
          <tr>
            <td style="background:rgba(251,191,36,0.07);padding:14px 40px;border-bottom:1px solid rgba(251,191,36,0.18);" class="mobile-pad">
              <p style="margin:0;font-family:${f};font-size:13px;font-weight:600;color:#fbbf24;">
                &#9888;&nbsp; New contact form submission requires your attention
              </p>
            </td>
          </tr>

          <!-- Subject line -->
          <tr>
            <td style="padding:32px 40px 20px;" class="mobile-pad">
              <p style="margin:0 0 6px;font-family:${f};font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#7eacc8;">
                Submitted Topic
              </p>
              <h1 style="margin:0 0 6px;font-family:${sf};font-size:22px;font-weight:700;line-height:1.3;color:#ffffff;">
                ${topic}
              </h1>
              <p style="margin:0;font-family:${f};font-size:12px;color:#7eacc8;">${submittedAt}</p>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding:0 40px;"><div style="height:1px;background:#1e2e3e;font-size:0;">&nbsp;</div></td></tr>

          <!-- Sender details table -->
          <tr>
            <td style="padding:24px 40px 8px;" class="mobile-pad">
              <p style="margin:0 0 14px;font-family:${f};font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#7eacc8;">
                Sender Details
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                style="background:#111827;border:1px solid #1e2e3e;border-radius:10px;overflow:hidden;">
                <!-- Name -->
                <tr>
                  <td style="padding:10px 16px;border-bottom:1px solid #1e2e3e;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
                      <td width="38%" style="font-family:${f};font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#7eacc8;vertical-align:top;padding-right:12px;">Name</td>
                      <td style="font-family:${f};font-size:13px;color:#c0d9f0;">${name}</td>
                    </tr></table>
                  </td>
                </tr>
                <!-- Email -->
                <tr>
                  <td style="padding:10px 16px;border-bottom:1px solid #1e2e3e;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
                      <td width="38%" style="font-family:${f};font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#7eacc8;vertical-align:top;padding-right:12px;">Email</td>
                      <td style="font-family:${f};font-size:13px;color:#c0d9f0;">
                        <a href="mailto:${email}" style="color:#0ea5e9;text-decoration:none;">${email}</a>
                      </td>
                    </tr></table>
                  </td>
                </tr>
                <!-- Organization -->
                <tr>
                  <td style="padding:10px 16px;border-bottom:1px solid #1e2e3e;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
                      <td width="38%" style="font-family:${f};font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#7eacc8;vertical-align:top;padding-right:12px;">Organization</td>
                      <td style="font-family:${f};font-size:13px;color:#c0d9f0;">${org}</td>
                    </tr></table>
                  </td>
                </tr>
                <!-- Topic badge -->
                <tr>
                  <td style="padding:10px 16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
                      <td width="38%" style="font-family:${f};font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#7eacc8;vertical-align:middle;padding-right:12px;">Topic</td>
                      <td>
                        <span style="display:inline-block;padding:3px 10px;background:${p.bg};border:1px solid ${p.border};border-radius:999px;font-family:${f};font-size:11px;font-weight:600;color:${p.color};">
                          ${topic}
                        </span>
                      </td>
                    </tr></table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Message body -->
          <tr>
            <td style="padding:8px 40px 24px;" class="mobile-pad">
              <p style="margin:0 0 14px;font-family:${f};font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#7eacc8;">
                Message
              </p>
              <div style="background:#111827;border:1px solid #1e2e3e;border-radius:10px;padding:20px;font-family:${f};font-size:14px;line-height:1.7;color:#c0d9f0;">
                <div style="border-left:3px solid #0ea5e9;padding-left:14px;">
                  ${messageHtml}
                </div>
              </div>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding:0 40px;"><div style="height:1px;background:#1e2e3e;font-size:0;">&nbsp;</div></td></tr>

          <!-- Reply CTA -->
          <tr>
            <td style="padding:28px 40px;" align="center" class="mobile-pad">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="border-radius:8px;background:#0284c7;">
                    <a href="mailto:${email}?subject=Re: ${encodeURIComponent(payload.topic)} — Craftlore"
                      style="display:inline-block;padding:14px 32px;font-family:${f};font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.02em;border-radius:8px;">
                      &#9993;&nbsp; Reply to ${name}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card footer -->
          <tr>
            <td style="background:#111827;padding:20px 40px;border-top:1px solid #1e2e3e;border-radius:0 0 16px 16px;" class="mobile-pad">
              <p style="margin:0;font-family:${f};font-size:11px;line-height:1.6;color:#4a7a99;text-align:center;">
                This notification was auto-generated by the Craftlore contact system.<br/>
                Do not reply directly to this email — use the button above.
              </p>
            </td>
          </tr>

        </table>

        <!-- Legal footer -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" class="email-container" style="margin-top:20px;">
          <tr>
            <td align="center">
              <p style="margin:0;font-family:${f};font-size:11px;line-height:1.6;color:#4a7a99;text-align:center;">
                &copy; ${new Date().getFullYear()} Craftlore. All rights reserved.<br/>
                Craftlore Global Coordination Office &bull; Washington DC / Kashmir Operations
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  static async send(payload: ContactPayload): Promise<string> {
    const html = this.buildHtml(payload);

    const response = (await resendClient.emails.send({
      from: mailConfig.from,
      to: payload.submissionEmail,
      subject: `[${payload.topic}] New message from ${payload.name}`,
      html,
      replyTo: payload.email,
    })) as ResendResponse;

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.id ?? "unknown";
  }
}
