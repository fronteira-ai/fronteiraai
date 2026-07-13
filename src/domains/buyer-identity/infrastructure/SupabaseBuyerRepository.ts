import type { SupabaseClient } from "@supabase/supabase-js";
import type { Buyer } from "../domain/Buyer";
import type { IBuyerRepository, CreateBuyerInput } from "../repositories/IBuyerRepository";

interface BuyerRow {
  id: string;
  auth_user_id: string | null;
  email: string | null;
  email_verified_at: string | null;
  display_name: string | null;
  phone: string | null;
  marketing_opt_in: boolean;
  anonymized_at: string | null;
  created_at: string;
}

function toDomain(row: BuyerRow): Buyer {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    email: row.email,
    emailVerifiedAt: row.email_verified_at,
    displayName: row.display_name,
    phone: row.phone,
    marketingOptIn: row.marketing_opt_in,
    anonymizedAt: row.anonymized_at,
    createdAt: row.created_at,
  };
}

export class SupabaseBuyerRepository implements IBuyerRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<Buyer | null> {
    const { data, error } = await this.client.from("buyers").select("*").eq("id", id).maybeSingle();
    if (error) {
      console.error("[SupabaseBuyerRepository.findById]", error.message);
      return null;
    }
    return data ? toDomain(data as BuyerRow) : null;
  }

  async findByAuthUserId(authUserId: string): Promise<Buyer | null> {
    const { data, error } = await this.client.from("buyers").select("*").eq("auth_user_id", authUserId).maybeSingle();
    if (error) {
      console.error("[SupabaseBuyerRepository.findByAuthUserId]", error.message);
      return null;
    }
    return data ? toDomain(data as BuyerRow) : null;
  }

  async findByEmail(email: string): Promise<Buyer | null> {
    const { data, error } = await this.client
      .from("buyers")
      .select("*")
      .eq("email", email)
      .is("anonymized_at", null)
      .maybeSingle();
    if (error) {
      console.error("[SupabaseBuyerRepository.findByEmail]", error.message);
      return null;
    }
    return data ? toDomain(data as BuyerRow) : null;
  }

  async create(input: CreateBuyerInput): Promise<Buyer | null> {
    const { data, error } = await this.client
      .from("buyers")
      .insert({
        auth_user_id: input.authUserId ?? null,
        email: input.email ?? null,
        display_name: input.displayName ?? null,
        phone: input.phone ?? null,
        marketing_opt_in: input.marketingOptIn ?? false,
      })
      .select("*")
      .single();
    if (error) {
      console.error("[SupabaseBuyerRepository.create]", error.message);
      return null;
    }
    return toDomain(data as BuyerRow);
  }

  async linkAuthUser(id: string, authUserId: string): Promise<Buyer | null> {
    const { data, error } = await this.client
      .from("buyers")
      .update({ auth_user_id: authUserId })
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[SupabaseBuyerRepository.linkAuthUser]", error.message);
      return null;
    }
    return toDomain(data as BuyerRow);
  }

  async markEmailVerified(id: string): Promise<Buyer | null> {
    const { data, error } = await this.client
      .from("buyers")
      .update({ email_verified_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[SupabaseBuyerRepository.markEmailVerified]", error.message);
      return null;
    }
    return toDomain(data as BuyerRow);
  }

  async anonymize(id: string): Promise<Buyer | null> {
    const { data, error } = await this.client
      .from("buyers")
      .update({
        email: null,
        display_name: null,
        phone: null,
        auth_user_id: null,
        anonymized_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[SupabaseBuyerRepository.anonymize]", error.message);
      return null;
    }
    return toDomain(data as BuyerRow);
  }
}
