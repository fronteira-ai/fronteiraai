import type { MerchantReviewRecord } from "../types/trust.types";
import { Star, CheckCircle2, MessageSquare } from "lucide-react";

interface Props {
  review: MerchantReviewRecord;
  showMerchantReply?: boolean;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} de 5 estrelas`} role="img">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= rating ? "fill-yellow-400 text-yellow-400" : "text-slate-600"}`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function ReviewCard({ review, showMerchantReply = true }: Props) {
  const date = new Date(review.created_at).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <article
      className="p-4 rounded-xl border border-slate-700/50 bg-slate-800/30 space-y-3"
      aria-label={`Avaliação de ${date}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <Stars rating={review.rating} />
          {review.title && (
            <h3 className="text-sm font-semibold text-white leading-tight">{review.title}</h3>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <time className="text-xs text-slate-500" dateTime={review.created_at}>{date}</time>
          {review.is_verified_purchase && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
              Compra verificada
            </span>
          )}
        </div>
      </header>

      <p className="text-sm text-slate-300 leading-relaxed">{review.body}</p>

      {review.helpful_count > 0 && (
        <p className="text-xs text-slate-500">
          {review.helpful_count} {review.helpful_count === 1 ? "pessoa achou útil" : "pessoas acharam útil"}
        </p>
      )}

      {showMerchantReply && review.merchant_reply && (
        <div className="mt-3 pl-3 border-l-2 border-slate-600">
          <div className="flex items-center gap-1.5 mb-1">
            <MessageSquare className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span className="text-xs font-medium text-slate-400">Resposta do lojista</span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">{review.merchant_reply}</p>
        </div>
      )}
    </article>
  );
}
