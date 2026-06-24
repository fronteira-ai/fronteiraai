"use client";

import { useEffect, useState } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Chip from "@/components/ui/Chip";
import { useProductFilters } from "@/hooks/useProductFilters";
import { Category } from "@/types/category";
import { Brand } from "@/types/brand";
import { Store } from "@/types/store";

type Props = {
  categories: Category[];
  brands: Brand[];
  stores: Store[];
};

const SORT_OPTIONS = [
  { value: "newest", label: "Mais recentes" },
  { value: "price_asc", label: "Menor preço" },
  { value: "price_desc", label: "Maior preço" },
  { value: "best_selling", label: "Mais vendidos (em breve)" },
  { value: "top_rated", label: "Melhor avaliação (em breve)" },
];

const DEBOUNCE_MS = 400;

// Estado local "espelha" um valor vindo da URL, mas precisa resetar quando
// esse valor muda por fora (ex.: navegação direta, botão voltar). Ajustar
// isso durante a renderização (em vez de em um useEffect) evita o
// re-render em cascata que useEffect+setState causaria aqui — padrão
// documentado em react.dev/learn/you-might-not-need-an-effect.
function useUrlSyncedState(value: string): [string, (next: string) => void] {
  const [state, setState] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  if (value !== prevValue) {
    setPrevValue(value);
    setState(value);
  }

  return [state, setState];
}

// Filtros do catálogo (/products): categoria/marca/loja/disponibilidade/
// ordenação aplicam na hora; busca textual e faixa de preço são debounced
// (texto digitado letra a letra não deve disparar uma navegação por tecla).
// hooks/useProductFilters.ts mantém a URL como única fonte de verdade.
export default function ProductFilters({ categories, brands, stores }: Props) {
  const { filters, setFilter } = useProductFilters();

  const [search, setSearch] = useUrlSyncedState(filters.q);
  const [minPrice, setMinPrice] = useUrlSyncedState(filters.minPrice);
  const [maxPrice, setMaxPrice] = useUrlSyncedState(filters.maxPrice);

  useEffect(() => {
    if (search === filters.q) return;
    const timeout = setTimeout(() => setFilter("q", search), DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [search, filters.q, setFilter]);

  useEffect(() => {
    if (minPrice === filters.minPrice) return;
    const timeout = setTimeout(() => setFilter("minPrice", minPrice), DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [minPrice, filters.minPrice, setFilter]);

  useEffect(() => {
    if (maxPrice === filters.maxPrice) return;
    const timeout = setTimeout(() => setFilter("maxPrice", maxPrice), DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [maxPrice, filters.maxPrice, setFilter]);

  const isInStockOnly = filters.availability === "in_stock";

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          label="Buscar"
          placeholder="Nome do produto"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <Select
          label="Categoria"
          placeholder="Todas as categorias"
          value={filters.category}
          onChange={(value) => setFilter("category", value)}
          options={categories.map((category) => ({
            value: category.slug,
            label: category.name,
          }))}
        />

        <Select
          label="Marca"
          placeholder="Todas as marcas"
          value={filters.brand}
          onChange={(value) => setFilter("brand", value)}
          options={brands.map((brand) => ({ value: brand.slug, label: brand.name }))}
        />

        <Select
          label="Loja"
          placeholder="Todas as lojas"
          value={filters.store}
          onChange={(value) => setFilter("store", value)}
          options={stores.map((store) => ({ value: store.slug, label: store.name }))}
        />

        <Input
          label="Preço mínimo (USD)"
          type="number"
          min={0}
          inputMode="decimal"
          placeholder="0"
          value={minPrice}
          onChange={(event) => setMinPrice(event.target.value)}
        />

        <Input
          label="Preço máximo (USD)"
          type="number"
          min={0}
          inputMode="decimal"
          placeholder="Sem limite"
          value={maxPrice}
          onChange={(event) => setMaxPrice(event.target.value)}
        />

        <Select
          label="Ordenar por"
          value={filters.sort || "newest"}
          onChange={(value) => setFilter("sort", value)}
          options={SORT_OPTIONS}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-400">Disponibilidade</span>
          <Chip
            onClick={() => setFilter("availability", isInStockOnly ? "" : "in_stock")}
            className={isInStockOnly ? "border-blue-500 bg-blue-500/10 text-white" : ""}
          >
            Somente em estoque
          </Chip>
        </div>
      </div>
    </div>
  );
}
