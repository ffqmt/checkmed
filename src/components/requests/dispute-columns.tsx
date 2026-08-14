"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DisputeStatusBadge } from "@/components/shared/dispute-status-badge";
import { formatDateTime } from "@/lib/utils";
import type { DisputeStatus } from "@prisma/client";

export type DisputeRow = {
  id: string;
  requestId: string;
  employeeName: string;
  reason: string;
  status: DisputeStatus;
  createdAt: Date | string;
  organizationName?: string;
  openedByName?: string;
  assignedToName?: string | null;
};

/**
 * Disputes route to the parent request's page, not a dispute-specific one —
 * so unlike columns.tsx these tables aren't given a DataTable `rowHrefBase`
 * (row.id here is the dispute id, not the request id it should navigate
 * to); each row links out via this cell instead.
 */
function employeeNameCell(hrefBase: string) {
  function EmployeeNameCell({ row }: { row: { original: DisputeRow } }) {
    return (
      <Link href={`${hrefBase}/${row.original.requestId}`} className="font-medium hover:underline">
        {row.original.employeeName}
      </Link>
    );
  }
  return EmployeeNameCell;
}

export const clientDisputeColumns: ColumnDef<DisputeRow>[] = [
  { accessorKey: "employeeName", header: "Colaborador", cell: employeeNameCell("/app/requests") },
  { accessorKey: "reason", header: "Motivo" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <DisputeStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "createdAt",
    header: "Aberta em",
    cell: ({ row }) => <span className="text-sm">{formatDateTime(row.original.createdAt)}</span>,
  },
];

export const internalDisputeColumns: ColumnDef<DisputeRow>[] = [
  { accessorKey: "employeeName", header: "Colaborador", cell: employeeNameCell("/ops/requests") },
  { accessorKey: "organizationName", header: "Organização" },
  { accessorKey: "reason", header: "Motivo" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <DisputeStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "assignedToName",
    header: "Responsável",
    cell: ({ row }) => <span className="text-sm">{row.original.assignedToName ?? "Não atribuída"}</span>,
  },
  {
    accessorKey: "createdAt",
    header: "Aberta em",
    cell: ({ row }) => <span className="text-sm">{formatDateTime(row.original.createdAt)}</span>,
  },
];
