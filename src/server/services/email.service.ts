import { prisma } from "@/lib/prisma";
import type { NotificationStatus } from "@prisma/client";
import { emailAdapter } from "./adapters/resend-email.adapter";

export interface EmailService {
  sendNotificationEmail(params: {
    organizationId: string;
    userId?: string;
    requestId: string;
    to: string;
    subject: string;
    bodyText: string;
  }): Promise<void>;
}

function renderEmailHtml(subject: string, bodyText: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #dce1e8;">
            <tr>
              <td style="background:#2454a8;padding:20px 28px;">
                <span style="color:#ffffff;font-size:16px;font-weight:700;letter-spacing:.02em;">MedCheck</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 12px;font-size:18px;color:#1a2433;">${subject}</h1>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#55627a;">${bodyText}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;border-top:1px solid #eef1f5;">
                <p style="margin:0;font-size:12px;color:#8994a8;">Este é um aviso automático da MedCheck. Não é necessário responder este e-mail.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Its own Notification row per attempt (channel: EMAIL), separate from the
 * always-created channel: IN_APP row for the same event — same pattern as
 * WhatsAppMessage tracking its own send outcome independently of the
 * in-app bell. Deliberately no separate "email message" table: unlike
 * WhatsApp this is one-way transactional mail with no reply-threading in
 * the app, so the existing Notification model (which already had an
 * EMAIL channel value nobody had used yet) is enough.
 */
export class DefaultEmailService implements EmailService {
  async sendNotificationEmail(params: {
    organizationId: string;
    userId?: string;
    requestId: string;
    to: string;
    subject: string;
    bodyText: string;
  }): Promise<void> {
    const record = await prisma.notification.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        requestId: params.requestId,
        channel: "EMAIL",
        title: params.subject,
        message: params.bodyText,
        status: "QUEUED",
      },
    });

    try {
      const result = await emailAdapter.sendEmail(params.to, params.subject, renderEmailHtml(params.subject, params.bodyText));
      await prisma.notification.update({
        where: { id: record.id },
        data: { status: result.status as NotificationStatus },
      });
      if (result.status === "FAILED") {
        console.error(`[email.service] send failed for notification ${record.id}: ${result.errorMessage}`);
      }
    } catch (error) {
      await prisma.notification.update({ where: { id: record.id }, data: { status: "FAILED" } });
      console.error(`[email.service] threw for notification ${record.id}:`, error);
    }
  }
}

export const emailService: EmailService = new DefaultEmailService();
