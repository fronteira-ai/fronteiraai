import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseMarketplaceAlertRepository } from "../infrastructure/SupabaseMarketplaceAlertRepository";
import { MarketplaceAlertType, MarketplaceAlertStatus } from "../types/enums";

// Mission 05.5 — P0. These tests exist because PostgREST silently caps every
// response at PGRST_DB_MAX_ROWS (1000 in this deployment). The first version of
// the batched read assumed one response was the whole set; above 1000 open
// alerts the dedupe set was truncated and the daily sweep re-created ~500
// alerts per day (production: marketplace_alerts 626 → 4.216 rows in 7 days).
// The fake client below models that cap explicitly, so "more than 1000 rows
// exist" cannot pass by accident.

/** PGRST_DB_MAX_ROWS in this deployment. */
const CAP = 1000;

interface Row {
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

function makeRows(count: number, alertType: MarketplaceAlertType = MarketplaceAlertType.LowCoverage): Row[] {
  const base = Date.UTC(2026, 0, 1);
  return Array.from({ length: count }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    alert_type: alertType,
    severity: "info",
    status: MarketplaceAlertStatus.Pending,
    subject_type: "brand",
    subject_id: `brand-${i}`,
    title: `alerta ${i}`,
    details: {},
    created_at: new Date(base + i * 1000).toISOString(),
    resolved_at: null,
  }));
}

interface RecordedRequest {
  alertTypes: string[];
  statuses: string[];
  from: number;
  to: number;
  orderedBy: string;
  askedForCount: boolean;
}

interface FakeResult {
  data: Row[] | null;
  count: number | null;
  error: { message: string } | null;
}

/** Models a PostgREST request: filter → deterministic order → range → CAP. */
class FakeQuery {
  private alertTypes: string[] = [];
  private statuses: string[] = [];
  private from = 0;
  private to = Number.MAX_SAFE_INTEGER;
  private orderedBy = "";
  private askedForCount = false;

  constructor(
    private readonly rows: Row[],
    private readonly requests: RecordedRequest[],
    private readonly failAtFrom?: number
  ) {}

  select(_columns: string, options?: { count?: string }) {
    this.askedForCount = options?.count === "exact";
    return this;
  }

  in(column: string, values: unknown[]) {
    if (column === "alert_type") this.alertTypes = values as string[];
    if (column === "status") this.statuses = values as string[];
    return this;
  }

  order(column: string) {
    this.orderedBy = column;
    return this;
  }

  range(from: number, to: number) {
    this.from = from;
    this.to = to;
    return this;
  }

  private execute(): FakeResult {
    this.requests.push({
      alertTypes: [...this.alertTypes],
      statuses: [...this.statuses],
      from: this.from,
      to: this.to,
      orderedBy: this.orderedBy,
      askedForCount: this.askedForCount,
    });

    if (this.failAtFrom !== undefined && this.from === this.failAtFrom) {
      return { data: null, count: null, error: { message: "simulated transport failure" } };
    }

    const filtered = this.rows
      .filter((row) => this.alertTypes.includes(row.alert_type) && this.statuses.includes(row.status))
      // The repository orders by id; the fake honours it so pagination is stable.
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

    const count = this.askedForCount ? filtered.length : null;
    // PostgREST never returns more than CAP rows, whatever the range asked for.
    const pageSize = Math.min(this.to - this.from + 1, CAP);
    return { data: filtered.slice(this.from, this.from + pageSize), count, error: null };
  }

  then<TResult>(
    onFulfilled: (value: FakeResult) => TResult,
    onRejected?: (reason: unknown) => TResult
  ): Promise<TResult> {
    return Promise.resolve(this.execute()).then(onFulfilled, onRejected);
  }
}

function makeClient(rows: Row[], failAtFrom?: number) {
  const requests: RecordedRequest[] = [];
  const client = {
    from: () => new FakeQuery(rows, requests, failAtFrom),
  };
  return { client: client as unknown as SupabaseClient, requests };
}

function makeRepo(rows: Row[], failAtFrom?: number) {
  const { client, requests } = makeClient(rows, failAtFrom);
  return { repo: new SupabaseMarketplaceAlertRepository(client), requests };
}

const TYPES = [MarketplaceAlertType.LowCoverage];

describe("SupabaseMarketplaceAlertRepository.listOpen — pagination across PGRST_DB_MAX_ROWS", () => {
  it("returns [] without querying when no alert type is requested", async () => {
    const { repo, requests } = makeRepo(makeRows(10));

    expect(await repo.listOpen([])).toEqual([]);
    expect(requests).toHaveLength(0); // no pointless round trip
  });

  it("0 alerts: one request, empty result", async () => {
    const { repo, requests } = makeRepo(makeRows(0));

    expect(await repo.listOpen(TYPES)).toEqual([]);
    expect(requests).toHaveLength(1);
  });

  it("fewer than 1000 alerts (<1000): one request, complete result", async () => {
    const { repo, requests } = makeRepo(makeRows(626));

    const result = await repo.listOpen(TYPES);

    expect(result).toHaveLength(626);
    expect(requests).toHaveLength(1);
    expect(requests[0].from).toBe(0);
    expect(requests[0].to).toBe(999);
  });

  it("exactly 1000 alerts: complete result, and stops as soon as count is reached", async () => {
    const { repo, requests } = makeRepo(makeRows(1000));

    const result = await repo.listOpen(TYPES);

    expect(result).toHaveLength(1000);
    // count === 1000 is authoritative, so no second (empty) page is requested.
    expect(requests).toHaveLength(1);
  });

  it("more than 1000 alerts (>1000): pages until exhaustion and NEVER stops at the cap", async () => {
    const rows = makeRows(1001);
    const { repo, requests } = makeRepo(rows);

    const result = await repo.listOpen(TYPES);

    expect(result).toHaveLength(1001);
    expect(result.length).not.toBe(CAP); // the regression was exactly this
    expect(requests).toHaveLength(2);
    expect(requests.map((r) => [r.from, r.to])).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it("production-scale dataset (4216 rows): 5 pages, exact set, no duplicates", async () => {
    const rows = makeRows(4216);
    const { repo, requests } = makeRepo(rows);

    const result = await repo.listOpen(TYPES);

    expect(result).toHaveLength(4216);
    const ids = result.map((a) => a.id);
    expect(new Set(ids).size).toBe(4216); // pages must be disjoint
    expect(new Set(ids)).toEqual(new Set(rows.map((r) => r.id))); // and complete
    expect(requests).toHaveLength(5);
    expect(requests.map((r) => [r.from, r.to])).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
      [3000, 3999],
      [4000, 4999],
    ]);
  });

  it.each([1, 999, 1000, 1001, 1999, 2000, 2001, 4500])(
    "pagination boundary at %i rows returns every row exactly once",
    async (rows) => {
      const all = makeRows(rows);
      const { repo } = makeRepo(all);

      const result = await repo.listOpen(TYPES);

      expect(result).toHaveLength(rows);
      expect(new Set(result.map((a) => a.id))).toEqual(new Set(all.map((r) => r.id)));
    }
  );

  it("preserves the N+1 fix: pages are batched by type, never one query per subject", async () => {
    const { repo, requests } = makeRepo(makeRows(4216));

    await repo.listOpen([MarketplaceAlertType.LowCoverage, MarketplaceAlertType.StoreNotSyncing]);

    // 5 pages for 4216 rows — versus the ~400 per-subject reads of the original
    // implementation (and no growth with the size of the backlog beyond 1/1000).
    expect(requests).toHaveLength(5);
    for (const request of requests) {
      expect(request.alertTypes).toEqual([
        MarketplaceAlertType.LowCoverage,
        MarketplaceAlertType.StoreNotSyncing,
      ]);
      expect(request.statuses).toEqual([
        MarketplaceAlertStatus.Pending,
        MarketplaceAlertStatus.Acknowledged,
      ]);
      expect(request.orderedBy).toBe("id"); // deterministic total order
      expect(request.askedForCount).toBe(true);
    }
  });

  it("failure during an intermediate page REJECTS instead of returning a partial set", async () => {
    const { repo, requests } = makeRepo(makeRows(4216), 1000);

    await expect(repo.listOpen(TYPES)).rejects.toThrow(/falha ao paginar marketplace_alerts/);
    // The failure happened on page 2, i.e. after a successful first page: a
    // partial set must never be handed to the caller, or it becomes duplicates.
    expect(requests).toHaveLength(2);
  });

  it("failure on the first page also rejects (fail-closed, no silent empty set)", async () => {
    const { repo } = makeRepo(makeRows(50), 0);

    await expect(repo.listOpen(TYPES)).rejects.toThrow(/página 0/);
  });
});
