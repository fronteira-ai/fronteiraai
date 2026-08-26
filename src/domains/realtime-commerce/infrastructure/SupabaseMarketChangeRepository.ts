import type { SupabaseClient } from "@supabase/supabase-js";
import type { CountFilter, IMarketChangeRepository } from "../repositories/IMarketChangeRepository";
import type { CreateMarketChangeInput, MarketChange } from "../types";
import { ChangeType, MarketChangeEntityType } from "../enums";

interface ChangeRow {
  id: string;
  change_type: string;
  entity_type: string;
  entity_id: string;
  product_id: string | null;
  store_id: string | null;
  field: string;
  previous_value: string | null;
  current_value: string | null;
  confidence: number;
  source: string;
  detected_at: string;
}

// Sprint 13: teto de ids por consulta em `latestForEntities`. Ver o limite de
// URI medido na Sprint 6 (falha em 220 ids); 150 deixa folga confortável.
const ENTITY_ID_CHUNK = 150;

// Sprint 13C: tamanho da página lida dentro de cada chunk. Tem de ficar ABAIXO
// do `max_rows` do PostgREST (`supabase/config.toml`: 1000) — acima dele o
// PostgREST corta a resposta em silêncio, sem erro e sem sinal de truncagem, e
// as entidades que caíssem no fim da ordenação simplesmente sumiriam do Map.
// 500 deixa margem para o teto ser reduzido pela metade sem quebrar nada.
const PAGE_SIZE = 500;

const COLUMNS =
  "id, change_type, entity_type, entity_id, product_id, store_id, field, previous_value, current_value, confidence, source, detected_at";

function toDomain(row: ChangeRow): MarketChange {
  return {
    id: row.id,
    changeType: row.change_type as ChangeType,
    entityType: row.entity_type as MarketChangeEntityType,
    entityId: row.entity_id,
    productId: row.product_id,
    storeId: row.store_id,
    field: row.field,
    previousValue: row.previous_value,
    currentValue: row.current_value,
    confidence: row.confidence,
    source: row.source,
    detectedAt: row.detected_at,
  };
}

function toRow(input: CreateMarketChangeInput) {
  return {
    change_type: input.changeType,
    entity_type: input.entityType,
    entity_id: input.entityId,
    product_id: input.productId,
    store_id: input.storeId,
    field: input.field,
    previous_value: input.previousValue,
    current_value: input.currentValue,
    confidence: input.confidence,
    source: input.source,
  };
}

export class SupabaseMarketChangeRepository implements IMarketChangeRepository {
  constructor(private readonly client: SupabaseClient) {}

  async insertMany(inputs: CreateMarketChangeInput[]): Promise<MarketChange[]> {
    if (inputs.length === 0) return [];

    const { data, error } = await this.client
      .from("market_changes")
      .insert(inputs.map(toRow))
      .select(COLUMNS);

    if (error || !data) {
      console.error("[SupabaseMarketChangeRepository.insertMany]", error?.message);
      return [];
    }
    return (data as ChangeRow[]).map(toDomain);
  }

  async countInRange(from: Date, to: Date, filter?: CountFilter): Promise<number> {
    let query = this.client
      .from("market_changes")
      .select("id", { count: "exact", head: true })
      .gte("detected_at", from.toISOString())
      .lte("detected_at", to.toISOString());

    if (filter?.changeTypes?.length) {
      query = query.in("change_type", filter.changeTypes);
    }

    const { count, error } = await query;
    if (error) {
      console.error("[SupabaseMarketChangeRepository.countInRange]", error.message);
      return 0;
    }
    return count ?? 0;
  }

  async listInRange(from: Date, to: Date, limit: number): Promise<MarketChange[]> {
    const { data, error } = await this.client
      .from("market_changes")
      .select(COLUMNS)
      .gte("detected_at", from.toISOString())
      .lte("detected_at", to.toISOString())
      .order("detected_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[SupabaseMarketChangeRepository.listInRange]", error.message);
      return [];
    }
    return ((data ?? []) as ChangeRow[]).map(toDomain);
  }

  async latestForEntity(entityType: string, entityId: string): Promise<MarketChange | null> {
    const { data } = await this.client
      .from("market_changes")
      .select(COLUMNS)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      // Sprint 13B: `detected_at` sozinho não é chave única — medido no banco
      // local, 5 das 120 ofertas com histórico têm DUAS mudanças com o mesmo
      // `detected_at` ao milissegundo. Sem segundo critério o Postgres pode
      // devolver qualquer uma das empatadas, e devolvia: dependendo do plano,
      // esta consulta e a em lote escolhiam linhas diferentes para a mesma
      // oferta. `id DESC` é o desempate — arbitrário como qualquer outro,
      // mas fixo, e idêntico nos dois caminhos de leitura.
      .order("detected_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    return data ? toDomain(data as ChangeRow) : null;
  }

  /** Sprint 13 — ver IMarketChangeRepository para o contrato.
   *
   * O `.limit(1)` por entidade do método individual não tem equivalente em
   * SQL numa consulta só sem window function, então a redução acontece em
   * duas etapas: uma leitura ordenada por `detected_at` decrescente (e `id`
   * decrescente para desempatar — ver `latestForEntity`) para todas as
   * entidades, e a primeira ocorrência de cada `entity_id` vence. Como a
   * ordenação é EXATAMENTE a mesma do método individual, e agora é total, o
   * registro escolhido é o mesmo — não só o mesmo `detected_at`, a mesma
   * linha.
   *
   * O teto de ids por consulta segue o limite de URI medido na Sprint 6
   * contra este mesmo stack (210 ids = 7.851 bytes -> HTTP 200; 220 ids =
   * 8.221 bytes -> HTTP 414). 150 fica bem abaixo e cobre com folga a
   * página de comparação, limitada a 100 ofertas.
   *
   * Sprint 13C — dentro de cada chunk a leitura é PAGINADA (`PAGE_SIZE`).
   * `market_changes` é append-only: o histórico por entidade só cresce, e uma
   * consulta sem página acabaria batendo no `max_rows` do PostgREST, que
   * trunca sem erro. A paginação é segura porque a ordenação
   * (`detected_at DESC, id DESC`) é TOTAL — `id` é único, então nenhuma linha
   * pode aparecer em duas páginas nem escapar de todas.
   *
   * Na prática o laço quase sempre faz uma volta só: ele para assim que todas
   * as entidades do chunk já foram resolvidas, e a mais recente de cada uma
   * está, por definição da ordenação, entre as primeiras linhas.
   */
  async latestForEntities(entityType: string, entityIds: string[]): Promise<Map<string, MarketChange>> {
    const latest = new Map<string, MarketChange>();
    const ids = [...new Set(entityIds)].filter(Boolean);
    if (ids.length === 0) return latest;

    for (let i = 0; i < ids.length; i += ENTITY_ID_CHUNK) {
      const chunk = ids.slice(i, i + ENTITY_ID_CHUNK);
      const pendentes = new Set(chunk);

      for (let offset = 0; ; offset += PAGE_SIZE) {
        const { data, error } = await this.client
          .from("market_changes")
          .select(COLUMNS)
          .eq("entity_type", entityType)
          .in("entity_id", chunk)
          .order("detected_at", { ascending: false })
          .order("id", { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (error) {
          // Mesmo contrato de falha do método individual, que também não lança:
          // ausência de histórico degrada para o fallback do chamador.
          console.error("[SupabaseMarketChangeRepository.latestForEntities]", error.message);
          break;
        }

        const rows = (data ?? []) as ChangeRow[];
        for (const row of rows) {
          // Ordenado por detected_at desc, id desc: a primeira ocorrência de
          // cada entity_id é a mais recente.
          if (!latest.has(row.entity_id)) {
            latest.set(row.entity_id, toDomain(row));
            pendentes.delete(row.entity_id);
          }
        }

        // Página incompleta = fim do conjunto. `pendentes` vazio = todas as
        // entidades do chunk já têm sua mudança mais recente; o resto das
        // páginas só traria histórico antigo, que este método descarta.
        // (Entidades sem nenhuma mudança nunca saem de `pendentes` — quem
        // encerra o laço nesse caso é a página incompleta.)
        if (rows.length < PAGE_SIZE || pendentes.size === 0) break;
      }
    }

    return latest;
  }

  async listForProduct(productId: string, from: Date, to: Date): Promise<MarketChange[]> {
    const { data, error } = await this.client
      .from("market_changes")
      .select(COLUMNS)
      .eq("product_id", productId)
      .gte("detected_at", from.toISOString())
      .lte("detected_at", to.toISOString())
      .order("detected_at", { ascending: true });

    if (error) {
      console.error("[SupabaseMarketChangeRepository.listForProduct]", error.message);
      return [];
    }
    return ((data ?? []) as ChangeRow[]).map(toDomain);
  }

  async listForStore(storeId: string, from: Date, to: Date, limit: number): Promise<MarketChange[]> {
    const { data, error } = await this.client
      .from("market_changes")
      .select(COLUMNS)
      .eq("store_id", storeId)
      .gte("detected_at", from.toISOString())
      .lte("detected_at", to.toISOString())
      .order("detected_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[SupabaseMarketChangeRepository.listForStore]", error.message);
      return [];
    }
    return ((data ?? []) as ChangeRow[]).map(toDomain);
  }
}
