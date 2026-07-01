import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { toImportLogShape } from "@/lib/sync-run-mapper";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const perPage = Math.min(50, Number(searchParams.get("perPage") ?? 20));

  // Release 1.7 — Wave 2: repointed from import_logs (superseded) to
  // connector_sync_runs. History only starts from Epic 1's go-live date —
  // expected, acceptable discontinuity, not a bug.
  const { data, error, count } = await auth.serviceClient
    .from("connector_sync_runs")
    .select("*", { count: "exact" })
    .order("started_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    data: (data ?? []).map(toImportLogShape),
    total: count ?? 0,
    page,
    perPage,
    totalPages: Math.ceil((count ?? 0) / perPage),
  });
}
