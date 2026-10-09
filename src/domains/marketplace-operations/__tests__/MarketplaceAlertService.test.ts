import { MarketplaceAlertService } from "../services/MarketplaceAlertService";
import {
  MarketplaceAlertStatus,
  MarketplaceAlertType,
  MarketplaceAlertSeverity,
} from "../types/enums";
import type { IMarketplaceAlertRepository } from "../repositories/IMarketplaceAlertRepository";
import type { MarketplaceAlert, AlertRuleResult } from "../types/alerts.types";

function makeResult(overrides: Partial<AlertRuleResult> = {}): AlertRuleResult {
  return {
    alertType: MarketplaceAlertType.ConnectorDown,
    severity: MarketplaceAlertSeverity.Critical,
    subjectType: "connector",
    subjectId: "c1",
    title: "Conector fora do ar",
    detail: {},
    ...overrides,
  };
}

function makeAlert(overrides: Partial<MarketplaceAlert> = {}): MarketplaceAlert {
  return {
    id: "a1",
    alertType: MarketplaceAlertType.ConnectorDown,
    severity: MarketplaceAlertSeverity.Critical,
    status: MarketplaceAlertStatus.Pending,
    subjectType: "connector",
    subjectId: "c1",
    title: "Conector fora do ar",
    detail: {},
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    ...overrides,
  };
}

class FakeAlertRepository implements IMarketplaceAlertRepository {
  public created: AlertRuleResult[] = [];
  public existing: MarketplaceAlert[] = [];
  public listOpenCalls: MarketplaceAlertType[][] = [];

  async listOpen(alertTypes: MarketplaceAlertType[]) {
    this.listOpenCalls.push(alertTypes);
    const OPEN_STATUSES: MarketplaceAlertStatus[] = [MarketplaceAlertStatus.Pending, MarketplaceAlertStatus.Acknowledged];
    return this.existing.filter(
      (a) => alertTypes.includes(a.alertType) && OPEN_STATUSES.includes(a.status)
    );
  }

  async create(input: AlertRuleResult) {
    this.created.push(input);
    return makeAlert({ alertType: input.alertType, subjectId: input.subjectId, title: input.title });
  }

  async list(status?: MarketplaceAlertStatus) {
    return status ? this.existing.filter((a) => a.status === status) : this.existing;
  }

  async updateStatus(id: string, status: MarketplaceAlertStatus) {
    const alert = this.existing.find((a) => a.id === id);
    if (!alert) return null;
    return { ...alert, status };
  }
}

describe("MarketplaceAlertService.sync", () => {
  it("creates a new alert when no open alert matches the key", async () => {
    const repo = new FakeAlertRepository();
    const service = new MarketplaceAlertService(repo);

    const created = await service.sync([makeResult()]);

    expect(created).toHaveLength(1);
    expect(repo.created).toHaveLength(1);
  });

  it("does not create a duplicate when an open alert already matches the key", async () => {
    const repo = new FakeAlertRepository();
    repo.existing.push(makeAlert({ status: MarketplaceAlertStatus.Pending }));
    const service = new MarketplaceAlertService(repo);

    const created = await service.sync([makeResult()]);

    expect(created).toHaveLength(0);
    expect(repo.created).toHaveLength(0);
  });

  it("creates a new alert once the matching one is already resolved (dedupe only blocks open alerts)", async () => {
    const repo = new FakeAlertRepository();
    repo.existing.push(makeAlert({ status: MarketplaceAlertStatus.Resolved }));
    const service = new MarketplaceAlertService(repo);

    const created = await service.sync([makeResult()]);

    expect(created).toHaveLength(1);
  });

  // Mission 05 regression (2026-09-30 incident). The dedupe used to be one
  // repository read per candidate, so a sweep whose rule produced one
  // candidate per coverage gap issued ~400 sequential queries against
  // `marketplace_alerts` in a single cron run — inside the window where the
  // PostgREST pool was exhausted (PGRST003/504). The batched read must stay
  // bounded by the number of DISTINCT alert types, never by backlog size.
  it("reads open alerts in ONE batched query per distinct type, not one per candidate", async () => {
    const repo = new FakeAlertRepository();
    const service = new MarketplaceAlertService(repo);

    const backfill = Array.from({ length: 200 }, (_, i) =>
      makeResult({ alertType: MarketplaceAlertType.LowCoverage, subjectType: "brand", subjectId: `brand-${i}` })
    );

    const created = await service.sync(backfill);

    expect(created).toHaveLength(200);
    expect(repo.listOpenCalls).toHaveLength(1);
    expect(repo.listOpenCalls[0]).toEqual([MarketplaceAlertType.LowCoverage]);
  });

  it("reads open alerts once for the whole sweep, however many types it mixes", async () => {
    const repo = new FakeAlertRepository();
    const service = new MarketplaceAlertService(repo);

    const results = [
      makeResult({ alertType: MarketplaceAlertType.LowCoverage, subjectId: "b1", subjectType: "brand" }),
      makeResult({ alertType: MarketplaceAlertType.LowCoverage, subjectId: "b2", subjectType: "brand" }),
      makeResult({ alertType: MarketplaceAlertType.LowFreshness, subjectId: null, subjectType: "marketplace" }),
      makeResult({ alertType: MarketplaceAlertType.LowFreshness, subjectId: null, subjectType: "marketplace" }),
    ];

    await service.sync(results);

    expect(repo.listOpenCalls).toHaveLength(1);
    expect(repo.listOpenCalls[0].sort()).toEqual(
      [MarketplaceAlertType.LowCoverage, MarketplaceAlertType.LowFreshness].sort()
    );
  });

  // Mission 05.5 — P0 regression. In production the repository returned only
  // the first 1000 open alerts (PostgREST cap), so a complete database looked
  // incomplete to this method and every sweep re-created ~500 alerts. These
  // tests pin the contract the fix depends on: a COMPLETE existing set means
  // zero INSERTs, at production scale.
  it("creates nothing when the COMPLETE existing set covers every candidate (production-scale)", async () => {
    const repo = new FakeAlertRepository();
    const service = new MarketplaceAlertService(repo);

    // 4.216 open alerts exist (the real figure measured on 2026-10-07)…
    const existing = Array.from({ length: 4216 }, (_, i) =>
      makeAlert({
        id: `existing-${i}`,
        alertType: MarketplaceAlertType.LowCoverage,
        subjectType: "brand",
        subjectId: i < 500 ? `brand-${i}` : `unrelated-brand-${i}`,
        status: MarketplaceAlertStatus.Pending,
      })
    );
    repo.existing.push(...existing);

    // …and the sweep proposes 500 candidates that are all already in that set.
    const candidates = Array.from({ length: 500 }, (_, i) =>
      makeResult({ alertType: MarketplaceAlertType.LowCoverage, subjectType: "brand", subjectId: `brand-${i}` })
    );

    const created = await service.sync(candidates);

    expect(created).toHaveLength(0);
    expect(repo.created).toHaveLength(0); // no duplicate INSERT
    expect(repo.listOpenCalls).toHaveLength(1); // still one batched read
  });

  it("creates only for candidates genuinely absent from a large existing set", async () => {
    const repo = new FakeAlertRepository();
    const service = new MarketplaceAlertService(repo);

    repo.existing.push(
      ...Array.from({ length: 4216 }, (_, i) =>
        makeAlert({
          id: `existing-${i}`,
          alertType: MarketplaceAlertType.LowCoverage,
          subjectType: "brand",
          subjectId: `brand-${i}`,
          status: MarketplaceAlertStatus.Pending,
        })
      )
    );

    const candidates = [
      makeResult({ alertType: MarketplaceAlertType.LowCoverage, subjectType: "brand", subjectId: "brand-0" }),
      makeResult({ alertType: MarketplaceAlertType.LowCoverage, subjectType: "brand", subjectId: "brand-999" }),
      makeResult({ alertType: MarketplaceAlertType.LowCoverage, subjectType: "brand", subjectId: "brand-new" }),
    ];

    const created = await service.sync(candidates);

    expect(created).toHaveLength(1);
    expect(repo.created).toHaveLength(1);
    expect(repo.created[0].subjectId).toBe("brand-new");
  });

  it("does not duplicate an identical candidate repeated in the same sweep", async () => {
    const repo = new FakeAlertRepository();
    const service = new MarketplaceAlertService(repo);

    const created = await service.sync([makeResult(), makeResult()]);

    expect(created).toHaveLength(1);
    expect(repo.created).toHaveLength(1);
  });

  it("does nothing (no reads, no writes) for an empty sweep", async () => {
    const repo = new FakeAlertRepository();
    const service = new MarketplaceAlertService(repo);

    expect(await service.sync([])).toEqual([]);
    expect(repo.listOpenCalls).toHaveLength(0);
  });
});

describe("MarketplaceAlertService lifecycle", () => {
  it("acknowledge/resolve/ignore delegate to repo.updateStatus with the right status", async () => {
    const repo = new FakeAlertRepository();
    repo.existing.push(makeAlert({ id: "a1" }));
    const service = new MarketplaceAlertService(repo);

    const acknowledged = await service.acknowledge("a1");
    expect(acknowledged?.status).toBe(MarketplaceAlertStatus.Acknowledged);

    const resolved = await service.resolve("a1");
    expect(resolved?.status).toBe(MarketplaceAlertStatus.Resolved);

    const ignored = await service.ignore("a1");
    expect(ignored?.status).toBe(MarketplaceAlertStatus.Ignored);
  });

  it("returns null when updating a non-existent alert", async () => {
    const repo = new FakeAlertRepository();
    const service = new MarketplaceAlertService(repo);
    expect(await service.resolve("missing")).toBeNull();
  });
});
