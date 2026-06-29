import { redirect } from "next/navigation";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { SupabaseVerificationRepository } from "@/src/domains/trust/infrastructure/SupabaseVerificationRepository";
import { SupabaseTrustEventRepository } from "@/src/domains/trust/infrastructure/SupabaseTrustEventRepository";
import { VerificationService } from "@/src/domains/trust/services/VerificationService";
import VerificationActionsClient from "@/components/admin/trust/VerificationActionsClient";

export const metadata = { title: "Verificações — Admin | ParaguAI" };

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  rejected: "Rejeitada",
  expired: "Expirada",
  revoked: "Revogada",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-400 bg-yellow-400/10",
  approved: "text-green-400 bg-green-400/10",
  rejected: "text-red-400 bg-red-400/10",
  expired: "text-slate-400 bg-slate-400/10",
  revoked: "text-orange-400 bg-orange-400/10",
};

export default async function AdminVerificationsPage() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) redirect("/admin/login");

  const verificationRepo = new SupabaseVerificationRepository(auth.serviceClient);
  const eventRepo = new SupabaseTrustEventRepository(auth.serviceClient);
  const service = new VerificationService(verificationRepo, eventRepo);

  const pending = await service.getPendingVerifications();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Verificações de Merchants</h1>
        <p className="text-slate-400 text-sm mt-1">
          {pending.length} verificação{pending.length !== 1 ? "ões" : ""} pendente{pending.length !== 1 ? "s" : ""}
        </p>
      </div>

      {pending.length === 0 ? (
        <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-8 text-center">
          <p className="text-slate-400">Nenhuma verificação pendente.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-slate-400">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Merchant ID</th>
                <th className="text-left px-4 py-3 font-medium">Tipo</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Submetida em</th>
                <th className="text-left px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {pending.map((v) => (
                <tr key={v.id} className="bg-slate-900/30 hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 text-slate-300 font-mono text-xs">{v.merchant_id.slice(0, 8)}…</td>
                  <td className="px-4 py-3 text-white capitalize">{v.verification_type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[v.status] ?? "text-slate-400"}`}>
                      {STATUS_LABELS[v.status] ?? v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(v.submitted_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    <VerificationActionsClient
                      verificationId={v.id}
                      merchantId={v.merchant_id}
                      status={v.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
