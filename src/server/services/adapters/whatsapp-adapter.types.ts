export type WhatsAppSendResult = {
  providerMessageId: string | null;
  status: "SENT" | "FAILED" | "SIMULATED";
  errorMessage?: string;
};

export interface WhatsAppAdapter {
  sendTemplateMessage(
    to: string,
    templateName: string,
    variables: Record<string, string>,
  ): Promise<WhatsAppSendResult>;
  sendTextMessage(to: string, message: string): Promise<WhatsAppSendResult>;
}
