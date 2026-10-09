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

/** PostgREST caps EVERY response at PGRST_DB_MAX_ROWS (1000 in this deployment). */
const PAGE_SIZE = 1000;
/** Hard bound so termination never depends on the server-reported `count`. */
const MAX_PAGES = 10_000;

export class SupabaseMarketplaceAlertRepository implements IMarketplaceAlertRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listOpen(alertTypes: MarketplaceAlertType[]): Promise<MarketplaceAlert[]> {
    if (alertTypes.length === 0) return [];

    // Mission 05.5 — P0 (data integrity). Mission 05 replaced the
    // per-candidate read (N+1: ~400 sequential queries per sweep) with a
    // single batched read — but PostgREST silently truncates any response at
    // PGRST_DB_MAX_ROWS (1000 here). Once more than 1000 alerts were open, the
    // returned set was incomplete, the caller's in-memory dedupe set was
    // therefore incomplete too, and the daily sweep re-created ~500 alerts
    // every day: `marketplace_alerts` went from 626 rows (2026-09-30) to 4.216
    // rows (2026-10-07). Pagination is part of the CONTRACT of this method, not
    // an optimisation: it must return the COMPLETE set of matching open
    // alerts, or fail loudly.
    //
    // Cost stays in the same order of magnitude as the Mission 05 fix:
    // ceil(open/PAGE_SIZE) requests (5 today) instead of one truncated
    // request — versus the ~400 of the original N+1. No per-subject query is
    // ever issued.
    const all: MarketplaceAlert[] = [];

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const from = page * PAGE_SIZE;

      const { data, count, error } = await this.client
        .from("marketplace_alerts")
        .select("*", { count: "exact" })
        .in("alert_type", alertTypes)
        .in("status", [MarketplaceAlertStatus.Pending, MarketplaceAlertStatus.Acknowledged])
        // Total order on the primary key: without a deterministic order,
        // range() pagination can repeat or skip rows between pages.
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        // Fail CLOSED. A partial set would make the caller believe an existing
        // alert is missing and INSERT a duplicate — exactly the corruption
        // this method exists to prevent. A visible, retryable failure of the
        // sweep is the cheaper outcome.
        throw new Error(
          `listOpen: falha ao paginar marketplace_alerts (página ${page}, range ${from}-${from + PAGE_SIZE - 1}): ${error.message}`
        );
      }

      const rows = (data ?? []) as AlertRow[];
      all.push(...rows.map(toDomain));

      // Classic short-page termination — independent of `count`.
      if (rows.length < PAGE_SIZE) return all;
      // Authoritative termination when the server reports the total.
      if (typeof count === "number" && all.length >= count) return all;
    }

    // Only reachable if a server keeps reporting a `count` above what it
    // returns while always filling pages. Kept so termination is provably
    // bounded rather than trusting the server.
    throw new Error(`listOpen: paginação excedeu ${MAX_PAGES} páginas em marketplace_alerts`);
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
