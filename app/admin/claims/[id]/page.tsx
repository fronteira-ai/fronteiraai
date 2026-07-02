import { redirect, notFound } from "next/navigation";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { createMerchantOwnershipServices } from "@/lib/merchant-ownership-factory";
import { SupabaseVerificationEvidenceRepository } from "@/src/domains/trust/infrastructure/SupabaseVerificationEvidenceRepository";
import { SupabaseVerificationHistoryRepository } from "@/src/domains/trust/infrastructure/SupabaseVerificationHistoryRepository";
import { SupabaseTrustSignalRepository } from "@/src/domains/trust/infrastructure/SupabaseTrustSignalRepository";
import { SupabaseSignalProvenanceRepository } from "@/src/domains/trust/infrastructure/SupabaseSignalProvenanceRepository";
import { TrustSignalService } from "@/src/domains/trust/services/TrustSignalService";
import ClaimActionsClient from "@/components/admin/claims/ClaimActionsClient";

export const metadata = { title: "Claim — Admin | ParaguAI" };

type Props = { params: Promise<{ id: string }> };

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  awaiting_review: "Aguardando revisão",
  approved: "Aprovada",
  rejected: "Rejeitada",
  cancelled: "Cancelada",
};

export default async function AdminClaimDetailPage({ params }: Props) {
  const { id } = await params;

  const auth = await requireAdmin();
  if (isAuthError(auth)) redirect("/admin/login");

  const { claimRepo, verificationService, eventService } = createMerchantOwnershipServices(auth.serviceClient);

  const claim = await claimRepo.findById(id);
  if (!claim) notFound();

  const verificationResult = claim.verificationId
    ? await verificationService.getVerificationResult(
        claim.verificationId,
        new SupabaseVerificationEvidenceRepository(auth.serviceClient),
        new SupabaseVerificationHistoryRepository(auth.serviceClient)
      )
    : null;

  const brainEvents = await eventService.getMerchantEvents(claim.merchantId, 20);

  const { data: merchant } = await auth.serviceClient.from("merchants").select("user_id, company_name").eq("id", claim.merchantId).maybeSingle();
  const trustSignalService = new TrustSignalService(
    new SupabaseTrustSignalRepository(auth.serviceClient),
    new SupabaseSignalProvenanceRepository(auth.serviceClient)
  );
  const trustSignals = merchant?.user_id ? await trustSignalService.getActiveSignals(merchant.user_id as string) : [];

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Claim de {claim.claimantName}</h1>
          <p className="text-slate-400 text-sm font-mono mt-0.5">{claim.id}</p>
        </div>
        <ClaimActionsClient claimId={claim.id} status={claim.status} />
      </div>

      <section className="rounded-lg border border-slate-700 bg-slate-800/40 p-4 space-y-2">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Dados</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <dt className="text-slate-400">Loja (merchant)</dt>
          <dd className="text-white">{merchant?.company_name ?? "—"}</dd>
          <dt className="text-slate-400">Requerente</dt>
          <dd className="text-white">{claim.claimantName} ({claim.claimantRole})</dd>
          <dt className="text-slate-400">Contato</dt>
          <dd className="text-white">{claim.claimantEmail} · {claim.claimantPhone}</dd>
          <dt className="text-slate-400">Status</dt>
          <dd className="text-white">{STATUS_LABELS[claim.status] ?? claim.status}</dd>
          <dt className="text-slate-400">Confiança automática</dt>
          <dd className="text-white">{claim.automatedConfidence}%</dd>
          <dt className="text-slate-400">Submetida em</dt>
          <dd className="text-white">{new Date(claim.createdAt).toLocaleString("pt-BR")}</dd>
          {claim.adminNote && (
            <>
              <dt className="text-slate-400">Nota do admin</dt>
              <dd className="text-yellow-300">{claim.adminNote}</dd>
            </>
          )}
          {claim.rejectionReason && (
            <>
              <dt className="text-slate-400">Motivo</dt>
              <dd className="text-red-300">{claim.rejectionReason}</dd>
            </>
          )}
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Progressive Verification — {claim.signalBreakdown.length} sinal(is)
        </h2>
        <ul className="space-y-2">
          {claim.signalBreakdown.map((signal) => (
            <li key={signal.signal} className="rounded border border-slate-700 bg-slate-800/30 p-3 text-sm flex items-start justify-between gap-4">
              <div>
                <p className="text-white font-medium capitalize">{signal.signal.replace(/_/g, " ")}</p>
                <p className="text-slate-400 text-xs mt-0.5">{signal.evidence}</p>
              </div>
              <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded ${signal.matched ? "text-green-400 bg-green-400/10" : "text-slate-400 bg-slate-400/10"}`}>
                {signal.matched ? `+${signal.weight}` : "0"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {verificationResult && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Histórico de verificação ({verificationResult.history.length})
          </h2>
          <ol className="relative border-l border-slate-700 space-y-4 pl-5">
            {[...verificationResult.history].reverse().map((h) => (
              <li key={h.id} className="relative">
                <span className="absolute -left-[1.35rem] top-1 h-2 w-2 rounded-full bg-cyan-500/60 ring-2 ring-slate-900" />
                <p className="text-sm text-white capitalize">{h.action.replace(/_/g, " ")}</p>
                <p className="text-xs text-slate-400 mt-0.5">{new Date(h.created_at).toLocaleString("pt-BR")}</p>
                {h.reason && <p className="text-xs text-slate-300 mt-0.5 italic">{h.reason}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Eventos do Brain ({brainEvents.length})</h2>
        {brainEvents.length === 0 ? (
          <p className="text-slate-500 text-sm">Nenhum evento registrado ainda.</p>
        ) : (
          <ul className="space-y-1">
            {brainEvents.map((e) => (
              <li key={e.id} className="text-sm text-slate-300 flex items-center justify-between">
                <span className="capitalize">{e.event_type.replace(/_/g, " ")}</span>
                <span className="text-xs text-slate-500">{new Date(e.created_at).toLocaleString("pt-BR")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Trust Signals ativos ({trustSignals.length})</h2>
        {trustSignals.length === 0 ? (
          <p className="text-slate-500 text-sm">Nenhum trust signal ativo para este merchant ainda.</p>
        ) : (
          <ul className="space-y-1">
            {trustSignals.map((s) => (
              <li key={s.id} className="text-sm text-slate-300">{s.title}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
