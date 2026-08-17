export type EmailSendResult = {
  providerMessageId: string | null;
  status: "SENT" | "FAILED" | "SIMULATED";
  errorMessage?: string;
};

export interface EmailAdapter {
  sendEmail(to: string, subject: string, html: string): Promise<EmailSendResult>;
}
