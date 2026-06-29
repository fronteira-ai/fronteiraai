import type { SupabaseClient } from "@supabase/supabase-js";
import type { IVerificationTypeCatalogRepository } from "../repositories/IVerificationTypeCatalogRepository";
import type { VerificationTypeCatalogRecord } from "../types/trust.types";
import type { VerificationCategory } from "../types/enums";

export class SupabaseVerificationTypeCatalogRepository implements IVerificationTypeCatalogRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findAll(activeOnly = true): Promise<VerificationTypeCatalogRecord[]> {
    let query = this.client
      .from("verification_types")
      .select("*")
      .order("sort_order", { ascending: true });

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[VerificationTypeCatalogRepository.findAll]", error);
      return [];
    }
    return (data ?? []) as VerificationTypeCatalogRecord[];
  }

  async findById(id: string): Promise<VerificationTypeCatalogRecord | null> {
    const { data, error } = await this.client
      .from("verification_types")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("[VerificationTypeCatalogRepository.findById]", error);
      return null;
    }
    return data as VerificationTypeCatalogRecord;
  }

  async findByCategory(category: VerificationCategory): Promise<VerificationTypeCatalogRecord[]> {
    const { data, error } = await this.client
      .from("verification_types")
      .select("*")
      .eq("category", category)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[VerificationTypeCatalogRepository.findByCategory]", error);
      return [];
    }
    return (data ?? []) as VerificationTypeCatalogRecord[];
  }
}
