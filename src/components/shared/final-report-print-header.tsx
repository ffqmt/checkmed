import { formatDate } from "@/lib/utils";

/** Only visible in the print stylesheet (hidden on screen) — gives the printed page a proper document header instead of a bare dashboard card, since this is meant to work as a standalone "relatório final" once printed/saved as PDF. */
export function FinalReportPrintHeader({
  employeeName,
  employeeDocumentMasked,
  requestId,
  receivedByCompanyAt,
}: {
  employeeName: string;
  employeeDocumentMasked: string;
  requestId: string;
  receivedByCompanyAt: Date;
}) {
  return (
    <div className="hidden print:block print:mb-6 print:border-b print:border-border print:pb-4">
      <div className="flex items-center justify-between">
        <span className="font-serif text-lg font-semibold">MedCheck</span>
        <span className="text-xs text-muted-foreground">Parecer final — Solicitação #{requestId}</span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
        <div className="flex gap-1">
          <dt className="text-muted-foreground">Colaborador:</dt>
          <dd className="font-medium">{employeeName}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-muted-foreground">CPF:</dt>
          <dd className="font-medium">{employeeDocumentMasked}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-muted-foreground">Recebido pela empresa em:</dt>
          <dd className="font-medium">{formatDate(receivedByCompanyAt)}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-muted-foreground">Impresso em:</dt>
          <dd className="font-medium">{formatDate(new Date())}</dd>
        </div>
      </dl>
    </div>
  );
}
