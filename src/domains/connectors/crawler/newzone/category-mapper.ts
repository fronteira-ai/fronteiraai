// New Zone — descoberta de categorias via API GraphQL pública (category_get_all).
// Usa a estrutura real do catálogo (não hardcoded) p/ descobrir categorias e
// filtrar as estratégicas por nome.

import { graphql } from "./graphql-client";

export interface NzCategory {
  id_category: number;
  name: string;
}

export interface CategoryResp {
  category_get_all: { count: number; rows: NzCategory[] };
}

const QUERY = `query CategoryGetAll { category_get_all { count rows { id_category name __typename } __typename } }`;

export async function fetchAllCategories(): Promise<NzCategory[]> {
  const res = await graphql<CategoryResp>("CategoryGetAll", QUERY, {});
  return res.data?.category_get_all?.rows ?? [];
}

const STRATEGIC_KEYWORDS = [
  "telefonia", "apple", "electron", "informatica", "games", "juegos",
  "tv", "camara", "fotografia", "auricular", "audio", "relojeria",
  "accesorios", "gamer", "consola", "computa", "celular",
];

/** Filtra categorias estratégicas (eletrônicos/Apple/games/computing/...). */
export function isStrategicCategory(name: string): boolean {
  const n = name.toLowerCase();
  return STRATEGIC_KEYWORDS.some((k) => n.includes(k));
}
