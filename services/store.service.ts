import { supabase } from "@/lib/supabase";
import { Store } from "@/types/store";

export async function getStores(): Promise<Store[]> {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("active", true)
    .order("rating", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data as Store[];
}

export async function getStore(id: string) {
  const { data } = await supabase
    .from("stores")
    .select("*")
    .eq("id", id)
    .single();

  return data;
}

export async function getStoreBySlug(slug: string): Promise<Store | null> {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data as Store;
}

/**
 * Mission 02B.2 — leitura em LOTE, para eliminar o N+1 de
 * `getFeaturedStores()` (uma consulta de `stores` por loja destaque).
 *
 * MESMA tabela, MESMO cliente (o anon `@/lib/supabase`, não o service-role:
 * o comportamento de RLS permanece exatamente o de `getStoreBySlug`) e
 * MESMOS filtros — apenas UMA consulta para N slugs em vez de N.
 *
 * Semântica preservada: `getStoreBySlug` devolvia `null` para slug
 * inexistente OU loja inativa (`active <> true`); aqui a loja simplesmente
 * não aparece no Map, e o chamador trata "ausente" e "não pública" da mesma
 * forma. Erro de banco segue a convenção do serviço (loga e devolve vazio).
 */
export async function getStoresBySlugs(slugs: string[]): Promise<Map<string, Store>> {
  const bySlug = new Map<string, Store>();
  const unique = [...new Set(slugs)].filter((slug): slug is string => Boolean(slug));
  if (unique.length === 0) return bySlug;

  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .in("slug", unique)
    .eq("active", true);

  if (error) {
    console.error(error);
    return bySlug;
  }

  for (const store of (data ?? []) as Store[]) {
    bySlug.set(store.slug, store);
  }

  return bySlug;
}

export async function getRelatedStores(
  excludeStoreId: string,
  limit = 4
): Promise<Store[]> {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("active", true)
    .neq("id", excludeStoreId)
    .order("rating", { ascending: false })
    .limit(limit);

  if (error) {
    console.error(error);
    return [];
  }

  return data as Store[];
}