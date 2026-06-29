import type { SupabaseClient } from "@supabase/supabase-js";
import type { ITrustSignalRepository } from "../repositories/ITrustSignalRepository";
import type { TrustSignalRecord, PaginatedResult, PaginationOptions } from "../types/trust.types";
import type { TrustSignalStatus } from "../types/enums";

export class SupabaseTrustSignalRepository implements ITrustSignalRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByMerchantId(merchantId: string, options: PaginationOptions = {}): Promise<PaginatedResult<TrustSignalRecord>> {
    const page = options.page ?? 1;
    const perPage = options.perPage ?? 20;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data, error, count } = await this.client
      .from("trust_signals")
      .select("*", { count: "exact" })
      .eq("merchant_id", merchantId)
      .order("sort_order", { ascending: true })
      .range(from, to);

    if (error) {
      console.error("[TrustSignalRepository.findByMerchantId]", error);
      return { data: [], total: 0, page, perPage, totalPages: 0 };
    }
    const total = count ?? 0;
    return { data: (data ?? []) as TrustSignalRecord[], total, page, perPage, totalPages: Math.ceil(total / perPage) };
  }

  async findActiveByMerchantId(merchantId: string): Promise<TrustSignalRecord[]> {
    const { data, error } = await this.client
      .from("trust_signals")
      .select("*")
      .eq("merchant_id", merchantId)
      .eq("status", "active")
      .eq("is_public", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[TrustSignalRepository.findActiveByMerchantId]", error);
      return [];
    }
    return (data ?? []) as TrustSignalRecord[];
  }

  async findById(id: string): Promise<TrustSignalRecord | null> {
    const { data, error } = await this.client
      .from("trust_signals")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("[TrustSignalRepository.findById]", error);
      return null;
    }
    return data as TrustSignalRecord;
  }

  async findByVerificationId(verificationId: string): Promise<TrustSignalRecord | null> {
    const { data, error } = await this.client
      .from("trust_signals")
      .select("*")
      .eq("verification_id", verificationId)
      .single();

    if (error) return null;
    return data as TrustSignalRecord;
  }

  async create(input: Omit<TrustSignalRecord, "id" | "created_at" | "last_updated_at">): Promise<TrustSignalRecord | null> {
    const { data, error } = await this.client
      .from("trust_signals")
      .insert(input)
      .select()
      .single();

    if (error) {
      console.error("[TrustSignalRepository.create]", error);
      return null;
    }
    return data as TrustSignalRecord;
  }

  async updateStatus(id: string, status: TrustSignalStatus): Promise<TrustSignalRecord | null> {
    const { data, error } = await this.client
      .from("trust_signals")
      .update({ status, last_updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[TrustSignalRepository.updateStatus]", error);
      return null;
    }
    return data as TrustSignalRecord;
  }

  async update(id: string, patch: Partial<TrustSignalRecord>): Promise<TrustSignalRecord | null> {
    const { data, error } = await this.client
      .from("trust_signals")
      .update({ ...patch, last_updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[TrustSignalRepository.update]", error);
      return null;
    }
    return data as TrustSignalRecord;
  }
}
