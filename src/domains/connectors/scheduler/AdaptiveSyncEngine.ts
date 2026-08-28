// Adaptive Sync Engine — Sprint "Realtime Commerce Sync V1".
//
// Pure de scheduling/freshness para o motor de sync autônomo. Sem I/O aqui:
// tudo determinístico e testável. Decide, por connector:
//   - PRÓXIMO sync (next_sync_at) por TIER + backoff exponencial + jitter;
//   - SE deve rodar agora (due);
//   - STATUS de saúde (HEALTHY/DEGRADED/STALE/FAILING/DISABLED);
//   - estado pós-sync (next_sync_at, consecutive_failures, freshness).
//
// Frequência prefere `sync_state.sync_frequency_min` (novo) e cai para
// `config.syncFrequencyHours*60` (retrocompat). EWOLVE o sistema atual —
// sem Redis/Kafka/BullMQ, reusa PostgreSQL (connectors.sync_state) + Vercel cron.

export type SyncTier = "HOT" | "WARM" | "COLD" | "FULL";
export type HealthStatus = "HEALTHY" | "DEGRADED" | "STALE" | "FAILING" | "DISABLED";

export interface ConnectorSyncState {
  /** next run (ISO). null = yet to schedule. */
  next_sync_at?: string | null;
  /** Cadência em MINUTOS deste store (tem prioridade sobre config.hours). */
  sync_frequency_min?: number | null;
  tier?: SyncTier | null;
  consecutive_failures?: number;
  last_sync_at?: string | null;
  last_success_at?: string | null;
  last_failure_at?: string | null;
  last_price_change_at?: string | null;
  last_stock_change_at?: string | null;
  health_status?: HealthStatus | null;
  /** base de backoff em minutos (dobra a cada falha até o teto). */
  backoff_minute?: number;
}

/** Tier defaults (custos realistas; NÃO copiado cegamente — ajustável). */
export const TIER_DEFAULTS_MIN: Record<SyncTier, number> = {
  HOT: 30,
  WARM: 120,
  COLD: 360,
  FULL: 1440, // 24h full sweep
};

export const BACKOFF_BASE_MIN = 15; // 15 → 30 → 60 → ... → teto
export const BACKOFF_CAP_MIN = 240; // 4h
export const STALE_THRESHOLD_FRACTION = 2; // > 2× a cadência sem sucesso → STALE
export const FAILING_THRESHOLD = 3; // ≥3 falhas consecutivas → FAILING

interface FrequencyInput {
  tier?: SyncTier | null;
  sync_frequency_min?: number | null;
  /** legacy config.syncFrequencyHours */
  configSyncFrequencyHours?: number;
}

export function effectiveFrequencyMin(input: FrequencyInput): number {
  if (input.sync_frequency_min && input.sync_frequency_min > 0) return input.sync_frequency_min;
  if (input.tier && TIER_DEFAULTS_MIN[input.tier]) return TIER_DEFAULTS_MIN[input.tier];
  if (input.configSyncFrequencyHours && input.configSyncFrequencyHours > 0) {
    return input.configSyncFrequencyHours * 60;
  }
  return TIER_DEFAULTS_MIN.COLD;
}

/** Jitter controlado (±20% de um minuto, só para espalhar o disparo). */
export function withJitterMin(minutes: number, seed = 0x9e3779b9): number {
  const pseudo = (Math.sin(seed) * 10000) % 1; // determinístico p/ teste
  const frac = 0.2 * pseudo; // ±20% de 1 minuto, não da cadência inteira
  return Math.max(0.2, minutes + frac);
}

/** Backoff exponencial em minutos (dobra até teto). */
export function backoffMinute(consecutiveFailures: number): number {
  if (consecutiveFailures <= 0) return 0;
  const steps = Math.min(consecutiveFailures - 1, 6);
  return Math.min(BACKOFF_BASE_MIN * Math.pow(2, steps), BACKOFF_CAP_MIN);
}

export interface NextSyncInput {
  state?: ConnectorSyncState | null;
  now: Date;
  configSyncFrequencyHours?: number;
  /** retry agenda: usa backoff em vez de cadência normal para falhas. */
  justFailed?: boolean;
}

/** Calcula next_sync_at — cadência (tier/config) + backoff se houve falha, com jitter. */
export function computeNextSyncAt(input: NextSyncInput): string {
  const state = input.state ?? {};
  const freq = effectiveFrequencyMin({
    tier: state.tier ?? null,
    sync_frequency_min: state.sync_frequency_min ?? null,
    configSyncFrequencyHours: input.configSyncFrequencyHours,
  });
  const failures = state.consecutive_failures ?? 0;
  const delay = input.justFailed || failures > 0
    ? Math.max(freq, backoffMinute(failures))
    : freq;
  const jittered = (input.justFailed || failures > 0) ? withJitterMin(delay, 7) : delay;
  return new Date(input.now.getTime() + jittered * 60_000).toISOString();
}

export interface DueInput {
  state?: ConnectorSyncState | null;
  now: Date;
  enabled?: boolean;
  configSyncFrequencyHours?: number;
}

export function isDue(input: DueInput): boolean {
  const enabled = input.enabled ?? true;
  if (!enabled) return false;
  const next = input.state?.next_sync_at;
  if (!next) {
    // never scheduled → due now (first run)
    return true;
  }
  return new Date(next).getTime() <= input.now.getTime();
}

export function classifyHealth(state: ConnectorSyncState | null | undefined, now: Date): HealthStatus {
  if (state?.health_status === "DISABLED") return "DISABLED";
  const failures = state?.consecutive_failures ?? 0;
  if (failures >= FAILING_THRESHOLD) return "FAILING";
  const lastSuccess = state?.last_success_at;
  if (lastSuccess) {
    const ageH = (now.getTime() - new Date(lastSuccess).getTime()) / 3_600_000;
    const freqH = (effectiveFrequencyMin({ tier: state.tier, sync_frequency_min: state.sync_frequency_min }) / 60);
    const maxAge = Math.max(freqH * STALE_THRESHOLD_FRACTION, 24);
    if (ageH > maxAge) return "STALE";
    if (failures > 0) return "DEGRADED";
    return "HEALTHY";
  }
  return failures > 0 ? "FAILING" : "STALE";
}

export type SyncOutcome = "success" | "partial" | "failed";

export interface OnSyncOutcomeInput {
  state?: ConnectorSyncState | null;
  outcome: SyncOutcome;
  now: Date;
  configSyncFrequencyHours?: number;
  /** observed changed prices/stocks this run (freshness timestamps). */
  priceChanged?: boolean;
  stockChanged?: boolean;
}

/** Aplica o resultado de um sync ao estado (next_sync_at, failures, freshness, health). */
export function onSyncOutcome(input: OnSyncOutcomeInput): ConnectorSyncState {
  const prev = input.state ?? {};
  const consecutiveFailures = input.outcome === "failed" ? (prev.consecutive_failures ?? 0) + 1 : 0;

  const next: ConnectorSyncState = {
    ...prev,
    consecutive_failures: consecutiveFailures,
    last_sync_at: input.now.toISOString(),
    ...(input.outcome !== "failed" ? { last_success_at: input.now.toISOString() } : { last_failure_at: input.now.toISOString() }),
    ...(input.priceChanged ? { last_price_change_at: input.now.toISOString() } : {}),
    ...(input.stockChanged ? { last_stock_change_at: input.now.toISOString() } : {}),
  };
  next.next_sync_at = computeNextSyncAt({
    state: next,
    now: input.now,
    configSyncFrequencyHours: input.configSyncFrequencyHours,
    justFailed: input.outcome === "failed" || input.outcome === "partial",
  });
  next.health_status = classifyHealth(next, input.now);
  if (input.outcome === "failed") next.backoff_minute = backoffMinute(consecutiveFailures);
  else next.backoff_minute = 0;
  return next;
}
