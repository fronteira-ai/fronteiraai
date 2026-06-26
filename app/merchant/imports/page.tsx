"use client";
import { useState, useEffect } from "react";
import { MerchantSidebar } from "@/components/merchant/layout/MerchantSidebar";
import { Plus, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import type { ImportLog } from "@/types/admin";

export default function MerchantImportsPage() {
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/merchant/imports/history")
      .then((r) => r.json() as Promise<{ data: ImportLog[] }>)
      .then((json) => { setLogs(json.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <MerchantSidebar />
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-white">Importações</h1>
              <p className="text-slate-400 text-sm mt-0.5">Histórico de sincronizações</p>
            </div>
            <Link href="/merchant/imports/new" className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors">
              <Plus className="w-4 h-4" />
              Nova Importação
            </Link>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Carregando...</div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-slate-500 text-sm">Nenhuma importação realizada ainda.</p>
                <Link href="/merchant/imports/new" className="mt-3 inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm">
                  <Plus className="w-4 h-4" /> Fazer primeira importação
                </Link>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-500">
                    <th className="text-left px-4 py-3">Conector</th>
                    <th className="text-left px-4 py-3">Data</th>
                    <th className="text-right px-4 py-3">Importados</th>
                    <th className="text-right px-4 py-3">Erros</th>
                    <th className="text-center px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="px-4 py-3 text-slate-300 font-mono text-xs">{log.connector_id}</td>
                      <td className="px-4 py-3 text-slate-400">{new Date(log.created_at).toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-3 text-right text-white font-medium">{log.total_persisted}</td>
                      <td className="px-4 py-3 text-right text-slate-400">{log.total_errors}</td>
                      <td className="px-4 py-3 text-center">
                        {log.success
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                          : <XCircle className="w-4 h-4 text-red-400 mx-auto" />}
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
