"use client";
import { useState, useEffect } from "react";
import { MerchantSidebar } from "@/components/merchant/layout/MerchantSidebar";
import { Play, AlertCircle, CheckCircle2, Globe } from "lucide-react";
import type { PipelineResult } from "@/src/domains/connectors/types/pipeline.types";
import { useToast } from "@/contexts/admin/ToastContext";

interface ConnectorInfo { id: string; name: string; type: string; description: string | null }

const PRODUCTION_TYPES = new Set(["crawler", "api-rest"]);

export default function MerchantNewImportPage() {
  const { toast } = useToast();
  const [connectors, setConnectors] = useState<ConnectorInfo[]>([]);
  const [connectorId, setConnectorId] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [skipMedia, setSkipMedia] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PipelineResult | null>(null);

  useEffect(() => {
    fetch("/api/admin/import/connectors")
      .then((r) => r.json() as Promise<{ data: ConnectorInfo[] }>)
      .then((json) => {
        const list = json.data ?? [];
        setConnectors(list);
        const prod = list.find((c) => PRODUCTION_TYPES.has(c.type));
        if (prod) setConnectorId(prod.id);
        else if (list[0]) setConnectorId(list[0].id);
      }).catch(() => {});
  }, []);

  async function handleRun() {
    if (!connectorId) return;
    setRunning(true);
    setResult(null);
    const res = await fetch("/api/merchant/imports/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectorId, dryRun, skipMedia }),
    });
    const json = await res.json() as { data?: PipelineResult; error?: string };
    setRunning(false);
    if (res.ok && json.data) {
      setResult(json.data);
      const count = json.data.persisted.filter((p) => p.action === "created" || p.action === "updated").length;
      toast.success(`Importação concluída — ${count} produtos${dryRun ? " (simulado)" : ""}`);
    } else {
      toast.error(json.error ?? "Erro ao executar importação");
    }
  }

  const selected = connectors.find((c) => c.id === connectorId);

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <MerchantSidebar />
      <main className="flex-1 p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold text-white mb-1">Nova Importação</h1>
          <p className="text-slate-400 text-sm mb-6">Execute o pipeline de aquisição de dados</p>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
            {/* Connector selector */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Fonte de dados</label>
              <select value={connectorId} onChange={(e) => setConnectorId(e.target.value)} className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500">
                {connectors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {PRODUCTION_TYPES.has(c.type) ? "(Produção)" : "(Referência)"}
                  </option>
                ))}
              </select>
              {selected && (
                <p className="text-xs text-slate-500 mt-1.5">{selected.description}</p>
              )}
            </div>

            {/* Options */}
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} className="w-4 h-4 accent-emerald-600" />
                Simular (sem gravar)
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input type="checkbox" checked={skipMedia} onChange={(e) => setSkipMedia(e.target.checked)} className="w-4 h-4 accent-emerald-600" />
                Pular mídia
              </label>
            </div>

            {!dryRun && (
              <div className="flex items-start gap-2 text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                Modo real — os dados serão gravados no banco.
              </div>
            )}

            {selected && PRODUCTION_TYPES.has(selected.type) && (
              <div className="flex items-start gap-2 text-sm text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                <Globe className="w-4 h-4 mt-0.5 shrink-0" />
                Conector ao vivo — acessa o site em tempo real. Pode levar alguns minutos.
              </div>
            )}

            <button onClick={handleRun} disabled={running || !connectorId} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors">
              <Play className="w-4 h-4" />
              {running ? "Executando..." : dryRun ? "Simular Importação" : "Importar Agora"}
            </button>
          </div>

          {result && (
            <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                {result.success ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
                <h2 className="text-sm font-semibold text-white">Resultado {result.dryRun ? "(Simulação)" : "(Executado)"}</h2>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Validados", value: result.metrics.totals.validated },
                  { label: "Importados", value: result.persisted.filter((p) => p.action === "created" || p.action === "updated").length },
                  { label: "Erros", value: result.errors.length },
                ].map((s) => (
                  <div key={s.label} className="bg-slate-800 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-white">{s.value}</p>
                    <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
