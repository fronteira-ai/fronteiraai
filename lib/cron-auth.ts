import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

// Release 1.7 — Wave 2: first shared-secret/header-based route auth in this
// project (every other guard — requireAdmin/requireMerchant — is session
// based, unusable by a Vercel Cron hit, which carries no cookies).
// Manual setup step, same spirit as manually applying migrations: set
// CRON_SECRET in the Vercel project's env vars (Production + Preview).
// Fails closed if CRON_SECRET is unset.
//
// Wave 6 hardening (2026-07-02): plain `!==` on a secret is a timing-attack
// surface — string comparison short-circuits at the first mismatched byte,
// leaking how many leading characters were guessed correctly via response
// latency. timingSafeEqual() only accepts equal-length buffers, so length is
// checked separately first (leaking length alone isn't the sensitive part).
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function requireCronSecret(request: NextRequest): NextResponse | null {
  const header = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || !header || !safeEqual(header, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  return null;
}
