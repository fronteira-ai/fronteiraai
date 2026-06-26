"use client";
import { useState, useEffect } from "react";
import { AlertCircle, AlertTriangle, Info, RefreshCw } from "lucide-react";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import type { QualityReport, QualityIssue } from "@/types/admin";

const severityConfig = {
  error: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  warning: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
};

function IssueCard({ issue }: { issue: QualityIssue }) {
  const cfg = severityConfig[issue.severity];
  const Icon = cfg.icon;
  return (
    <div className={`border rounded-xl p-4 ${cfg.bg}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${cfg.color}`} />
        <h3 className="text-sm font-semibold text-white">{issue.label}</h3>
        <span className={`ml-auto text-lg font-bold ${cfg.color}`}>{issue.count}</span>
      </div>
      {issue.records.length > 0 && (
        <div className="mt-3 space-y-1">
          {issue.records.slice(0, 5).map((r, i) => (
            <p key={i} className="text-xs text-slate-400 font-mono">
              {r.name ? String(r.name) : r.id ? String(r.id) : JSON.stringify(r)}
            </p>
          ))}
          {issue.records.length > 5 && (
            <p className="text-xs text-slate-500">+{issue.records.length - 5} mais</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function QualityPage() {
  const [report, setReport] = useState<QualityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    fetch("/api/admin/quality/report")
      .then((r) => r.json() as Promise<{ data: QualityReport }>)
      .then((json) => { setReport(json.data ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [reloadKey]);

  const totalIssues = report?.issues.reduce((acc, i) => acc + (i.severity === "error" ? i.count : 0), 0) ?? 0;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Centro de Qualidade</h1>
          {report && <p className="text-slate-400 text-sm mt-0.5">Gerado em {new Date(report.generatedAt).toLocaleString("pt-BR")}</p>}
        </div>
        <AdminButton variant="secondary" icon={<RefreshCw className="w-4 h-4" />} loading={loading}
          onClick={() => { setLoading(true); setReloadKey((k) => k + 1); }}>
          Atualizar
        </AdminButton>
      </div>

      {totalIssues > 0 && (
        <div className="mb-5 flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {totalIssues} erro{totalIssues > 1 ? "s" : ""} crítico{totalIssues > 1 ? "s" : ""} encontrado{totalIssues > 1 ? "s" : ""} — requer atenção imediata.
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {report?.issues.map((issue) => (
            <IssueCard key={issue.type} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}
