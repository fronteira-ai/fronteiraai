"use client";
import { useState, useEffect } from "react";
import { MerchantSidebar } from "@/components/merchant/layout/MerchantSidebar";
import { FileText } from "lucide-react";
import type { MerchantAuditLog } from "@/types/merchant";

const EVENT_LABELS: Record<string, string> = {
  login: "Login", logout: "Logout", register: "Cadastro",
  import_run: "Importação (simulação)", import_complete: "Importação executada",
  import_failed: "Importação falhou",
  product_added: "Produto adicionado", product_updated: "Produto atualizado",
  price_changed: "Preço alterado", store_linked: "Loja vinculada",
  onboarding_step: "Passo do onboarding", onboarding_complete: "Onboarding concluído",
  settings_updated: "Configurações atualizadas",
};

export default function MerchantAuditPage() {
  const [logs, setLogs] = useState<MerchantAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/merchant/audit")
      .then((r) => r.json() as Promise<{ data: MerchantAuditLog[] }>)
      .then((json) => { setLogs(json.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <MerchantSidebar />
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-white">Auditoria</h1>
            <p className="text-slate-400 text-sm mt-0.5">Registro completo de ações na sua conta</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Carregando...</div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Nenhum evento registrado.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-500">
                    <th className="text-left px-4 py-3">Evento</th>
                    <th className="text-left px-4 py-3">Data</th>
                    <th className="text-left px-4 py-3">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                      <td className="px-4 py-3">
                        <span className="text-slate-200 font-medium text-xs">
                          {EVENT_LABELS[log.event_type] ?? log.event_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs font-mono truncate max-w-xs">
                        {log.payload ? JSON.stringify(log.payload) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
