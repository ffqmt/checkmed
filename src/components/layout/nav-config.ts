import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FileUp,
  ListChecks,
  ScrollText,
  ShieldAlert,
  Settings,
  Users,
  Building2,
  KeyRound,
  Webhook,
  Database,
  ClipboardList,
  MessageSquare,
  Inbox,
  Stethoscope,
  ShieldQuestion,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const clientNav: NavItem[] = [
  { href: "/app", label: "Painel", icon: LayoutDashboard },
  { href: "/app/requests/new", label: "Nova solicitação", icon: FileUp },
  { href: "/app/requests", label: "Solicitações", icon: ListChecks },
  { href: "/app/disputes", label: "Contestações", icon: ShieldAlert },
  { href: "/app/users", label: "Usuários da empresa", icon: Users },
  { href: "/app/settings", label: "Configurações", icon: Settings },
];

export const internalNav: NavItem[] = [
  { href: "/ops", label: "Painel operacional", icon: LayoutDashboard },
  { href: "/ops/queue", label: "Fila de análise", icon: Inbox },
  { href: "/ops/disputes", label: "Contestações", icon: ShieldAlert },
];

export const adminNav: NavItem[] = [
  { href: "/admin/organizations", label: "Organizações", icon: Building2 },
  { href: "/admin/users", label: "Usuários", icon: Users },
  { href: "/admin/doctor-registry", label: "Registro de médicos (CRM)", icon: Stethoscope },
  { href: "/admin/whatsapp", label: "Integração WhatsApp", icon: MessageSquare },
  { href: "/admin/api-keys", label: "API Keys", icon: KeyRound },
  { href: "/admin/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/admin/retention", label: "Políticas de retenção", icon: Database },
  { href: "/admin/data-privacy", label: "Solicitações de privacidade", icon: ShieldQuestion },
  { href: "/admin/audit-logs", label: "Logs de auditoria", icon: ScrollText },
];

export type NavArea = "client" | "internal" | "admin";

// Icon components (function references) cannot cross the Server->Client
// component boundary as props — only rendered elements/plain data can.
// AppShell (a Server Component) passes down the area key only; the client
// nav components import the actual arrays from this plain module themselves.
export const NAV_BY_AREA: Record<NavArea, NavItem[]> = {
  client: clientNav,
  internal: internalNav,
  admin: adminNav,
};

export const clientRequestTabs = [
  { value: "overview", label: "Visão geral" },
  { value: "timeline", label: "Linha do tempo" },
  { value: "report", label: "Parecer" },
];

export const internalRequestTabs: { value: string; label: string }[] = [
  { value: "overview", label: "Visão geral" },
  { value: "document", label: "Documento" },
  { value: "extracted", label: "Dados extraídos" },
  { value: "doctor", label: "Médico" },
  { value: "clinic", label: "Clínica" },
  { value: "qrcode", label: "QR Code" },
  { value: "technical", label: "Análise técnica" },
  { value: "similarity", label: "Similaridade" },
  { value: "risk", label: "Score de risco" },
  { value: "contacts", label: "Contatos" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "timeline", label: "Timeline" },
  { value: "audit", label: "Auditoria" },
  { value: "report", label: "Parecer" },
];

export const iconClipboard: LucideIcon = ClipboardList;
