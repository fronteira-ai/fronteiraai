import { redirect, notFound } from "next/navigation";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { SupabaseVerificationRepository } from "@/src/domains/trust/infrastructure/SupabaseVerificationRepository";
import { SupabaseTrustEventRepository } from "@/src/domains/trust/infrastructure/SupabaseTrustEventRepository";
import { SupabaseVerificationHistoryRepository } from "@/src/domains/trust/infrastructure/SupabaseVerificationHistoryRepository";
import { SupabaseVerificationEvidenceRepository } from "@/src/domains/trust/infrastructure/SupabaseVerificationEvidenceRepository";
import { VerificationService } from "@/src/domains/trust/services/VerificationService";
import VerificationActionsClient from "@/components/admin/trust/VerificationActionsClient";

export const metadata = { title: "Verificação — Admin | ParaguAI" };

type Props = { params: Promise<{ id: string }> };

const ACTION_LABEL: Record<string, string> = {
  created: "Criada",
  submitted: "Submetida",
  approved: "Aprovada",
  rejected: "Rejeitada",
  revoked: "Revogada",
  expired: "Expirada",
  evidence_added: "Evidência adicionada",
  evidence_removed: "Evidência removida",
  metadata_updated: "Metadados atualizados",
};

export default async function AdminVerificationDetailPage({ params }: Props) {
  const { id } = await params;

  const auth = await requireAdmin();
  if (isAuthError(auth)) redirect("/admin/login");

  const verificationRepo = new SupabaseVerificationRepository(auth.serviceClient);
  const eventRepo = new SupabaseTrustEventRepository(auth.serviceClient);
  const historyRepo = new SupabaseVerificationHistoryRepository(auth.serviceClient);
  const evidenceRepo = new SupabaseVerificationEvidenceRepository(auth.serviceClient);
  const service = new VerificationService(verificationRepo, eventRepo);

  const result = await service.getVerificationResult(id, evidenceRepo, historyRepo);
  if (!result) notFound();

  const { verification, evidence, history } = result;

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Verificação</h1>
          <p className="text-slate-400 text-sm font-mono mt-0.5">{verification.id}</p>
        </div>
        <VerificationActionsClient
          verificationId={verification.id}
          merchantId={verification.merchant_id}
          status={verification.status}
        />
      </div>

      <section className="rounded-lg border border-slate-700 bg-slate-800/40 p-4 space-y-2">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Dados</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <dt className="text-slate-400">Merchant</dt>
          <dd className="text-white font-mono text-xs">{verification.merchant_id}</dd>
          <dt className="text-slate-400">Tipo</dt>
          <dd className="text-white capitalize">{verification.verification_type.replace(/_/g, " ")}</dd>
          <dt className="text-slate-400">Status</dt>
          <dd className="text-white capitalize">{verification.status}</dd>
          <dt className="text-slate-400">Submetida em</dt>
          <dd className="text-white">{new Date(verification.submitted_at).toLocaleString("pt-BR")}</dd>
          {verification.reviewed_at && (
            <>
              <dt className="text-slate-400">Revisada em</dt>
              <dd className="text-white">{new Date(verification.reviewed_at).toLocaleString("pt-BR")}</dd>
            </>
          )}
          {verification.rejection_reason && (
            <>
              <dt className="text-slate-400">Motivo</dt>
              <dd className="text-red-300">{verification.rejection_reason}</dd>
            </>
          )}
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Evidências ({evidence.filter(e => !e.deleted_at).length})
        </h2>
        {evidence.filter(e => !e.deleted_at).length === 0 ? (
          <p className="text-slate-500 text-sm">Nenhuma evidência anexada.</p>
        ) : (
          <ul className="space-y-2">
            {evidence.filter(e => !e.deleted_at).map((ev) => (
              <li key={ev.id} className="rounded border border-slate-700 bg-slate-800/30 p-3 text-sm">
                <p className="text-white font-medium">{ev.label}</p>
                <p className="text-slate-400 text-xs mt-0.5 capitalize">{ev.evidence_type}</p>
                {ev.content && <p className="text-slate-300 text-xs mt-1 break-all">{ev.content}</p>}
                {ev.is_valid !== null && (
                  <p className={`text-xs mt-1 ${ev.is_valid ? "text-green-400" : "text-red-400"}`}>
                    {ev.is_valid ? "Validada" : "Inválida"}{ev.review_note ? ` — ${ev.review_note}` : ""}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Histórico ({history.length})
        </h2>
        {history.length === 0 ? (
          <p className="text-slate-500 text-sm">Sem histórico de ações.</p>
        ) : (
          <ol className="relative border-l border-slate-700 space-y-4 pl-5">
            {[...history].reverse().map((h) => (
              <li key={h.id} className="relative">
                <span className="absolute -left-[1.35rem] top-1 h-2 w-2 rounded-full bg-cyan-500/60 ring-2 ring-slate-900" />
                <p className="text-sm text-white">{ACTION_LABEL[h.action] ?? h.action}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(h.created_at).toLocaleString("pt-BR")}
                  {h.performed_by_role && ` · ${h.performed_by_role}`}
                </p>
                {h.reason && <p className="text-xs text-slate-300 mt-0.5 italic">{h.reason}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
