"use client";

import { Search, Sparkles } from "lucide-react";
import Chip from "@/components/ui/Chip";
import { useSearch } from "@/hooks/useSearch";

const suggestions = [
  "iPhone 17 Pro",
  "Notebook Gamer",
  "Apple Watch Ultra",
  "DJI Mini 4 Pro",
];

type Props = {
  defaultValue?: string;
};

export default function SearchBar({ defaultValue = "" }: Props) {
  const { query, setQuery, submit } = useSearch(defaultValue);

  return (
    <div className="w-full">
      <div className="glass-card flex flex-col overflow-hidden rounded-3xl shadow-[0_0_60px_-20px_var(--color-brand-blue)] ring-1 ring-brand-blue/25 transition-all duration-300 sm:flex-row sm:rounded-full focus-within:ring-brand-blue/50">
        <div className="flex items-center pl-6 pt-6 sm:pt-0">
          <Search size={22} className="text-slate-400" />
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="O que você procura hoje?"
          aria-label="Buscar produtos"
          className="flex-1 bg-transparent px-5 py-6 text-lg text-white outline-none placeholder:text-slate-500"
        />

        <button
          onClick={submit}
          className="m-2 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-blue to-brand-purple px-8 py-4 font-semibold text-white shadow-[0_0_24px_-6px_var(--color-brand-blue)] transition-transform duration-300 hover:scale-[1.03] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/60"
        >
          <Sparkles size={18} />
          Encontrar a melhor compra
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Produtos mais buscados
        </span>
        {suggestions.map((item) => (
          <Chip key={item} onClick={() => setQuery(item)}>
            {item}
          </Chip>
        ))}
      </div>
    </div>
  );
}
