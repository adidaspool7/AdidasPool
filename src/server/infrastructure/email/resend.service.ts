/**
 * Resend Email Service
 *
 * ONION LAYER: Infrastructure
 * DEPENDENCIES: resend (external), domain ports (inward)
 *
 * Implements IEmailService using Resend.
 */

import { Resend } from "resend";
import type { IEmailService } from "@server/domain/ports/services";

let _resend: Resend | null = null;
function getResendClient(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export class ResendEmailService implements IEmailService {
  async sendMagicLink(
    to: string,
    candidateName: string,
    magicLink: string,
    expiresAt: Date
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await getResendClient().emails.send({
        from: "Talent Platform <noreply@yourdomain.com>",
        to,
        subject: "Your Language Assessment Invitation",
        html: `
          <h2>Hello ${candidateName},</h2>
          <p>You have been invited to complete a language assessment.</p>
          <p><a href="${magicLink}" style="padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Start Assessment</a></p>
          <p>This link expires on ${expiresAt.toLocaleDateString()}.</p>
          <p>If the button doesn't work, copy this link: ${magicLink}</p>
        `,
      });

      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown email error";
      return { success: false, error: message };
    }
  }

  async sendContactEmail(
    to: string,
    candidateName: string,
    subject: string,
    body: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Sanitise and convert plain-text body to safe HTML
      const escaped = body
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      const htmlBody = escaped
        .split(/\n{2,}/)
        .map((para) => `<p style="margin:0 0 12px 0">${para.replace(/\n/g, "<br>")}</p>`)
        .join("");

      await getResendClient().emails.send({
        from: "adidas Talent Team <noreply@yourdomain.com>",
        to,
        subject,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333;line-height:1.6">
            ${htmlBody}
            <hr style="margin-top:32px;border:none;border-top:1px solid #eee">
            <p style="font-size:11px;color:#aaa;margin-top:16px">
              This message was sent via the adidas Talent Intelligence Platform.
              If you believe you received this in error, please disregard it.
            </p>
          </div>
        `,
      });

      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown email error";
      return { success: false, error: message };
    }
  }
}
