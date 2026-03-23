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
// DESIGN TOKENS (email-safe, inlined)
// ============================================

const F = "'Inter','Helvetica Neue',Arial,sans-serif";
const SF = "'Merriweather',Georgia,'Times New Roman',serif";

const T = {
  bgOuter: "#04040f",
  bgCard: "#0d1117",
  bgSection: "#111827",
  primary300: "#38bdf8",
  primary400: "#0ea5e9",
  primary500: "#0284c7",
  primary600: "#0369a1",
  accent400: "#22d3ee",
  success: "#10b981",
  warning: "#fbbf24",
  error: "#ef4444",
  textPrimary: "#ffffff",
  textSecondary: "#c0d9f0",
  textTertiary: "#7eacc8",
  textMuted: "#4a7a99",
  border: "#1e2e3e",
  borderPrimary: "#0e4a6e",
};

// ============================================
// SHARED HELPERS
// ============================================

function shell(inner: string, previewText: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <title>Craftlore</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Merriweather:wght@700&display=swap" rel="stylesheet"/>
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
    a{color:${T.primary400};text-decoration:none;}
    a:hover{text-decoration:underline;}
    @media only screen and (max-width:620px){
      .ec{width:100%!important;}
      .mp{padding:24px 16px!important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${T.bgOuter};font-family:${F};-webkit-font-smoothing:antialiased;">

  <!-- Preview text -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:${T.bgOuter};min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Card -->
        <table role="presentation" class="ec" cellpadding="0" cellspacing="0" width="600"
          style="background-color:${T.bgCard};border-radius:16px;border:1px solid ${T.border};overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,0.7);">
          ${inner}
        </table>

        <!-- Legal footer -->
        <table role="presentation" class="ec" cellpadding="0" cellspacing="0" width="600" style="margin-top:20px;">
          <tr>
            <td align="center">
              <p style="margin:0;font-family:${F};font-size:11px;line-height:1.6;color:${T.textMuted};text-align:center;">
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

function brandHeader(
  tagline: string,
  stripeColors = `${T.primary600},${T.primary500},${T.accent400}`,
): string {
  return `
  <tr><td style="background:linear-gradient(90deg,${stripeColors});height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>
  <tr>
    <td style="background:linear-gradient(135deg,#071e2e 0%,#0c2a3f 50%,#071e2e 100%);padding:28px 40px;border-bottom:1px solid ${T.borderPrimary};" class="mp">
      <p style="margin:0;font-family:${SF};font-size:24px;font-weight:700;letter-spacing:-0.02em;color:${T.textPrimary};">
        Craft<span style="color:${T.primary400};">lore</span>
      </p>
      <p style="margin:4px 0 0;font-family:${F};font-size:10px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:${T.textTertiary};">
        ${tagline}
      </p>
    </td>
  </tr>`;
}

function divider(): string {
  return `<tr><td style="padding:0 40px;"><div style="height:1px;background:${T.border};font-size:0;">&nbsp;</div></td></tr>`;
}

function cardFooter(note: string): string {
  return `
  <tr>
    <td style="background:${T.bgSection};padding:20px 40px;border-top:1px solid ${T.border};border-radius:0 0 16px 16px;" class="mp">
      <p style="margin:0;font-family:${F};font-size:12px;line-height:1.6;color:${T.textTertiary};text-align:center;">
        ${note}
      </p>
    </td>
  </tr>`;
}

// ============================================
// TEMPLATE 1 — Access Created (magic link + OTP)
// ============================================

function buildAccessCreatedHtml(params: SendAccessCreatedParams): string {
  const expiryFormatted = params.expiresAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Split OTP into individual digit cells for the block display
  const otpDigits = params.otp
    .split("")
    .map(
      (d) => `<td style="padding:0 4px;">
      <span style="display:inline-block;width:44px;height:54px;background:rgba(14,165,233,0.08);border:1px solid ${T.borderPrimary};border-radius:8px;font-family:'Courier New',Courier,monospace;font-size:28px;font-weight:700;color:${T.primary300};text-align:center;line-height:54px;">${d}</span>
    </td>`,
    )
    .join("");

  const inner = `
  ${brandHeader("Dashboard Access")}

  <!-- Hero -->
  <tr>
    <td style="padding:40px 40px 28px;" class="mp">
      <p style="margin:0 0 10px;font-family:${F};font-size:10px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${T.textTertiary};">
        Access Granted
      </p>
      <h1 style="margin:0 0 14px;font-family:${SF};font-size:26px;font-weight:700;line-height:1.25;color:${T.textPrimary};">
        Welcome, ${params.name}.
      </h1>
      <p style="margin:0;font-family:${F};font-size:15px;line-height:1.65;color:${T.textSecondary};">
        You have been granted access to the Craftlore dashboard. Use the button and one-time code below to sign in.
      </p>
    </td>
  </tr>

  ${divider()}

  <!-- Magic link CTA -->
  <tr>
    <td style="padding:28px 40px 20px;" class="mp">
      <p style="margin:0 0 14px;font-family:${F};font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${T.textTertiary};">
        Step 1 — Click to Access
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0;">
        <tr>
          <td style="border-radius:8px;background:${T.primary500};">
            <a href="${params.magicLinkUrl}" target="_blank"
              style="display:inline-block;padding:14px 32px;font-family:${F};font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.02em;border-radius:8px;">
              &#128274;&nbsp; Access Dashboard
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:12px 0 0;font-family:${F};font-size:12px;line-height:1.6;color:${T.textTertiary};">
        If the button doesn't work, copy and paste this link into your browser:<br/>
        <a href="${params.magicLinkUrl}" style="color:${T.primary400};text-decoration:none;word-break:break-all;font-size:11px;">${params.magicLinkUrl}</a>
      </p>
    </td>
  </tr>

  ${divider()}

  <!-- OTP block -->
  <tr>
    <td style="padding:24px 40px 28px;" class="mp">
      <p style="margin:0 0 14px;font-family:${F};font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${T.textTertiary};">
        Step 2 — Enter Your One-Time Code
      </p>
      <p style="margin:0 0 16px;font-family:${F};font-size:13px;line-height:1.6;color:${T.textSecondary};">
        After clicking the link, enter this code when prompted. It expires in <strong style="color:${T.textPrimary};">10 minutes</strong>.
      </p>
      <!-- OTP digits -->
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0;">
        <tr>${otpDigits}</tr>
      </table>
      <!-- Expiry warning -->
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:16px;">
        <tr>
          <td style="background:rgba(251,191,36,0.07);border:1px solid rgba(251,191,36,0.22);border-radius:8px;padding:12px 16px;">
            <p style="margin:0;font-family:${F};font-size:12px;color:${T.warning};">
              &#9200;&nbsp; <strong>This code expires in 10 minutes.</strong> Do not share it with anyone.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  ${divider()}

  <!-- Access expiry info -->
  <tr>
    <td style="padding:24px 40px;" class="mp">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
        style="background:${T.bgSection};border:1px solid ${T.border};border-radius:10px;overflow:hidden;">
        <tr>
          <td style="padding:16px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
              <td width="38%" style="font-family:${F};font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${T.textTertiary};vertical-align:top;padding-right:12px;">Dashboard Access Expires</td>
              <td style="font-family:${F};font-size:13px;font-weight:600;color:${T.textPrimary};">${expiryFormatted}</td>
            </tr></table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  ${cardFooter(`Do not share this link or code with anyone.
    If you did not expect this email, you can safely ignore it.
    Questions? Contact <a href="mailto:contact@craftlore.org" style="color:${T.primary400};text-decoration:none;font-weight:600;">contact@craftlore.org</a>`)}`;

  return shell(
    inner,
    `Your Craftlore dashboard access is ready — sign in with your one-time code.`,
  );
}

// ============================================
// TEMPLATE 2 — Extension Request Resolved
// ============================================

function buildExtensionResolvedHtml(
  params: SendExtensionResolvedParams,
): string {
  const isApproved = params.action === "approved";

  const expiryLine =
    isApproved && params.newExpiresAt !== undefined
      ? params.newExpiresAt.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : null;

  // Stripe + icon adapt to approved/rejected
  const accentColor = isApproved ? T.success : T.error;
  const iconBg = isApproved ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.10)";
  const iconBorder = isApproved
    ? "rgba(16,185,129,0.30)"
    : "rgba(239,68,68,0.30)";
  const icon = isApproved ? "&#10003;" : "&#10005;";
  const stripeColors = isApproved
    ? `${T.primary600},${T.success},${T.accent400}`
    : `${T.primary600},${T.error},#f97316`;

  const inner = `
  ${brandHeader("Dashboard Access", stripeColors)}

  <!-- Hero -->
  <tr>
    <td style="padding:40px 40px 28px;text-align:center;" class="mp">
      <div style="display:inline-block;width:52px;height:52px;background:${iconBg};border:2px solid ${iconBorder};border-radius:50%;text-align:center;line-height:52px;font-size:22px;margin-bottom:18px;color:${accentColor};">
        ${icon}
      </div>
      <p style="margin:0 0 10px;font-family:${F};font-size:10px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${accentColor};">
        Extension ${isApproved ? "Approved" : "Not Approved"}
      </p>
      <h1 style="margin:0 0 14px;font-family:${SF};font-size:26px;font-weight:700;line-height:1.25;color:${T.textPrimary};">
        Hi ${params.name},
      </h1>
      <p style="margin:0 auto;font-family:${F};font-size:15px;line-height:1.65;color:${T.textSecondary};max-width:420px;">
        ${
          isApproved
            ? "Your request for additional dashboard access time has been reviewed and approved."
            : "Your request for additional dashboard access time has been reviewed but could not be approved at this time."
        }
      </p>
    </td>
  </tr>

  ${divider()}

  <!-- Status callout -->
  <tr>
    <td style="padding:28px 40px;" class="mp">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
        style="background:${isApproved ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)"};border-left:3px solid ${accentColor};border-radius:0 8px 8px 0;">
        <tr>
          <td style="padding:16px 20px;">
            <p style="margin:0 0 4px;font-family:${F};font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${accentColor};">
              ${isApproved ? "Access Extended" : "Request Declined"}
            </p>
            <p style="margin:0;font-family:${F};font-size:13px;line-height:1.6;color:${T.textSecondary};">
              ${
                isApproved
                  ? expiryLine
                    ? `Your dashboard access has been extended. You can continue using the platform until <strong style="color:${T.textPrimary};">${expiryLine}</strong>.`
                    : "Your dashboard access has been extended. Please log in to see your updated expiry date."
                  : "After review, this extension request was not approved. If you believe this is an error or require urgent access, please contact the administrator directly."
              }
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- New expiry detail row (approved only) -->
  ${
    isApproved && expiryLine
      ? `
  <tr>
    <td style="padding:0 40px 28px;" class="mp">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
        style="background:${T.bgSection};border:1px solid rgba(16,185,129,0.20);border-radius:10px;overflow:hidden;">
        <tr>
          <td style="padding:16px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
              <td width="38%" style="font-family:${F};font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${T.textTertiary};vertical-align:top;padding-right:12px;">New Access Expiry</td>
              <td style="font-family:${F};font-size:13px;font-weight:600;color:${T.success};">${expiryLine}</td>
            </tr></table>
          </td>
        </tr>
      </table>
    </td>
  </tr>`
      : ""
  }

  ${divider()}

  <!-- CTA / help -->
  <tr>
    <td style="padding:28px 40px;" class="mp" align="center">
      ${
        isApproved
          ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
            <td style="border-radius:8px;background:${T.primary500};">
              <a href="https://craftlore.org/dashboard" style="display:inline-block;padding:14px 32px;font-family:${F};font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                &#128274;&nbsp; Go to Dashboard
              </a>
            </td>
           </tr></table>`
          : `<p style="margin:0;font-family:${F};font-size:13px;line-height:1.6;color:${T.textSecondary};text-align:center;">
            Need further assistance? Reach out to the administrator at<br/>
            <a href="mailto:contact@craftlore.org" style="color:${T.primary400};text-decoration:none;font-weight:600;">contact@craftlore.org</a>
           </p>`
      }
    </td>
  </tr>

  ${cardFooter(`If you did not request an extension, please contact <a href="mailto:contact@craftlore.org" style="color:${T.primary400};text-decoration:none;font-weight:600;">contact@craftlore.org</a> immediately.`)}`;

  return shell(
    inner,
    isApproved
      ? `Your dashboard access extension has been approved${expiryLine ? ` — valid until ${expiryLine}` : ""}.`
      : "Your dashboard access extension request was not approved.",
  );
}

// ============================================
// ACCESS MAILER — class structure untouched
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

      if (response.error !== undefined && response.error !== null) {
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
    params: SendAccessCreatedParams,
  ): Promise<void> {
    await this.sendMail({
      to: params.to,
      subject: "Your Craftlore dashboard access is ready",
      html: buildAccessCreatedHtml(params),
    });
  }

  // ── Extension Request Resolved ──────────────

  static async sendExtensionResolved(
    params: SendExtensionResolvedParams,
  ): Promise<void> {
    await this.sendMail({
      to: params.to,
      subject:
        params.action === "approved"
          ? "Your access extension has been approved — Craftlore"
          : "Your access extension request was not approved — Craftlore",
      html: buildExtensionResolvedHtml(params),
    });
  }
}
