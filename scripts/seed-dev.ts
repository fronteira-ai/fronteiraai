// Sprint 3C — Dataset de DESENVOLVIMENTO para o Supabase local.
//
// Por que não reaproveitar `database/seed/`: aquele seed não cria lojas. Ele
// faz backfill de `slug`/`active` em 5 lojas que já existiam no Supabase
// Cloud ("localiza cada loja pelo `name` exato" — database/seed/stores/data.js).
// Contra um banco local vazio ele não produz nada. Ele continua intocado,
// como registro da sua função original.
//
// Este dataset é 100% FICTÍCIO. Nenhum dado real de produção foi copiado:
// nenhum PII, nenhuma credencial, nenhum inventário real de merchant. As
// lojas têm nomes inventados de propósito, para que ninguém confunda uma
// linha local com um merchant real do marketplace.
//
// Volumes (alvo da Fase 7): 10 stores, 8 brands, 8 categories, 50 products,
// 120 offers, 300 price_history, 50 canonical_products, 20 merge_candidates,
// 200 market_changes, 7 market_pulse_snapshots, 20 buyer_sessions,
// 100 buyer_events.
//
// Cobertura deliberada de casos de borda:
//   - produtos presentes em múltiplas lojas (comparação real)
//   - produtos sem nenhuma oferta (estado vazio do catálogo)
//   - ofertas fora de estoque e indisponíveis
//   - dispersão de preço entre lojas para o mesmo produto
//   - títulos divergentes entre lojas (mesmo produto, nome diferente)
//   - specifications preenchidas (Product Identity / comparação)
//   - merge_candidates cross-merchant pendentes de revisão
//   - histórico de preço com altas e quedas
//   - eventos OfferClicked/ProductImpression/SearchPerformed
//
// Uso: npm run seed:dev   (alvo LOCAL por padrão — ver scripts/lib/supabaseTarget.ts)
import { getServiceClient } from "./lib/client";
import { resolveSupabaseTarget } from "./lib/supabaseTarget";

// ── PRNG determinístico (mulberry32) ──────────────────────────────────────
// Seed fixa: o mesmo `npm run seed:dev` produz sempre o mesmo dataset, o que
// torna bugs de UI reproduzíveis entre máquinas.
let _s = 0x9e3779b9;
function rnd(): number {
  _s |= 0;
  _s = (_s + 0x6d2b79f5) | 0;
  let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];
const int = (min: number, max: number): number => min + Math.floor(rnd() * (max - min + 1));
const round2 = (n: number): number => Math.round(n * 100) / 100;

const slugify = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const daysAgo = (n: number): string =>
  new Date(Date.now() - n * 86_400_000).toISOString();

// ── Dados fictícios ───────────────────────────────────────────────────────
const STORES = [
  { name: "Demo Eletrônicos CDE", city: "Ciudad del Este", rating: 4.6 },
  { name: "Demo Import House", city: "Ciudad del Este", rating: 4.2 },
  { name: "Demo Tech Salto", city: "Salto del Guairá", rating: 4.8 },
  { name: "Demo Mega Store", city: "Ciudad del Este", rating: 3.9 },
  { name: "Demo Pedro Juan Shop", city: "Pedro Juan Caballero", rating: 4.4 },
  { name: "Demo Fronteira Digital", city: "Ciudad del Este", rating: 4.1 },
  { name: "Demo Duty Center", city: "Salto del Guairá", rating: 4.7 },
  { name: "Demo Atacado Py", city: "Ciudad del Este", rating: 3.6 },
  { name: "Demo Smart Point", city: "Encarnación", rating: 4.3 },
  { name: "Demo Global Trade", city: "Ciudad del Este", rating: 4.0 },
];

const BRANDS = ["Apple", "Samsung", "Xiaomi", "Sony", "DJI", "LG", "Dell", "JBL"];

const CATEGORIES = [
  { name: "Celulares", icon: "📱" },
  { name: "Notebooks", icon: "💻" },
  { name: "Drones", icon: "🚁" },
  { name: "TVs", icon: "📺" },
  { name: "Videogames", icon: "🎮" },
  { name: "Áudio", icon: "🎧" },
  { name: "Câmeras", icon: "📷" },
  { name: "Smartwatches", icon: "⌚" },
];

// 50 modelos: [brand, category, modelo base, preço-base USD]
const MODELS: ReadonlyArray<[string, string, string, number]> = [
  ["Apple", "Celulares", "iPhone 16 Pro 256GB", 999], ["Apple", "Celulares", "iPhone 16 128GB", 799],
  ["Apple", "Celulares", "iPhone 15 128GB", 699], ["Apple", "Notebooks", "MacBook Air M3 13 256GB", 1099],
  ["Apple", "Notebooks", "MacBook Pro M3 14 512GB", 1799], ["Apple", "Smartwatches", "Apple Watch Series 10 46mm", 429],
  ["Apple", "Áudio", "AirPods Pro 2", 229], ["Samsung", "Celulares", "Galaxy S24 Ultra 512GB", 1199],
  ["Samsung", "Celulares", "Galaxy S24 256GB", 849], ["Samsung", "Celulares", "Galaxy A55 128GB", 349],
  ["Samsung", "TVs", "Smart TV Neo QLED 65 4K", 1299], ["Samsung", "TVs", "Smart TV Crystal 55 4K", 449],
  ["Samsung", "Smartwatches", "Galaxy Watch 7 44mm", 299], ["Samsung", "Notebooks", "Galaxy Book4 Pro 14", 1249],
  ["Xiaomi", "Celulares", "Redmi Note 13 Pro 256GB", 279], ["Xiaomi", "Celulares", "Xiaomi 14 512GB", 799],
  ["Xiaomi", "Celulares", "Poco X6 Pro 256GB", 319], ["Xiaomi", "Smartwatches", "Watch S3", 129],
  ["Xiaomi", "TVs", "TV A Pro 55 4K", 379], ["Xiaomi", "Áudio", "Redmi Buds 5 Pro", 59],
  ["Sony", "Videogames", "PlayStation 5 Slim 1TB", 499], ["Sony", "Videogames", "PlayStation 5 Pro 2TB", 699],
  ["Sony", "Áudio", "WH-1000XM5", 349], ["Sony", "Câmeras", "Alpha A7 IV Kit", 2499],
  ["Sony", "Câmeras", "ZV-1 II", 899], ["Sony", "TVs", "Bravia XR 65 OLED", 1899],
  ["DJI", "Drones", "Mini 4 Pro Fly More", 1099], ["DJI", "Drones", "Air 3S Combo", 1549],
  ["DJI", "Drones", "Neo", 199], ["DJI", "Câmeras", "Osmo Pocket 3", 519],
  ["DJI", "Câmeras", "Osmo Action 5 Pro", 349], ["LG", "TVs", "OLED evo C4 65", 1699],
  ["LG", "TVs", "UHD UT80 50", 379], ["LG", "Áudio", "XBoom Go XG7", 179],
  ["LG", "Notebooks", "Gram 16 512GB", 1399], ["Dell", "Notebooks", "Inspiron 15 512GB", 649],
  ["Dell", "Notebooks", "XPS 14 1TB", 1699], ["Dell", "Notebooks", "Latitude 5450 256GB", 1099],
  ["Dell", "Notebooks", "Alienware m16 1TB", 2199], ["JBL", "Áudio", "Charge 6", 179],
  ["JBL", "Áudio", "Flip 7", 129], ["JBL", "Áudio", "Tune 770NC", 99],
  ["JBL", "Áudio", "Quantum 610", 119], ["Apple", "Celulares", "iPhone 16 Plus 256GB", 899],
  ["Samsung", "Celulares", "Galaxy Z Flip6 256GB", 1099], ["Xiaomi", "Notebooks", "Redmi Book Pro 14", 749],
  ["Sony", "Videogames", "DualSense Edge", 199], ["DJI", "Drones", "Avata 2 Combo", 999],
  ["LG", "Smartwatches", "Watch Sport 42mm", 199], ["JBL", "Áudio", "Boombox 4", 499],
];

// Sufixos de título por loja: o MESMO produto aparece com nome diferente em
// cada loja — exatamente o cenário que o Product Identity precisa resolver.
const TITLE_VARIANTS = [
  (n: string) => n,
  (n: string) => `${n} - Lacrado`,
  (n: string) => `${n} (Novo, Garantia 1 Ano)`,
  (n: string) => `${n} | Pronta Entrega`,
  (n: string) => `${n} Original`,
];

const CONDITIONS = ["novo", "novo", "novo", "vitrine"] as const;
const WARRANTIES = ["12 meses", "6 meses", "3 meses", "Garantia da loja"] as const;
const CHANGE_TYPES = [
  "price_increased", "price_decreased", "stock_returned", "stock_out",
  "stock_quantity_changed", "offer_created", "promotion_detected",
] as const;
const EVENT_TYPES = [
  "SearchPerformed", "ProductImpression", "ProductClicked", "OfferViewed",
  "OfferClicked", "OfferClicked", "MerchantViewed", "CategoryViewed",
  "ProductCompared", "SessionStarted",
] as const;
const DEVICES = ["desktop", "mobile", "mobile", "tablet"] as const;

interface Row { id: string; [k: string]: unknown }

async function main(): Promise<void> {
  const target = resolveSupabaseTarget();
  if (target.target !== "local") {
    console.error(
      "seed:dev é um dataset de DESENVOLVIMENTO e recusa qualquer alvo que não seja local."
    );
    process.exit(1);
  }
  console.log(`Alvo: ${target.url}\n`);

  const db = getServiceClient();

  const insert = async <T extends object>(table: string, rows: T[]): Promise<Row[]> => {
    const out: Row[] = [];
    for (let i = 0; i < rows.length; i += 200) {
      const { data, error } = await db
        .from(table)
        .insert(rows.slice(i, i + 200))
        .select("id");
      if (error) throw new Error(`${table}: ${error.message}`);
      out.push(...((data ?? []) as Row[]));
    }
    console.log(`  ${table.padEnd(24)} ${String(out.length).padStart(4)} linhas`);
    return out;
  };

  console.log("Inserindo dataset de desenvolvimento...");

  // ── brands / categories / stores ────────────────────────────────────────
  const brands = await insert(
    "brands",
    BRANDS.map((name) => ({ name, slug: slugify(name), logo_url: null }))
  );
  const brandBySlug = new Map(BRANDS.map((n, i) => [slugify(n), brands[i].id]));

  const categories = await insert(
    "categories",
    CATEGORIES.map((c) => ({ name: c.name, slug: slugify(c.name), icon: c.icon }))
  );
  const catBySlug = new Map(CATEGORIES.map((c, i) => [slugify(c.name), categories[i].id]));

  const stores = await insert(
    "stores",
    STORES.map((s, i) => ({
      name: s.name,
      slug: slugify(s.name),
      description: `Loja de demonstração em ${s.city}. Dado fictício — Sprint 3C.`,
      city: s.city,
      country: "Paraguai",
      rating: s.rating,
      logo_url: null,
      cover_image: null,
      is_verified: i < 6,
      phone: `+595 61 500-${100 + i}`,
      whatsapp: `+595 98 100-${200 + i}`,
      email: `contato@${slugify(s.name)}.example`,
      website: `https://${slugify(s.name)}.example`,
      address: `Av. Demo ${100 + i * 7}, ${s.city}`,
      opening_hours: "Seg-Sáb 08:00-18:00",
      instagram: `@${slugify(s.name)}`,
      latitude: round2(-25.5 + rnd()),
      longitude: round2(-54.6 + rnd()),
      delivery: rnd() > 0.3,
      pickup: true,
      pix_br: rnd() > 0.25,
      active: true,
    }))
  );

  // ── products (50) ───────────────────────────────────────────────────────
  const productRows = MODELS.map(([brand, cat, model]) => {
    const specs: Record<string, string> = { modelo: model, condicao: "novo" };
    const storage = model.match(/(\d+)(GB|TB)/);
    if (storage) specs.armazenamento = storage[0];
    if (cat === "Celulares") specs.cor = pick(["Preto", "Branco", "Azul", "Titânio"]);
    if (cat === "TVs") specs.polegadas = (model.match(/\b(\d{2})\b/)?.[1] ?? "55") + '"';
    if (cat === "Notebooks") specs.memoria = pick(["8GB", "16GB", "32GB"]);
    return {
      name: `${brand} ${model}`,
      slug: slugify(`${brand} ${model}`),
      description: `${brand} ${model}. Produto de demonstração do ambiente local (Sprint 3C).`,
      brand_id: brandBySlug.get(slugify(brand))!,
      category_id: catBySlug.get(slugify(cat))!,
      image_url: null,
      specifications: specs,
    };
  });
  // Sprint 4 — condição 7 do checklist de dataset: produto SEM categoria.
  // O catálogo real tem produtos cuja categoria nunca foi resolvida (é o que
  // o Programa Κ mediu na taxonomia fragmentada), e várias superfícies
  // dependem desse caso: getRelatedProducts precisa sair cedo sem consultar
  // o banco quando category_id é null, e /categorias não pode contar um
  // produto sem categoria. Índice 45 tem ofertas; índice 48 não tem — assim
  // o caso é exercitado tanto no catálogo quanto no estado vazio.
  productRows[45].category_id = null as unknown as string;
  productRows[48].category_id = null as unknown as string;

  const products = await insert("products", productRows);

  // ── offers (120) ────────────────────────────────────────────────────────
  // Os 4 últimos produtos ficam SEM oferta de propósito (estado vazio).
  const offerRows: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  const offerMeta: { productIdx: number; storeIdx: number; price: number }[] = [];

  const eligible = products.length - 4;
  let idx = 0;
  while (offerRows.length < 120) {
    const p = idx % eligible;
    // produtos do início recebem mais lojas → comparação rica
    const nStores = p < 12 ? 4 : p < 28 ? 3 : 2;
    for (let k = 0; k < nStores && offerRows.length < 120; k++) {
      const s = (p * 3 + k * 2 + int(0, 2)) % stores.length;
      const key = `${p}:${s}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const base = MODELS[p][3];
      const price = round2(base * (0.88 + rnd() * 0.28)); // dispersão real entre lojas
      const outOfStock = rnd() < 0.15;
      const unavailable = rnd() < 0.07;
      const hasOldPrice = rnd() < 0.35;

      offerRows.push({
        product_id: products[p].id,
        store_id: stores[s].id,
        currency: "USD",
        price_usd: price,
        price_brl: round2(price * 5.42),
        old_price: hasOldPrice ? round2(price * (1.05 + rnd() * 0.2)) : null,
        in_stock: !outOfStock,
        available: !unavailable,
        stock_quantity: outOfStock ? 0 : int(1, 40),
        condition: pick(CONDITIONS),
        warranty: pick(WARRANTIES),
        cashback: rnd() < 0.25 ? int(1, 8) : null,
        product_url: `https://${slugify(STORES[s].name)}.example/p/${slugify(MODELS[p][2])}`,
        created_at: daysAgo(int(30, 120)),
        updated_at: daysAgo(int(0, 5)),
      });
      offerMeta.push({ productIdx: p, storeIdx: s, price });
    }
    idx++;
    if (idx > 500) break;
  }
  // Sprint 4 — Fase 11: um produto cujas ofertas estão TODAS sem estoque.
  // É o único caso capaz de exercitar a regra crítica do ParaguAI Advisor —
  // "nunca recomendar compra de item sem estoque" — e o caminho
  // `recommendation === "unavailable"` do ParaguAIAdvisorComposer. Sem ele,
  // a regra é inverificável: todo produto do dataset tem ao menos uma oferta
  // disponível. Índice 20 = Sony PlayStation 5 Slim 1TB.
  const OUT_OF_STOCK_PRODUCT_IDX = 20;
  for (let i = 0; i < offerRows.length; i++) {
    if (offerMeta[i].productIdx === OUT_OF_STOCK_PRODUCT_IDX) {
      offerRows[i].in_stock = false;
      offerRows[i].stock_quantity = 0;
      offerRows[i].available = true; // ativa, porém esgotada — não arquivada
    }
  }

  const offers = await insert("offers", offerRows);

  // ── price_history (300) ─────────────────────────────────────────────────
  const historyRows: Record<string, unknown>[] = [];
  for (let i = 0; historyRows.length < 300; i++) {
    const o = i % offers.length;
    const current = offerMeta[o].price;
    const steps = int(2, 3);
    for (let k = 0; k < steps && historyRows.length < 300; k++) {
      const prev = round2(current * (0.9 + rnd() * 0.25));
      const next = round2(prev * (0.92 + rnd() * 0.18));
      historyRows.push({
        offer_id: offers[o].id,
        price_usd: next,
        price_brl: round2(next * 5.42),
        old_price_usd: prev,
        source: "seed",
        recorded_at: daysAgo(int(1, 90)),
      });
    }
  }
  await insert("price_history", historyRows);

  // ── canonical_products (50) + vínculo nas offers ────────────────────────
  // O nome canônico recebe uma variação de título por índice: é justamente a
  // divergência de nomenclatura entre lojas que o Product Identity precisa
  // resolver, e o que a fila de merge apresenta ao revisor humano.
  const canonicalRows = MODELS.map(([brand, cat, model], i) => ({
    canonical_slug: slugify(`${brand} ${model}`) + "-canonical",
    name: TITLE_VARIANTS[i % TITLE_VARIANTS.length](`${brand} ${model}`),
    brand_id: brandBySlug.get(slugify(brand))!,
    category_id: catBySlug.get(slugify(cat))!,
    image_url: null,
    specifications: productRows[i].specifications,
  }));
  const canonicals = await insert("canonical_products", canonicalRows);

  for (let i = 0; i < offers.length; i += 200) {
    const chunk = offers.slice(i, i + 200);
    await Promise.all(
      chunk.map((o, j) =>
        db
          .from("offers")
          .update({ canonical_product_id: canonicals[offerMeta[i + j].productIdx].id })
          .eq("id", o.id)
      )
    );
  }
  console.log(`  offers.canonical_product_id  ${offers.length} vinculadas`);

  // ── merge_candidates (20) — cross-merchant, pendentes de revisão ────────
  // Pares entre canônicos da MESMA marca+categoria: é exatamente o formato
  // que a fila de revisão do Merge Queue Dashboard consome.
  const mergeRows: Record<string, unknown>[] = [];
  const usedPairs = new Set<string>();
  for (let a = 0; a < MODELS.length && mergeRows.length < 20; a++) {
    for (let b = a + 1; b < MODELS.length && mergeRows.length < 20; b++) {
      if (MODELS[a][0] !== MODELS[b][0] || MODELS[a][1] !== MODELS[b][1]) continue;
      const key = `${a}:${b}`;
      if (usedPairs.has(key)) continue;
      usedPairs.add(key);
      const confidence = round2(72 + rnd() * 26);
      mergeRows.push({
        source_canonical_product_id: canonicals[a].id,
        target_canonical_product_id: canonicals[b].id,
        confidence,
        algorithm_version: "seed-dev-1.0",
        matched_attributes: ["brand", "category"],
        mismatched_attributes: confidence < 85 ? ["armazenamento"] : [],
        penalties: [],
        reason: `Mesma marca (${MODELS[a][0]}) e categoria (${MODELS[a][1]}); títulos divergentes entre lojas.`,
        status: "pending",
      });
    }
  }
  await insert("merge_candidates", mergeRows);

  // ── market_changes (200) ────────────────────────────────────────────────
  const changeRows = Array.from({ length: 200 }, (_, i) => {
    const o = i % offers.length;
    const meta = offerMeta[o];
    const type = pick(CHANGE_TYPES);
    const isPrice = type === "price_increased" || type === "price_decreased";
    const prev = meta.price;
    const cur = type === "price_decreased" ? round2(prev * 0.92) : round2(prev * 1.07);
    return {
      change_type: type,
      entity_type: "offer",
      entity_id: offers[o].id,
      product_id: products[meta.productIdx].id,
      store_id: stores[meta.storeIdx].id,
      field: isPrice ? "price_usd" : "in_stock",
      previous_value: isPrice ? String(prev) : "true",
      current_value: isPrice ? String(cur) : "false",
      confidence: 1.0,
      source: "seed",
      detected_at: daysAgo(int(0, 14)),
    };
  });
  await insert("market_changes", changeRows);

  // ── market_pulse_snapshots (7 dias) ─────────────────────────────────────
  const pulseRows = Array.from({ length: 7 }, (_, d) => {
    const dropped = int(8, 40);
    const raised = int(4, 25);
    return {
      snapshot_date: new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10),
      prices_changed_count: dropped + raised,
      prices_dropped_count: dropped,
      prices_raised_count: raised,
      products_added_count: int(0, 6),
      products_removed_count: int(0, 3),
      top_categories: CATEGORIES.slice(0, 3).map((c) => ({ name: c.name, changes: int(3, 20) })),
      top_stores: STORES.slice(0, 3).map((s) => ({ name: s.name, changes: int(3, 18) })),
      cheapest_category: { name: CATEGORIES[5].name },
      most_expensive_move_category: { name: CATEGORIES[3].name },
    };
  });
  await insert("market_pulse_snapshots", pulseRows);

  // ── buyer_sessions (20) + buyer_events (100) ────────────────────────────
  const sessionRows = Array.from({ length: 20 }, (_, i) => ({
    anonymous_id: `dev-anon-${String(i + 1).padStart(3, "0")}`,
    device_type: pick(DEVICES),
    browser: pick(["Chrome", "Safari", "Firefox", "Edge"]),
    country: pick(["BR", "PY"]),
    city: pick(["Foz do Iguaçu", "Curitiba", "Ciudad del Este", "São Paulo"]),
    language: "pt-BR",
    entry_page: pick(["/", "/products", "/categorias"]),
    exit_page: pick(["/products", "/lojas", "/"]),
    event_count: 5,
    started_at: daysAgo(int(0, 20)),
    last_event_at: daysAgo(int(0, 20)),
    duration_seconds: int(45, 900),
  }));
  const sessions = await insert("buyer_sessions", sessionRows);

  const eventRows = Array.from({ length: 100 }, (_, i) => {
    const s = i % sessions.length;
    const o = i % offers.length;
    const meta = offerMeta[o];
    const type = pick(EVENT_TYPES);
    return {
      event_type: type,
      session_id: sessions[s].id,
      anonymous_id: sessionRows[s].anonymous_id,
      store_id: stores[meta.storeIdx].id,
      product_id: products[meta.productIdx].id,
      search_query: type === "SearchPerformed" ? pick(["iphone", "drone", "tv 65", "notebook"]) : null,
      page_url: `/product/${productRows[meta.productIdx].slug}`,
      referrer: pick(["/", "/products", null]),
      metadata: { offer_id: offers[o].id, source: "seed-dev" },
      occurred_at: daysAgo(int(0, 20)),
    };
  });
  await insert("buyer_events", eventRows);

  console.log("\nDataset de desenvolvimento inserido.");
}

main().catch((err) => {
  console.error("\nFalha no seed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
