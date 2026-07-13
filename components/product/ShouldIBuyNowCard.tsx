import type { PurchaseTimingResult, PurchaseTimingVerdict } from "@/src/domains/buyer-intelligence";

type Props = {
  timing: PurchaseTimingResult | null;
};

const VERDICT_CONFIG: Record<PurchaseTimingVerdict, { emoji: string; title: string; border: string; bg: string; text: string }> = {
  buy_now: { emoji: "🟢", title: "Comprar agora", border: "border-emerald-500/30", bg: "bg-emerald-500/5", text: "text-emerald-300" },
  can_wait: { emoji: "🟡", title: "Pode esperar", border: "border-amber-500/30", bg: "bg-amber-500/5", text: "text-amber-300" },
  better_wait: { emoji: "🔴", title: "Melhor aguardar", border: "border-red-500/30", bg: "bg-red-500/5", text: "text-red-300" },
  insufficient_data: { emoji: "⚪", title: "Não há dados suficientes", border: "border-slate-700", bg: "bg-slate-900/60", text: "text-slate-400" },
};

// Release 2.0 — Wave 3 (Experience Iteration 3 — Should I Buy Now). Every
// reason rendered here is PurchaseTimingComposer's own output — this
// component formats, it never decides. See
// docs/product/PURCHASE_TIMING_DECISION.md for the full signal inventory
// and every documented threshold behind each possible reason.
export default function ShouldIBuyNowCard({ timing }: Props) {
  if (!timing) return null;

  const config = VERDICT_CONFIG[timing.verdict];
  const isInsufficient = timing.verdict === "insufficient_data";

  return (
    <div className={`rounded-3xl border ${config.border} ${config.bg} p-6`}>
      <div className="flex items-center gap-2">
        <span className="text-2xl" aria-hidden>{config.emoji}</span>
        <h3 className={`text-lg font-bold ${config.text}`}>{config.title}</h3>
      </div>

      {!isInsufficient ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {timing.verdict === "buy_now"
              ? "Por que recomendamos comprar agora:"
              : timing.verdict === "better_wait"
                ? "Por que recomendamos esperar:"
                : "O que observamos:"}
          </p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm text-slate-300">
            {timing.reasons.map((reason, i) => (
              <li key={`${reason.factor}-${i}`} className="flex items-start gap-2">
                <span className="text-slate-500">•</span>
                <span>
                  <span className="font-medium text-white">{reason.label}</span> — {reason.evidence}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-400">
          Ainda não temos histórico de preço suficiente para este produto para recomendar esperar ou comprar agora — mostramos o preço atual, sem inventar uma tendência.
        </p>
      )}
    </div>
  );
}
