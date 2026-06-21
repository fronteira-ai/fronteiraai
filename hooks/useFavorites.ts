"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Favorite } from "@/types/favorite";

const STORAGE_KEY = "paraguai:favorites";
const listeners = new Set<() => void>();

function readFromStorage(): Favorite[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Favorite[]) : [];
  } catch {
    return [];
  }
}

let cache: Favorite[] = readFromStorage();

function getSnapshot(): Favorite[] {
  return cache;
}

function getServerSnapshot(): Favorite[] {
  return [];
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function persist(next: Favorite[]) {
  cache = next;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  listeners.forEach((listener) => listener());
}

// Favoritos anônimos (sem autenticação): persistidos no localStorage do
// navegador, por isso este hook não passa por nenhum service/Supabase.
// useSyncExternalStore evita o mismatch de hidratação que um useEffect +
// setState causaria ao ler o localStorage no primeiro render.
export function useFavorites() {
  const favorites = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const isFavorite = useCallback(
    (productId: string) =>
      favorites.some((item) => item.productId === productId),
    [favorites]
  );

  const toggleFavorite = useCallback((favorite: Favorite) => {
    const exists = cache.some((item) => item.productId === favorite.productId);
    const next = exists
      ? cache.filter((item) => item.productId !== favorite.productId)
      : [...cache, favorite];

    persist(next);
  }, []);

  return { favorites, isFavorite, toggleFavorite };
}
