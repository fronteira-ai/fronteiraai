import type { SupabaseClient } from "@supabase/supabase-js";
import type { IVerificationRepository } from "../repositories/IVerificationRepository";
import type { MerchantVerificationRecord } from "../types/trust.types";
import type { VerificationType, VerificationStatus } from "../types/enums";

export class SupabaseVerificationRepository implements IVerificationRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<MerchantVerificationRecord | null> {
    const { data, error } = await this.client
      .from("merchant_verifications")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("[VerificationRepository.findById]", error);
      return null;
    }
    return data as MerchantVerificationRecord;
  }

  async findByMerchantId(merchantId: string): Promise<MerchantVerificationRecord[]> {
    const { data, error } = await this.client
      .from("merchant_verifications")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[VerificationRepository.findByMerchantId]", error);
      return [];
    }
    return (data ?? []) as MerchantVerificationRecord[];
  }

  async findPending(): Promise<MerchantVerificationRecord[]> {
    const { data, error } = await this.client
      .from("merchant_verifications")
      .select("*")
      .eq("status", "pending")
      .order("submitted_at", { ascending: true });

    if (error) {
      console.error("[VerificationRepository.findPending]", error);
      return [];
    }
    return (data ?? []) as MerchantVerificationRecord[];
  }

  async create(
    merchantId: string,
    type: VerificationType,
    metadata: Record<string, unknown> = {}
  ): Promise<MerchantVerificationRecord | null> {
    const { data, error } = await this.client
      .from("merchant_verifications")
      .insert({ merchant_id: merchantId, verification_type: type, metadata })
      .select()
      .single();

    if (error) {
      console.error("[VerificationRepository.create]", error);
      return null;
    }
    return data as MerchantVerificationRecord;
  }

  async updateStatus(
    id: string,
    status: VerificationStatus,
    reviewedBy: string,
    rejectionReason?: string
  ): Promise<MerchantVerificationRecord | null> {
    const { data, error } = await this.client
      .from("merchant_verifications")
      .update({
        status,
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectionReason ?? null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[VerificationRepository.updateStatus]", error);
      return null;
    }
    return data as MerchantVerificationRecord;
  }
}
