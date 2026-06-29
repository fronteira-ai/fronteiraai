import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { ReviewStatus } from "@/src/domains/trust/types/enums";
import { Clock, CheckCircle2, EyeOff, Trash2, AlertTriangle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Moderação de Reviews | Admin ParaguAI",
};

const STATUS_CONFIG = {
  [ReviewStatus.Pending]: { label: "Pendente", color: "text-yellow-400 bg-yellow-500/10", Icon: Clock },
  [ReviewStatus.Approved]: { label: "Aprovado", color: "text-emerald-400 bg-emerald-500/10", Icon: CheckCircle2 },
  [ReviewStatus.Hidden]: { label: "Oculto", color: "text-slate-400 bg-slate-500/10", Icon: EyeOff },
  [ReviewStatus.Removed]: { label: "Removido", color: "text-red-400 bg-red-500/10", Icon: Trash2 },
};

export default async function AdminTrustReviewsPage() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) redirect("/admin/login");

  const client = getSupabaseServiceClient();
  const { data: pendingReviews } = await client
    .from("merchant_reviews")
    .select("*")
    .eq("status", "pending")
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(50);

  const { data: recentModerated } = await client
    .from("merchant_reviews")
    .select("*")
    .in("status", ["approved", "hidden", "removed"])
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  const pendingCount = pendingReviews?.length ?? 0;

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Moderação de Reviews</h1>
          <p className="text-sm text-slate-400 mt-1">
            {pendingCount > 0
              ? `${pendingCount} review${pendingCount > 1 ? "s" : ""} aguardando moderação`
              : "Nenhum review pendente"}
          </p>
        </div>
      </header>

      {/* Pending queue */}
      <section aria-labelledby="pending-heading">
        <h2 id="pending-heading" className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-400" aria-hidden="true" />
          Fila de moderação
        </h2>
        {pendingCount === 0 ? (
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" aria-hidden="true" />
            <p className="text-slate-300 font-medium">Nenhum review pendente!</p>
            <p className="text-sm text-slate-500 mt-1">Todos os reviews foram moderados.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(pendingReviews ?? []).map((review) => (
              <Link
                key={review.id}
                href={`/admin/trust/reviews/${review.id}`}
                className="block rounded-xl border border-yellow-500/20 bg-slate-800/50 p-4 hover:border-yellow-500/40 transition-colors"
                aria-label={`Moderar review ${review.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-yellow-400 text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-500/10">
                        Pendente
                      </span>
                      <span className="text-sm font-medium text-white">⭐ {review.rating}/5</span>
                    </div>
                    {review.title && (
                      <p className="text-sm font-medium text-white mb-1">{review.title as string}</p>
                    )}
                    <p className="text-sm text-slate-400 line-clamp-2">{review.body as string}</p>
                  </div>
                  <div className="text-xs text-slate-500 flex-shrink-0">
                    {new Date(review.created_at as string).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                {(review.report_count as number) > 0 && (
                  <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                    {review.report_count as number} denúncia{(review.report_count as number) > 1 ? "s" : ""}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recently moderated */}
      {(recentModerated ?? []).length > 0 && (
        <section aria-labelledby="moderated-heading">
          <h2 id="moderated-heading" className="text-base font-semibold text-white mb-4">Moderados recentemente</h2>
          <div className="space-y-2">
            {(recentModerated ?? []).map((review) => {
              const cfg = STATUS_CONFIG[review.status as ReviewStatus];
              const Icon = cfg.Icon ?? CheckCircle2;
              return (
                <Link
                  key={review.id}
                  href={`/admin/trust/reviews/${review.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-700/50 bg-slate-800/20 hover:border-slate-600 transition-colors text-sm"
                  aria-label={`Review ${review.id}, status: ${cfg.label}`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${cfg.color.split(" ")[0]}`} aria-hidden="true" />
                  <span className="text-slate-300 flex-1 truncate">{(review.body as string).substring(0, 80)}…</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.color}`}>{cfg.label}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
