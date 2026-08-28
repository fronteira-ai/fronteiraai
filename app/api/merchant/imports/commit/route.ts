import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireMerchantContext } from "@/lib/merchant-auth";
import { MerchantImportCommitService } from "@/src/domains/merchant-import/MerchantImportCommitService";
import { SourceParserResolver } from "@/src/domains/merchant-import/ImportSourceResolver";
import { sourceChecksum, canCommit } from "@/src/domains/merchant-import/types";
import { SupabaseCatalogRepository } from "@/src/domains/connectors/infrastructure/SupabaseCatalogRepository";
import type { ExistingProductForMatch } from "@/src/domains/merchant-import/ImportPlanBuilder";
import { logAuditEvent } from "@/services/merchant.service";

/**
 * Merchant Import — COMMIT (preview→approval→commit, um fluxo seguro).
 * Ver docblock no arquivo — gates de tenancy/role/imutabilidade/idempotência.
 */
export async function POST(request: NextRequest) {
  const ctx = await requireMerchantContext();
  if ("error" in ctx || !("permissions" in ctx)) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const { merchant, userId, permissions, role, serviceClient } = ctx;

  // ROLE: aprovar/commitar exige ManageImports (owner/administrador/gerente).
  if (!canCommit(permissions)) {
    return NextResponse.json({ error: "Sua função não permite confirmar importações" }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const storeId = String(body.store_id ?? "").trim();
  const content = String(body.content ?? "");
  if (!storeId) return NextResponse.json({ error: "store_id é obrigatório" }, { status: 400 });
  if (!content) return NextResponse.json({ error: "content vazio" }, { status: 400 });

  // TENANCY: re-audit de posse.
  const { data: link } = await serviceClient
    .from("merchant_stores")
    .select("store_id")
    .eq("merchant_id", merchant.id)
    .eq("store_id", storeId)
    .maybeSingle();
  if (!link) return NextResponse.json({ error: "Loja não pertence à sua conta" }, { status: 403 });

  const sourceType = (String(body.source_type ?? "CSV").toUpperCase()) as "CSV" | "XML" | "JSON";
  const mapping = (body.mapping ?? {}) as Record<string, string>;
  const expectedChecksum = String(body.source_checksum ?? "").trim();

  // IMMUTABLE PREVIEW: o checksum aprovado no preview deve continuar válido.
  const currentChecksum = sourceChecksum(content);
  if (expectedChecksum && expectedChecksum !== currentChecksum) {
    return NextResponse.json({ error: "O arquivo/feed mudou desde a prévia. Revalide antes de confirmar." }, { status: 409 });
  }

  // Parse + normalize via o MESMO pipeline do merchant-feed (sem 2º pipeline).
  let offers;
  try {
    const resolver = new SourceParserResolver();
    offers = resolver.resolveOffers(content, sourceType, mapping, String(body.root_path ?? "products"));
  } catch (e) {
    return NextResponse.json({ error: `Falha ao ler importação: ${(e as Error).message}` }, { status: 400 });
  }
  if (offers.length === 0) {
    return NextResponse.json({ error: "Nenhum item válido para importar" }, { status: 400 });
  }

  // Produtos canônicos existentes da loja (para matching conservador) — reuso.
  const existingProducts = await loadStoreExistingProducts(serviceClient, storeId);

  // Commit engine (idempotente, plan determinístico, nunca commita
  // PROHIBIDO/AMBÍGUO/INVÁLIDO) — reuso SupabaseCatalogRepository.
  const repo = new SupabaseCatalogRepository(serviceClient);
  const svc = new MerchantImportCommitService({ repository: repo, existingProducts, batchSize: 500 });
  const sessionId = String(body.session_id ?? `imp-${Date.now()}`);
  const commit = await svc.commit(offers, { merchantId: merchant.id, userId, storeId, sourceChecksum: currentChecksum, sessionId });

  await logAuditEvent(merchant.id, userId, "import_complete", {
    session: sessionId, store_id: storeId, source_type: sourceType, status: commit.status,
    created_products: commit.createdProducts, created_offers: commit.createdOffers, updated_offers: commit.updatedOffers,
    rejected: commit.rejected, price_history: commit.priceHistoryWrites, role,
  }, serviceClient);

  return NextResponse.json({ data: { ...commit, sessionId, role }, error_summary: commit.errorSummary ?? undefined });
}

/** Carrega produtos canônicos das ofertas já existentes da loja (para matching). */
async function loadStoreExistingProducts(client: SupabaseClient, storeId: string): Promise<ExistingProductForMatch[]> {
  const { data } = await client
    .from("offers")
    .select("products!inner(id, name, brand_id)")
    .eq("store_id", storeId)
    .limit(20000);
  const out: ExistingProductForMatch[] = [];
  for (const o of (data ?? []) as unknown as Array<{ products?: { id: string; name: string; brand_id: string | null } | Array<{ id: string; name: string; brand_id: string | null }> }>) {
    const p = Array.isArray(o.products) ? o.products[0] : (o.products as { id: string; name: string; brand_id: string | null } | undefined);
    if (p) out.push({ id: p.id, name: p.name, brand: undefined, externalId: undefined });
  }
  return out;
}

