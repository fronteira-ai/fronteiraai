import type { SupabaseClient } from "@supabase/supabase-js";
import type { IProductCandidateRepository } from "../repositories/IProductCandidateRepository";
import type { MatchCandidate } from "../types/product-identity.types";

interface CategoryRelation {
  slug: string;
}

export class SupabaseProductCandidateRepository implements IProductCandidateRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByBrandSlug(brandSlug: string): Promise<MatchCandidate[]> {
    const { data: brand, error: brandError } = await this.client
      .from("brands")
      .select("id")
      .eq("slug", brandSlug)
      .maybeSingle();

    if (brandError) {
      console.error("[SupabaseProductCandidateRepository.findByBrandSlug]", brandError.message);
      return [];
    }
    if (!brand) return [];

    const { data, error } = await this.client
      .from("products")
      .select("id, slug, name, specifications, categories(slug)")
      .eq("brand_id", brand.id);

    if (error) {
      console.error("[SupabaseProductCandidateRepository.findByBrandSlug]", error.message);
      return [];
    }

    return (data ?? []).map((row) => {
      const categoryRelation = row.categories as CategoryRelation | CategoryRelation[] | null;
      const category = Array.isArray(categoryRelation) ? categoryRelation[0] : categoryRelation;

      return {
        productId: row.id as string,
        slug: row.slug as string,
        name: row.name as string,
        brandSlug,
        categorySlug: category?.slug ?? "",
        specifications: (row.specifications as Record<string, string> | null) ?? {},
      };
    });
  }
}
