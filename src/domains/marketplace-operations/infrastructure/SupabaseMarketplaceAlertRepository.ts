import type { SupabaseClient } from "@supabase/supabase-js";
import type { IMarketplaceAlertRepository } from "../repositories/IMarketplaceAlertRepository";
import type { MarketplaceAlert, AlertRuleResult } from "../types/alerts.types";
import {
  MarketplaceAlertStatus,
  type MarketplaceAlertType,
  type MarketplaceAlertSeverity,
  type MarketplaceAlertSubjectType,
} from "../types/enums";

interface AlertRow {
  id: string;
  alert_type: string;
  severity: string;
  status: string;
  subject_type: string | null;
  subject_id: string | null;
  title: string;
  details: Record<string, unknown>;
  created_at: string;
  resolved_at: string | null;
}

function toDomain(row: AlertRow): MarketplaceAlert {
  return {
    id: row.id,
    alertType: row.alert_type as MarketplaceAlertType,
    severity: row.severity as MarketplaceAlertSeverity,
    status: row.status as MarketplaceAlert["status"],
    subjectType: row.subject_type as MarketplaceAlertSubjectType | null,
    subjectId: row.subject_id,
    title: row.title,
    detail: row.details,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

export class SupabaseMarketplaceAlertRepository implements IMarketplaceAlertRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findOpenByKey(
    alertType: MarketplaceAlertType,
    subjectType: MarketplaceAlertSubjectType | null,
    subjectId: string | null
  ): Promise<MarketplaceAlert | null> {
    let query = this.client
      .from("marketplace_alerts")
      .select("*")
      .eq("alert_type", alertType)
      .in("status", [MarketplaceAlertStatus.Pending, MarketplaceAlertStatus.Acknowledged]);

    query = subjectId ? query.eq("subject_id", subjectId) : query.is("subject_id", null);
    query = subjectType ? query.eq("subject_type", subjectType) : query.is("subject_type", null);

    const { data } = await query.maybeSingle();
    return data ? toDomain(data as AlertRow) : null;
  }

  async create(input: AlertRuleResult): Promise<MarketplaceAlert | null> {
    const { data, error } = await this.client
      .from("marketplace_alerts")
      .insert({
        alert_type: input.alertType,
        severity: input.severity,
        status: MarketplaceAlertStatus.Pending,
        subject_type: input.subjectType,
        subject_id: input.subjectId,
        title: input.title,
        details: input.detail,
      })
      .select("*")
      .single();

    if (error || !data) return null;
    return toDomain(data as AlertRow);
  }

  async list(status?: MarketplaceAlertStatus): Promise<MarketplaceAlert[]> {
    let query = this.client.from("marketplace_alerts").select("*").order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);

    const { data } = await query;
    return ((data ?? []) as AlertRow[]).map(toDomain);
  }

  async updateStatus(id: string, status: MarketplaceAlertStatus): Promise<MarketplaceAlert | null> {
    const resolvedAt = status === MarketplaceAlertStatus.Resolved ? new Date().toISOString() : null;

    const { data, error } = await this.client
      .from("marketplace_alerts")
      .update({ status, resolved_at: resolvedAt })
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) return null;
    return toDomain(data as AlertRow);
  }
}
