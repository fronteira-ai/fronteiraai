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
      .order("detected_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return data ? toDomain(data as ChangeRow) : null;
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
