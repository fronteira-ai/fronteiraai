import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { createMerchantOwnershipServices } from "@/lib/merchant-ownership-factory";
import { ClaimStatus } from "@/src/domains/merchant-ownership";

export const metadata = { title: "Claims — Admin | ParaguAI" };

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  awaiting_review: "Aguardando revisão",
  approved: "Aprovada",
  rejected: "Rejeitada",
  cancelled: "Cancelada",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-400 bg-yellow-400/10",
  awaiting_review: "text-orange-400 bg-orange-400/10",
  approved: "text-green-400 bg-green-400/10",
  rejected: "text-red-400 bg-red-400/10",
  cancelled: "text-slate-400 bg-slate-400/10",
};

export default async function AdminClaimsPage() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) redirect("/admin/login");

  const { claimRepo } = createMerchantOwnershipServices(auth.serviceClient);
  const { items: claims, total } = await claimRepo.findByStatus(ClaimStatus.AwaitingReview, { limit: 50, offset: 0 });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Central de Revisão de Claims</h1>
        <p className="text-slate-400 text-sm mt-1">
          {total} claim{total !== 1 ? "s" : ""} aguardando revisão
        </p>
      </div>

      {claims.length === 0 ? (
        <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-8 text-center">
          <p className="text-slate-400">Nenhuma claim aguardando revisão.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-slate-400">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Requerente</th>
                <th className="text-left px-4 py-3 font-medium">Cargo</th>
                <th className="text-left px-4 py-3 font-medium">Confiança automática</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Submetida em</th>
                <th className="text-left px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {claims.map((c) => (
                <tr key={c.id} className="bg-slate-900/30 hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 text-white">{c.claimantName}</td>
                  <td className="px-4 py-3 text-slate-300">{c.claimantRole}</td>
                  <td className="px-4 py-3 text-slate-300">{c.automatedConfidence}%</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[c.status] ?? "text-slate-400"}`}>
                      {STATUS_LABELS[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{new Date(c.createdAt).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/claims/${c.id}`} className="text-cyan-400 hover:text-cyan-300 text-xs font-medium">
                      Revisar →
                    </Link>
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
