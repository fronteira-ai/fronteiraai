import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import {
  SupabaseMerchantReviewRepository,
  SupabaseReviewReportRepository,
  SupabaseReviewAuditRepository,
} from "@/src/domains/trust/infrastructure";
import { ReviewModerationClient } from "@/components/admin/trust/ReviewModerationClient";
import { Star, ArrowLeft, AlertTriangle } from "lucide-react";
import type { Metadata } from "next";
import type { ReviewStatus } from "@/src/domains/trust/types/enums";

type Params = Promise<{ id: string }>;

export const metadata: Metadata = { title: "Moderar Review | Admin ParaguAI" };

export default async function AdminReviewDetailPage({ params }: { params: Params }) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) redirect("/admin/login");

  const { id } = await params;
  const client = getSupabaseServiceClient();
  const reviewRepo = new SupabaseMerchantReviewRepository(client);
  const reportRepo = new SupabaseReviewReportRepository(client);
  const auditRepo = new SupabaseReviewAuditRepository(client);

  const [review, reports, history] = await Promise.all([
    reviewRepo.findById(id),
    reportRepo.findByReviewId(id),
    auditRepo.findByReviewId(id),
  ]);

  if (!review) notFound();

  const statusLabels: Record<ReviewStatus, string> = {
    pending: "Pendente",
    approved: "Aprovado",
    hidden: "Oculto",
    removed: "Removido",
  } as Record<ReviewStatus, string>;

  const statusColors: Record<string, string> = {
    pending: "text-yellow-400 bg-yellow-500/10",
    approved: "text-emerald-400 bg-emerald-500/10",
    hidden: "text-slate-400 bg-slate-500/10",
    removed: "text-red-400 bg-red-500/10",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/trust/reviews"
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          aria-label="Voltar para moderação"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Reviews
        </Link>
        <span className="text-slate-600" aria-hidden="true">/</span>
        <span className="text-sm text-slate-300">Review #{id.slice(0, 8)}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Review content */}
        <div className="lg:col-span-2 space-y-4">
          <section className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-slate-600"}`}
                    aria-hidden="true"
                  />
                ))}
                <span className="text-sm text-slate-400 ml-1" aria-label={`${review.rating} estrelas`}>{review.rating}/5</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[review.status] ?? ""}`}>
                {statusLabels[review.status as ReviewStatus] ?? review.status}
              </span>
            </div>

            {review.title && (
              <h2 className="text-base font-semibold text-white mb-2">{review.title}</h2>
            )}
            <p className="text-sm text-slate-300 leading-relaxed">{review.body}</p>

            <dl className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-2 gap-3 text-xs text-slate-400">
              <div>
                <dt className="font-medium text-slate-500">Criado em</dt>
                <dd>{new Date(review.created_at).toLocaleString("pt-BR")}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Edições</dt>
                <dd>{review.edit_count}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Útil</dt>
                <dd>{review.helpful_count} votos</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Denúncias</dt>
                <dd className={review.report_count > 0 ? "text-red-400" : ""}>{review.report_count}</dd>
              </div>
            </dl>
          </section>

          {/* Reports */}
          {reports.length > 0 && (
            <section aria-labelledby="reports-heading">
              <h2 id="reports-heading" className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" aria-hidden="true" />
                Denúncias ({reports.length})
              </h2>
              <div className="space-y-2">
                {reports.map((report) => (
                  <div key={report.id} className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-red-300 font-medium capitalize">{report.reason.replace("_", " ")}</span>
                      <span className="text-xs text-slate-500">{new Date(report.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                    {report.description && <p className="text-slate-400 mt-1 text-xs">{report.description}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <ReviewModerationClient
            reviewId={review.id}
            status={review.status as ReviewStatus}
          />

          {/* Audit history */}
          <section aria-labelledby="history-heading">
            <h3 id="history-heading" className="text-sm font-semibold text-white mb-3">Histórico de moderação</h3>
            {history.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Nenhuma ação registrada.</p>
            ) : (
              <ol className="space-y-2" aria-label="Ações de moderação">
                {history.map((entry) => (
                  <li key={entry.id} className="text-xs p-2.5 rounded-lg bg-slate-800/30 border border-slate-700/50">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-300 capitalize">{entry.action.replace("_", " ")}</span>
                      <time className="text-slate-500" dateTime={entry.created_at}>
                        {new Date(entry.created_at).toLocaleDateString("pt-BR")}
                      </time>
                    </div>
                    {entry.reason && <p className="text-slate-500 mt-0.5">{entry.reason}</p>}
                    {entry.performed_by_role && (
                      <p className="text-slate-600 mt-0.5">Por: {entry.performed_by_role}</p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
