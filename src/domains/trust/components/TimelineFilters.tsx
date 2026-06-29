"use client";

import { TimelineEventCategory } from "../types/enums";

const CATEGORIES: Array<{ value: TimelineEventCategory | "all"; label: string }> = [
  { value: "all", label: "Todos" },
  { value: TimelineEventCategory.Verification, label: "Verificações" },
  { value: TimelineEventCategory.Review, label: "Avaliações" },
  { value: TimelineEventCategory.Badge, label: "Badges" },
  { value: TimelineEventCategory.Profile, label: "Perfil" },
  { value: TimelineEventCategory.Operational, label: "Operação" },
];

interface Props {
  active: TimelineEventCategory | "all";
  onChange: (value: TimelineEventCategory | "all") => void;
}

export function TimelineFilters({ active, onChange }: Props) {
  return (
    <nav role="navigation" aria-label="Filtros do histórico">
      <ul className="flex flex-wrap gap-2">
        {CATEGORIES.map(({ value, label }) => (
          <li key={value}>
            <button
              type="button"
              onClick={() => onChange(value)}
              aria-pressed={active === value}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                active === value
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                  : "bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600"
              }`}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
