// Golden Query Suite — relatório de Search Recall contra a RPC de busca real.
//
// Roda `search_products_global` para um conjunto persistente de queries
// representativas e reporta RESULT_COUNT / ZERO_RESULT. Serve de
// observabilidade e base do SEARCH_REPORT; não é um teste unitário (o
// mecanismo de recall vive na RPC SQL). Dry-run/read-only.

import { getServiceClient } from "./lib/client";

const GOLDEN_QUERIES = [
  "iPhone 17 Pro",
  "iPhone 17 Pro Max",
  "iPhone 17",
  "iPhone 16 Pro",
  "Galaxy S26",
  "MacBook",
  "MacBook Air",
  "MacBook Pro",
  "PlayStation 5",
  "PS5",
  // variantes de recall (espaços / continuada / caixa)
  "iphone17pro",
  "iphone 17pro",
  "iphone 17 pro",
  "IPHONE 17 PRO",
  "17 pro",
  "ps5",
  "playstation5",
  // base em dados reais (produtos já ingeridos)
  "xiaomi",
  "samsung",
];

interface Row { product_id: string; has_stock: boolean; lowest_price_usd: number | null; }
async function count(term: string): Promise<number> {
  const sb = getServiceClient();
  const { data, error } = await sb.rpc("search_products_global", { p_term: term, p_limit: 8, p_offset: 0 });
  if (error) { console.error(`  [${term}] RPC erro: ${error.message}`); return -1; }
  return Array.isArray(data) ? (data as Row[]).length : 0;
}

async function main() {
  let total = 0, zero = 0, err = 0;
  console.log("término | count | zero?");
  for (const q of GOLDEN_QUERIES) {
    const n = await count(q);
    total++;
    if (n === -1) err++;
    else if (n === 0) zero++;
    console.log(`${q} | ${n} | ${n === 0 ? "ZERO" : n === -1 ? "ERR" : "ok"}`);
  }
  const rate = total > 0 ? ((total - zero - err) / total) * 100 : 0;
  console.log(`\n[golden-search] queries=${total} zero=${zero} err=${err} GOLDEN_QUERY_PASS_RATE=${rate.toFixed(1)}%`);
}

main().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
