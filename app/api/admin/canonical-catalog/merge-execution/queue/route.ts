import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { createCanonicalCatalogServices } from "@/lib/canonical-catalog-factory";
import { MergeCandidateStatus } from "@/src/domains/canonical-catalog";

const VALID_STATUSES = new Set(Object.values(MergeCandidateStatus));

// Program Ω — Mission Ω-1, Objetivo 3/4. Same shape as the pre-existing
// GET /merge-candidates route, extended to the 2 new terminal statuses
// (Merged, RolledBack) the queue's lifecycle now has.
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status") ?? MergeCandidateStatus.Pending;
  if (!VALID_STATUSES.has(statusParam as MergeCandidateStatus)) {
    return NextResponse.json({ error: `Invalid status. Expected one of: ${[...VALID_STATUSES].join(", ")}` }, { status: 400 });
  }

  const limit = Math.min(Number(searchParams.get("limit") ?? 20) || 20, 100);
  const offset = Number(searchParams.get("offset") ?? 0) || 0;

  const { mergeCandidateRepo } = createCanonicalCatalogServices(auth.serviceClient);
  const result = await mergeCandidateRepo.findByStatus(statusParam as MergeCandidateStatus, { limit, offset });

  return NextResponse.json({ data: result.items, total: result.total });
}
