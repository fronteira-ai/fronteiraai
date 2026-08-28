import type { SupabaseClient } from "@supabase/supabase-js";
import type { MerchantAuthorizationRecord } from "@/src/domains/merchant-feed/auth/MerchantAuthorization";

export interface MerchantAuthorizationRow {
  id: string;
  merchant_id: string;
  store_id: string | null;
  authorized_by: string;
  authorization_date: string;
  source_url: string;
  allowed_usage: string[];
  evidence_reference: string | null;
  contact_reference: string | null;
  status: MerchantAuthorizationRecord["status"];
  created_at: string;
  updated_at: string;
}

/**
 * Persist/leitura de registros de autorização (internal audit trail, §7/§34).
 * Em rotas de merchant, o chamador deve validar que o `merchant_id` pertence ao
 * usuário logado via requireMerchant — NUNCA confiar em store_id/merchant_id vindo
 * do browser (§46). Este serviço opera com service client (server-side).
 */
export class MerchantAuthorizationService {
  constructor(private readonly supabase: SupabaseClient) {}

  /** Lista autorizações de uma merchant (tenant-scoped pelo merchant_id). */
  async listByMerchant(merchantId: string): Promise<MerchantAuthorizationRow[]> {
    const { data } = await this.supabase
      .from("merchant_authorizations")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("authorization_date", { ascending: false });
    return (data ?? []) as MerchantAuthorizationRow[];
  }

  /** Upsert idempotente (uma autorização ativa por store+merchant). */
  async upsert(record: MerchantAuthorizationRecord & { merchantId: string; storeId: string }): Promise<MerchantAuthorizationRow> {
    const { data, error } = await this.supabase
      .from("merchant_authorizations")
      .upsert(
        {
          merchant_id: record.merchantId,
          store_id: record.storeId,
          authorized_by: record.authorizedBy,
          authorization_date: record.authorizationDate,
          source_url: record.sourceUrl,
          allowed_usage: record.allowedUsage,
          evidence_reference: record.evidenceReference ?? null,
          contact_reference: record.contactReference ?? null,
          status: record.status,
        },
        { onConflict: "store_id,merchant_id" },
      )
      .select("*")
      .single();
    if (error) throw new Error(`merchant_authorizations upsert: ${error.message}`);
    return data as unknown as MerchantAuthorizationRow;
  }
}
