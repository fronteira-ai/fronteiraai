/**
 * Merchant Feed Platform — registration + Adaptive Sync integration.
 *
 * Registra um feed de lojista em `connectors` (a mesma tabela do Adaptive Sync
 * Engine) e registra o IConnector no registry — SEM cron paralelo. O cron
 * dispatcher que já itera `connectors` passa a ver o feed como due.
 *
 * Onboarding do operador (V1):
 *   register(client, input) → valida dry-run (se ainda não) → upsert
 *   `connectors.connector_key = merchant-feed-<slug>` com config (feed_url,
 *   source_type, trust, tier) → registra MerchantFeedConnector no registry.
 *
 * Prepara serviços p/ futuro self-service (UI separada nesta Sprint opcional).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { connectorRegistry } from "../../connectors/services/ConnectorRegistry";
import { ConnectorType, ConnectorStatus } from "../../connectors/types/enums";
import type { Connector } from "../../connectors/domain/Connector";
import { MerchantFeedConnector } from "../connector/MerchantFeedConnector";
import type { MerchantFeedConfig, MerchantFeedSourceType, MerchantFeedSourceTrust } from "../config/MerchantFeedConfig";
import type { MerchantSourceConfig } from "../config/MerchantSourceConfig";
import { validateMerchantSourceConfig } from "../config/MerchantSourceConfig";
import { classifyHealth, type ConnectorSyncState } from "../../connectors/scheduler/AdaptiveSyncEngine";

export interface MerchantFeedRegistrationInput {
  storeSlug: string;
  feedUrl: string;
  sourceType?: MerchantFeedSourceType;
  trust?: MerchantFeedSourceTrust;
  preferredTier?: "HOT" | "WARM";
  /** Config declarativa (fieldMapping/rootPath/currency) para feeds JSON. */
  sourceConfig?: MerchantSourceConfig;
}

export interface MerchantFeedRegistrationResult {
  connector: Connector;
  canActivate: boolean;
  feedConfig: MerchantFeedConfig;
}

export class MerchantFeedRegistrationService {
  constructor(private readonly client: SupabaseClient) {}

  /** Persiste o feed em connectors + registra o IConnector. Não depara com
   * scheduler paralelo: o Adaptive Sync Engine existente agenda via isDue. */
  async register(input: MerchantFeedRegistrationInput): Promise<MerchantFeedRegistrationResult> {
    if (input.sourceConfig) validateMerchantSourceConfig(input.sourceConfig);
    const config: MerchantFeedConfig = {
      feedUrl: input.feedUrl,
      sourceType: input.sourceType ?? input.sourceConfig?.sourceType ?? "XML_FEED",
      trust: input.trust ?? "OFFICIAL_MERCHANT_FEED",
      preferredTier: input.preferredTier ?? "HOT",
      enabled: true,
      sourceConfig: input.sourceConfig,
    };

    const connectorKey = `merchant-feed-${input.storeSlug}`;
    const connType = config.sourceType === "JSON_FEED" ? ConnectorType.JsonFile : ConnectorType.XmlFile;
    // upsert linha em connectors (config inclui feed_url; sync_state agenda HOT/WARM).
    const syncState: ConnectorSyncState = {
      tier: config.preferredTier,
      next_sync_at: new Date().toISOString(),
    };
    const { data, error } = await this.client
      .from("connectors")
      .upsert(
        {
          connector_key: connectorKey,
          name: `${input.storeSlug} (feed oficial)`,
          version: "1.0.0",
          type: connType,
          store_slug: input.storeSlug,
          description: `Feed oficial do lojista (${config.sourceType})`,
          status: ConnectorStatus.Active,
          // syncFrequencyHours: legacy opt-in gate do cron (todo connector com
          // cadência entrou pelo caminho isDue→onSyncOutcome). HOT=30min/WARM=2h.
          config: { merchantFeed: config, syncFrequencyHours: config.preferredTier === "HOT" ? 0.5 : 2 },
          sync_state: syncState,
        },
        { onConflict: "connector_key" }
      )
      .select("*")
      .single();

    if (error) throw new Error(`merchant-feed upsert: ${error.message}`);

    // registra o IConnector para o cron dispatcher achar por connectorKey.
    if (!connectorRegistry.has(connectorKey)) {
      connectorRegistry.register(new MerchantFeedConnector(config, input.storeSlug));
    }

    const connector = { ...(data as unknown as Record<string, unknown>) } as never as Connector;
    return { connector, canActivate: true, feedConfig: config };
  }

  /** Lê feeds persistidos e registra seus IConnector (chamado no boot, antes do cron). */
  async bootstrap(persisted: Connector[]): Promise<void> {
    for (const c of persisted) {
      if (!c.connectorKey.startsWith("merchant-feed-")) continue;
      const cfg = (c.config?.merchantFeed as MerchantFeedConfig) ?? null;
      if (!cfg?.feedUrl) continue;
      if (!connectorRegistry.has(c.connectorKey)) {
        connectorRegistry.register(new MerchantFeedConnector(cfg, c.storeSlug));
      }
    }
  }

  /** Estado de saúde do feed (read-through ao AdaptiveSyncEngine). */
  health(connector: Connector): string {
    return classifyHealth(connector.syncState ?? {}, new Date());
  }
}
