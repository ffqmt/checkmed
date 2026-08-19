"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Print-to-PDF, not a generated file — the browser's own "Salvar como PDF" in the print dialog covers the "PDF do parecer" need without a server-side rendering pipeline. Hidden from the printed page itself via print:hidden. */
export function PrintReportButton() {
  return (
    <Button type="button" variant="outline" size="sm" className="print:hidden" onClick={() => window.print()}>
      <Printer /> Imprimir parecer
    </Button>
  );
}
