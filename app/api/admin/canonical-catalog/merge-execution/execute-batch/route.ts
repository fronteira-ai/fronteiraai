import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { createCanonicalCatalogServices } from "@/lib/canonical-catalog-factory";
import { MergeCandidateStatus } from "@/src/domains/canonical-catalog";

const MAX_BATCH_LIMIT = 500;

interface BatchBody {
  limit?: number;
  dryRun?: boolean;
}

// Program Ω — Mission Ω-1, Objetivo 2/10. Executes (or, with dryRun:true,
// previews) every candidate currently in status=Approved, up to `limit`.
// Never touches Pending candidates — approval is always a separate, prior
// step (Shadow Mode). Sequential under the hood (MergeExecutorService.executeBatch),
// so two candidates that happen to share a target never race each other.
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const body = (await request.json().catch(() => ({}))) as BatchBody;
  const limit = Math.min(body.limit ?? 50, MAX_BATCH_LIMIT);
  const dryRun = body.dryRun ?? false;

  const { mergeCandidateRepo, mergeExecutorService } = createCanonicalCatalogServices(auth.serviceClient);
  const approvedPage = await mergeCandidateRepo.findByStatus(MergeCandidateStatus.Approved, { limit, offset: 0 });

  if (dryRun) {
    const previews = await Promise.all(approvedPage.items.map((c) => mergeExecutorService.preview(c.id)));
    const succeeded = previews.filter((p) => p.ok);
    const failed = previews.filter((p) => !p.ok);
    const offersToMove = succeeded.reduce((sum, p) => sum + (p.ok ? p.preview.offerIdsToMove.length : 0), 0);
    return NextResponse.json({
      dryRun: true,
      attempted: approvedPage.items.length,
      wouldSucceed: succeeded.length,
      wouldFail: failed.length,
      totalOffersToMove: offersToMove,
      previews: succeeded.map((p) => (p.ok ? p.preview : null)).filter(Boolean),
      errors: failed.map((p) => (!p.ok ? p.error : null)).filter(Boolean),
    });
  }

  const result = await mergeExecutorService.executeBatch(approvedPage.items.map((c) => c.id), auth.email);
  return NextResponse.json({ dryRun: false, ...result });
}
