"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { productsPath, ProductsQueryParams } from "@/constants/routes";

export interface ProductFiltersState {
  q: string;
  category: string;
  brand: string;
  store: string;
  minPrice: string;
  maxPrice: string;
  availability: string;
  sort: string;
  page: number;
}

type FilterKey = keyof Omit<ProductFiltersState, "page">;

interface UseProductFiltersResult {
  filters: ProductFiltersState;
  setFilter: (key: FilterKey, value: string) => void;
  setPage: (page: number) => void;
}

// Sincroniza o estado dos filtros do catálogo (/products) com a URL: a URL
// é a única fonte de verdade (mesmo princípio de hooks/useSearch.ts), então
// o resultado é sempre compartilhável/recarregável e funciona com SSR. Mudar
// qualquer filtro volta para a página 1; mudar só a página preserva os
// demais filtros.
export function useProductFilters(): UseProductFiltersResult {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters: ProductFiltersState = useMemo(
    () => ({
      q: searchParams.get("q") ?? "",
      category: searchParams.get("category") ?? "",
      brand: searchParams.get("brand") ?? "",
      store: searchParams.get("store") ?? "",
      minPrice: searchParams.get("minPrice") ?? "",
      maxPrice: searchParams.get("maxPrice") ?? "",
      availability: searchParams.get("availability") ?? "",
      sort: searchParams.get("sort") ?? "",
      page: Number(searchParams.get("page") ?? "1") || 1,
    }),
    [searchParams]
  );

  const navigate = useCallback(
    (next: ProductFiltersState) => {
      const params: ProductsQueryParams = {
        q: next.q || undefined,
        category: next.category || undefined,
        brand: next.brand || undefined,
        store: next.store || undefined,
        minPrice: next.minPrice || undefined,
        maxPrice: next.maxPrice || undefined,
        availability: next.availability || undefined,
        sort: next.sort || undefined,
        page: next.page > 1 ? String(next.page) : undefined,
      };
      router.push(productsPath(params));
    },
    [router]
  );

  const setFilter = useCallback(
    (key: FilterKey, value: string) => {
      navigate({ ...filters, [key]: value, page: 1 });
    },
    [filters, navigate]
  );

  const setPage = useCallback(
    (page: number) => {
      navigate({ ...filters, page });
    },
    [filters, navigate]
  );

  return { filters, setFilter, setPage };
}
