import type { ImportLog } from "@/types/admin";

// Maps a connector_sync_runs row (Release 1.7) into the legacy ImportLog
// shape import_logs used to produce — lets app/admin/logs/page.tsx and
// app/merchant/imports/page.tsx keep working unchanged after both readers
// were repointed off the now-superseded import_logs table (Wave 2).
export function toImportLogShape(row: Record<string, unknown>): ImportLog {
  const totals = (row.totals as Record<string, number> | null) ?? {};
  const errors = (row.errors as unknown[] | null) ?? null;

  return {
    id: row.id as string,
    connector_id: row.connector_key as string,
    batch_id: row.batch_id as string,
    dry_run: row.dry_run as boolean,
    success: row.status === "success",
    total_raw: totals.validated ?? 0,
    total_persisted: totals.persisted ?? 0,
    total_errors: errors?.length ?? 0,
    metrics: totals,
    errors,
    created_at: (row.completed_at as string | null) ?? (row.started_at as string),
  };
}
