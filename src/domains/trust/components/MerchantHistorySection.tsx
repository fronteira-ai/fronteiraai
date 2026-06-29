import type { MerchantTimelineRecord } from "../types/trust.types";
import { MerchantTimeline, TimelineEmptyState } from "./MerchantTimeline";

interface Props {
  timeline: MerchantTimelineRecord[];
}

export function MerchantHistorySection({ timeline }: Props) {
  return (
    <section aria-labelledby="history-section-heading" className="space-y-4">
      <div>
        <h2 id="history-section-heading" className="text-lg font-semibold text-white mb-1">
          Histórico
        </h2>
        <p className="text-sm text-slate-400">
          Eventos públicos registrados desde a entrada do lojista na plataforma.
        </p>
      </div>

      {timeline.length > 0 ? (
        <MerchantTimeline events={timeline} />
      ) : (
        <TimelineEmptyState />
      )}
    </section>
  );
}
