import type { SupabaseClient } from "@supabase/supabase-js";
import { DiscoveryService } from "../services/DiscoveryService";
import type { IDiscoverySource, DiscoveryResult } from "../types/discovery.types";

function makeSource(overrides: Partial<DiscoveryResult> = {}): IDiscoverySource {
  const result: DiscoveryResult = {
    domain: "example.com.py",
    storeName: "example.com.py",
    candidateProductUrls: [],
    robotsAllowed: true,
    ...overrides,
  };
  return { key: "sitemap-discovery", discover: jest.fn().mockResolvedValue(result) };
}

function makeSupabase(existing: { id: string } | null, insertedId = "new-store-id"): SupabaseClient {
  const storesBuilder: Record<string, unknown> = {
    select: jest.fn(() => storesBuilder),
    eq: jest.fn(() => storesBuilder),
    maybeSingle: jest.fn(() => Promise.resolve({ data: existing, error: null })),
    insert: jest.fn(() => storesBuilder),
    single: jest.fn(() => Promise.resolve({ data: { id: insertedId }, error: null })),
  };
  return { from: jest.fn(() => storesBuilder) } as unknown as SupabaseClient;
}

describe("DiscoveryService", () => {
  it("aborts and returns null when robots.txt disallows discovery", async () => {
    const service = new DiscoveryService(makeSupabase(null), makeSource({ robotsAllowed: false }));
    const outcome = await service.discoverAndCreateStore("example.com.py");
    expect(outcome).toBeNull();
  });

  it("returns the existing store without creating a duplicate", async () => {
    const service = new DiscoveryService(makeSupabase({ id: "existing-id" }), makeSource());
    const outcome = await service.discoverAndCreateStore("example.com.py");
    expect(outcome).toEqual({
      storeId: "existing-id",
      created: false,
      domain: "example.com.py",
      storeName: "example.com.py",
    });
  });

  it("creates a new unclaimed store when none exists yet", async () => {
    const service = new DiscoveryService(makeSupabase(null), makeSource());
    const outcome = await service.discoverAndCreateStore("example.com.py");
    expect(outcome).toEqual({
      storeId: "new-store-id",
      created: true,
      domain: "example.com.py",
      storeName: "example.com.py",
    });
  });
});
