import { memo } from "react";
import type { SpecificationEntry } from "@/src/domains/buyer-intelligence";

type Props = {
  entries: SpecificationEntry[];
};

function SpecRow({ entry }: { entry: SpecificationEntry }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
      <dt className="text-slate-400">{entry.label}</dt>
      <dd className="font-medium text-white">{entry.value}</dd>
    </div>
  );
}

function ProductSpecifications({ entries }: Props) {
  const highlighted = entries.filter((entry) => entry.highlight);
  const rest = entries.filter((entry) => !entry.highlight);

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8">

      <h2 className="text-2xl font-bold text-white">
        Especificações
      </h2>

      {entries.length === 0 ? (
        <p className="mt-4 text-slate-400">
          Nenhuma especificação disponível para este produto.
        </p>
      ) : (
        <>
          {highlighted.length > 0 ? (
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              {highlighted.map((entry) => (
                <SpecRow key={entry.label} entry={entry} />
              ))}
            </dl>
          ) : null}

          {rest.length > 0 ? (
            <>
              {highlighted.length > 0 ? (
                <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Outras especificações
                </h3>
              ) : null}
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                {rest.map((entry) => (
                  <SpecRow key={entry.label} entry={entry} />
                ))}
              </dl>
            </>
          ) : null}
        </>
      )}

    </section>
  );
}

export default memo(ProductSpecifications);
