"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { RiskBadge } from "@/components/shared/risk-badge";
import { PRIORITY_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import type { RequestStatus, RiskLevel, RequestPriority } from "@prisma/client";

export type RequestRow = {
  id: string;
  employeeName: string;
  employeeDocumentMasked: string;
  status: RequestStatus;
  riskLevel: RiskLevel | null;
  priority: RequestPriority;
  createdAt: Date | string;
  slaDueAt: Date | string | null;
  organizationName?: string;
  assignedToName?: string | null;
};

export const clientRequestColumns: ColumnDef<RequestRow>[] = [
  { accessorKey: "employeeName", header: "Colaborador" },
  { accessorKey: "employeeDocumentMasked", header: "CPF" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "riskLevel",
    header: "Confiabilidade",
    cell: ({ row }) => (row.original.riskLevel ? <RiskBadge level={row.original.riskLevel} /> : <span className="text-xs text-muted-foreground">—</span>),
  },
  {
    accessorKey: "createdAt",
    header: "Criada em",
    cell: ({ row }) => <span className="text-sm">{formatDateTime(row.original.createdAt)}</span>,
  },
];

export const internalRequestColumns: ColumnDef<RequestRow>[] = [
  { accessorKey: "employeeName", header: "Colaborador" },
  { accessorKey: "organizationName", header: "Organização" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "riskLevel",
    header: "Confiabilidade",
    cell: ({ row }) => (row.original.riskLevel ? <RiskBadge level={row.original.riskLevel} /> : <span className="text-xs text-muted-foreground">—</span>),
  },
  {
    accessorKey: "priority",
    header: "Prioridade",
    cell: ({ row }) => <span className="text-sm">{PRIORITY_LABELS[row.original.priority]}</span>,
  },
  {
    accessorKey: "assignedToName",
    header: "Responsável",
    cell: ({ row }) => <span className="text-sm">{row.original.assignedToName ?? "Não atribuído"}</span>,
  },
  {
    accessorKey: "createdAt",
    header: "Criada em",
    cell: ({ row }) => <span className="text-sm">{formatDateTime(row.original.createdAt)}</span>,
  },
];
