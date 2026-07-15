import { NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { createCanonicalCatalogServices } from "@/lib/canonical-catalog-factory";

// Program Ω — Mission Ω-1, Objetivo 1. Read-only classification of every
// `pending` merge candidate into Alta/Média/Revisão manual — reuses the
// confidence tiers CanonicalMergeSuggestionService already computed, never
// a new algorithm. Returns counts + the candidates themselves so the admin
// panel can render the 3 buckets without a second round trip.
export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { mergeAuditService } = createCanonicalCatalogServices(auth.serviceClient);
  const audit = await mergeAuditService.classifyPending();

  return NextResponse.json({
    total: audit.total,
    counts: { alta: audit.alta.length, media: audit.media.length, revisaoManual: audit.revisaoManual.length },
    alta: audit.alta,
    media: audit.media,
    revisaoManual: audit.revisaoManual,
  });
}
