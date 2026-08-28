/**
 * Merchant Import — import session + immutable preview (deterministic plan).
 *
 * Uma sessão de import carrega ESTADO (UPLOADED → VALIDATED → PREVIEW_READY →
 * APPROVED → COMMITTING → COMMITTED/PARTIAL/FAILED/CANCELLED) e um PREVIEW
 * IMUTÁVEL: checksum da fonte + snapshot de mapping + resumo. É isso que o
 * commit promete executar — mesmos inputs, mesma decisão (sem recomputar
 * diferente entre preview e commit).
 */

export type ImportSourceType = "CSV" | "XML" | "JSON" | "FEED_URL";
export type ImportSourceMode = "ONE_TIME_UPLOAD" | "CONTINUOUS_FEED";

export type ImportStatus =
  | "UPLOADED"
  | "VALIDATED"
  | "PREVIEW_READY"
  | "APPROVED"
  | "COMMITTING"
  | "COMMITTED"
  | "PARTIAL"
  | "FAILED"
  | "CANCELLED";

/** Classificação determinística de CADA item no plano — preview e commit usam a MESMA. */
export type ImportItemDecision =
  | "MATCH_EXISTING_PRODUCT"
  | "CREATE_PRODUCT_CANDIDATE"
  | "UPDATE_EXISTING_OFFER"
  | "CREATE_NEW_OFFER"
  | "AMBIGUOUS"
  | "INVALID"
  | "PROHIBITED"
  | "UNCHANGED";

export interface ImportPlanItem {
  externalId: string;
  name: string;
  decision: ImportItemDecision;
  reason?: string;
  /** productId já resolvido (MATCH/UPDATE) — para commit não refazer matching. */
  productId?: string;
  offerId?: string;
}

export interface ImportPlanSummary {
  total: number;
  matchedExisting: number;
  createCandidates: number;
  updateExistingOffers: number;
  createNewOffers: number;
  ambiguous: number;
  invalid: number;
  prohibited: number;
  unchanged: number;
}

export interface ImportSessionSnapshot {
  id: string;
  source_checksum: string;
  mapping_snapshot: Record<string, unknown>;
  preview_summary: ImportPlanSummary;
}

export interface ImportPreviewRequest {
  content: string;
  sourceType: ImportSourceType;
  sourceMode: ImportSourceMode;
  mappingSnapshot: Record<string, unknown>;
}

/** Estado determinístico: mapa de transições válidas (minimal state machine). */
export const IMPORT_STATUS_TRANSITIONS: Record<ImportStatus, ImportStatus[]> = {
  UPLOADED: ["VALIDATED", "CANCELLED", "FAILED"],
  VALIDATED: ["PREVIEW_READY", "FAILED", "CANCELLED"],
  PREVIEW_READY: ["APPROVED", "CANCELLED", "FAILED"],
  APPROVED: ["COMMITTING", "CANCELLED", "FAILED"],
  COMMITTING: ["COMMITTED", "PARTIAL", "FAILED"],
  COMMITTED: [],
  PARTIAL: ["COMMITTING"], // resumir do checkpoint
  FAILED: ["COMMITTING", "CANCELLED"], // retry seguro (idempotente)
  CANCELLED: [],
};

export function canTransition(from: ImportStatus, to: ImportStatus): boolean {
  return (IMPORT_STATUS_TRANSITIONS[from] ?? []).includes(to);
}

/** ROLE gate (§8): aprovar/commitar exige permissão de gerenciar imports. */
export function canCommit(permissions: readonly string[]): boolean {
  return permissions.includes("manage_imports");
}

/** Checksum determinístico da fonte (imutabilidade do preview, §5). */
export function sourceChecksum(content: string): string {
  // FNV-1a 32-bit simples, determínísstico, sem depender de hash cripto cara no hot path.
  let h = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    h ^= content.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
