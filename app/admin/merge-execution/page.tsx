"use client";
import { useCallback, useEffect, useState } from "react";
import { GitMerge, RefreshCw, CheckCircle2, XCircle, Undo2, ShieldCheck } from "lucide-react";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminDataTable, type Column } from "@/components/admin/ui/AdminDataTable";
import type { MergeCandidate } from "@/src/domains/canonical-catalog/domain/MergeCandidate";
import type { MergeExecution } from "@/src/domains/canonical-catalog/domain/MergeExecution";
import type { MergeQueueStats } from "@/src/domains/canonical-catalog/services/MergeQueueDashboardService";

// Program Ω — Mission Ω-1, Objetivo 4. The operational panel this Wave was
// asked to build: candidatos pendentes (com classificação de confiança),
// merges executados, merges rejeitados, rollback, taxa de sucesso — 5
// concerns, one page, same internal-tab pattern already established by
// app/admin/marketplace-operations/page.tsx.

type Tab = "auditoria" | "aprovados" | "executados" | "rejeitados" | "rollback";

const TABS: { id: Tab; label: string }[] = [
  { id: "auditoria", label: "Auditoria (Pendentes)" },
  { id: "aprovados", label: "Aprovados" },
  { id: "executados", label: "Executados" },
  { id: "rejeitados", label: "Rejeitados" },
  { id: "rollback", label: "Rollback" },
];

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
      <p className="text-slate-500 text-xs">{label}</p>
      <p className="text-white text-xl font-semibold">{value}</p>
    </div>
  );
}

interface AuditResponse {
  total: number;
  counts: { alta: number; media: number; revisaoManual: number };
  alta: MergeCandidate[];
  media: MergeCandidate[];
  revisaoManual: MergeCandidate[];
}

async function postJSON(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json;
}

function candidateColumns(
  onApprove: (id: string) => void,
  onReject: (id: string) => void,
  busyId: string | null
): Column<MergeCandidate>[] {
  return [
    { key: "id", header: "ID", render: (c) => <span className="font-mono text-xs">{c.id.slice(0, 8)}</span> },
    { key: "confidence", header: "Confiança", render: (c) => `${c.confidence.toFixed(1)}%` },
    { key: "reason", header: "Motivo", className: "max-w-md truncate" },
    { key: "createdAt", header: "Criado em", render: (c) => new Date(c.createdAt).toLocaleDateString("pt-BR") },
    {
      key: "actions",
      header: "Ações",
      render: (c) => (
        <div className="flex gap-2">
          <AdminButton size="sm" variant="secondary" loading={busyId === c.id} onClick={() => onApprove(c.id)} icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
            Aprovar
          </AdminButton>
          <AdminButton size="sm" variant="ghost" loading={busyId === c.id} onClick={() => onReject(c.id)} icon={<XCircle className="w-3.5 h-3.5" />}>
            Rejeitar
          </AdminButton>
        </div>
      ),
    },
  ];
}

export default function MergeExecutionPage() {
  const [stats, setStats] = useState<MergeQueueStats | null>(null);
  const [audit, setAudit] = useState<AuditResponse | null>(null);
  const [approved, setApproved] = useState<MergeCandidate[]>([]);
  const [executed, setExecuted] = useState<MergeExecution[]>([]);
  const [rejected, setRejected] = useState<MergeCandidate[]>([]);
  const [rolledBack, setRolledBack] = useState<MergeExecution[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("auditoria");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Same shape as app/admin/marketplace-operations/page.tsx: `loading` never
  // gets set(true) synchronously from inside the effect — it starts true via
  // useState, and refresh() (a plain event handler, never an effect) is the
  // only place that sets it back to true before bumping refreshKey.
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch("/api/admin/canonical-catalog/merge-execution/stats").then((r) => r.json()),
      fetch("/api/admin/canonical-catalog/merge-execution/audit").then((r) => r.json()),
      fetch("/api/admin/canonical-catalog/merge-execution/queue?status=approved&limit=50").then((r) => r.json()),
      fetch("/api/admin/canonical-catalog/merge-execution/executions?status=executed&limit=50").then((r) => r.json()),
      fetch("/api/admin/canonical-catalog/merge-execution/queue?status=rejected&limit=50").then((r) => r.json()),
      fetch("/api/admin/canonical-catalog/merge-execution/executions?status=rolled_back&limit=50").then((r) => r.json()),
    ])
      .then(([statsRes, auditRes, approvedRes, executedRes, rejectedRes, rolledBackRes]) => {
        if (cancelled) return;
        setStats(statsRes);
        setAudit(auditRes);
        setApproved(approvedRes.data ?? []);
        setExecuted(executedRes.data ?? []);
        setRejected(rejectedRes.data ?? []);
        setRolledBack(rolledBackRes.data ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const refresh = useCallback(() => {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  }, []);

  async function handleApprove(id: string) {
    setBusyId(id);
    try {
      await postJSON(`/api/admin/canonical-catalog/merge-execution/${id}/approve`);
      setMessage("Candidato aprovado.");
      refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha ao aprovar.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    setBusyId(id);
    try {
      await postJSON(`/api/admin/canonical-catalog/merge-execution/${id}/reject`);
      setMessage("Candidato rejeitado.");
      refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha ao rejeitar.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleExecute(id: string, dryRun: boolean) {
    setBusyId(id);
    try {
      const result = await postJSON(`/api/admin/canonical-catalog/merge-execution/${id}/execute${dryRun ? "?dryRun=true" : ""}`);
      setMessage(
        dryRun
          ? `Dry-run: ${result.preview.offerIdsToMove.length} oferta(s) seriam movidas.`
          : `Merge executado: ${result.offersMoved} oferta(s) movida(s).`
      );
      if (!dryRun) refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha ao executar.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRollback(executionId: string) {
    setBusyId(executionId);
    try {
      await postJSON(`/api/admin/canonical-catalog/merge-execution/executions/${executionId}/rollback`);
      setMessage("Merge revertido.");
      refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha ao reverter.");
    } finally {
      setBusyId(null);
    }
  }

  const executionColumns: Column<MergeExecution>[] = [
    { key: "id", header: "Execução", render: (e) => <span className="font-mono text-xs">{e.id.slice(0, 8)}</span> },
    { key: "movedOfferIds", header: "Ofertas movidas", render: (e) => e.movedOfferIds.length },
    { key: "executedAt", header: "Executado em", render: (e) => new Date(e.executedAt).toLocaleString("pt-BR") },
    { key: "executedBy", header: "Por" },
    ...(activeTab === "executados"
      ? [
          {
            key: "actions",
            header: "Ações",
            render: (e: MergeExecution) => (
              <AdminButton size="sm" variant="danger" loading={busyId === e.id} onClick={() => handleRollback(e.id)} icon={<Undo2 className="w-3.5 h-3.5" />}>
                Reverter
              </AdminButton>
            ),
          },
        ]
      : [{ key: "rolledBackAt", header: "Revertido em", render: (e: MergeExecution) => (e.rolledBackAt ? new Date(e.rolledBackAt).toLocaleString("pt-BR") : "—") }]),
  ];

  const rejectedColumns: Column<MergeCandidate>[] = [
    { key: "id", header: "ID", render: (c) => <span className="font-mono text-xs">{c.id.slice(0, 8)}</span> },
    { key: "confidence", header: "Confiança", render: (c) => `${c.confidence.toFixed(1)}%` },
    { key: "reason", header: "Motivo", className: "max-w-md truncate" },
    { key: "reviewedBy", header: "Revisado por" },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <GitMerge className="w-5 h-5" /> Merge Execution Engine
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Fila de {audit?.total ?? "—"} candidatos de união — Shadow Mode: nenhuma execução acontece sem aprovação humana explícita.
          </p>
        </div>
        <AdminButton variant="secondary" icon={<RefreshCw className="w-4 h-4" />} loading={loading} onClick={refresh}>
          Atualizar
        </AdminButton>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm text-indigo-300 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-indigo-400 hover:text-indigo-200">
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatTile label="Pendentes" value={stats?.pending ?? "—"} />
        <StatTile label="Aprovados" value={stats?.approved ?? "—"} />
        <StatTile label="Merged" value={stats?.merged ?? "—"} />
        <StatTile label="Rejeitados" value={stats?.rejected ?? "—"} />
        <StatTile label="Rollback" value={stats?.rolledBack ?? "—"} />
        <StatTile label="Ofertas movidas (ativas)" value={stats?.totalOffersMoved ?? "—"} />
        <StatTile
          label="Taxa de sucesso"
          value={stats?.successRate === null || stats?.successRate === undefined ? "N/A" : `${(stats.successRate * 100).toFixed(0)}%`}
        />
      </div>

      <div className="mb-6 flex gap-1 rounded-xl border border-slate-700/50 bg-slate-900/50 p-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
              activeTab === id ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "auditoria" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Alta ≥95% · Média 85–94% · Revisão manual 70–84% — mesmos limiares do
            Product Identity Engine (product-identity/types/enums.ts), reclassificados, nunca recalculados.
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">Alta confiança ({audit?.counts.alta ?? 0})</h3>
            <AdminDataTable columns={candidateColumns(handleApprove, handleReject, busyId)} data={audit?.alta ?? []} keyField="id" loading={loading} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">Média confiança ({audit?.counts.media ?? 0})</h3>
            <AdminDataTable columns={candidateColumns(handleApprove, handleReject, busyId)} data={audit?.media ?? []} keyField="id" loading={loading} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">Revisão manual ({audit?.counts.revisaoManual ?? 0})</h3>
            <AdminDataTable columns={candidateColumns(handleApprove, handleReject, busyId)} data={audit?.revisaoManual ?? []} keyField="id" loading={loading} />
          </div>
        </div>
      )}

      {activeTab === "aprovados" && (
        <div>
          <p className="text-xs text-slate-500 mb-3">
            Aprovado ≠ executado. Um merge só move ofertas quando &ldquo;Executar&rdquo; é clicado — o preview é sempre um dry-run, escreve nada.
          </p>
          <AdminDataTable
            columns={[
              { key: "id", header: "ID", render: (c) => <span className="font-mono text-xs">{c.id.slice(0, 8)}</span> },
              { key: "confidence", header: "Confiança", render: (c) => `${c.confidence.toFixed(1)}%` },
              { key: "reason", header: "Motivo", className: "max-w-md truncate" },
              {
                key: "actions",
                header: "Ações",
                render: (c: MergeCandidate) => (
                  <div className="flex gap-2">
                    <AdminButton size="sm" variant="ghost" loading={busyId === c.id} onClick={() => handleExecute(c.id, true)}>
                      Preview (dry-run)
                    </AdminButton>
                    <AdminButton size="sm" variant="primary" loading={busyId === c.id} onClick={() => handleExecute(c.id, false)}>
                      Executar
                    </AdminButton>
                  </div>
                ),
              },
            ]}
            data={approved}
            keyField="id"
            loading={loading}
            emptyMessage="Nenhum candidato aprovado aguardando execução."
          />
        </div>
      )}

      {activeTab === "executados" && (
        <AdminDataTable columns={executionColumns} data={executed} keyField="id" loading={loading} emptyMessage="Nenhum merge executado ainda." />
      )}

      {activeTab === "rejeitados" && (
        <AdminDataTable columns={rejectedColumns} data={rejected} keyField="id" loading={loading} emptyMessage="Nenhum candidato rejeitado." />
      )}

      {activeTab === "rollback" && (
        <AdminDataTable columns={executionColumns} data={rolledBack} keyField="id" loading={loading} emptyMessage="Nenhum rollback realizado." />
      )}
    </div>
  );
}
