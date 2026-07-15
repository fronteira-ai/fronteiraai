import { NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { createCanonicalCatalogServices } from "@/lib/canonical-catalog-factory";

type Params = { params: Promise<{ candidateId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { candidateId } = await params;
  const { mergeExecutorService } = createCanonicalCatalogServices(auth.serviceClient);

  const result = await mergeExecutorService.reject(candidateId, auth.email);
  if (!result.ok) return NextResponse.json({ error: result.error.message, code: result.error.code }, { status: 400 });

  return NextResponse.json({ message: "Merge candidate rejected" });
}
