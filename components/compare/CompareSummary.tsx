import { memo } from "react";
import { CompareSummary as CompareSummaryType } from "@/types/compare";
import { formatUSD } from "@/src/domains/exchange";

type Props = {
  summary: CompareSummaryType;
};

function CompareSummary({ summary }: Props) {
  const {
    lowestPriceUSD,
    highestPriceUSD,
    absoluteDifferenceUSD,
    percentageDifference,
    storeCount,
    availableCount,
  } = summary;

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8">

      <h2 className="text-xl font-bold text-white">Resumo da Comparação</h2>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">

        <StatBox
          label="Menor preço"
          value={lowestPriceUSD !== null ? formatUSD(lowestPriceUSD) : "—"}
          highlight="green"
        />

        <StatBox
          label="Maior preço"
          value={highestPriceUSD !== null ? formatUSD(highestPriceUSD) : "—"}
          highlight="red"
        />

        <StatBox
          label="Economia máxima"
          value={
            absoluteDifferenceUSD !== null && absoluteDifferenceUSD > 0
              ? `${formatUSD(absoluteDifferenceUSD)} (${percentageDifference !== null ? percentageDifference.toFixed(1) : "0"}%)`
              : "Mesmo preço"
          }
          highlight="blue"
        />

        <StatBox
          label="Lojas"
          value={`${storeCount} loja${storeCount !== 1 ? "s" : ""} · ${availableCount} com estoque`}
          highlight="default"
        />

      </div>

    </section>
  );
}

type StatBoxProps = {
  label: string;
  value: string;
  highlight: "green" | "red" | "blue" | "default";
};

const colorMap: Record<StatBoxProps["highlight"], string> = {
  green: "text-emerald-400",
  red: "text-red-400",
  blue: "text-blue-400",
  default: "text-white",
};

function StatBox({ label, value, highlight }: StatBoxProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className={`mt-2 text-lg font-bold ${colorMap[highlight]}`}>
        {value}
      </p>
    </div>
  );
}

export default memo(CompareSummary);
