import { NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { createCanonicalCatalogServices } from "@/lib/canonical-catalog-factory";

type Params = { params: Promise<{ candidateId: string }> };

// Program Ω — Mission Ω-1. Records a human decision — same Shadow Mode
// invariant as the pre-existing PATCH /merge-candidates/[id] route, but
// enforced with an explicit state-machine guard (candidate must currently
// be Pending) via MergeExecutorService instead of a raw status write.
export async function POST(_request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { candidateId } = await params;
  const { mergeExecutorService } = createCanonicalCatalogServices(auth.serviceClient);

  const result = await mergeExecutorService.approve(candidateId, auth.email);
  if (!result.ok) return NextResponse.json({ error: result.error.message, code: result.error.code }, { status: 400 });

  return NextResponse.json({ message: "Merge candidate approved" });
}
