import type { SupabaseClient } from "@supabase/supabase-js";
import type { MerchantDelegate } from "../domain/MerchantDelegate";
import { DelegateStatus } from "../types/enums";
import type { CreateDelegateInput, IMerchantDelegateRepository } from "../repositories/IMerchantDelegateRepository";

function toMerchantDelegate(row: Record<string, unknown>): MerchantDelegate {
  return {
    id: row.id as string,
    merchantId: row.merchant_id as string,
    invitedEmail: row.invited_email as string,
    userId: (row.user_id as string | null) ?? null,
    role: row.role as MerchantDelegate["role"],
    status: row.status as MerchantDelegate["status"],
    inviteToken: row.invite_token as string,
    invitedBy: row.invited_by as string,
    invitedAt: row.invited_at as string,
    acceptedAt: (row.accepted_at as string | null) ?? null,
    revokedAt: (row.revoked_at as string | null) ?? null,
  };
}

export class SupabaseMerchantDelegateRepository implements IMerchantDelegateRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: CreateDelegateInput): Promise<MerchantDelegate> {
    const { data, error } = await this.client
      .from("merchant_delegates")
      .insert({
        merchant_id: input.merchantId,
        invited_email: input.invitedEmail,
        role: input.role,
        invite_token: input.inviteToken,
        invited_by: input.invitedBy,
        status: DelegateStatus.Invited,
      })
      .select("*")
      .single();

    if (error) throw new Error(`delegate invite insert: ${error.message}`);
    return toMerchantDelegate(data);
  }

  async findById(id: string): Promise<MerchantDelegate | null> {
    const { data, error } = await this.client.from("merchant_delegates").select("*").eq("id", id).maybeSingle();
    if (error) {
      console.error("[SupabaseMerchantDelegateRepository.findById]", error.message);
      return null;
    }
    return data ? toMerchantDelegate(data) : null;
  }

  async findByToken(inviteToken: string): Promise<MerchantDelegate | null> {
    const { data, error } = await this.client
      .from("merchant_delegates")
      .select("*")
      .eq("invite_token", inviteToken)
      .maybeSingle();
    if (error) {
      console.error("[SupabaseMerchantDelegateRepository.findByToken]", error.message);
      return null;
    }
    return data ? toMerchantDelegate(data) : null;
  }

  async findByMerchantId(merchantId: string): Promise<MerchantDelegate[]> {
    const { data, error } = await this.client
      .from("merchant_delegates")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("invited_at", { ascending: false });
    if (error) {
      console.error("[SupabaseMerchantDelegateRepository.findByMerchantId]", error.message);
      return [];
    }
    return (data ?? []).map(toMerchantDelegate);
  }

  async findActiveByUserId(userId: string): Promise<MerchantDelegate | null> {
    const { data, error } = await this.client
      .from("merchant_delegates")
      .select("*")
      .eq("user_id", userId)
      .eq("status", DelegateStatus.Active)
      .maybeSingle();
    if (error) {
      console.error("[SupabaseMerchantDelegateRepository.findActiveByUserId]", error.message);
      return null;
    }
    return data ? toMerchantDelegate(data) : null;
  }

  async accept(id: string, userId: string): Promise<void> {
    const { error } = await this.client
      .from("merchant_delegates")
      .update({ user_id: userId, status: DelegateStatus.Active, accepted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(`delegate accept: ${error.message}`);
  }

  async updateStatus(id: string, status: DelegateStatus): Promise<void> {
    const update: Record<string, unknown> = { status };
    if (status === DelegateStatus.Revoked) update.revoked_at = new Date().toISOString();
    const { error } = await this.client.from("merchant_delegates").update(update).eq("id", id);
    if (error) throw new Error(`delegate status update: ${error.message}`);
  }
}
