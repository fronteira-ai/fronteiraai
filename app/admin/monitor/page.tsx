"use client";
import { useState, useEffect } from "react";
import { AdminDataTable, type Column } from "@/components/admin/ui/AdminDataTable";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { RefreshCw, CheckCircle2, XCircle, Activity, Clock } from "lucide-react";
import type { ConnectorHealthSummary } from "@/app/api/admin/monitor/summary/route";

interface SyncRunRow {
  id: string;
  connector_key: string;
  merchant_id: string | null;
  batch_id: string;
  dry_run: boolean;
  status: "running" | "success" | "partial" | "failed";
  totals: { persisted?: number } | null;
  errors: unknown[] | null;
  started_at: string;
  completed_at: string | null;
}

const statusConfig: Record<string, { color: string; bg: string }> = {
  success: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  partial: { color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  failed: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  running: { color: "text-slate-400", bg: "bg-slate-700/50 border-slate-700" },
};

function ConnectorCard({ summary }: { summary: ConnectorHealthSummary }) {
  const cfg = statusConfig[summary.lastStatus ?? "running"] ?? statusConfig.running;
  return (
    <div className={`border rounded-xl p-4 ${cfg.bg}`}>
      <div className="flex items-center gap-2 mb-2">
        <Activity className={`w-4 h-4 ${cfg.color}`} />
        <h3 className="text-sm font-semibold text-white">{summary.name}</h3>
        <span className="ml-auto text-xs text-slate-500 font-mono">{summary.storeSlug}</span>
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {summary.lastSyncAt ? new Date(summary.lastSyncAt).toLocaleString("pt-BR") : "Nunca sincronizado"}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className={cfg.color}>{summary.lastStatus ?? "—"}</span>
        <span className={summary.errorRate > 0 ? "text-red-400" : "text-slate-500"}>
          Taxa de erro: {(summary.errorRate * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

export default function EcosystemMonitorPage() {
  const [summary, setSummary] = useState<ConnectorHealthSummary[]>([]);
  const [runs, setRuns] = useState<SyncRunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/monitor/summary").then((r) => r.json() as Promise<{ data: ConnectorHealthSummary[] }>),
      fetch(`/api/admin/monitor/runs?page=${page}&perPage=20`).then(
        (r) => r.json() as Promise<{ data: SyncRunRow[]; totalPages: number }>
      ),
    ])
      .then(([summaryJson, runsJson]) => {
        setSummary(summaryJson.data ?? []);
        setRuns(runsJson.data ?? []);
        setTotalPages(runsJson.totalPages ?? 1);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, reloadKey]);

  const cols: Column<SyncRunRow>[] = [
    { key: "connector_key", header: "Connector", render: (r) => <span className="font-mono text-xs">{r.connector_key}</span> },
    { key: "merchant_id", header: "Merchant", render: (r) => (
      <span className="font-mono text-xs text-slate-500">{r.merchant_id ? r.merchant_id.slice(0, 8) + "…" : "—"}</span>
    )},
    { key: "dry_run", header: "Modo", render: (r) => (
      <span className={`px-2 py-0.5 text-xs rounded-full ${r.dry_run ? "bg-slate-700 text-slate-400" : "bg-indigo-500/10 text-indigo-400"}`}>
        {r.dry_run ? "Dry-run" : "Execução"}
      </span>
    )},
    { key: "totals", header: "Persistidos", render: (r) => String(r.totals?.persisted ?? 0) },
    { key: "errors", header: "Erros", render: (r) => (
      <span className={(r.errors?.length ?? 0) > 0 ? "text-red-400 font-medium" : "text-slate-500"}>{r.errors?.length ?? 0}</span>
    )},
    { key: "status", header: "Status", render: (r) => r.status === "success"
      ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
      : r.status === "running"
        ? <Clock className="w-4 h-4 text-slate-400" />
        : <XCircle className="w-4 h-4 text-red-400" />
    },
    { key: "started_at", header: "Data", render: (r) => (
      <span className="text-xs text-slate-500">{new Date(r.completed_at ?? r.started_at).toLocaleString("pt-BR")}</span>
    )},
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Monitor do Ecossistema</h1>
          <p className="text-slate-400 text-sm mt-0.5">Saúde dos conectores e histórico de sincronizações</p>
        </div>
        <AdminButton variant="secondary" icon={<RefreshCw className="w-4 h-4" />} loading={loading}
          onClick={() => { setLoading(true); setReloadKey((k) => k + 1); }}>
          Atualizar
        </AdminButton>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {summary.map((s) => (
            <ConnectorCard key={s.connectorKey} summary={s} />
          ))}
          {summary.length === 0 && (
            <p className="text-slate-500 text-sm col-span-2">Nenhum conector registrado ainda.</p>
          )}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <AdminDataTable columns={cols} data={runs} keyField="id" loading={loading}
          emptyMessage="Nenhuma sincronização registrada ainda."
          page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
