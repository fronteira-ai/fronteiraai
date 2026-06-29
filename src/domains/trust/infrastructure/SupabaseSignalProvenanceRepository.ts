import type { SupabaseClient } from "@supabase/supabase-js";
import type { ISignalProvenanceRepository } from "../repositories/ISignalProvenanceRepository";
import type { SignalProvenanceRecord } from "../types/trust.types";

export class SupabaseSignalProvenanceRepository implements ISignalProvenanceRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findBySignalId(signalId: string): Promise<SignalProvenanceRecord | null> {
    const { data, error } = await this.client
      .from("signal_provenance")
      .select("*")
      .eq("signal_id", signalId)
      .single();

    if (error) {
      console.error("[SignalProvenanceRepository.findBySignalId]", error);
      return null;
    }
    return data as SignalProvenanceRecord;
  }

  async findByMerchantId(merchantId: string): Promise<SignalProvenanceRecord[]> {
    const { data, error } = await this.client
      .from("signal_provenance")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[SignalProvenanceRepository.findByMerchantId]", error);
      return [];
    }
    return (data ?? []) as SignalProvenanceRecord[];
  }

  async create(input: Omit<SignalProvenanceRecord, "id" | "created_at">): Promise<SignalProvenanceRecord | null> {
    const { data, error } = await this.client
      .from("signal_provenance")
      .insert(input)
      .select()
      .single();

    if (error) {
      console.error("[SignalProvenanceRepository.create]", error);
      return null;
    }
    return data as SignalProvenanceRecord;
  }
}
