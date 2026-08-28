import { NextRequest, NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import { MerchantCsvFeedParser } from "@/src/domains/merchant-feed/parser/MerchantCsvFeedParser";
import { MerchantJsonFeedParser } from "@/src/domains/merchant-feed/parser/MerchantJsonFeedParser";
import { MerchantFeedParser } from "@/src/domains/merchant-feed/parser/MerchantFeedParser";
import type { MerchantSourceConfig, MerchantFieldSlot, MerchantFieldMapping } from "@/src/domains/merchant-feed/config/MerchantSourceConfig";
import { MerchantFeedMatchPreview } from "@/src/domains/merchant-feed/canonical/MerchantFeedMatchPreview";
import type { RawOffer } from "@/src/domains/connectors/types/raw.types";

export interface UploadPreviewResult {
  committed: false;
  total: number;
  valid: number;
  invalid: number;
  matched: number;
  newCandidates: number;
  ambiguous: number;
  priceErrors: number;
  stockErrors: number;
  imageCoverage: number;
  errors: Array<{ codigo?: string; reason: string }>;
  storeOwned: boolean;
}

/**
 * Merchant Console — IMPORT PREVIEW (§22/24) para upload CSV/XML/JSON.
 * VALIDA + PRÉVIA SEM escrever no catálogo (dry-run). A loja deve pertencer à
 * merchant logada (server-side via merchant_stores). Reusa os parsers do
 * Merchant Feed — sem pipeline paralelo. Nenhum dado é persistido em produção
 * por esta rota (committed: false).
 */
export async function POST(request: NextRequest) {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;
  const { merchant, serviceClient } = auth;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const storeId = String(form?.get("storeId") ?? "").trim();
  const format = String(form?.get("format") ?? "").trim().toUpperCase() as "CSV" | "XML" | "JSON";
  let content = "";

  if (file && typeof file === "object" && "text" in file) {
    const f = file as Blob;
    if (f.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Arquivo acima do limite (8 MB)" }, { status: 400 });
    }
    content = await f.text();
  } else {
    content = String(form?.get("content") ?? "").trim();
  }

  if (!storeId) return NextResponse.json({ error: "storeId é obrigatório" }, { status: 400 });
  if (!content) return NextResponse.json({ error: "Arquivo vazio" }, { status: 400 });

  // Re-audit de posse (server-side).
  const { data: link } = await serviceClient
    .from("merchant_stores")
    .select("store_id")
    .eq("merchant_id", merchant.id)
    .eq("store_id", storeId)
    .maybeSingle();
  const storeOwned = !!link;
  const result: UploadPreviewResult = { committed: false, total: 0, valid: 0, invalid: 0, matched: 0, newCandidates: 0, ambiguous: 0, priceErrors: 0, stockErrors: 0, imageCoverage: 0, errors: [], storeOwned };
  if (!storeOwned) {
    return NextResponse.json({ ...result, errors: [{ reason: "FORBIDDEN_STORE" }] }, { status: 403 });
  }

  // Mapeamento declarativo fornecido pelo cliente (coluna→slot) — validado.
  const rawMapping = form?.get("mapping");
  const columnMapping: Record<string, MerchantFieldSlot> = {};
  if (rawMapping) {
    try {
      Object.assign(columnMapping, JSON.parse(String(rawMapping)));
    } catch {
      return NextResponse.json({ ...result, errors: [{ reason: "MAPPING_INVALID_JSON" }] }, { status: 400 });
    }
  }
  const fieldMapping = (form?.get("fieldMapping") ? JSON.parse(String(form.get("fieldMapping"))) : {}) as MerchantFieldMapping;

  const sourceConfig: MerchantSourceConfig = {
    sourceType: (format === "CSV" ? "CSV_FEED" : format === "JSON" ? "JSON_FEED" : "XML_FEED") as never,
    feedUrl: "upload",
    fieldMapping,
  };

  let offers: RawOffer[] = [];
  let errors: Array<{ codigo?: string; reason: string }> = [];
  if (format === "CSV") {
    const parsed = new MerchantCsvFeedParser(sourceConfig, columnMapping).parse(content);
    offers = parsed.offers; errors = parsed.errors;
  } else if (format === "JSON") {
    const parsed = new MerchantJsonFeedParser({ ...sourceConfig, rootPath: (form?.get("rootPath") as string) ?? "products" }).parse(content);
    offers = parsed.offers; errors = parsed.errors;
  } else {
    const parsed = new MerchantFeedParser().parse(content);
    offers = parsed.offers; errors = parsed.errors;
  }

  const priceErrors = errors.filter((e) => e.reason.startsWith("INVALID_PRICE")).length;
  const stockErrors = errors.filter((e) => e.reason.includes("STOCK") || e.reason.includes("ESTOQUE")).length;
  const rows = new MerchantFeedMatchPreview([]).preview(offers.map((o) => ({ product: o.product })));
  const matched = rows.filter((r) => r.status === "MATCHED_EXISTING_PRODUCT").length;
  const newCandidates = rows.filter((r) => r.status === "NEW_PRODUCT_CANDIDATE").length;
  const ambiguous = rows.filter((r) => r.status === "AMBIGUOUS").length;
  const imageCoverage = offers.length ? offers.filter((o) => o.product.imageUrl).length / offers.length : 0;

  return NextResponse.json({ ...result, total: offers.length + errors.length, valid: offers.length, invalid: errors.length, matched, newCandidates, ambiguous, priceErrors, stockErrors, imageCoverage, errors, committed: false });
}
