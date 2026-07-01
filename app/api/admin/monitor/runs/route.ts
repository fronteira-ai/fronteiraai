import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const perPage = Math.min(50, Number(searchParams.get("perPage") ?? 20));
  const connectorKey = searchParams.get("connectorKey");
  const status = searchParams.get("status");

  let query = auth.serviceClient
    .from("connector_sync_runs")
    .select("*", { count: "exact" });

  if (connectorKey) query = query.eq("connector_key", connectorKey);
  if (status) query = query.eq("status", status);

  const { data, error, count } = await query
    .order("started_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [], total: count ?? 0, page, perPage, totalPages: Math.ceil((count ?? 0) / perPage) });
}
