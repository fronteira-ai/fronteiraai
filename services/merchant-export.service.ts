import type { SupabaseClient } from "@supabase/supabase-js";

/** Prefixos de fórmula a neutralizar ao EXPORTAR CSV (CSV injection §37). */
const FORMULA_PREFIX = new Set(["=", "+", "-", "@", "\t", "\r"]);

/** Escapa uma célula CSV (aspas) e neutraliza injeção de fórmula. */
export function escapeCsvCell(raw: unknown): string {
  let s = raw === null || raw === undefined ? "" : String(raw);
  const first = s.charAt(0);
  if (FORMULA_PREFIX.has(first)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: Array<Array<unknown>>): string {
  return rows.map((r) => r.map(escapeCsvCell).join(",")).join("\n");
}

export interface MerchantExportRow {
  externalId: string;
  name: string;
  brand?: string | null;
  priceUSD?: number | null;
  inStock?: boolean | null;
  stockQuantity?: number | null;
  productUrl?: string | null;
  imageUrl?: string | null;
}

/**
 * Exporta APENAS dados da loja autorizada de uma merchant (# §36/37).
 * `storeId` deve vir da autorização tenz-ant (server-side), nunca do browser isolado.
 */
export async function exportStoreCatalogCsv(
  supabase: SupabaseClient,
  merchantId: string,
  storeId: string,
): Promise<string> {
  // Re-audit de posse (mesma checagem de merchant_stores) — não confiar em client.
  const { data: link } = await supabase
    .from("merchant_stores")
    .select("store_id")
    .eq("merchant_id", merchantId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (!link) throw new Error("EXPORT_FORBIDDEN: store não pertence à merchant");

  const { data: offers } = await supabase
    .from("offers")
    .select("external_id, price_usd, in_stock, stock_quantity, product_url, stores!inner(slug), products(name, brand, image_url)")
    .eq("store_id", storeId)
    .limit(20000);

  const rows: Array<Array<unknown>> = [[
    "referencia", "produto", "marca", "preco_usd", "em_estoque", "estoque", "url_produto", "imagem",
  ]];
  for (const o of (offers ?? []) as Array<Record<string, unknown>>) {
    const prod = (o.products ?? {}) as Record<string, unknown>;
    rows.push([
      o.external_id ?? "",
      prod.name ?? "",
      prod.brand ?? "",
      o.price_usd ?? "",
      o.in_stock === true ? "sim" : o.in_stock === false ? "nao" : "",
      o.stock_quantity ?? "",
      o.product_url ?? "",
      prod.image_url ?? "",
    ]);
  }
  return toCsv(rows);
}
