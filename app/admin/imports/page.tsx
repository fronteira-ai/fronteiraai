"use client";
import { useState, useEffect } from "react";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminFormField, AdminSelect } from "@/components/admin/ui/AdminFormField";
import { useToast } from "@/contexts/admin/ToastContext";
import { Play, AlertCircle, CheckCircle2, Globe, FileJson, FileText } from "lucide-react";
import type { PipelineResult } from "@/acquisition/types/pipeline";

interface ConnectorInfo {
  id: string;
  name: string;
  version: string;
  type: string;
  storeSlug: string;
  description: string | null;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  "crawler": <Globe className="w-3.5 h-3.5" />,
  "api-rest": <Globe className="w-3.5 h-3.5" />,
  "json-file": <FileJson className="w-3.5 h-3.5" />,
  "csv-file": <FileText className="w-3.5 h-3.5" />,
};

const PRODUCTION_TYPES = new Set(["crawler", "api-rest", "erp"]);

export default function ImportsPage() {
  const { toast } = useToast();
  const [connectors, setConnectors] = useState<ConnectorInfo[]>([]);
  const [connectorId, setConnectorId] = useState("shoppingchina");
  const [dryRun, setDryRun] = useState(true);
  const [skipMedia, setSkipMedia] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PipelineResult | null>(null);

  useEffect(() => {
    fetch("/api/admin/import/connectors")
      .then((r) => r.json() as Promise<{ data: ConnectorInfo[] }>)
      .then((json) => {
        setConnectors(json.data ?? []);
        // Default to first production connector if available
        const prod = json.data?.find((c) => PRODUCTION_TYPES.has(c.type));
        if (prod) setConnectorId(prod.id);
      })
      .catch(() => {});
  }, []);

  const connectorOptions = connectors.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const selectedConnector = connectors.find((c) => c.id === connectorId);
  const isProduction = selectedConnector ? PRODUCTION_TYPES.has(selectedConnector.type) : false;

  async function handleRun() {
    setRunning(true);
    setResult(null);
    const res = await fetch("/api/admin/import/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectorId, dryRun, skipMedia }),
    });
    const json = await res.json() as { data?: PipelineResult; error?: string };
    setRunning(false);
    if (res.ok && json.data) {
      setResult(json.data);
      const count = json.data.persisted.filter((p) => p.action === "created" || p.action === "updated").length;
      toast.success(`Pipeline concluído — ${count} registros${dryRun ? " (dry-run)" : ""}`);
    } else {
      toast.error(json.error ?? "Erro ao executar pipeline");
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Centro de Importações</h1>
        <p className="text-slate-400 text-sm mt-0.5">Execute o pipeline de aquisição de dados</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
        <AdminFormField label="Connector">
          <AdminSelect value={connectorId} onChange={(e) => setConnectorId(e.target.value)} options={connectorOptions} />
        </AdminFormField>

        {selectedConnector && (
          <div className="flex items-center gap-2 text-xs">
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${isProduction ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-slate-700 text-slate-400 border border-slate-600"}`}>
              {TYPE_ICON[selectedConnector.type] ?? null}
              {isProduction ? "Produção" : "Referência"}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">{selectedConnector.description ?? selectedConnector.type}</span>
            <span className="text-slate-600 ml-auto">v{selectedConnector.version}</span>
          </div>
        )}

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} className="w-4 h-4 accent-indigo-600" />
            Dry-run (simular, sem gravar)
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" checked={skipMedia} onChange={(e) => setSkipMedia(e.target.checked)} className="w-4 h-4 accent-indigo-600" />
            Pular processamento de mídia
          </label>
        </div>

        {!dryRun && (
          <div className="flex items-start gap-2 text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            Modo de execução real — os dados serão gravados no banco de dados.
          </div>
        )}

        {isProduction && !dryRun && (
          <div className="flex items-start gap-2 text-sm text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
            <Globe className="w-4 h-4 mt-0.5 shrink-0" />
            Conector ao vivo — o site será acessado em tempo real. Pode demorar alguns minutos.
          </div>
        )}

        <AdminButton
          icon={<Play className="w-4 h-4" />}
          onClick={handleRun}
          loading={running}
          variant={dryRun ? "secondary" : "primary"}
        >
          {running ? "Executando..." : dryRun ? "Simular Pipeline" : "Executar Pipeline"}
        </AdminButton>
      </div>

      {result && (
        <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            {result.success
              ? <CheckCircle2 className="w-5 h-5 text-green-400" />
              : <AlertCircle className="w-5 h-5 text-red-400" />}
            <h2 className="text-sm font-semibold text-white">
              Resultado {result.dryRun ? "(Dry-run)" : "(Executado)"}
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: "Validados", value: result.metrics.totals.validated },
              { label: "Persistidos", value: result.persisted.filter((p) => p.action === "created" || p.action === "updated").length },
              { label: "Erros", value: result.errors.length },
            ].map((s) => (
              <div key={s.label} className="bg-slate-800 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white">{String(s.value)}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {result.errors.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-slate-400 mb-2">Erros:</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-400 font-mono bg-red-500/5 px-2 py-1 rounded">
                    {typeof err === "string" ? err : JSON.stringify(err)}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
