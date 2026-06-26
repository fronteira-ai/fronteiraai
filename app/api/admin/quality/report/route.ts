import { NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import type { QualityReport } from "@/types/admin";

export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;
  const db = auth.serviceClient;

  const [
    productsNoImage,
    productsNoBrand,
    productsNoCategory,
    offersNoUrl,
    offersNegativePrice,
    offersOutOfStock,
  ] = await Promise.all([
    db.from("products").select("id,name,slug", { count: "exact" }).is("image_url", null),
    db.from("products").select("id,name,slug", { count: "exact" }).is("brand_id", null),
    db.from("products").select("id,name,slug", { count: "exact" }).is("category_id", null),
    db.from("offers").select("id,product_id,store_id", { count: "exact" }).is("product_url", null),
    db.from("offers").select("id,product_id,store_id,price_usd", { count: "exact" }).lte("price_usd", 0),
    db.from("offers").select("id,product_id,store_id", { count: "exact" }).eq("in_stock", false),
  ]);

  const report: QualityReport = {
    generatedAt: new Date().toISOString(),
    issues: [
      {
        type: "missing_image",
        severity: "warning",
        count: productsNoImage.count ?? 0,
        label: "Produtos sem imagem",
        records: (productsNoImage.data ?? []).slice(0, 20) as Record<string, unknown>[],
      },
      {
        type: "missing_brand",
        severity: "warning",
        count: productsNoBrand.count ?? 0,
        label: "Produtos sem marca",
        records: (productsNoBrand.data ?? []).slice(0, 20) as Record<string, unknown>[],
      },
      {
        type: "missing_category",
        severity: "warning",
        count: productsNoCategory.count ?? 0,
        label: "Produtos sem categoria",
        records: (productsNoCategory.data ?? []).slice(0, 20) as Record<string, unknown>[],
      },
      {
        type: "missing_product_url",
        severity: "info",
        count: offersNoUrl.count ?? 0,
        label: "Ofertas sem URL do produto",
        records: (offersNoUrl.data ?? []).slice(0, 20) as Record<string, unknown>[],
      },
      {
        type: "invalid_price",
        severity: "error",
        count: offersNegativePrice.count ?? 0,
        label: "Ofertas com preço inválido (≤ 0)",
        records: (offersNegativePrice.data ?? []).slice(0, 20) as Record<string, unknown>[],
      },
      {
        type: "out_of_stock",
        severity: "info",
        count: offersOutOfStock.count ?? 0,
        label: "Ofertas sem estoque",
        records: [],
      },
    ],
  };

  return NextResponse.json({ data: report });
}
