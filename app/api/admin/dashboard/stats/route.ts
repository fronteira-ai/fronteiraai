import { NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { toImportLogShape } from "@/lib/sync-run-mapper";
import type { DashboardStats } from "@/types/admin";

export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;
  const db = auth.serviceClient;

  const [products, offers, stores, brands, categories, priceHistory, lastImport] =
    await Promise.all([
      db.from("products").select("id", { count: "exact", head: true }),
      db.from("offers").select("id", { count: "exact", head: true }),
      db.from("stores").select("id", { count: "exact", head: true }),
      db.from("brands").select("id", { count: "exact", head: true }),
      db.from("categories").select("id", { count: "exact", head: true }),
      db.from("price_history").select("id", { count: "exact", head: true }),
      db
        .from("connector_sync_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const stats: DashboardStats = {
    products: products.count ?? 0,
    offers: offers.count ?? 0,
    stores: stores.count ?? 0,
    brands: brands.count ?? 0,
    categories: categories.count ?? 0,
    priceHistoryEntries: priceHistory.count ?? 0,
    lastImport: lastImport.data ? toImportLogShape(lastImport.data) : null,
  };

  return NextResponse.json({ data: stats });
}
