import type { ParaguAIAdvisorResult } from "@/src/domains/buyer-intelligence";

type Props = {
  advisor: ParaguAIAdvisorResult | null;
};

// Release 2.0 — Fase 2 — Wave 5 (EI-5 — ParaguAI Advisor, Objetivo 5).
// Renders ParaguAIAdvisorComposer.compose(...).summary verbatim — always
// capped at 5 lines by the composer itself, this component never trims or
// reorders. Meant to be understood in under 10 seconds.
export default function RecommendationSummary({ advisor }: Props) {
  if (!advisor || advisor.summary.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <ul className="flex flex-col gap-1.5 text-sm text-slate-300">
        {advisor.summary.map((line, i) => (
          <li key={i} className="flex items-start gap-2">
            <span aria-hidden>{line.icon}</span>
            <span>
              <span className="font-medium text-white">{line.label}</span>: {line.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
