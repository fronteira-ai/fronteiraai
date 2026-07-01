import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron-auth";
import { createConnectorsServices } from "@/lib/connectors-factory";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { ConnectorStatus } from "@/src/domains/connectors/types/enums";

// First route in this repo to set maxDuration — a multi-connector sweep can
// run long. Triggered daily by vercel.json's single cron entry; this route
// decides at runtime which connectors are actually due (interval-based, see
// VercelCronScheduler's doc comment).
export const maxDuration = 60;

interface ConnectorScheduleConfig {
  syncFrequencyHours?: number;
}

export async function GET(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  const { connectorRepo, connectorRegistry, syncRunRepo, manualSyncTrigger } =
    createConnectorsServices(getSupabaseServiceClient());

  const connectors = (await connectorRepo.list()).filter((c) => c.status === ConnectorStatus.Active);

  const results: Array<{ connectorKey: string; success: boolean; syncRunId: string | null; skipped?: string }> = [];

  for (const persisted of connectors) {
    const config = (persisted.config ?? {}) as ConnectorScheduleConfig;

    // Opt-in scheduling: connectors without syncFrequencyHours in config are
    // never swept — today's reference JSON/CSV connectors stay manual-only.
    if (!config.syncFrequencyHours) continue;

    const [lastRun] = await syncRunRepo.findByConnector(persisted.id, 1);
    const lastCompletedAt = lastRun?.completedAt ? new Date(lastRun.completedAt) : null;
    const isDue = !lastCompletedAt || Date.now() - lastCompletedAt.getTime() >= config.syncFrequencyHours * 3_600_000;

    if (!isDue) continue;

    if (!connectorRegistry.has(persisted.connectorKey)) {
      results.push({ connectorKey: persisted.connectorKey, success: false, syncRunId: null, skipped: "not registered in this process" });
      continue;
    }

    const connector = connectorRegistry.get(persisted.connectorKey);
    const outcome = await manualSyncTrigger.trigger(connector, { dryRun: false, verbose: false });
    results.push({ connectorKey: persisted.connectorKey, success: outcome.success, syncRunId: outcome.syncRunId });
  }

  return NextResponse.json({ data: results });
}
