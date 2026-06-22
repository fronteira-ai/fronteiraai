type Props = {
  title?: string;
};

export default function SearchResults({
  title = "Resultados da pesquisa",
}: Props) {
  return (
    <section className="mt-10">

      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8">

        <h2 className="text-2xl font-bold text-white">
          {title}
        </h2>

        <p className="mt-3 text-slate-400">
          Nenhum resultado encontrado.
        </p>

      </div>

    </section>
  );
}