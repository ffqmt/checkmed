import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiRequest, ApiAuthError } from "@/server/api-auth";
import { whatsAppService } from "@/server/services/whatsapp.service";

const bodySchema = z.object({
  to: z.string().min(8),
  templateName: z.string().optional(),
  message: z.string().optional(),
  variables: z.record(z.string(), z.string()).optional(),
  requestId: z.string().optional(),
});

/** POST /api/integrations/whatsapp/send — sends a template or free-text WhatsApp message on behalf of the authenticated organization. */
export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await authenticateApiRequest(request);
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
    const data = parsed.data;

    if (data.templateName) {
      await whatsAppService.sendTemplateMessage(organizationId, data.to, data.templateName, data.variables ?? {}, data.requestId);
    } else if (data.message) {
      await whatsAppService.sendTextMessage(organizationId, data.to, data.message, data.requestId);
    } else {
      return NextResponse.json({ error: "Informe 'templateName' ou 'message'." }, { status: 422 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApiAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error(error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
