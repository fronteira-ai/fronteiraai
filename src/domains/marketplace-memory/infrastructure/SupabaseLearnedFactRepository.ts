import type { SupabaseClient } from "@supabase/supabase-js";
import type { LearnedFact } from "../domain/LearnedFact";
import type { ILearnedFactRepository } from "../repositories/ILearnedFactRepository";
import type { FactType } from "../types/enums";
import type { LearnedFactInput, PaginatedResult, PaginationParams } from "../types/marketplace-memory.types";
import { LearnedFactMapper } from "../mappers/LearnedFactMapper";

export class SupabaseLearnedFactRepository implements ILearnedFactRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByCanonicalProductId(canonicalProductId: string): Promise<LearnedFact[]> {
    const { data, error } = await this.client
      .from("marketplace_memory_facts")
      .select("*")
      .eq("canonical_product_id", canonicalProductId);

    if (error) {
      console.error("[SupabaseLearnedFactRepository.findByCanonicalProductId]", error.message);
      return [];
    }
    return (data ?? []).map(LearnedFactMapper.toDomain);
  }

  // Sprint 15B (egress). Substitui, no caminho do merge-suggestions, uma
  // consulta POR CANDIDATO por uma leitura em lote.
  //
  // Dois limites reais e independentes, por isso as duas dimensões:
  //
  // 1. ID_CHUNK — a lista de UUIDs vai na URI da requisição PostgREST, que
  //    tem limite de tamanho. 150 é o mesmo valor já usado por
  //    `SupabaseCanonicalCatalogRepository.findOffersByCanonicalProductIds`
  //    (Sprint 8B) para exatamente o mesmo problema.
  //
  // 2. PAGE_SIZE — `UNIQUE (canonical_product_id, fact_type)` limita cada
  //    produto a um fato por tipo, e `FactType` tem 17 valores. Um chunk de
  //    150 IDs pode portanto devolver até 2550 linhas, acima do `max_rows`
  //    do PostgREST (1000): sem paginar, o servidor truncaria em silêncio e
  //    fatos desapareceriam. Daí paginar DENTRO de cada chunk, com `id`
  //    como ordem determinística — sem ela, `range` duplica ou perde linhas.
  //
  // `select("*")` mantido de propósito: o mapeamento por linha tem de ser
  // idêntico ao do método individual. Reduzir colunas aqui é outra mudança,
  // com outro risco, e não é o que esta Sprint se propõe.
  private static readonly ID_CHUNK = 150;
  private static readonly PAGE_SIZE = 500;

  async findByCanonicalProductIds(canonicalProductIds: string[]): Promise<Map<string, LearnedFact[]>> {
    const grouped = new Map<string, LearnedFact[]>();
    const ids = [...new Set(canonicalProductIds)].filter(Boolean);
    if (ids.length === 0) return grouped;

    for (let i = 0; i < ids.length; i += SupabaseLearnedFactRepository.ID_CHUNK) {
      const chunk = ids.slice(i, i + SupabaseLearnedFactRepository.ID_CHUNK);

      for (let offset = 0; ; offset += SupabaseLearnedFactRepository.PAGE_SIZE) {
        const { data, error } = await this.client
          .from("marketplace_memory_facts")
          .select("*")
          .in("canonical_product_id", chunk)
          .order("id", { ascending: true })
          .range(offset, offset + SupabaseLearnedFactRepository.PAGE_SIZE - 1);

        if (error) {
          // Mesma política do individual: loga e degrada para vazio, nunca
          // lança. Um resultado PARCIAL seria pior que vazio — o chamador
          // trataria um produto com fatos como se não tivesse nenhum.
          console.error("[SupabaseLearnedFactRepository.findByCanonicalProductIds]", error.message);
          return new Map();
        }

        const rows = (data ?? []) as Record<string, unknown>[];
        for (const row of rows) {
          const key = row.canonical_product_id as string;
          const bucket = grouped.get(key) ?? [];
          bucket.push(LearnedFactMapper.toDomain(row));
          grouped.set(key, bucket);
        }

        if (rows.length < SupabaseLearnedFactRepository.PAGE_SIZE) break;
      }
    }

    return grouped;
  }

  async findByTypeAndValue(factType: FactType, factValue: string): Promise<LearnedFact[]> {
    const { data, error } = await this.client
      .from("marketplace_memory_facts")
      .select("*")
      .eq("fact_type", factType)
      .eq("fact_value", factValue);

    if (error) {
      console.error("[SupabaseLearnedFactRepository.findByTypeAndValue]", error.message);
      return [];
    }
    return (data ?? []).map(LearnedFactMapper.toDomain);
  }

  async upsert(input: LearnedFactInput): Promise<LearnedFact> {
    const { data, error } = await this.client
      .from("marketplace_memory_facts")
      .upsert(LearnedFactMapper.toRow(input), { onConflict: "canonical_product_id,fact_type" })
      .select("*")
      .single();

    if (error) throw new Error(`learned fact upsert: ${error.message}`);
    return LearnedFactMapper.toDomain(data);
  }

  async findAll(pagination: PaginationParams): Promise<PaginatedResult<LearnedFact>> {
    const { limit, offset } = pagination;
    const { data, error, count } = await this.client
      .from("marketplace_memory_facts")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[SupabaseLearnedFactRepository.findAll]", error.message);
      return { items: [], total: 0 };
    }
    return { items: (data ?? []).map(LearnedFactMapper.toDomain), total: count ?? 0 };
  }

  async countByFactType(factType: FactType): Promise<number> {
    const { count, error } = await this.client
      .from("marketplace_memory_facts")
      .select("*", { count: "exact", head: true })
      .eq("fact_type", factType);
    if (error) {
      console.error("[SupabaseLearnedFactRepository.countByFactType]", error.message);
      return 0;
    }
    return count ?? 0;
  }

  async countTotal(): Promise<number> {
    const { count, error } = await this.client.from("marketplace_memory_facts").select("*", { count: "exact", head: true });
    if (error) {
      console.error("[SupabaseLearnedFactRepository.countTotal]", error.message);
      return 0;
    }
    return count ?? 0;
  }
}
