"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { revokeApiKey } from "@/server/actions/api-keys";

export function RevokeApiKeyButton({ apiKeyId }: { apiKeyId: string }) {
  const router = useRouter();

  async function handleClick() {
    await revokeApiKey(apiKeyId);
    toast.success("Chave revogada.");
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick}>
      Revogar
    </Button>
  );
}
