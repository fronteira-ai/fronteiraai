import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoreClaim } from "../domain/StoreClaim";
import { ClaimStatus } from "../types/enums";
import type {
  CreateStoreClaimInput,
  IStoreClaimRepository,
  UpdateStoreClaimStatusInput,
} from "../repositories/IStoreClaimRepository";
import type { PaginatedResult, PaginationParams, SignalCheckResult } from "../types/merchant-ownership.types";

function toStoreClaim(row: Record<string, unknown>): StoreClaim {
  return {
    id: row.id as string,
    merchantId: row.merchant_id as string,
    storeId: row.store_id as string,
    status: row.status as ClaimStatus,
    claimantName: row.claimant_name as string,
    claimantPhone: row.claimant_phone as string,
    claimantEmail: row.claimant_email as string,
    claimantRole: row.claimant_role as string,
    automatedConfidence: row.automated_confidence as number,
    signalBreakdown: (row.signal_breakdown as SignalCheckResult[] | null) ?? [],
    verificationId: (row.verification_id as string | null) ?? null,
    rejectionReason: (row.rejection_reason as string | null) ?? null,
    adminNote: (row.admin_note as string | null) ?? null,
    reviewedAt: (row.reviewed_at as string | null) ?? null,
    reviewedBy: (row.reviewed_by as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export class SupabaseStoreClaimRepository implements IStoreClaimRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: CreateStoreClaimInput): Promise<StoreClaim> {
    const { data, error } = await this.client
      .from("store_claims")
      .insert({
        merchant_id: input.merchantId,
        store_id: input.storeId,
        status: input.status,
        claimant_name: input.claimantName,
        claimant_phone: input.claimantPhone,
        claimant_email: input.claimantEmail,
        claimant_role: input.claimantRole,
        automated_confidence: input.automatedConfidence,
        signal_breakdown: input.signalBreakdown,
        verification_id: input.verificationId,
      })
      .select("*")
      .single();

    if (error) throw new Error(`store claim insert: ${error.message}`);
    return toStoreClaim(data);
  }

  async findById(id: string): Promise<StoreClaim | null> {
    const { data, error } = await this.client.from("store_claims").select("*").eq("id", id).maybeSingle();
    if (error) {
      console.error("[SupabaseStoreClaimRepository.findById]", error.message);
      return null;
    }
    return data ? toStoreClaim(data) : null;
  }

  async findByMerchantId(merchantId: string): Promise<StoreClaim[]> {
    const { data, error } = await this.client
      .from("store_claims")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[SupabaseStoreClaimRepository.findByMerchantId]", error.message);
      return [];
    }
    return (data ?? []).map(toStoreClaim);
  }

  async findByStoreId(storeId: string): Promise<StoreClaim[]> {
    const { data, error } = await this.client
      .from("store_claims")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[SupabaseStoreClaimRepository.findByStoreId]", error.message);
      return [];
    }
    return (data ?? []).map(toStoreClaim);
  }

  async findActiveByStoreAndMerchant(storeId: string, merchantId: string): Promise<StoreClaim | null> {
    const { data, error } = await this.client
      .from("store_claims")
      .select("*")
      .eq("store_id", storeId)
      .eq("merchant_id", merchantId)
      .in("status", [ClaimStatus.Pending, ClaimStatus.AwaitingReview])
      .maybeSingle();
    if (error) {
      console.error("[SupabaseStoreClaimRepository.findActiveByStoreAndMerchant]", error.message);
      return null;
    }
    return data ? toStoreClaim(data) : null;
  }

  async findByStatus(status: ClaimStatus, pagination: PaginationParams): Promise<PaginatedResult<StoreClaim>> {
    const { limit, offset } = pagination;
    const { data, error, count } = await this.client
      .from("store_claims")
      .select("*", { count: "exact" })
      .eq("status", status)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[SupabaseStoreClaimRepository.findByStatus]", error.message);
      return { items: [], total: 0 };
    }

    return { items: (data ?? []).map(toStoreClaim), total: count ?? 0 };
  }

  async updateStatus(id: string, input: UpdateStoreClaimStatusInput): Promise<void> {
    const { error } = await this.client
      .from("store_claims")
      .update({
        status: input.status,
        reviewed_by: input.reviewedBy ?? null,
        rejection_reason: input.rejectionReason ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw new Error(`store claim status update: ${error.message}`);
  }

  async addAdminNote(id: string, note: string): Promise<void> {
    const { error } = await this.client.from("store_claims").update({ admin_note: note }).eq("id", id);
    if (error) throw new Error(`store claim admin note: ${error.message}`);
  }
}
