import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatRelativeToNow(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = d.getTime() - Date.now();
  const diffMin = Math.round(diffMs / 60000);
  const abs = Math.abs(diffMin);
  if (abs < 1) return "agora";
  if (abs < 60) return diffMin < 0 ? `há ${abs} min` : `em ${abs} min`;
  const diffHours = Math.round(diffMin / 60);
  if (Math.abs(diffHours) < 24)
    return diffHours < 0 ? `há ${Math.abs(diffHours)}h` : `em ${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  return diffDays < 0 ? `há ${Math.abs(diffDays)}d` : `em ${diffDays}d`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/**
 * Who actually sent an OUTBOUND WhatsApp message — never the client
 * organization's name, which isn't who's typing. templateName is only ever
 * set by the system-triggered notify() path (see whatsapp.service.ts), so
 * it's a reliable signal for "automatic" independent of sentByUserId. A
 * message with neither is a manual send from before sentByUserId existed —
 * distinct from "automatic", not guessed as either.
 */
export function outboundSenderLabel(message: { templateName: string | null; sentByUser: { name: string } | null }) {
  if (message.templateName) return "Envio automático";
  if (message.sentByUser) return message.sentByUser.name;
  return "Remetente não registrado";
}
