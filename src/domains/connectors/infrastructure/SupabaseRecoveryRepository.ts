import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  IRecoveryRepository,
  RecoveryCandidateRow,
  ConfirmedAttributes,
  RecordRecoveryDecisionInput,
} from "../repositories/IRecoveryRepository";
import { isForbiddenValue } from "../normalization/ForbiddenValues";

// Mission Ω-Rehabilitation. Junk brand/category ids are resolved ONCE per
// repository lifetime (one recovery run) — the same forbidden-name check
// Mission Ω-Gatekeeper's ForbiddenValues.ts already defines, applied here
// against the real `brands`/`categories` rows so "which existing rows are
// junk" is computed from real data, never a hardcoded id list.
export class SupabaseRecoveryRepository implements IRecoveryRepository {
  private junkBrandIds: Set<string> | null = null;
  private junkCategoryIds: Set<string> | null = null;

  constructor(private readonly client: SupabaseClient) {}

  private async loadJunkBrandIds(): Promise<Set<string>> {
    if (this.junkBrandIds) return this.junkBrandIds;
    const { data, error } = await this.client.from("brands").select("id, name");
    if (error) throw new Error(`brands fetch: ${error.message}`);
    this.junkBrandIds = new Set((data ?? []).filter((b) => isForbiddenValue(b.name as string)).map((b) => b.id as string));
    return this.junkBrandIds;
  }

  private async loadJunkCategoryIds(): Promise<Set<string>> {
    if (this.junkCategoryIds) return this.junkCategoryIds;
    const { data, error } = await this.client.from("categories").select("id, name");
    if (error) throw new Error(`categories fetch: ${error.message}`);
    this.junkCategoryIds = new Set((data ?? []).filter((c) => isForbiddenValue(c.name as string)).map((c) => c.id as string));
    return this.junkCategoryIds;
  }

  async countCandidates(): Promise<number> {
    const junkBrandIds = await this.loadJunkBrandIds();
    const junkCategoryIds = await this.loadJunkCategoryIds();

    // Same flat-OR reasoning as fetchCandidates — PostgREST ids inlined
    // directly, both sets are small (hundreds of rows).
    const allClauses = [
      "brand_id.is.null",
      ...[...junkBrandIds].map((id) => `brand_id.eq.${id}`),
      "category_id.is.null",
      ...[...junkCategoryIds].map((id) => `category_id.eq.${id}`),
    ].join(",");

    const { count, error } = await this.client.from("products").select("id", { count: "exact", head: true }).or(allClauses);
    if (error) throw new Error(`countCandidates: ${error.message}`);
    return count ?? 0;
  }

  async fetchCandidates(afterProductId: string | null, limit: number): Promise<RecoveryCandidateRow[]> {
    const junkBrandIds = await this.loadJunkBrandIds();
    const junkCategoryIds = await this.loadJunkCategoryIds();
    // A single flat OR across every clause is exactly "(brand is null or
    // junk) OR (category is null or junk)" — no nesting needed, since every
    // clause here is already independently OR'd against the others.
    const allClauses = [
      "brand_id.is.null",
      ...[...junkBrandIds].map((id) => `brand_id.eq.${id}`),
      "category_id.is.null",
      ...[...junkCategoryIds].map((id) => `category_id.eq.${id}`),
    ].join(",");

    let query = this.client
      .from("products")
      .select("id, name, specifications, brand_id, category_id, offers(store_id), brands(name), categories(name)")
      .or(allClauses)
      .order("id", { ascending: true })
      .limit(limit);

    // Keyset pagination — `id > cursor` seeks directly via the primary key
    // index, so query cost stays flat regardless of how deep into the
    // catalog this page is (unlike OFFSET, which must skip every prior row
    // on every call — confirmed in production to hit Postgres's statement
    // timeout around candidate #20,000 of ~22,000 real candidates).
    if (afterProductId) query = query.gt("id", afterProductId);

    const { data, error } = await query;

    if (error) throw new Error(`fetchCandidates: ${error.message}`);

    return (data ?? []).map((row) => {
      const offersRelation = row.offers as { store_id: string }[] | { store_id: string } | null;
      const offer = Array.isArray(offersRelation) ? offersRelation[0] : offersRelation;
      const brandRelation = row.brands as { name: string } | { name: string }[] | null;
      const brand = Array.isArray(brandRelation) ? brandRelation[0] : brandRelation;
      const categoryRelation = row.categories as { name: string } | { name: string }[] | null;
      const category = Array.isArray(categoryRelation) ? categoryRelation[0] : categoryRelation;

      return {
        productId: row.id as string,
        storeId: offer?.store_id ?? "",
        name: row.name as string,
        specifications: row.specifications as Record<string, string> | null,
        brandId: row.brand_id as string | null,
        brandName: brand?.name ?? null,
        categoryId: row.category_id as string | null,
        categoryName: category?.name ?? null,
      };
    });
  }

  async findConfirmedByIdentifier(identifierType: "ean" | "manufacturer_code", identifierValue: string): Promise<ConfirmedAttributes | null> {
    const junkBrandIds = await this.loadJunkBrandIds();
    const junkCategoryIds = await this.loadJunkCategoryIds();

    const { data, error } = await this.client
      .from("product_identifiers")
      .select("product_id")
      .eq("identifier_type", identifierType)
      .eq("identifier_value", identifierValue)
      .limit(5);
    if (error) {
      console.error("[SupabaseRecoveryRepository.findConfirmedByIdentifier]", error.message);
      return null;
    }
    if (!data || data.length === 0) return null;

    for (const row of data) {
      const { data: product } = await this.client
        .from("products")
        .select("brand_id, category_id, brands(id, name), categories(id, name)")
        .eq("id", row.product_id)
        .maybeSingle();
      if (!product) continue;

      const brandRelation = product.brands as { id: string; name: string } | { id: string; name: string }[] | null;
      const brand = Array.isArray(brandRelation) ? brandRelation[0] : brandRelation;
      const categoryRelation = product.categories as { id: string; name: string } | { id: string; name: string }[] | null;
      const category = Array.isArray(categoryRelation) ? categoryRelation[0] : categoryRelation;

      const brandConfirmed = product.brand_id && !junkBrandIds.has(product.brand_id as string) ? brand : null;
      const categoryConfirmed = product.category_id && !junkCategoryIds.has(product.category_id as string) ? category : null;

      if (brandConfirmed || categoryConfirmed) {
        return {
          brandId: brandConfirmed?.id ?? null,
          brandName: brandConfirmed?.name ?? null,
          categoryId: categoryConfirmed?.id ?? null,
          categoryName: categoryConfirmed?.name ?? null,
        };
      }
    }
    return null;
  }

  async findCanonicalLinkAttributes(productId: string): Promise<ConfirmedAttributes | null> {
    const junkBrandIds = await this.loadJunkBrandIds();
    const junkCategoryIds = await this.loadJunkCategoryIds();

    const { data: offer } = await this.client
      .from("offers")
      .select("canonical_product_id")
      .eq("product_id", productId)
      .not("canonical_product_id", "is", null)
      .limit(1)
      .maybeSingle();
    if (!offer?.canonical_product_id) return null;

    const { data: canonical } = await this.client
      .from("canonical_products")
      .select("brand_id, category_id, brands(id, name), categories(id, name)")
      .eq("id", offer.canonical_product_id)
      .maybeSingle();
    if (!canonical) return null;

    const brandRelation = canonical.brands as { id: string; name: string } | { id: string; name: string }[] | null;
    const brand = Array.isArray(brandRelation) ? brandRelation[0] : brandRelation;
    const categoryRelation = canonical.categories as { id: string; name: string } | { id: string; name: string }[] | null;
    const category = Array.isArray(categoryRelation) ? categoryRelation[0] : categoryRelation;

    const brandConfirmed = canonical.brand_id && !junkBrandIds.has(canonical.brand_id as string) ? brand : null;
    const categoryConfirmed = canonical.category_id && !junkCategoryIds.has(canonical.category_id as string) ? category : null;

    if (!brandConfirmed && !categoryConfirmed) return null;

    return {
      brandId: brandConfirmed?.id ?? null,
      brandName: brandConfirmed?.name ?? null,
      categoryId: categoryConfirmed?.id ?? null,
      categoryName: categoryConfirmed?.name ?? null,
    };
  }

  async updateProductBrand(productId: string, brandId: string): Promise<void> {
    const { error } = await this.client.from("products").update({ brand_id: brandId }).eq("id", productId);
    if (error) throw new Error(`updateProductBrand: ${error.message}`);
  }

  async updateProductCategory(productId: string, categoryId: string): Promise<void> {
    const { error } = await this.client.from("products").update({ category_id: categoryId }).eq("id", productId);
    if (error) throw new Error(`updateProductCategory: ${error.message}`);
  }

  async recordDecision(input: RecordRecoveryDecisionInput): Promise<void> {
    const { error } = await this.client.from("catalog_recovery_decisions").insert({
      product_id: input.productId,
      field_type: input.fieldType,
      previous_value: input.previousValue,
      layer: input.layer,
      recovered_value: input.recoveredValue,
      recovered_brand_id: input.recoveredBrandId,
      recovered_category_id: input.recoveredCategoryId,
      confidence: input.confidence,
      evidence: input.evidence,
    });
    if (error) console.error("[SupabaseRecoveryRepository.recordDecision]", error.message);
  }
}
