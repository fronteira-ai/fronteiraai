import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { createCanonicalCatalogServices } from "@/lib/canonical-catalog-factory";
import { MergeExecutionStatus } from "@/src/domains/canonical-catalog";

const VALID_STATUSES = new Set(Object.values(MergeExecutionStatus));

// Program Ω — Mission Ω-1, Objetivo 4. Lists merge_executions rows — the
// panel needs an execution's id (not the candidate's id) to call
// POST /executions/[executionId]/rollback.
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status") ?? MergeExecutionStatus.Executed;
  if (!VALID_STATUSES.has(statusParam as MergeExecutionStatus)) {
    return NextResponse.json({ error: `Invalid status. Expected one of: ${[...VALID_STATUSES].join(", ")}` }, { status: 400 });
  }

  const limit = Math.min(Number(searchParams.get("limit") ?? 20) || 20, 100);
  const offset = Number(searchParams.get("offset") ?? 0) || 0;

  const { mergeExecutionRepo } = createCanonicalCatalogServices(auth.serviceClient);
  const result = await mergeExecutionRepo.findByStatus(statusParam as MergeExecutionStatus, { limit, offset });

  return NextResponse.json({ data: result.items, total: result.total });
}
