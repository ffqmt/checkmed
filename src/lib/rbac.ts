import type { UserRole } from "@prisma/client";
import { INTERNAL_ROLES } from "./constants";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string | null;
};

export function isInternal(role: UserRole) {
  return INTERNAL_ROLES.includes(role);
}

export function isClient(role: UserRole) {
  return !isInternal(role);
}

export const permissions = {
  manageOrganizations: (role: UserRole) => role === "SUPER_ADMIN",
  manageGlobalSettings: (role: UserRole) => role === "SUPER_ADMIN",
  manageInternalUsers: (role: UserRole) =>
    role === "SUPER_ADMIN" || role === "INTERNAL_ADMIN",
  manageOrganizationUsers: (role: UserRole) =>
    role === "SUPER_ADMIN" || role === "CLIENT_ADMIN",
  assignAnalyst: (role: UserRole) =>
    role === "SUPER_ADMIN" || role === "INTERNAL_ADMIN" || role === "INTERNAL_SUPERVISOR",
  reviewAsAnalyst: (role: UserRole) =>
    role === "INTERNAL_ANALYST" ||
    role === "INTERNAL_SUPERVISOR" ||
    role === "INTERNAL_ADMIN" ||
    role === "SUPER_ADMIN",
  approveSupervisorReview: (role: UserRole) =>
    role === "INTERNAL_SUPERVISOR" ||
    role === "INTERNAL_ADMIN" ||
    role === "SUPER_ADMIN",
  viewAuditLogs: (role: UserRole) =>
    role === "SUPER_ADMIN" || role === "INTERNAL_ADMIN" || role === "INTERNAL_SUPERVISOR",
  manageApiKeysAndWebhooks: (role: UserRole) =>
    role === "SUPER_ADMIN" || role === "CLIENT_ADMIN",
  manageWhatsAppIntegration: (role: UserRole) =>
    role === "SUPER_ADMIN" || role === "INTERNAL_ADMIN",
  submitRequest: (role: UserRole) => isClient(role),
  openDispute: (role: UserRole) => isClient(role),
  fileDataPrivacyRequest: (role: UserRole) => role === "CLIENT_ADMIN" || isInternal(role),
  fulfillDataPrivacyRequest: (role: UserRole) => role === "SUPER_ADMIN" || role === "INTERNAL_ADMIN",
} as const;

export function assertPermission(ok: boolean, message = "Acesso não permitido") {
  if (!ok) {
    throw new Error(message);
  }
}
