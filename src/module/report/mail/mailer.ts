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

// ── Design tokens (email-safe, inlined) ───────────────────────────────────────
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

// ── Status config ─────────────────────────────────────────────────────────────
function statusMeta(status: ReportStatus): {
  label: string;
  color: string;
  border: string;
  bg: string;
  icon: string;
} {
  const s = String(status).toLowerCase();
  if (s.includes("under_review") || s.includes("review")) {
    return {
      label: "Under Review",
      color: T.primary300,
      border: T.borderPrimary,
      bg: "rgba(14,165,233,0.12)",
      icon: "&#128269;",
    };
  }
  if (s.includes("investigating") || s.includes("invest")) {
    return {
      label: "Investigating",
      color: T.warning,
      border: "rgba(251,191,36,0.35)",
      bg: "rgba(251,191,36,0.10)",
      icon: "&#128270;",
    };
  }
  if (
    s.includes("resolved") ||
    s.includes("closed") ||
    s.includes("complete")
  ) {
    return {
      label: "Resolved",
      color: T.success,
      border: "rgba(16,185,129,0.35)",
      bg: "rgba(16,185,129,0.12)",
      icon: "&#10003;",
    };
  }
  if (s.includes("rejected") || s.includes("invalid")) {
    return {
      label: "Rejected",
      color: T.error,
      border: "rgba(239,68,68,0.35)",
      bg: "rgba(239,68,68,0.10)",
      icon: "&#10005;",
    };
  }
  // pending / submitted / default
  return {
    label: "Submitted",
    color: T.accent400,
    border: "rgba(34,211,238,0.30)",
    bg: "rgba(34,211,238,0.08)",
    icon: "&#128221;",
  };
}

function statusPill(status: ReportStatus): string {
  const m = statusMeta(status);
  return `<span style="display:inline-block;padding:3px 10px;background:${m.bg};border:1px solid ${m.border};border-radius:999px;font-family:${F};font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${m.color};">${m.icon}&nbsp;${m.label}</span>`;
}

// ── Shared shell ──────────────────────────────────────────────────────────────
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

// ── Shared header row ─────────────────────────────────────────────────────────
function brandHeader(tagline: string): string {
  return `
  <tr><td style="background:linear-gradient(90deg,${T.primary600},${T.primary500},${T.accent400});height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>
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

// ─────────────────────────────────────────────────────────────────────────────
// Template 1 — Report Received
// ─────────────────────────────────────────────────────────────────────────────
function buildReportReceivedHtml(trackingId: string): string {
  const inner = `
  ${brandHeader("Counterfeit Report System")}

  <!-- Hero -->
  <tr>
    <td style="padding:40px 40px 28px;text-align:center;" class="mp">
      <div style="display:inline-block;width:52px;height:52px;background:rgba(14,165,233,0.12);border:2px solid rgba(14,165,233,0.30);border-radius:50%;text-align:center;line-height:52px;font-size:22px;margin-bottom:18px;">
        &#128221;
      </div>
      <p style="margin:0 0 10px;font-family:${F};font-size:10px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${T.textTertiary};">
        Report Submitted
      </p>
      <h1 style="margin:0 0 14px;font-family:${SF};font-size:26px;font-weight:700;line-height:1.25;color:${T.textPrimary};">
        Your report has been received.
      </h1>
      <p style="margin:0 auto;font-family:${F};font-size:15px;line-height:1.65;color:${T.textSecondary};max-width:420px;">
        Thank you for helping protect Kashmiri craft integrity. Our team will review your submission and take appropriate action.
      </p>
    </td>
  </tr>

  ${divider()}

  <!-- Tracking ID block -->
  <tr>
    <td style="padding:28px 40px;" class="mp">
      <p style="margin:0 0 14px;font-family:${F};font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${T.textTertiary};">
        Your Reference
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
        style="background:${T.bgSection};border:1px solid ${T.borderPrimary};border-radius:10px;overflow:hidden;">
        <tr>
          <td style="padding:20px 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td>
                  <p style="margin:0 0 4px;font-family:${F};font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${T.textTertiary};">
                    Tracking ID
                  </p>
                  <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:18px;font-weight:700;letter-spacing:0.06em;color:${T.primary300};">
                    ${trackingId}
                  </p>
                </td>
                <td align="right" valign="middle">
                  <span style="display:inline-block;padding:4px 12px;background:rgba(14,165,233,0.12);border:1px solid ${T.borderPrimary};border-radius:999px;font-family:${F};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${T.primary300};">
                    &#128221;&nbsp;Submitted
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="margin:12px 0 0;font-family:${F};font-size:12px;color:${T.textTertiary};">
        Save this ID — you will need it to check on your report's status.
      </p>
    </td>
  </tr>

  ${divider()}

  <!-- What happens next -->
  <tr>
    <td style="padding:24px 40px;" class="mp">
      <p style="margin:0 0 16px;font-family:${F};font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${T.textTertiary};">
        What Happens Next
      </p>
      ${[
        [
          "Report assigned for review",
          "Our compliance team reviews all incoming reports within 2 business days.",
        ],
        [
          "Investigation initiated if valid",
          "Credible reports are escalated for formal investigation under CKTRE protocols.",
        ],
        [
          "You'll be notified of updates",
          "You'll receive an email whenever the status of your report changes.",
        ],
      ]
        .map(
          ([title, desc], i) => `
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:14px;">
        <tr>
          <td width="30" valign="top" style="padding-top:1px;">
            <span style="display:inline-block;width:22px;height:22px;background:rgba(14,165,233,0.12);border:1px solid ${T.borderPrimary};border-radius:50%;font-family:${F};font-size:11px;font-weight:700;color:${T.primary300};text-align:center;line-height:22px;">${i + 1}</span>
          </td>
          <td style="padding-left:10px;">
            <p style="margin:0 0 2px;font-family:${F};font-size:13px;font-weight:600;color:${T.textPrimary};">${title}</p>
            <p style="margin:0;font-family:${F};font-size:12px;line-height:1.55;color:${T.textTertiary};">${desc}</p>
          </td>
        </tr>
      </table>`,
        )
        .join("")}
    </td>
  </tr>

  <!-- Card footer -->
  <tr>
    <td style="background:${T.bgSection};padding:20px 40px;border-top:1px solid ${T.border};border-radius:0 0 16px 16px;" class="mp">
      <p style="margin:0;font-family:${F};font-size:12px;line-height:1.6;color:${T.textTertiary};text-align:center;">
        Questions? Contact us at
        <a href="mailto:contact@craftlore.org" style="color:${T.primary400};text-decoration:none;font-weight:600;">contact@craftlore.org</a>
      </p>
    </td>
  </tr>`;

  return shell(inner, `Report received — your tracking ID is ${trackingId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Template 2 — Status Updated
// ─────────────────────────────────────────────────────────────────────────────
function buildStatusUpdatedHtml(
  trackingId: string,
  oldStatus: ReportStatus,
  newStatus: ReportStatus,
): string {
  const oldMeta = statusMeta(oldStatus);
  const newMeta = statusMeta(newStatus);

  // Pick accent stripe color based on new status
  const stripeColor =
    newMeta.color === T.success
      ? T.success
      : newMeta.color === T.error
        ? T.error
        : newMeta.color === T.warning
          ? T.warning
          : T.primary500;

  const inner = `
  <tr><td style="background:linear-gradient(90deg,${T.primary600},${stripeColor},${T.accent400});height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>
  <tr>
    <td style="background:linear-gradient(135deg,#071e2e 0%,#0c2a3f 50%,#071e2e 100%);padding:28px 40px;border-bottom:1px solid ${T.borderPrimary};" class="mp">
      <p style="margin:0;font-family:${SF};font-size:24px;font-weight:700;letter-spacing:-0.02em;color:${T.textPrimary};">
        Craft<span style="color:${T.primary400};">lore</span>
      </p>
      <p style="margin:4px 0 0;font-family:${F};font-size:10px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:${T.textTertiary};">
        Counterfeit Report System
      </p>
    </td>
  </tr>

  <!-- Hero -->
  <tr>
    <td style="padding:40px 40px 28px;text-align:center;" class="mp">
      <div style="display:inline-block;width:52px;height:52px;background:${newMeta.bg};border:2px solid ${newMeta.border};border-radius:50%;text-align:center;line-height:52px;font-size:22px;margin-bottom:18px;">
        ${newMeta.icon}
      </div>
      <p style="margin:0 0 10px;font-family:${F};font-size:10px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${T.textTertiary};">
        Status Update
      </p>
      <h1 style="margin:0 0 14px;font-family:${SF};font-size:26px;font-weight:700;line-height:1.25;color:${T.textPrimary};">
        Your report status has changed.
      </h1>
      <p style="margin:0 auto;font-family:${F};font-size:15px;line-height:1.65;color:${T.textSecondary};max-width:420px;">
        We have an update on the counterfeit report you submitted. Please review the details below.
      </p>
    </td>
  </tr>

  ${divider()}

  <!-- Tracking ID + status transition -->
  <tr>
    <td style="padding:28px 40px;" class="mp">
      <p style="margin:0 0 14px;font-family:${F};font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${T.textTertiary};">
        Report Details
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
        style="background:${T.bgSection};border:1px solid ${T.border};border-radius:10px;overflow:hidden;">

        <!-- Tracking ID row -->
        <tr>
          <td style="padding:12px 20px;border-bottom:1px solid ${T.border};">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
              <td width="38%" style="font-family:${F};font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${T.textTertiary};vertical-align:middle;padding-right:12px;">Tracking ID</td>
              <td style="font-family:'Courier New',Courier,monospace;font-size:13px;font-weight:700;letter-spacing:0.05em;color:${T.primary300};">${trackingId}</td>
            </tr></table>
          </td>
        </tr>

        <!-- Previous status row -->
        <tr>
          <td style="padding:12px 20px;border-bottom:1px solid ${T.border};">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
              <td width="38%" style="font-family:${F};font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${T.textTertiary};vertical-align:middle;padding-right:12px;">Previous Status</td>
              <td>${statusPill(oldStatus)}</td>
            </tr></table>
          </td>
        </tr>

        <!-- New status row -->
        <tr>
          <td style="padding:12px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
              <td width="38%" style="font-family:${F};font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${T.textTertiary};vertical-align:middle;padding-right:12px;">Current Status</td>
              <td>
                ${statusPill(newStatus)}
                <span style="margin-left:8px;font-family:${F};font-size:11px;color:${T.textTertiary};">
                  Updated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </span>
              </td>
            </tr></table>
          </td>
        </tr>

      </table>
    </td>
  </tr>

  ${divider()}

  <!-- Status-specific message -->
  <tr>
    <td style="padding:24px 40px;" class="mp">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
        style="background:${newMeta.bg};border-left:3px solid ${newMeta.color};border-radius:0 8px 8px 0;">
        <tr>
          <td style="padding:16px 20px;">
            <p style="margin:0 0 4px;font-family:${F};font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${newMeta.color};">
              ${newMeta.label}
            </p>
            <p style="margin:0;font-family:${F};font-size:13px;line-height:1.6;color:${T.textSecondary};">
              ${
                newMeta.label === "Under Review"
                  ? "Your report is currently being examined by our compliance team. No further action is needed from you at this stage."
                  : newMeta.label === "Investigating"
                    ? "Your report has been escalated for formal investigation. Our team is actively examining the evidence submitted."
                    : newMeta.label === "Resolved"
                      ? "This report has been reviewed and closed. Thank you for helping protect authentic Kashmiri craftsmanship."
                      : newMeta.label === "Rejected"
                        ? "After review, we were unable to substantiate this report with the available evidence. You may submit a new report with additional documentation."
                        : "Your report has been successfully logged in our system and is queued for review."
              }
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Card footer -->
  <tr>
    <td style="background:${T.bgSection};padding:20px 40px;border-top:1px solid ${T.border};border-radius:0 0 16px 16px;" class="mp">
      <p style="margin:0;font-family:${F};font-size:12px;line-height:1.6;color:${T.textTertiary};text-align:center;">
        Questions about your report? Contact us at
        <a href="mailto:contact@craftlore.org" style="color:${T.primary400};text-decoration:none;font-weight:600;">contact@craftlore.org</a>
        and quote your tracking ID.
      </p>
    </td>
  </tr>`;

  return shell(
    inner,
    `Status update on report ${trackingId} — now ${newMeta.label}`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mailer class — structure, logging, and send logic untouched
// ─────────────────────────────────────────────────────────────────────────────
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
    params: SendReportReceivedParams,
  ): Promise<void> {
    await this.sendMail({
      to: params.to,
      subject: `Your counterfeit report has been received — Ref: ${params.trackingId}`,
      html: buildReportReceivedHtml(params.trackingId),
    });
  }

  static async sendStatusUpdated(
    params: SendStatusUpdatedParams,
  ): Promise<void> {
    const newMeta = statusMeta(params.newStatus);
    await this.sendMail({
      to: params.to,
      subject: `Report ${params.trackingId} is now ${newMeta.label} — Craftlore`,
      html: buildStatusUpdatedHtml(
        params.trackingId,
        params.oldStatus,
        params.newStatus,
      ),
    });
  }
}
