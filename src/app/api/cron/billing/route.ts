import { NextResponse } from "next/server";
import { generateMonthlyInvoices } from "@/server/services/billing.service";

/**
 * Runs on the 1st of every month (see vercel.json) — bills the previous
 * month's real usage for every organization with an active subscription.
 * Same auth pattern as /api/cron/retention. Safe to trigger by hand too
 * (e.g. via `curl -H "Authorization: Bearer $CRON_SECRET" .../api/cron/billing`)
 * if a run needs to be redone — it's idempotent per organization+month.
 */
export async function GET(request: Request) {
  const authError = checkCronAuth(request);
  if (authError) return authError;

  const result = await generateMonthlyInvoices();
  return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), ...result });
}

function checkCronAuth(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (secret) {
    if (authHeader !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return null;
  }
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 });
  }
  return null;
}
