import { prisma } from "@/lib/prisma";
import type { NotificationStatus } from "@prisma/client";
import { formatDate } from "@/lib/utils";
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

function appBaseUrl(): string {
  return process.env.NEXTAUTH_URL ?? "https://checkmed-mu.vercel.app";
}

function renderEmailHtml(params: {
  subject: string;
  bodyText: string;
  employeeName: string | null;
  requestDate: Date | null;
  requestLink: string;
}): string {
  const { subject, bodyText, employeeName, requestDate, requestLink } = params;
  const metaLine =
    employeeName && requestDate
      ? `Atestado de <strong style="color:#1a2433;">${employeeName}</strong> · enviado em ${formatDate(requestDate)} para a MedCheck`
      : null;

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #dce1e8;">
            <tr>
              <td style="background:#17203a;padding:24px 32px;">
                <span style="color:#ffffff;font-size:17px;font-weight:700;letter-spacing:.03em;">MedCheck</span>
                <span style="display:block;color:#8ba4d6;font-size:11px;margin-top:2px;letter-spacing:.04em;text-transform:uppercase;">Validação de atestados médicos</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 8px;">
                <span style="display:inline-block;background:#e7eefb;color:#17398a;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:4px 10px;border-radius:99px;">Atualização de solicitação</span>
                <h1 style="margin:14px 0 12px;font-size:20px;line-height:1.3;color:#1a2433;">${subject}</h1>
                ${metaLine ? `<p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#55627a;">${metaLine}</p>` : ""}
                <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#3d4759;">${bodyText}</p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:8px;background:#2454a8;">
                      <a href="${requestLink}" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Ver solicitação no painel →</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #eef1f5;">
                <p style="margin:0;font-size:12px;color:#8994a8;">Este é um aviso automático da MedCheck. Não é necessário responder este e-mail — para dúvidas, acesse o painel.</p>
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

    const request = await prisma.medicalCertificateRequest.findUnique({
      where: { id: params.requestId },
      select: { employeeName: true, createdAt: true },
    });

    const html = renderEmailHtml({
      subject: params.subject,
      bodyText: params.bodyText,
      employeeName: request?.employeeName ?? null,
      requestDate: request?.createdAt ?? null,
      requestLink: `${appBaseUrl()}/app/requests/${params.requestId}`,
    });

    try {
      const result = await emailAdapter.sendEmail(params.to, params.subject, html);
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
