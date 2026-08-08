import { Badge } from "@/components/ui/badge";
import { RISK_LABELS, RISK_TONE } from "@/lib/constants";
import type { RiskLevel } from "@prisma/client";

export function RiskBadge({ level }: { level: RiskLevel }) {
  return <Badge variant={RISK_TONE[level]}>{RISK_LABELS[level]}</Badge>;
}
