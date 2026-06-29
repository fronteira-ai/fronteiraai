import { ShieldCheck } from "lucide-react";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { SupabaseTrustRepository } from "@/src/domains/trust/infrastructure/SupabaseTrustRepository";
import { SupabaseTrustEventRepository } from "@/src/domains/trust/infrastructure/SupabaseTrustEventRepository";
import { TrustService } from "@/src/domains/trust/services/TrustService";
import { getTrustStatusLabel, getBadgeLabel, formatTrustDate } from "@/src/domains/trust/utils/trust.utils";
import { TrustStatus, TrustBadge } from "@/src/domains/trust/types/enums";

export const metadata = { title: "Trust — Admin | ParaguAI" };

const STATUS_BG: Record<TrustStatus, string> = {
  [TrustStatus.Unverified]: "bg-slate-800 text-slate-300",
  [TrustStatus.Pending]:    "bg-yellow-900/40 text-yellow-300",
  [TrustStatus.Verified]:   "bg-green-900/40 text-green-300",
  [TrustStatus.Suspended]:  "bg-red-900/40 text-red-300",
  [TrustStatus.Rejected]:   "bg-red-950/60 text-red-400",
};

export default async function AdminTrustPage() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) redirect("/admin/login");

  const trustRepo = new SupabaseTrustRepository(auth.serviceClient);
  const eventRepo = new SupabaseTrustEventRepository(auth.serviceClient);
  const trustService = new TrustService(trustRepo, eventRepo);

  const { data: records, total } = await trustService.listAll({ page: 1, perPage: 50 });

  const counts = {
    total,
    verified: records.filter((r) => r.status === TrustStatus.Verified).length,
    pending: records.filter((r) => r.status === TrustStatus.Pending).length,
    suspended: records.filter((r) => r.status === TrustStatus.Suspended).length,
    unverified: records.filter((r) => r.status === TrustStatus.Unverified).length,
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <ShieldCheck className="w-6 h-6 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">Trust & Reputation</h1>
        </div>
        <p className="text-slate-400 text-sm">
          Infraestrutura de confiança — Release 1.5.1
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: "Total",       value: counts.total,       color: "text-white" },
          { label: "Verificados", value: counts.verified,    color: "text-green-400" },
          { label: "Em análise",  value: counts.pending,     color: "text-yellow-400" },
          { label: "Suspensos",   value: counts.suspended,   color: "text-red-400" },
          { label: "Sem verificar", value: counts.unverified, color: "text-slate-400" },
        ].map((card) => (
          <div key={card.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Records table */}
      {records.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Nenhum registro de trust.</p>
          <p className="text-slate-500 text-xs mt-1">
            Registros são criados ao inicializar o Trust para cada merchant.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Merchants</h2>
            <span className="text-xs text-slate-500">{total} registros</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-5 py-3 text-xs text-slate-500 uppercase tracking-wide">Merchant ID</th>
                  <th className="text-left px-5 py-3 text-xs text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 text-xs text-slate-500 uppercase tracking-wide">Badge</th>
                  <th className="text-left px-5 py-3 text-xs text-slate-500 uppercase tracking-wide">Score</th>
                  <th className="text-left px-5 py-3 text-xs text-slate-500 uppercase tracking-wide">Verificado em</th>
                  <th className="text-left px-5 py-3 text-xs text-slate-500 uppercase tracking-wide">Atualizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-slate-400">
                      {r.merchant_id.slice(0, 8)}…
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_BG[r.status as TrustStatus] ?? "bg-slate-800 text-slate-300"}`}>
                        {getTrustStatusLabel(r.status as TrustStatus)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-300 text-xs">
                      {getBadgeLabel(r.badge_level as TrustBadge)}
                    </td>
                    <td className="px-5 py-3 text-slate-300">
                      {r.trust_score}
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs">
                      {formatTrustDate(r.last_verified_at)}
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs">
                      {formatTrustDate(r.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-indigo-950/30 border border-indigo-900/40 rounded-xl">
        <p className="text-xs text-indigo-300 font-medium mb-1">Sprint 1.5.1 — Infraestrutura</p>
        <p className="text-xs text-indigo-400/70">
          Badges e mudanças de status serão gerenciados via API (POST /api/trust/merchant/[id]/badges).
          A interface de gerenciamento completa será implementada na Sprint 1.5.5.
        </p>
      </div>
    </div>
  );
}
