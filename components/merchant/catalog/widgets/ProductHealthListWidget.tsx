"use client";

import { useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import type { ProductHealthRecord } from "@/src/domains/catalog-intelligence/types";
import { ProductHealthStatus } from "@/src/domains/catalog-intelligence/types/enums";

type FilterTab = "all" | ProductHealthStatus;

const STATUS_CONFIG = {
  [ProductHealthStatus.Ideal]: {
    label: "Ideal",
    icon: CheckCircle2,
    color: "text-emerald-400",
    badge: "bg-emerald-500/15 text-emerald-400",
  },
  [ProductHealthStatus.Attention]: {
    label: "Atenção",
    icon: AlertTriangle,
    color: "text-amber-400",
    badge: "bg-amber-500/15 text-amber-400",
  },
  [ProductHealthStatus.Critical]: {
    label: "Crítico",
    icon: AlertCircle,
    color: "text-red-400",
    badge: "bg-red-500/15 text-red-400",
  },
} as const;

function ProductCard({ record }: { record: ProductHealthRecord }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[record.status];
  const Icon = cfg.icon;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${cfg.color}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium text-white">{record.product_name}</p>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.badge}`}>
              {record.score}%
            </span>
          </div>

          {record.diagnoses.length > 0 && (
            <>
              {expanded && (
                <div className="mt-3 space-y-2">
                  {record.diagnoses.map((d) => (
                    <div key={d.type} className="flex items-start gap-2 text-xs">
                      <span
                        className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                          d.severity === "critical"
                            ? "bg-red-400"
                            : d.severity === "warning"
                              ? "bg-amber-400"
                              : "bg-slate-500"
                        }`}
                      />
                      <span>
                        <span className="font-medium text-slate-300">{d.label}</span>
                        <span className="ml-1 text-slate-500">— {d.impact}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setExpanded((e) => !e)}
                className="mt-2 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" /> Ocultar diagnóstico
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    {record.diagnoses.length} problema{record.diagnoses.length > 1 ? "s" : ""} encontrado{record.diagnoses.length > 1 ? "s" : ""}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProductHealthListWidget({ data }: { data: ProductHealthRecord[] }) {
  const [filter, setFilter] = useState<FilterTab>("all");

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h3 className="mb-1 text-sm font-semibold text-white">Produtos que precisam de atenção</h3>
        <p className="text-sm text-slate-500">Nenhum produto com problemas identificado.</p>
      </div>
    );
  }

  const tabs: { id: FilterTab; label: string }[] = [
    { id: "all", label: "Todos" },
    { id: ProductHealthStatus.Critical, label: "Crítico" },
    { id: ProductHealthStatus.Attention, label: "Atenção" },
    { id: ProductHealthStatus.Ideal, label: "Ideal" },
  ];

  const visible = filter === "all" ? data : data.filter((p) => p.status === filter);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Produtos que precisam de atenção</h3>
        <span className="text-xs text-slate-500">{data.length} total</span>
      </div>

      <div className="mb-4 flex gap-1">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              filter === id
                ? "bg-slate-700 text-white"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
        {visible.map((p) => (
          <ProductCard key={p.offer_id} record={p} />
        ))}
      </div>

      {visible.length === 0 && (
        <p className="text-center text-sm text-slate-500 py-4">
          Nenhum produto nesta categoria.
        </p>
      )}
    </div>
  );
}
