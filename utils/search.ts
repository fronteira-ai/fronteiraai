// Escapa os caracteres especiais do LIKE/ILIKE do Postgres (% e _) para que
// um termo de busca vindo do usuário seja tratado como texto literal, nunca
// como wildcard. Compartilhado por services/search.service.ts e
// services/product.service.ts (catálogo) para não duplicar a mesma regra.
export function escapeLikePattern(value: string): string {
  return value.replace(/[%_]/g, (char) => `\\${char}`);
}
