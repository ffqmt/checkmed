"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

export type DoctorRow = {
  id: string;
  officialName: string;
  crm: string;
  uf: string;
  specialty: string | null;
  registrationStatus: string | null;
  verifiedAt: Date | string;
};

/**
 * registrationStatus is free text copied from the CFM site (not an enum —
 * different searches/imports have produced a dozen distinct real values),
 * so tone is inferred by keyword rather than an exhaustive exact-match map
 * that would silently miss a future variant.
 */
function statusTone(status: string | null): "success" | "danger" | "warning" | "neutral" {
  if (!status) return "neutral";
  const s = status.toLowerCase();
  if (s === "regular") return "success";
  if (s.includes("cancel") || s.includes("cass")) return "danger";
  if (s.includes("suspens")) return "warning";
  return "neutral";
}

export const doctorColumns: ColumnDef<DoctorRow>[] = [
  { accessorKey: "officialName", header: "Nome" },
  {
    id: "crmUf",
    header: "CRM/UF",
    cell: ({ row }) => (
      <span className="tabular-nums">
        {row.original.crm}/{row.original.uf}
      </span>
    ),
  },
  {
    accessorKey: "specialty",
    header: "Especialidade",
    cell: ({ row }) => <span className="text-sm">{row.original.specialty ?? "—"}</span>,
  },
  {
    accessorKey: "registrationStatus",
    header: "Situação (CFM)",
    cell: ({ row }) => <Badge variant={statusTone(row.original.registrationStatus)}>{row.original.registrationStatus ?? "—"}</Badge>,
  },
  {
    accessorKey: "verifiedAt",
    header: "Verificado em",
    cell: ({ row }) => <span className="text-sm">{formatDateTime(row.original.verifiedAt)}</span>,
  },
];
