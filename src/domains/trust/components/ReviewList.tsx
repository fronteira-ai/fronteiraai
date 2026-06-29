import type { MerchantReviewRecord, ReviewStats } from "../types/trust.types";
import { ReviewCard } from "./ReviewCard";
import { Star } from "lucide-react";

interface Props {
  reviews: MerchantReviewRecord[];
  stats?: ReviewStats;
  emptyMessage?: string;
}

export function ReviewList({ reviews, stats, emptyMessage = "Nenhuma avaliação ainda." }: Props) {
  return (
    <section aria-labelledby="reviews-heading">
      <div className="flex items-baseline gap-3 mb-4">
        <h2 id="reviews-heading" className="text-lg font-semibold text-white">Avaliações</h2>
        {stats && stats.approvedCount > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-slate-400">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" aria-hidden="true" />
            <span aria-label={`Nota média ${stats.average} de 5, baseada em ${stats.approvedCount} avaliações`}>
              <span className="text-yellow-400 font-medium">{stats.average}</span>
              <span className="ml-1">({stats.approvedCount} {stats.approvedCount === 1 ? "avaliação" : "avaliações"})</span>
            </span>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="text-sm text-slate-500 italic py-4" role="status">{emptyMessage}</p>
      ) : (
        <div className="space-y-3" role="list" aria-label="Lista de avaliações">
          {reviews.map((review) => (
            <div key={review.id} role="listitem">
              <ReviewCard review={review} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
