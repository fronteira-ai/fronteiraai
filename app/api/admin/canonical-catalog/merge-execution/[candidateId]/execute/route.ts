import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { createCanonicalCatalogServices } from "@/lib/canonical-catalog-factory";

type Params = { params: Promise<{ candidateId: string }> };

// Program Ω — Mission Ω-1, Objetivo 2. `?dryRun=true` runs MergeExecutorService.preview
// (writes nothing) instead of execute — the same code path Objetivo 10's
// "após executar todos os merges aprovados" projection uses, just scoped to
// one candidate here.
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { candidateId } = await params;
  const dryRun = new URL(request.url).searchParams.get("dryRun") === "true";
  const { mergeExecutorService } = createCanonicalCatalogServices(auth.serviceClient);

  if (dryRun) {
    const result = await mergeExecutorService.preview(candidateId);
    if (!result.ok) return NextResponse.json({ error: result.error.message, code: result.error.code }, { status: 400 });
    return NextResponse.json({ dryRun: true, preview: result.preview });
  }

  const result = await mergeExecutorService.execute(candidateId, auth.email);
  if (!result.ok) return NextResponse.json({ error: result.error.message, code: result.error.code }, { status: 400 });

  return NextResponse.json({ dryRun: false, execution: result.execution, offersMoved: result.offersMoved });
}
