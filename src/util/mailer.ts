// import { Resend } from "resend";
// import { env } from "../config/env.ts";
// import { logger } from "./logger.ts";

// const resend = new Resend(env.RESEND_API_KEY);

// export class Mailer {
//   static async sendEmailVerification(
//     to: string,
//     code: string,
//     name?: string
//   ): Promise<void> {
//     logger.info("MAILER_SEND_ATTEMPT", {
//       provider: "resend",
//       type: "email_verification",
//       to,
//     });

//     try {
//       const result = await resend.emails.send({
//         from: env.RESEND_FROM_EMAIL,
//         to,
//         subject: "Verify your email",
//         html: `
//           <p>Hello${name ? ` ${name}` : ""},</p>
//           <p>Your verification code is:</p>
//           <h2>${code}</h2>
//           <p>This code expires in 10 minutes.</p>
//         `,
//       });

//       logger.info("MAILER_SEND_SUCCESS", {
//         provider: "resend",
//         to,
//         messageId: result.data?.id,
//       });
//     } catch (error: any) {
//       logger.error("MAILER_SEND_FAILED", {
//         provider: "resend",
//         to,
//         errorName: error?.name,
//         errorMessage: error?.message,
//         stack:
//           process.env.NODE_ENV !== "production" ? error?.stack : undefined,
//       });

//       throw error;
//     }
//   }
// }

import { Resend } from "resend";
import { env } from "../config/env.ts";
import { logger } from "./logger.ts";

const resend = new Resend(env.RESEND_API_KEY);

export class Mailer {
  static async sendEmailVerification(
    to: string,
    code: string,
    name?: string
  ): Promise<void> {
    logger.info("MAILER_SEND_ATTEMPT", {
      provider: "resend",
      type: "email_verification",
      to,
    });

    try {
      const result = await resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to,
        subject: "Verify your email",
        text: `Hello${name ? " " + name : ""},

Your verification code is: ${code}

This code expires in 10 minutes.

If you did not request this, you can safely ignore this email.`,
        html: `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Email Verification</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f9fafb; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px;">
      <tr>
        <td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff; padding:24px; border-radius:8px;">
            <tr>
              <td>
                <p style="font-size:14px; color:#111827; margin:0 0 12px;">
                  Hello${name ? ` ${name}` : ""},
                </p>

                <p style="font-size:14px; color:#111827; margin:0 0 16px;">
                  Use the verification code below to confirm your email address:
                </p>

                <p style="font-size:24px; font-weight:bold; letter-spacing:4px; margin:24px 0; color:#111827;">
                  ${code}
                </p>

                <p style="font-size:12px; color:#6b7280; margin:0 0 24px;">
                  This code expires in 10 minutes. If you didn’t request this, you can ignore this email.
                </p>

                <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;" />

                <p style="font-size:11px; color:#9ca3af; margin:0;">
                  © ${new Date().getFullYear()} craftlore. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`,
      });

      logger.info("MAILER_SEND_SUCCESS", {
        provider: "resend",
        to,
        messageId: result.data?.id,
      });
    } catch (error: any) {
      logger.error("MAILER_SEND_FAILED", {
        provider: "resend",
        to,
        errorName: error?.name,
        errorMessage: error?.message,
        stack: process.env.NODE_ENV !== "production" ? error?.stack : undefined,
      });

      throw error;
    }
  }
}
