import type { SupabaseClient } from "@supabase/supabase-js";
import type { IBuyerAlertCandidateRepository } from "../repositories/IBuyerAlertCandidateRepository";
import type { BuyerAlertCandidate, CreateBuyerAlertCandidateInput } from "../types";
import { AlertCandidateStatus, AlertType } from "../enums";

interface CandidateRow {
  id: string;
  alert_type: string;
  product_id: string | null;
  offer_id: string | null;
  store_id: string | null;
  market_change_id: string | null;
  priority: number;
  payload: Record<string, unknown>;
  rate_limit_key: string;
  status: string;
  created_at: string;
}

const COLUMNS =
  "id, alert_type, product_id, offer_id, store_id, market_change_id, priority, payload, rate_limit_key, status, created_at";

function toDomain(row: CandidateRow): BuyerAlertCandidate {
  return {
    id: row.id,
    alertType: row.alert_type as AlertType,
    productId: row.product_id,
    offerId: row.offer_id,
    storeId: row.store_id,
    marketChangeId: row.market_change_id,
    priority: row.priority,
    payload: row.payload,
    rateLimitKey: row.rate_limit_key,
    status: row.status as AlertCandidateStatus,
    createdAt: row.created_at,
  };
}

export class SupabaseBuyerAlertCandidateRepository implements IBuyerAlertCandidateRepository {
  constructor(private readonly client: SupabaseClient) {}

  async createIfNotRateLimited(input: CreateBuyerAlertCandidateInput): Promise<BuyerAlertCandidate | null> {
    const { data, error } = await this.client
      .from("buyer_alert_candidates")
      .insert({
        alert_type: input.alertType,
        product_id: input.productId,
        offer_id: input.offerId,
        store_id: input.storeId,
        market_change_id: input.marketChangeId,
        priority: input.priority,
        payload: input.payload,
        rate_limit_key: input.rateLimitKey,
      })
      .select(COLUMNS)
      .single();

    if (error) {
      // Postgres unique_violation — expected outcome of rate limiting, not a
      // failure. Any other error is logged.
      if (error.code !== "23505") console.error("[SupabaseBuyerAlertCandidateRepository.createIfNotRateLimited]", error.message);
      return null;
    }
    return data ? toDomain(data as CandidateRow) : null;
  }

  async listPending(limit: number): Promise<BuyerAlertCandidate[]> {
    const { data, error } = await this.client
      .from("buyer_alert_candidates")
      .select(COLUMNS)
      .eq("status", AlertCandidateStatus.Pending)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[SupabaseBuyerAlertCandidateRepository.listPending]", error.message);
      return [];
    }
    return ((data ?? []) as CandidateRow[]).map(toDomain);
  }
}
