import type { SupabaseClient } from "@supabase/supabase-js";
import type { IDiscoverySource } from "../types/discovery.types";
import { slugify } from "@/utils/slug";

export interface DiscoverAndCreateStoreOutcome {
  storeId: string;
  created: boolean;
  domain: string;
  storeName: string;
}

// The ONLY code path allowed to create a `stores` row without one already
// existing — deliberately bypasses ICatalogRepository entirely, so
// CatalogWriteStage's "store must already exist" guard is never touched or
// weakened for regular connectors (JSON/CSV/ShoppingChina/future api-rest).
export class DiscoveryService {
  constructor(
    private readonly client: SupabaseClient,
    private readonly source: IDiscoverySource
  ) {}

  async discoverAndCreateStore(domain: string): Promise<DiscoverAndCreateStoreOutcome | null> {
    const result = await this.source.discover(domain);

    if (!result.robotsAllowed) {
      console.warn(`[DiscoveryService] robots.txt disallows discovery for ${result.domain}`);
      return null;
    }

    const slug = slugify(result.storeName);
    if (!slug) return null;

    const { data: existing, error: findError } = await this.client
      .from("stores")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (findError) {
      console.error("[DiscoveryService.discoverAndCreateStore]", findError.message);
      return null;
    }

    if (existing) {
      return { storeId: existing.id as string, created: false, domain: result.domain, storeName: result.storeName };
    }

    const { data: inserted, error: insertError } = await this.client
      .from("stores")
      .insert({
        name: result.storeName,
        slug,
        city: "Ciudad del Este",
        country: "PY",
        active: true,
        website: `https://${result.domain}`,
        discovered_at: new Date().toISOString(),
        discovery_connector_key: this.source.key,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("[DiscoveryService.discoverAndCreateStore]", insertError?.message);
      return null;
    }

    return { storeId: inserted.id as string, created: true, domain: result.domain, storeName: result.storeName };
  }
}
