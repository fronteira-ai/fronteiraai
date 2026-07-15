import { NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { createCanonicalCatalogServices } from "@/lib/canonical-catalog-factory";

type Params = { params: Promise<{ executionId: string }> };

// Program Ω — Mission Ω-1, Objetivo 2/4 (rollback). Reverses one merge
// execution exactly — repoints only the offer ids that execution moved,
// never every offer currently on the target.
export async function POST(_request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { executionId } = await params;
  const { mergeExecutorService } = createCanonicalCatalogServices(auth.serviceClient);

  const result = await mergeExecutorService.rollback(executionId, auth.email);
  if (!result.ok) return NextResponse.json({ error: result.error.message, code: result.error.code }, { status: 400 });

  return NextResponse.json({ message: "Merge execution rolled back", execution: result.execution });
}
