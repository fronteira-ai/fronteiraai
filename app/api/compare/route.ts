import { NextRequest, NextResponse } from "next/server";
import {
  getProductComparisonBySlug,
  getProductComparison,
} from "@/services/compare.service";

// GET /api/compare?slug=<product-slug>
// GET /api/compare?productId=<product-uuid>
//
// Returns CompareResult JSON with product, ranked offers (with price metrics)
// and summary stats. Reads with the anon key — requires 0007 RLS migration
// to be applied to return real data (see docs/operations/DECISIONS.md ADR-019).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const productId = searchParams.get("productId");

  if (!slug && !productId) {
    return NextResponse.json(
      { error: "Forneça slug ou productId como query parameter." },
      { status: 400 }
    );
  }

  const result = slug
    ? await getProductComparisonBySlug(slug)
    : await getProductComparison(productId!);

  if (!result) {
    return NextResponse.json(
      { error: "Produto não encontrado ou sem dados disponíveis." },
      { status: 404 }
    );
  }

  return NextResponse.json(result, {
    headers: {
      // Allow public caching for up to 60 s; revalidate in background
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
