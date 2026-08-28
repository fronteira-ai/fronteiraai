import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron-auth";
import { createConnectorsServices } from "@/lib/connectors-factory";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { ConnectorStatus } from "@/src/domains/connectors/types/enums";
import type { Connector } from "@/src/domains/connectors/domain/Connector";
import {
  isDue,
  onSyncOutcome,
  classifyHealth,
  type SyncOutcome,
} from "@/src/domains/connectors/scheduler/AdaptiveSyncEngine";

// Realtime Commerce Sync V1 — a rota continua sendo o cron diário disparado
// por vercel.json ("0 6 * * *"), mas agora EVOLUI para o Adaptive Sync Engine:
//   - SELECT due: connectors cujo sync_state.next_sync_at <= now (ou, sem
//     estado ainda — primeira execução —, preserva o agendamento legado via
//     lastRun + syncFrequencyHours p/ não barrar o deploy);
//   - dispatch com CONCURRÊNCIA LIMITADA (bounded), em vez de sequencial;
//   - após cada run persiste sync_state (next_sync_at, consecutive_failures,
//     health_status, freshness) via onSyncOutcome.
// Store isolation: falha de um connector não impede os outros.
export const maxDuration = 60;

interface ConnectorScheduleConfig {
  syncFrequencyHours?: number;
}
const CONCURRENCY = 2; // bounded: crawlers são pesados e devem respeitar sites externos

function effectiveFreqHours(cfg: ConnectorScheduleConfig): number {
  return cfg.syncFrequencyHours ?? 24;
}

function isDueConnector(persisted: Connector, cfg: ConnectorScheduleConfig, now: Date, lastCompletedAt: string | null): boolean {
  // Sem estado de scheduling ainda (primeira execução pós-deploy): preserva
  // o agendamento legado (lastRun.completedAt + syncFrequencyHours) para não
  // re-barrare stores que acabaram de sincronizar.
  if (persisted.syncState?.next_sync_at) {
    return isDue({ state: persisted.syncState, now, enabled: persisted.status === ConnectorStatus.Active });
  }
  if (!lastCompletedAt) return true; // nunca rodou → schedule
  return Date.now() - new Date(lastCompletedAt).getTime() >= effectiveFreqHours(cfg) * 3_600_000;
}

export async function GET(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  const { connectorRepo, connectorRegistry, syncRunRepo, manualSyncTrigger } =
    createConnectorsServices(getSupabaseServiceClient());
  const now = new Date();

  const connectors = (await connectorRepo.list()).filter((c) => c.status === ConnectorStatus.Active);

  const due: Connector[] = [];
  const configs = new Map<string, ConnectorScheduleConfig>();
  for (const persisted of connectors) {
    const cfg = (persisted.config ?? {}) as ConnectorScheduleConfig;
    configs.set(persisted.id, cfg);
    if (!cfg.syncFrequencyHours) continue; // opt-in legado
    const [lastRun] = await syncRunRepo.findByConnector(persisted.id, 1);
    const lastCompletedAt = lastRun?.completedAt ? new Date(lastRun.completedAt).toISOString() : null;
    if (isDueConnector(persisted, cfg, now, lastCompletedAt)) due.push(persisted);
  }

  const results: Array<{ connectorKey: string; success: boolean; syncRunId: string | null; skipped?: string; persistedNextSyncAt?: string | null; health?: string | null }> = [];

  // Bounded concurrency (store isolation): processa em lotes de CONCURRENCY.
  for (let i = 0; i < due.length; i += CONCURRENCY) {
    const batch = due.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (persisted) => {
        const cfg = configs.get(persisted.id) ?? {};
        if (!connectorRegistry.has(persisted.connectorKey)) {
          results.push({ connectorKey: persisted.connectorKey, success: false, syncRunId: null, skipped: "not registered in this process" });
          return;
        }
        const connector = connectorRegistry.get(persisted.connectorKey);

        // ── LEASE (locking/anti-duplicação) ──────────────────────────────
        // Antes de rodar, seta next_sync_at para futuro (agora + frequência)
        // como lease: se uma concorrência despertar neste connector durante
        // a execução, isDue() não o re-seleciona (evita duplicata). Depois
        // da execução, onSyncOutcome recalcula o próximo agendamento real.
        const leaseState = onSyncOutcome({
          state: persisted.syncState ?? {},
          outcome: "success", // lease conservador: agenda para o futuro
          now: new Date(),
          configSyncFrequencyHours: effectiveFreqHours(cfg),
        });
        await connectorRepo.updateSyncState(persisted.id, leaseState);

        const outcome = await manualSyncTrigger.trigger(connector, { dryRun: false, verbose: false });

        // Estado final: reflete o resultado real da execução.
        const syncOutcome: SyncOutcome = outcome.success ? "success" : (outcome.errors?.length ?? 0) > 0 ? "partial" : "failed";
        const nextState = onSyncOutcome({
          state: leaseState,
          outcome: syncOutcome,
          now: new Date(),
          configSyncFrequencyHours: effectiveFreqHours(cfg),
        });
        await connectorRepo.updateSyncState(persisted.id, nextState);
        results.push({
          connectorKey: persisted.connectorKey,
          success: outcome.success,
          syncRunId: outcome.syncRunId,
          persistedNextSyncAt: nextState.next_sync_at ?? null,
          health: nextState.health_status ?? null,
        });
      })
    );
  }

  // Atualiza health p/ conectores vistos (mesmo os não-due) — visibilidade operacional.
  const healthByKey = new Map<string, string>();
  for (const c of connectors) {
    healthByKey.set(c.connectorKey, classifyHealth(c.syncState ?? {}, now));
  }

  return NextResponse.json({ data: results, health: Object.fromEntries(healthByKey) });
}
