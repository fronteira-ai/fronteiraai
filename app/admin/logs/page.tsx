"use client";
import { useState, useEffect } from "react";
import { AdminDataTable, type Column } from "@/components/admin/ui/AdminDataTable";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import type { ImportLog } from "@/types/admin";

export default function LogsPage() {
  const [data, setData] = useState<ImportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    fetch(`/api/admin/logs?page=${page}&perPage=20`)
      .then((r) => r.json() as Promise<{ data: ImportLog[]; totalPages: number }>)
      .then((json) => { setData(json.data ?? []); setTotalPages(json.totalPages ?? 1); setLoading(false); })
      .catch(() => setLoading(false));
  }, [page, reloadKey]);

  const cols: Column<ImportLog>[] = [
    { key: "connector_id", header: "Connector", render: (r) => <span className="font-mono text-xs">{r.connector_id}</span> },
    { key: "batch_id", header: "Batch", render: (r) => <span className="font-mono text-xs text-slate-500">{r.batch_id.slice(0, 12)}…</span> },
    { key: "dry_run", header: "Modo", render: (r) => (
      <span className={`px-2 py-0.5 text-xs rounded-full ${r.dry_run ? "bg-slate-700 text-slate-400" : "bg-indigo-500/10 text-indigo-400"}`}>
        {r.dry_run ? "Dry-run" : "Execução"}
      </span>
    )},
    { key: "total_persisted", header: "Persistidos", render: (r) => String(r.total_persisted) },
    { key: "total_errors", header: "Erros", render: (r) => (
      <span className={r.total_errors > 0 ? "text-red-400 font-medium" : "text-slate-500"}>{r.total_errors}</span>
    )},
    { key: "success", header: "Status", render: (r) => r.success
      ? <CheckCircle2 className="w-4 h-4 text-green-400" />
      : <XCircle className="w-4 h-4 text-red-400" />
    },
    { key: "created_at", header: "Data", render: (r) => (
      <span className="text-xs text-slate-500">{new Date(r.created_at).toLocaleString("pt-BR")}</span>
    )},
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Log de Importações</h1>
          <p className="text-slate-400 text-sm mt-0.5">Histórico de execuções do pipeline</p>
        </div>
        <AdminButton variant="secondary" icon={<RefreshCw className="w-4 h-4" />} loading={loading}
          onClick={() => { setLoading(true); setReloadKey((k) => k + 1); }}>
          Atualizar
        </AdminButton>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <AdminDataTable columns={cols} data={data} keyField="id" loading={loading}
          emptyMessage="Nenhuma importação registrada ainda."
          page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
