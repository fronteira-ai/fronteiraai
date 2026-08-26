import type { SupabaseClient } from "@supabase/supabase-js";
import type { CanonicalProduct } from "../domain/CanonicalProduct";
import type { ICanonicalCatalogRepository } from "../repositories/ICanonicalCatalogRepository";
import type {
  CanonicalOfferView,
  CanonicalProductInput,
  CanonicalProductSyncFields,
  PaginatedResult,
  PaginationParams,
} from "../types/canonical-catalog.types";

function toCanonicalProduct(row: Record<string, unknown>): CanonicalProduct {
  return {
    id: row.id as string,
    canonicalSlug: row.canonical_slug as string,
    name: row.name as string,
    brandId: (row.brand_id as string | null) ?? null,
    categoryId: (row.category_id as string | null) ?? null,
    imageUrl: (row.image_url as string | null) ?? null,
    specifications: (row.specifications as Record<string, string> | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    isActive: (row.is_active as boolean | null) ?? true,
    mergedIntoId: (row.merged_into_id as string | null) ?? null,
  };
}

export class SupabaseCanonicalCatalogRepository implements ICanonicalCatalogRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findBySlug(canonicalSlug: string): Promise<CanonicalProduct | null> {
    const { data, error } = await this.client
      .from("canonical_products")
      .select("*")
      .eq("canonical_slug", canonicalSlug)
      .maybeSingle();
    if (error) {
      console.error("[SupabaseCanonicalCatalogRepository.findBySlug]", error.message);
      return null;
    }
    return data ? toCanonicalProduct(data) : null;
  }

  async findById(id: string): Promise<CanonicalProduct | null> {
    const { data, error } = await this.client.from("canonical_products").select("*").eq("id", id).maybeSingle();
    if (error) {
      console.error("[SupabaseCanonicalCatalogRepository.findById]", error.message);
      return null;
    }
    return data ? toCanonicalProduct(data) : null;
  }

  async findOrCreateBySlug(canonicalSlug: string, input: CanonicalProductInput): Promise<CanonicalProduct> {
    const existing = await this.findBySlug(canonicalSlug);
    if (existing) return existing;

    const { data, error } = await this.client
      .from("canonical_products")
      .insert({
        canonical_slug: canonicalSlug,
        name: input.name,
        brand_id: input.brandId,
        category_id: input.categoryId,
        image_url: input.imageUrl,
        specifications: input.specifications,
      })
      .select("*")
      .single();

    if (error) {
      // Concurrent creation race: another caller inserted the same slug
      // between our findBySlug and insert. Read-back instead of failing —
      // canonical_slug's UNIQUE constraint is what actually prevents
      // duplicates; this makes the method idempotent under concurrency too.
      const raced = await this.findBySlug(canonicalSlug);
      if (raced) return raced;
      throw new Error(`canonical product insert: ${error.message}`);
    }

    return toCanonicalProduct(data);
  }

  async updateSyncedFields(id: string, fields: Partial<CanonicalProductSyncFields>): Promise<CanonicalProduct> {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if ("brandId" in fields) patch.brand_id = fields.brandId;
    if ("categoryId" in fields) patch.category_id = fields.categoryId;
    if ("imageUrl" in fields) patch.image_url = fields.imageUrl;
    if ("specifications" in fields) patch.specifications = fields.specifications;

    const { data, error } = await this.client.from("canonical_products").update(patch).eq("id", id).select("*").single();
    if (error) throw new Error(`canonical product sync update: ${error.message}`);
    return toCanonicalProduct(data);
  }

  // Sprint 15. Mesmo tamanho de página já usado por
  // SupabaseMarketChangeRepository (Sprint 13C) — convenção do projeto para
  // leitura paginada por `range`, e folgadamente abaixo do `max_rows` do
  // PostgREST, de modo que uma página nunca é truncada pelo servidor.
  private static readonly BRAND_PAGE_SIZE = 500;

  // Todas as colunas que `toCanonicalProduct` lê, menos `image_url`.
  private static readonly BRAND_COLUMNS =
    "id, canonical_slug, name, brand_id, category_id, specifications, created_at, updated_at, is_active, merged_into_id";

  // Sprint 15 (egress). `findByBrandId` é chamada UMA VEZ POR ITEM do
  // canonical_suggestion_outbox (CanonicalMergeSuggestionService.
  // suggestMergesFor, seu único consumidor de produção), e era a maior
  // resposta isolada do fluxo: `select("*")` sem `range`/`limit`, incluindo
  // `specifications` (jsonb).
  //
  // Duas mudanças, ambas de QUANTO se lê — nunca de QUAIS produtos entram:
  //
  // 1. PROJEÇÃO — apenas `image_url` saiu, por ser a única coluna que
  //    nenhum consumidor lê (o mapper a converte para `null`, valor válido
  //    para `imageUrl: string | null`). `created_at`/`updated_at` FICAM:
  //    `toCanonicalProduct` os tipa como `string` não-nulo e omiti-los
  //    produziria `undefined` — violação de tipo em troca de poucos bytes.
  //    `is_active`/`merged_into_id` FICAM: são pequenos e seus defaults no
  //    mapper (`true`/`null`) mentiriam sobre um produto já mesclado se
  //    algum consumidor futuro passasse a lê-los.
  //
  // 2. PAGINAÇÃO — antes, uma marca com mais produtos que o `max_rows` do
  //    PostgREST (1000 por padrão) era TRUNCADA EM SILÊNCIO e os candidatos
  //    excedentes simplesmente não eram avaliados. O laço abaixo lê até o
  //    fim. Isto CORRIGE uma perda de candidatos; não reduz bytes — para
  //    marcas grandes lê mais do que antes, porque antes se perdia dado.
  //
  // `.order("id")` é obrigatório: sem ordenação determinística, paginar por
  // `range` pode duplicar ou perder linhas entre páginas. A ordem anterior
  // era a de armazenamento do Postgres — arbitrária e não garantida. O
  // motor desempata por ordem de array (`confidence > best.confidence`, o
  // PRIMEIRO máximo vence), então empates agora resolvem de forma
  // reproduzível por `id` crescente, em vez de arbitrariamente. Nenhuma
  // pontuação muda; o casamento por slug exato é imune (canonical_slug é
  // UNIQUE). Mesma política de erro de antes: loga e devolve [].
  async findByBrandId(brandId: string): Promise<CanonicalProduct[]> {
    const rows: Record<string, unknown>[] = [];

    for (let offset = 0; ; offset += SupabaseCanonicalCatalogRepository.BRAND_PAGE_SIZE) {
      const { data, error } = await this.client
        .from("canonical_products")
        .select(SupabaseCanonicalCatalogRepository.BRAND_COLUMNS)
        .eq("brand_id", brandId)
        .order("id", { ascending: true })
        .range(offset, offset + SupabaseCanonicalCatalogRepository.BRAND_PAGE_SIZE - 1);

      if (error) {
        console.error("[SupabaseCanonicalCatalogRepository.findByBrandId]", error.message);
        return [];
      }

      const page = (data ?? []) as unknown as Record<string, unknown>[];
      rows.push(...page);
      if (page.length < SupabaseCanonicalCatalogRepository.BRAND_PAGE_SIZE) break;
    }

    return rows.map(toCanonicalProduct);
  }

  async findByCategoryId(categoryId: string): Promise<CanonicalProduct[]> {
    const { data, error } = await this.client.from("canonical_products").select("*").eq("category_id", categoryId);
    if (error) {
      console.error("[SupabaseCanonicalCatalogRepository.findByCategoryId]", error.message);
      return [];
    }
    return (data ?? []).map(toCanonicalProduct);
  }

  async linkOffer(offerId: string, canonicalProductId: string): Promise<void> {
    const { error } = await this.client
      .from("offers")
      .update({ canonical_product_id: canonicalProductId })
      .eq("id", offerId);
    if (error) throw new Error(`offer link: ${error.message}`);
  }

  async findOffersByCanonicalProductId(
    canonicalProductId: string,
    pagination: PaginationParams
  ): Promise<PaginatedResult<CanonicalOfferView>> {
    const { limit, offset } = pagination;
    const { data, error, count } = await this.client
      .from("offers")
      // Sprint 9B (P3-1): passa a usar a lista de colunas e o mapper que a
      // Sprint 8B já havia extraído para a leitura em lote. Antes eram duas
      // cópias que precisavam ser mantidas em sincronia — a inclusão de
      // `available` teria de ser feita duas vezes, e divergir aqui
      // silenciosamente é exatamente como P3-1 nasceu.
      .select(SupabaseCanonicalCatalogRepository.OFFER_COLUMNS, { count: "exact" })
      .eq("canonical_product_id", canonicalProductId)
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[SupabaseCanonicalCatalogRepository.findOffersByCanonicalProductId]", error.message);
      return { items: [], total: 0 };
    }

    const items: CanonicalOfferView[] = (data ?? []).map((row) =>
      SupabaseCanonicalCatalogRepository.mapOfferRow(row as unknown as Record<string, unknown>)
    );

    return { items, total: count ?? items.length };
  }

  // Sprint 8B (P2-4). Colunas e mapeamento compartilhados entre a leitura
  // individual e a em lote — se divergissem, o lote deixaria de ser uma
  // substituição fiel da consulta que ele elimina.
  // Sprint 9B (P3-1): `available` acrescentado ao TRANSPORTE. Nenhum filtro
  // é aplicado aqui de propósito: este repositório é compartilhado com
  // market-insights (PriceIntelligenceService) e buyer-intelligence
  // (OpportunityEngine), que hoje dependem do conjunto completo de ofertas.
  // Filtrar aqui mudaria a semântica de preço/economia desses domínios e
  // reabriria P2-2/P2-4. Quem decide o que é comparável é o consumidor.
  private static readonly OFFER_COLUMNS =
    "id, product_id, store_id, price_usd, in_stock, available, stock_quantity, updated_at, condition, warranty, product_url, stores(slug)";

  private static mapOfferRow(row: Record<string, unknown>): CanonicalOfferView {
    const storeRelation = row.stores as { slug: string } | { slug: string }[] | null;
    const store = Array.isArray(storeRelation) ? storeRelation[0] : storeRelation;
    return {
      offerId: row.id as string,
      productId: row.product_id as string,
      storeId: row.store_id as string,
      storeSlug: store?.slug ?? "",
      priceUSD: row.price_usd as number,
      inStock: row.in_stock as boolean,
      // Sprint 9B (P3-1). Default `true` só protege contra uma linha sem a
      // coluna (mock antigo, select parcial); no schema real `available` é
      // NOT NULL DEFAULT true, então nunca vem ausente do banco.
      available: (row.available as boolean | null) ?? true,
      stockQuantity: (row.stock_quantity as number | null) ?? null,
      updatedAt: row.updated_at as string,
      condition: (row.condition as string | null) ?? null,
      warranty: (row.warranty as string | null) ?? null,
      productUrl: (row.product_url as string | null) ?? null,
    };
  }

  /** Sprint 8B (P2-4) — ver ICanonicalCatalogRepository para o contrato.
   *
   * Um `.in(...)` carrega um UUID (36 chars) por id na query string. A
   * Sprint 6 mediu o teto real do Kong contra este mesmo stack: 210 ids =
   * 7.851 bytes → HTTP 200; 220 ids = 8.221 bytes → HTTP 414. O chunk de
   * 150 fica bem abaixo disso e ainda assim transforma os 50 candidatos do
   * OpportunityEngine numa única viagem. */
  private static readonly ID_CHUNK = 150;

  async findOffersByCanonicalProductIds(
    canonicalProductIds: string[],
    perProductLimit: number
  ): Promise<Map<string, CanonicalOfferView[]>> {
    const grouped = new Map<string, CanonicalOfferView[]>();
    const ids = [...new Set(canonicalProductIds)].filter(Boolean);
    if (ids.length === 0) return grouped;

    for (let i = 0; i < ids.length; i += SupabaseCanonicalCatalogRepository.ID_CHUNK) {
      const chunk = ids.slice(i, i + SupabaseCanonicalCatalogRepository.ID_CHUNK);
      const { data, error } = await this.client
        .from("offers")
        .select(`canonical_product_id, ${SupabaseCanonicalCatalogRepository.OFFER_COLUMNS}`)
        .in("canonical_product_id", chunk);

      if (error) {
        console.error("[SupabaseCanonicalCatalogRepository.findOffersByCanonicalProductIds]", error.message);
        // Mesmo contrato de falha do método individual: degrada para vazio,
        // nunca lança — o motor trata ausência de ofertas como candidato
        // eliminado, e nunca como erro fatal do render.
        continue;
      }

      for (const row of (data ?? []) as Record<string, unknown>[]) {
        const key = row.canonical_product_id as string;
        const bucket = grouped.get(key) ?? [];
        // Reproduz o truncamento por produto do método individual
        // (`.range(0, limit-1)`): o lote não pode devolver mais ofertas por
        // produto do que a consulta que ele substitui devolveria.
        if (bucket.length < perProductLimit) {
          bucket.push(SupabaseCanonicalCatalogRepository.mapOfferRow(row));
        }
        grouped.set(key, bucket);
      }
    }

    return grouped;
  }

  async findAll(pagination: PaginationParams): Promise<PaginatedResult<CanonicalProduct>> {
    const { limit, offset } = pagination;
    const { data, error, count } = await this.client
      .from("canonical_products")
      .select("*", { count: "exact" })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[SupabaseCanonicalCatalogRepository.findAll]", error.message);
      return { items: [], total: 0 };
    }

    const items = (data ?? []).map(toCanonicalProduct);
    return { items, total: count ?? items.length };
  }

  async findCanonicalProductIdByProductId(productId: string): Promise<string | null> {
    const { data, error } = await this.client
      .from("offers")
      .select("canonical_product_id")
      .eq("product_id", productId)
      .not("canonical_product_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[SupabaseCanonicalCatalogRepository.findCanonicalProductIdByProductId]", error.message);
      return null;
    }
    return (data?.canonical_product_id as string | null) ?? null;
  }

  // Program Ω — Mission Ω-1 (Merge Execution Engine)

  async findOfferIdsByCanonicalProductId(canonicalProductId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from("offers")
      .select("id")
      .eq("canonical_product_id", canonicalProductId);
    if (error) {
      console.error("[SupabaseCanonicalCatalogRepository.findOfferIdsByCanonicalProductId]", error.message);
      return [];
    }
    return (data ?? []).map((row) => row.id as string);
  }

  async reassignOffers(sourceCanonicalProductId: string, targetCanonicalProductId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from("offers")
      .update({ canonical_product_id: targetCanonicalProductId })
      .eq("canonical_product_id", sourceCanonicalProductId)
      .select("id");
    if (error) throw new Error(`merge offer reassignment: ${error.message}`);
    return (data ?? []).map((row) => row.id as string);
  }

  async reassignOffersByIds(offerIds: string[], targetCanonicalProductId: string): Promise<void> {
    if (offerIds.length === 0) return;
    const { error } = await this.client
      .from("offers")
      .update({ canonical_product_id: targetCanonicalProductId })
      .in("id", offerIds);
    if (error) throw new Error(`merge rollback offer reassignment: ${error.message}`);
  }

  async deactivateAndMerge(id: string, mergedIntoId: string): Promise<void> {
    const { error } = await this.client
      .from("canonical_products")
      .update({ is_active: false, merged_into_id: mergedIntoId, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(`canonical product deactivate: ${error.message}`);
  }

  async reactivate(id: string): Promise<void> {
    const { error } = await this.client
      .from("canonical_products")
      .update({ is_active: true, merged_into_id: null, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(`canonical product reactivate: ${error.message}`);
  }

  // Program Κ — Mission Κ-4 (Product Identity Integration)

  async findCategorySlugsByIds(categoryIds: string[]): Promise<Map<string, string>> {
    const uniqueIds = Array.from(new Set(categoryIds)).filter((id): id is string => Boolean(id));
    const result = new Map<string, string>();
    if (uniqueIds.length === 0) return result;

    // Chunked to stay well under Postgres/HTTP header limits for large
    // .in() filters (a 500-id chunk was already observed to overflow
    // request headers against this project — 100 stays comfortably under).
    const CHUNK = 100;
    for (let i = 0; i < uniqueIds.length; i += CHUNK) {
      const chunk = uniqueIds.slice(i, i + CHUNK);
      const { data, error } = await this.client.from("categories").select("id, slug").in("id", chunk);
      if (error) {
        console.error("[SupabaseCanonicalCatalogRepository.findCategorySlugsByIds]", error.message);
        continue;
      }
      for (const row of (data ?? []) as { id: string; slug: string }[]) {
        result.set(row.id, row.slug);
      }
    }
    return result;
  }
}
