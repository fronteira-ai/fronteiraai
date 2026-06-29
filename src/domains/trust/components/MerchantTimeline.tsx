import type { MerchantTimelineRecord } from "../types/trust.types";
import { TimelineEventCategory } from "../types/enums";
import { ShieldCheck, Star, Award, User, Zap } from "lucide-react";

const CATEGORY_ICONS: Record<TimelineEventCategory, React.FC<{ className?: string }>> = {
  [TimelineEventCategory.Verification]: ShieldCheck,
  [TimelineEventCategory.Review]: Star,
  [TimelineEventCategory.Badge]: Award,
  [TimelineEventCategory.Profile]: User,
  [TimelineEventCategory.Operational]: Zap,
};

const CATEGORY_COLORS: Record<TimelineEventCategory, string> = {
  [TimelineEventCategory.Verification]: "bg-cyan-500/20 text-cyan-400 border-cyan-500/40",
  [TimelineEventCategory.Review]: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
  [TimelineEventCategory.Badge]: "bg-violet-500/20 text-violet-400 border-violet-500/40",
  [TimelineEventCategory.Profile]: "bg-slate-500/20 text-slate-400 border-slate-500/40",
  [TimelineEventCategory.Operational]: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
};

interface TimelineEventProps {
  event: MerchantTimelineRecord;
  isLast: boolean;
}

function TimelineEvent({ event, isLast }: TimelineEventProps) {
  const IconComponent = CATEGORY_ICONS[event.category as TimelineEventCategory] ?? Zap;
  const colors = CATEGORY_COLORS[event.category as TimelineEventCategory] ?? CATEGORY_COLORS[TimelineEventCategory.Profile];
  const date = new Date(event.occurred_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0 ${colors}`}>
          <IconComponent className="w-4 h-4" aria-hidden="true" />
        </div>
        {!isLast && <div className="w-px flex-1 bg-slate-700 mt-1" aria-hidden="true" />}
      </div>
      <div className={`pb-4 ${isLast ? "pb-0" : ""} min-w-0`}>
        <p className="text-sm font-medium text-white leading-tight">{event.title}</p>
        {event.description && (
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{event.description}</p>
        )}
        <time className="text-xs text-slate-500 mt-1 block" dateTime={event.occurred_at}>{date}</time>
      </div>
    </div>
  );
}

export function TimelineEmptyState() {
  return (
    <p className="text-sm text-slate-500 italic py-4" role="status">
      Nenhum evento no histórico ainda.
    </p>
  );
}

export function TimelineSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando histórico...">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-700 animate-pulse flex-shrink-0" />
          <div className="space-y-2 flex-1 py-1">
            <div className="h-3 bg-slate-700 rounded animate-pulse w-3/4" />
            <div className="h-2.5 bg-slate-800 rounded animate-pulse w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface Props {
  events: MerchantTimelineRecord[];
  loading?: boolean;
}

export function MerchantTimeline({ events, loading = false }: Props) {
  if (loading) return <TimelineSkeleton />;
  if (events.length === 0) return <TimelineEmptyState />;

  return (
    <div role="list" aria-label="Histórico do lojista">
      {events.map((event, idx) => (
        <div key={event.id} role="listitem">
          <TimelineEvent event={event} isLast={idx === events.length - 1} />
        </div>
      ))}
    </div>
  );
}
