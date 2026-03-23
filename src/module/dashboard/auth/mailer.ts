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

function detailRow(label: string, value: string, last = false): string {
  return `
  <tr>
    <td style="padding:11px 20px;${last ? "" : `border-bottom:1px solid ${T.border};`}">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
        <td width="38%" style="font-family:${F};font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${T.textTertiary};vertical-align:top;padding-right:12px;">${label}</td>
        <td style="font-family:${F};font-size:13px;color:${T.textSecondary};vertical-align:top;">${value}</td>
      </tr></table>
    </td>
  </tr>`;
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
// TEMPLATE 1 — Magic Link + OTP
// ============================================

function buildMagicLinkHtml(params: SendMagicLinkParams): string {
  const expiryFormatted = params.expiresAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const otpDigits = params.otp
    .split("")
    .map(
      (d) => `<td style="padding:0 3px;">
      <span style="display:inline-block;width:44px;height:54px;background:rgba(14,165,233,0.08);border:1px solid ${T.borderPrimary};border-radius:8px;font-family:'Courier New',Courier,monospace;font-size:28px;font-weight:700;color:${T.primary300};text-align:center;line-height:54px;">${d}</span>
    </td>`,
    )
    .join("");

  const inner = `
  ${brandHeader("Secure Sign-In")}

  <!-- Hero -->
  <tr>
    <td style="padding:40px 40px 28px;" class="mp">
      <p style="margin:0 0 10px;font-family:${F};font-size:10px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${T.textTertiary};">
        Sign-In Request
      </p>
      <h1 style="margin:0 0 14px;font-family:${SF};font-size:26px;font-weight:700;line-height:1.25;color:${T.textPrimary};">
        Your sign-in link is ready.
      </h1>
      <p style="margin:0;font-family:${F};font-size:15px;line-height:1.65;color:${T.textSecondary};">
        Use the button and one-time code below to access your Craftlore dashboard. Both expire in <strong style="color:${T.textPrimary};">10 minutes</strong>.
      </p>
    </td>
  </tr>

  ${divider()}

  <!-- Step 1: Magic link -->
  <tr>
    <td style="padding:28px 40px 20px;" class="mp">
      <p style="margin:0 0 14px;font-family:${F};font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${T.textTertiary};">
        Step 1 — Open Your Sign-In Link
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td style="border-radius:8px;background:${T.primary500};">
            <a href="${params.magicLinkUrl}" target="_blank"
              style="display:inline-block;padding:14px 32px;font-family:${F};font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.02em;border-radius:8px;">
              &#128274;&nbsp; Sign In to Dashboard
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:12px 0 0;font-family:${F};font-size:12px;line-height:1.6;color:${T.textTertiary};">
        Button not working? Paste this URL into your browser:<br/>
        <a href="${params.magicLinkUrl}" style="color:${T.primary400};text-decoration:none;word-break:break-all;font-size:11px;">${params.magicLinkUrl}</a>
      </p>
    </td>
  </tr>

  ${divider()}

  <!-- Step 2: OTP -->
  <tr>
    <td style="padding:24px 40px 28px;" class="mp">
      <p style="margin:0 0 6px;font-family:${F};font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${T.textTertiary};">
        Step 2 — Enter Your One-Time Code
      </p>
      <p style="margin:0 0 18px;font-family:${F};font-size:13px;line-height:1.6;color:${T.textSecondary};">
        After opening the link, enter this code when prompted.
      </p>
      <!-- OTP digit blocks -->
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>${otpDigits}</tr>
      </table>
      <!-- Expiry warning -->
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:16px;">
        <tr>
          <td style="background:rgba(251,191,36,0.07);border:1px solid rgba(251,191,36,0.22);border-radius:8px;padding:12px 16px;">
            <p style="margin:0;font-family:${F};font-size:12px;color:${T.warning};">
              &#9200;&nbsp; <strong>Expires in 10 minutes.</strong> Do not share this code with anyone.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  ${divider()}

  <!-- Access expiry -->
  <tr>
    <td style="padding:24px 40px;" class="mp">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
        style="background:${T.bgSection};border:1px solid ${T.border};border-radius:10px;overflow:hidden;">
        ${detailRow("Link Expires", expiryFormatted, true)}
      </table>
    </td>
  </tr>

  ${cardFooter(`Do not share this link or code with anyone.
    If you did not request this email, you can safely ignore it.
    Questions? <a href="mailto:contact@craftlore.org" style="color:${T.primary400};text-decoration:none;font-weight:600;">contact@craftlore.org</a>`)}`;

  return shell(
    inner,
    "Your Craftlore sign-in link and one-time code are ready — expires in 10 minutes.",
  );
}

// ============================================
// TEMPLATE 2 — Device Approval Request
// ============================================

function buildDeviceApprovalHtml(
  approvalUrl: string,
  deviceMetadata: DeviceMetadata,
): string {
  const detectedAt = new Date().toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const inner = `
  <!-- Red-tinted stripe signals security alert -->
  <tr><td style="background:linear-gradient(90deg,${T.primary600},${T.error},#f97316);height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>
  <tr>
    <td style="background:linear-gradient(135deg,#1a0a0a 0%,#2d0e0e 50%,#1a0a0a 100%);padding:28px 40px;border-bottom:1px solid rgba(239,68,68,0.25);" class="mp">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td>
            <p style="margin:0;font-family:${SF};font-size:24px;font-weight:700;letter-spacing:-0.02em;color:${T.textPrimary};">
              Craft<span style="color:${T.primary400};">lore</span>
            </p>
            <p style="margin:4px 0 0;font-family:${F};font-size:10px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#f87171;">
              Security Alert
            </p>
          </td>
          <td align="right" valign="middle">
            <span style="display:inline-block;padding:4px 12px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.35);border-radius:999px;font-family:${F};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.error};">
              &#9888;&nbsp; Action Required
            </span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Alert banner -->
  <tr>
    <td style="background:rgba(239,68,68,0.07);padding:14px 40px;border-bottom:1px solid rgba(239,68,68,0.18);" class="mp">
      <p style="margin:0;font-family:${F};font-size:13px;font-weight:600;color:${T.error};">
        &#128683;&nbsp; A login attempt was made from an unrecognized device on your account
      </p>
    </td>
  </tr>

  <!-- Hero -->
  <tr>
    <td style="padding:36px 40px 24px;" class="mp">
      <h1 style="margin:0 0 14px;font-family:${SF};font-size:24px;font-weight:700;line-height:1.3;color:${T.textPrimary};">
        New device sign-in attempt
      </h1>
      <p style="margin:0;font-family:${F};font-size:15px;line-height:1.65;color:${T.textSecondary};">
        Someone attempted to sign in to your Craftlore dashboard from a device we don't recognise. Review the details below and approve or ignore this request.
      </p>
    </td>
  </tr>

  ${divider()}

  <!-- Device details table -->
  <tr>
    <td style="padding:24px 40px 8px;" class="mp">
      <p style="margin:0 0 14px;font-family:${F};font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${T.textTertiary};">
        Device Details
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
        style="background:${T.bgSection};border:1px solid rgba(239,68,68,0.20);border-radius:10px;overflow:hidden;">
        ${detailRow("Browser", deviceMetadata.browser ?? "Unknown")}
        ${detailRow("Operating System", deviceMetadata.os ?? "Unknown")}
        ${detailRow("IP Address", deviceMetadata.ip ?? "Unknown")}
        ${detailRow("Detected", detectedAt, true)}
      </table>
    </td>
  </tr>

  <!-- Was this you? -->
  <tr>
    <td style="padding:16px 40px 24px;" class="mp">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
        style="background:rgba(14,165,233,0.05);border-left:3px solid ${T.primary500};border-radius:0 8px 8px 0;">
        <tr>
          <td style="padding:14px 18px;">
            <p style="margin:0 0 4px;font-family:${F};font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${T.primary300};">
              Was this you?
            </p>
            <p style="margin:0;font-family:${F};font-size:13px;line-height:1.6;color:${T.textSecondary};">
              If you initiated this sign-in, click the button below to approve this device. The approval link expires in <strong style="color:${T.textPrimary};">24 hours</strong>.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  ${divider()}

  <!-- Approve CTA -->
  <tr>
    <td style="padding:28px 40px;" align="center" class="mp">
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
        <tr>
          <td style="border-radius:8px;background:${T.primary500};">
            <a href="${approvalUrl}" target="_blank"
              style="display:inline-block;padding:14px 32px;font-family:${F};font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.02em;border-radius:8px;">
              &#128275;&nbsp; Approve This Device
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:12px 0 0;font-family:${F};font-size:11px;color:${T.textTertiary};text-align:center;">
        Link expires in 24 hours. Only click if you recognise this sign-in attempt.
      </p>
    </td>
  </tr>

  ${divider()}

  <!-- Security warning -->
  <tr>
    <td style="padding:24px 40px;" class="mp">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
        style="background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.22);border-radius:8px;">
        <tr>
          <td style="padding:16px 20px;">
            <p style="margin:0 0 6px;font-family:${F};font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${T.error};">
              &#128683;&nbsp; If this was NOT you
            </p>
            <p style="margin:0;font-family:${F};font-size:13px;line-height:1.6;color:${T.textSecondary};">
              Do <strong style="color:${T.textPrimary};">not</strong> click the button above. Contact
              <a href="mailto:contact@craftlore.org" style="color:${T.primary400};text-decoration:none;font-weight:600;">contact@craftlore.org</a>
              immediately and secure your account.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  ${cardFooter(`This is an automated security alert from Craftlore. Do not reply to this email.`)}`;

  return shell(
    inner,
    "Security alert: a new device is attempting to access your Craftlore dashboard.",
  );
}

// ============================================
// AUTH MAILER — class structure untouched
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

  // ── Magic Link + OTP Email ──────────────────

  static async sendMagicLink(params: SendMagicLinkParams): Promise<void> {
    await this.sendMail({
      to: params.to,
      subject: "Your Craftlore sign-in link — expires in 10 minutes",
      html: buildMagicLinkHtml(params),
    });
  }

  // ── Device Approval Email (owner only) ──────

  static async sendDeviceApprovalRequest(
    params: SendDeviceApprovalParams,
  ): Promise<void> {
    const approvalUrl = `${process.env["FRONTEND_URL"] ?? ""}/dashboard/auth/device/approve/${params.approvalToken}`;

    await this.sendMail({
      to: params.to,
      subject:
        "Security alert: new device sign-in attempt on your Craftlore account",
      html: buildDeviceApprovalHtml(approvalUrl, params.deviceMetadata),
    });
  }
}
