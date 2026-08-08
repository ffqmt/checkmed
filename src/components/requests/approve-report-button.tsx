"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { approveFinalReport } from "@/server/actions/final-reports";

export function ApproveReportButton({ reportId }: { reportId: string }) {
  const router = useRouter();

  async function handleClick() {
    try {
      await approveFinalReport(reportId);
      toast.success("Parecer aprovado.");
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  return (
    <Button size="sm" onClick={handleClick}>
      <CheckCircle2 /> Aprovar parecer
    </Button>
  );
}
