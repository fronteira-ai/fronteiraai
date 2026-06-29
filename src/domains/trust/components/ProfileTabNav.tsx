import Link from "next/link";
import type { PassportSection } from "../types/enums";

const TABS: Array<{ id: PassportSection; label: string }> = [
  { id: "overview" as PassportSection, label: "Visão Geral" },
  { id: "trust" as PassportSection, label: "Trust" },
  { id: "timeline" as PassportSection, label: "Histórico" },
  { id: "reviews" as PassportSection, label: "Avaliações" },
  { id: "info" as PassportSection, label: "Informações" },
];

interface Props {
  activeTab: string;
  merchantId: string;
}

export function ProfileTabNav({ activeTab, merchantId }: Props) {
  return (
    <nav aria-label="Seções do perfil" className="border-b border-slate-700/50">
      <div className="flex gap-1 overflow-x-auto scrollbar-none -mb-px">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={`/lojistas/${merchantId}?tab=${tab.id}`}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? "border-cyan-400 text-cyan-400"
                  : "border-transparent text-slate-400 hover:text-white hover:border-slate-500"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
