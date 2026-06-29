import type { SupabaseClient } from "@supabase/supabase-js";
import type { IVerificationHistoryRepository, CreateAuditInput } from "../repositories/IVerificationHistoryRepository";
import type { VerificationAuditRecord } from "../types/trust.types";

export class SupabaseVerificationHistoryRepository implements IVerificationHistoryRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByVerificationId(verificationId: string): Promise<VerificationAuditRecord[]> {
    const { data, error } = await this.client
      .from("verification_history")
      .select("*")
      .eq("verification_id", verificationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[VerificationHistoryRepository.findByVerificationId]", error);
      return [];
    }
    return (data ?? []) as VerificationAuditRecord[];
  }

  async findByMerchantId(merchantId: string, limit = 100): Promise<VerificationAuditRecord[]> {
    const { data, error } = await this.client
      .from("verification_history")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[VerificationHistoryRepository.findByMerchantId]", error);
      return [];
    }
    return (data ?? []) as VerificationAuditRecord[];
  }

  async create(input: CreateAuditInput): Promise<VerificationAuditRecord | null> {
    const { data, error } = await this.client
      .from("verification_history")
      .insert({
        verification_id: input.verification_id,
        merchant_id: input.merchant_id,
        action: input.action,
        previous_status: input.previous_status ?? null,
        new_status: input.new_status ?? null,
        performed_by: input.performed_by ?? null,
        performed_by_role: input.performed_by_role ?? null,
        reason: input.reason ?? null,
        metadata: input.metadata ?? {},
      })
      .select()
      .single();

    if (error) {
      console.error("[VerificationHistoryRepository.create]", error);
      return null;
    }
    return data as VerificationAuditRecord;
  }
}
