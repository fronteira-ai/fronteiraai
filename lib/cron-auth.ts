import { NextRequest, NextResponse } from "next/server";

// Release 1.7 — Wave 2: first shared-secret/header-based route auth in this
// project (every other guard — requireAdmin/requireMerchant — is session
// based, unusable by a Vercel Cron hit, which carries no cookies).
// Manual setup step, same spirit as manually applying migrations: set
// CRON_SECRET in the Vercel project's env vars (Production + Preview).
// Fails closed if CRON_SECRET is unset.
export function requireCronSecret(request: NextRequest): NextResponse | null {
  const header = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  return null;
}
