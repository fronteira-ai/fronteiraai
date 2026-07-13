/**
 * PROGRAM Κ (KAPPA) — MISSION Κ-1 — Objetivo 2/3: Similarity & Clustering.
 *
 * Read-only. No writes, no new categories, no DB changes. Computes, for
 * every pair of `categories` rows, a lexical similarity (normalized name
 * token Jaccard + Levenshtein ratio + a small PT/ES/EN commerce-synonym
 * dictionary) and a product-context similarity (predominant-brand overlap +
 * specification-key overlap, both derived from `products`), then unions
 * high-confidence pairs into clusters (Union-Find). Medium-confidence pairs
 * are reported separately as "ambíguas" (manual review), never auto-merged.
 *
 * This is measurement only — no category is merged, renamed, or created in
 * the database. Output is consumed by hand to write
 * docs/product/CATEGORY_SIMILARITY_ANALYSIS.md and
 * docs/product/CATEGORY_CLUSTER_MATRIX.md.
 *
 * Uso:
 *   npx tsx scripts/kappa1-category-similarity.ts
 */
import { getServiceClient } from "./lib/client";

const PAGE_SIZE = 1000;

async function fetchAll<T>(supabase: ReturnType<typeof getServiceClient>, table: string, columns: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`[kappa1-similarity] ${table} query failed: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
}
interface ProductRow {
  id: string;
  category_id: string | null;
  brand_id: string | null;
  specifications: Record<string, string> | null;
}

// Small bilingual (PT/ES) + EN commerce-synonym dictionary. Only added where
// Sprint 2.4 (CATEGORY_NORMALIZATION_REPORT.md §2) or this Sprint's own
// inventory found real cross-merchant name variance that plain edit-distance
// would NOT catch (i.e. the words are not near-cognates). Deliberately
// small and named-source, not a general-purpose translator.
const SYNONYM_GROUPS: string[][] = [
  ["fone", "fones", "auricular", "auriculares", "headset", "headsets"],
  ["celular", "celulares", "smartphone", "smartphones", "telefone", "movil", "moviles"],
  ["notebook", "notebooks", "laptop", "laptops"],
  ["tv", "tvs", "televisor", "televisores", "televisao"],
  ["geladeira", "heladera", "refrigerador", "refrigeradores"],
  ["caixa", "altavoz", "altavoces", "parlante", "parlantes", "speaker", "speakers"],
  ["roteador", "router", "roteadores", "routers"],
  ["jogo", "jogos", "juego", "juegos", "game", "games"],
  ["impressora", "impressoras", "impresora", "impresoras"],
  ["mouse", "mouses", "raton"],
  ["cafeteira", "cafetera", "cafeteras"],
  ["aspirador", "aspiradores", "aspiradora", "aspiradoras"],
  ["cartao", "cartoes", "tarjeta", "tarjetas"],
  ["fritadeira", "airfryer", "friteira"],
  ["camara", "camaras", "camera", "cameras"],
  ["reloj", "relogio", "relogios", "relojes", "watch", "watches"],
  ["monitor", "monitores"],
];
const synonymOf = new Map<string, string>();
for (const group of SYNONYM_GROUPS) {
  const canon = group[0];
  for (const word of group) synonymOf.set(word, canon);
}

const STOPWORDS = new Set([
  "de", "da", "do", "das", "dos", "e", "y", "para", "com", "a", "o", "el", "la",
  "las", "los", "para o", "&", "-",
]);

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normalize(value: string): string {
  return stripAccents(value.toLowerCase())
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Heuristic PT/ES pluralization strip — documented as a heuristic, not an
// authoritative stemmer (see CATEGORY_SIMILARITY_ANALYSIS.md §1 caveats).
function stem(token: string): string {
  const syn = synonymOf.get(token);
  if (syn) return syn;
  if (token.length > 5 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

function tokenSet(name: string): Set<string> {
  const norm = normalize(name);
  const tokens = norm.split(" ").filter((t) => t.length > 0 && !STOPWORDS.has(t));
  return new Set(tokens.map(stem));
}

function jaccard<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const x of a) if (b.has(x)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

function levenshteinRatio(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// Generic/fallback bucket detector — same insight as
// CATEGORY_NORMALIZATION_REPORT.md §3 ("GENERAL"/"Outros" are non-informative
// merchant-taxonomy roots, not real product categories).
const GENERIC_NAMES = new Set([
  "general", "geral", "electronicos", "eletronicos", "outros", "otros", "diversos",
  "salud y belleza", "casa y escritorio", "varios", "accesorios", "acessorios",
]);
function isGenericBucket(normName: string): boolean {
  return GENERIC_NAMES.has(normName);
}

interface CategoryFeatures {
  id: string;
  name: string;
  slug: string;
  normName: string;
  tokens: Set<string>;
  productCount: number;
  brandCounts: Map<string, number>;
  specKeys: Set<string>;
  generic: boolean;
}

class UnionFind {
  parent = new Map<string, string>();
  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x);
    let root = x;
    while (this.parent.get(root) !== root) root = this.parent.get(root)!;
    let cur = x;
    while (this.parent.get(cur) !== root) {
      const next = this.parent.get(cur)!;
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }
  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

async function main() {
  const supabase = getServiceClient();
  const [categories, products] = await Promise.all([
    fetchAll<CategoryRow>(supabase, "categories", "id, name, slug"),
    fetchAll<ProductRow>(supabase, "products", "id, category_id, brand_id, specifications"),
  ]);

  const productsByCategory = new Map<string, ProductRow[]>();
  for (const p of products) {
    if (!p.category_id) continue;
    if (!productsByCategory.has(p.category_id)) productsByCategory.set(p.category_id, []);
    productsByCategory.get(p.category_id)!.push(p);
  }

  const features: CategoryFeatures[] = categories.map((c) => {
    const norm = normalize(c.name);
    const prods = productsByCategory.get(c.id) ?? [];
    const brandCounts = new Map<string, number>();
    const specKeys = new Set<string>();
    for (const p of prods) {
      if (p.brand_id) brandCounts.set(p.brand_id, (brandCounts.get(p.brand_id) ?? 0) + 1);
      if (p.specifications) for (const k of Object.keys(p.specifications)) specKeys.add(k.toLowerCase());
    }
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      normName: norm,
      tokens: tokenSet(c.name),
      productCount: prods.length,
      brandCounts,
      specKeys,
      generic: isGenericBucket(norm),
    };
  });

  const byId = new Map(features.map((f) => [f.id, f]));

  // Minimum sample size before brand/spec overlap is trusted as a signal.
  // Below this, two categories with 1-2 products each can hit brandJaccard=1
  // or specJaccard=1 by pure chance (same single supplying brand), which is
  // noise, not evidence — this caused a first-draft bug where >500 unrelated
  // categories chained into one cluster via Union-Find over noisy "context"
  // edges (see CATEGORY_SIMILARITY_ANALYSIS.md §1, "Correção metodológica").
  const MIN_SAMPLE_FOR_CONTEXT = 5;

  interface Edge {
    a: string;
    b: string;
    lexScore: number;
    contextScore: number | null;
    tier: "Alta" | "Média" | "Ambígua";
  }
  const edges: Edge[] = [];
  const uf = new UnionFind();

  for (let i = 0; i < features.length; i++) {
    const A = features[i];
    if (A.generic) continue; // generic buckets are handled separately, never auto-clustered
    for (let j = i + 1; j < features.length; j++) {
      const B = features[j];
      if (B.generic) continue;

      const jac = jaccard(A.tokens, B.tokens);
      // Whole-string Levenshtein is only trustworthy when BOTH names reduce
      // to a single content token: it catches irregular singular/plural or
      // PT/ES spelling variance ("Aspirador"/"Aspiradora") not covered by the
      // stem/synonym dictionary. Applying it to multi-token names is unsafe —
      // a shared template phrase ("Accesorios para Notebook" vs "Accesorios
      // para iPhone") dominates the edit distance even though the concepts
      // differ entirely; this produced a false 173-category supercluster in
      // an earlier draft (see CATEGORY_SIMILARITY_ANALYSIS.md §1). A second
      // draft restricted Levenshtein to single-token pairs but still chained
      // unrelated short words ("Facas"/"Tazas", 5 letters, 2 edits = ratio
      // 0.6) into an 84-category supercluster — short strings collide by
      // chance far more often than long ones. Fixed by requiring a minimum
      // length (>=7 chars) AND a much higher ratio (>=0.8, i.e. at most ~1
      // edit per 5 chars) before Levenshtein alone can promote a pair to
      // "Alta" — real singular/plural/spelling variants clear this easily
      // ("Aspirador"/"Aspiradora" = 0.90, "Impressoras"/"Impresoras" = 0.91),
      // coincidental short-word collisions do not.
      let lexScore = jac;
      if (A.tokens.size === 1 && B.tokens.size === 1) {
        const minLen = Math.min(A.normName.length, B.normName.length);
        if (minLen >= 7) {
          const lev = levenshteinRatio(A.normName, B.normName);
          if (lev >= 0.8) lexScore = Math.max(lexScore, lev);
        }
      }
      if (lexScore < 0.35) continue; // below floor: no relationship signal at all

      const sampleOk = A.productCount >= MIN_SAMPLE_FOR_CONTEXT && B.productCount >= MIN_SAMPLE_FOR_CONTEXT;
      const brandJac = jaccard(new Set(A.brandCounts.keys()), new Set(B.brandCounts.keys()));
      const specJac = jaccard(A.specKeys, B.specKeys);
      const contextScore = sampleOk ? 0.5 * brandJac + 0.5 * specJac : null;

      // Clustering (Objetivo 3 "equivalentes") only ever unions on lexScore
      // >= 0.6 — a robust, sample-size-independent signal (name/slug text).
      // contextScore is corroborating evidence for the "Média" tier, surfaced
      // as individual reviewable pairs, but deliberately NEVER fed into
      // Union-Find — transitive closure over a noisy signal is what produced
      // the false supercluster in the first draft.
      let tier: Edge["tier"];
      if (lexScore >= 0.6) tier = "Alta";
      else if (contextScore !== null && contextScore >= 0.4) tier = "Média";
      else tier = "Ambígua";

      edges.push({ a: A.id, b: B.id, lexScore, contextScore, tier });
      if (tier === "Alta") uf.union(A.id, B.id);
    }
  }

  // Materialize clusters — Alta-only union (see comment above).
  const clusterMembers = new Map<string, string[]>();
  for (const f of features) {
    if (f.generic) continue;
    const root = uf.find(f.id);
    if (!clusterMembers.has(root)) clusterMembers.set(root, []);
    clusterMembers.get(root)!.push(f.id);
  }
  const realClusters = [...clusterMembers.values()].filter((members) => members.length > 1);

  const genericCategories = features.filter((f) => f.generic);
  const ambiguousOnly = edges.filter((e) => e.tier === "Ambígua");

  // "Única" = no edge of ANY tier (Alta/Média/Ambígua) touches this category —
  // a stricter bar than "not unioned into a cluster", since a category can
  // have an unresolved Média/Ambígua candidate without ever being merged.
  const idsInAnyEdge = new Set<string>();
  for (const e of edges) {
    idsInAnyEdge.add(e.a);
    idsInAnyEdge.add(e.b);
  }
  const trueUniques = features.filter((f) => !f.generic && !idsInAnyEdge.has(f.id));

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  MISSION Κ-1 — Objetivo 2/3: Similarity & Clustering       ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  console.log(`Categorias totais: ${features.length}`);
  console.log(`Categorias genéricas/fallback (excluídas do clustering): ${genericCategories.length}`);
  for (const g of genericCategories) console.log(`  - ${g.name} (${g.slug}) — ${g.productCount} produtos`);

  console.log(`\nPares avaliados com lexScore >= 0.35: ${edges.length}`);
  console.log(`  Alta confiança:   ${edges.filter((e) => e.tier === "Alta").length}`);
  console.log(`  Média confiança:  ${edges.filter((e) => e.tier === "Média").length}`);
  console.log(`  Ambígua:          ${ambiguousOnly.length}`);

  console.log(`\nClusters formados (Alta apenas, 2+ categorias): ${realClusters.length}`);
  console.log(`Categorias que entraram em algum cluster: ${realClusters.reduce((s, c) => s + c.length, 0)}`);
  console.log(
    `Categorias "únicas" (nenhum edge de nenhum tier, não genéricas): ${trueUniques.length} / ${features.length - genericCategories.length}`
  );

  console.log(`\n— Clusters detalhados (ordenados por soma de produtos) —`);
  const clustersDetailed = realClusters
    .map((members) => {
      const feats = members.map((id) => byId.get(id)!);
      const totalProducts = feats.reduce((s, f) => s + f.productCount, 0);
      return { feats, totalProducts };
    })
    .sort((a, b) => b.totalProducts - a.totalProducts);

  for (const { feats, totalProducts } of clustersDetailed) {
    console.log(`\n  CLUSTER (${feats.length} categorias, ${totalProducts} produtos combinados):`);
    for (const f of feats) {
      console.log(`    - "${f.name}" (${f.slug}) — ${f.productCount} produtos`);
    }
  }

  console.log(`\n— Pares Ambíguos (precisam revisão manual, NÃO unidos) —`);
  for (const e of ambiguousOnly.sort((a, b) => b.lexScore - a.lexScore)) {
    const A = byId.get(e.a)!;
    const B = byId.get(e.b)!;
    const ctx = e.contextScore === null ? "n/a (amostra pequena)" : e.contextScore.toFixed(2);
    console.log(
      `  "${A.name}" (${A.productCount}p) <-> "${B.name}" (${B.productCount}p) — lex=${e.lexScore.toFixed(2)} ctx=${ctx}`
    );
  }

  console.log(`\n— Pares Média confiança (lex 0.35-0.6 + contexto >=0.4, NÃO unidos automaticamente, revisão leve recomendada) —`);
  const mediaOnly = edges.filter((e) => e.tier === "Média");
  for (const e of mediaOnly.sort((a, b) => (b.contextScore ?? 0) - (a.contextScore ?? 0))) {
    const A = byId.get(e.a)!;
    const B = byId.get(e.b)!;
    console.log(
      `  "${A.name}" (${A.productCount}p) <-> "${B.name}" (${B.productCount}p) — lex=${e.lexScore.toFixed(2)} ctx=${(e.contextScore ?? 0).toFixed(2)}`
    );
  }

  console.log(`\n— Categorias "únicas" com >=10 produtos (conceitos genuinamente distintos, maior massa) —`);
  const uniqueBig = trueUniques.filter((f) => f.productCount >= 10).sort((a, b) => b.productCount - a.productCount);
  for (const f of uniqueBig) console.log(`  ${f.name} (${f.slug}) — ${f.productCount} produtos`);

  console.log("\n[kappa1-category-similarity] done.");
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
