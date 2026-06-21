import { memo } from "react";

type Props = {
  specifications: Record<string, string> | null;
};

function ProductSpecifications({ specifications }: Props) {
  const entries = specifications ? Object.entries(specifications) : [];

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
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          {entries.map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between border-b border-slate-800 pb-3"
            >
              <dt className="text-slate-400">{label}</dt>
              <dd className="font-medium text-white">{value}</dd>
            </div>
          ))}
        </dl>
      )}

    </section>
  );
}

export default memo(ProductSpecifications);
