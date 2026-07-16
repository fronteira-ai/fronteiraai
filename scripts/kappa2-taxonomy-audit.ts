/**
 * PROGRAM Κ (KAPPA) — MISSION Κ-2 — Objetivo 1: Auditoria completa da taxonomia.
 *
 * Read-only. No writes. Answers, with real data:
 *   - Quantas categorias existem hoje / são duplicadas (reaproveita a Κ-1)?
 *   - Quantas categorias têm nome predominantemente PT / ES / EN?
 *   - Quantos brands reais existem, e quantos são duplicatas
 *     (case/pontuação/whitespace) do mesmo nome normalizado?
 *
 * A detecção de idioma é uma heurística de dicionário fechado (marcadores
 * lexicais PT-only / ES-only já vistos em CATEGORY_SIMILARITY_ANALYSIS.md e
 * CATEGORY_CLUSTER_MATRIX.md — "de"/"para"/"ão" vs. "de"/"para"/"ón"/"ç"→"z"),
 * não um classificador de idioma real — cada categoria "Indeterminado" é
 * relatada como tal, nunca forçada em um dos 2 buckets.
 *
 * Uso: npx tsx scripts/kappa2-taxonomy-audit.ts
 */
import { getServiceClient } from "./lib/client";

const PAGE_SIZE = 1000;

async function fetchAll<T>(supabase: ReturnType<typeof getServiceClient>, table: string, columns: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`[kappa2-audit] ${table} query failed: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

// PT-only / ES-only lexical markers — small, closed, named-source dictionary
// (same discipline as kappa1-category-similarity.ts's SYNONYM_GROUPS): each
// marker was chosen because it appears in real category names already seen
// in this Program, never a general-purpose language model.
const PT_MARKERS = ["ão", "ções", "ão", "çã", "ê", "ô", "lh", "nh", "fone", "câ", "vídeo", "ó ", "óculo"];
const ES_MARKERS = ["ón", "ción", "ñ", "áv", "és", "cámara", "teléf", "juegu", "reloj", "azul", "ó de"];
const PT_WORDS = new Set(["de", "para", "com", "e", "sem", "fio", "câmeras", "carregadores", "impressoras", "óculos"]);
const ES_WORDS = new Set(["de", "para", "y", "sin", "cable", "cámaras", "cargadores", "impresoras", "gafas", "lentes"]);

type Language = "PT" | "ES" | "EN" | "Indeterminado";

function detectLanguage(name: string): Language {
  const lower = name.toLowerCase();
  let ptScore = 0;
  let esScore = 0;
  for (const m of PT_MARKERS) if (lower.includes(m)) ptScore++;
  for (const m of ES_MARKERS) if (lower.includes(m)) esScore++;

  const tokens = lower.normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z]+/).filter(Boolean);
  for (const t of tokens) {
    if (PT_WORDS.has(t) && !ES_WORDS.has(t)) ptScore++;
    if (ES_WORDS.has(t) && !PT_WORDS.has(t)) esScore++;
  }

  // Pure-ASCII, no PT/ES accented forms, and every token is a recognizable
  // English commerce word — reported only for the small set of category
  // names that are literally English words with no PT/ES signal at all
  // (e.g. "Speaker", "Games", "Home Theater").
  const hasAccent = /[àáâãéêíóôõúüçñ]/i.test(name);
  const EN_WORDS = new Set(["speaker", "speakers", "games", "home", "theater", "smart", "watch", "watches", "drone", "drones"]);
  const looksEnglish = !hasAccent && tokens.length > 0 && tokens.every((t) => EN_WORDS.has(t) || t.length <= 2);

  if (looksEnglish && ptScore === 0 && esScore === 0) return "EN";
  if (ptScore === 0 && esScore === 0) return "Indeterminado";
  if (ptScore > esScore) return "PT";
  if (esScore > ptScore) return "ES";
  return "Indeterminado";
}

function normalizeBrandName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[®™©]/g, "")
    .replace(/\b(inc|corp|corporation|company|co|ltd|llc|sa|srl)\b\.?/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
}
interface BrandRow {
  id: string;
  name: string;
  slug: string;
}

async function main() {
  const supabase = getServiceClient();
  const [categories, brands] = await Promise.all([
    fetchAll<CategoryRow>(supabase, "categories", "id, name, slug"),
    fetchAll<BrandRow>(supabase, "brands", "id, name, slug"),
  ]);

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  MISSION Κ-2 — Objetivo 1: Taxonomy Audit                  ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  console.log(`Categorias totais: ${categories.length}`);

  const langCounts: Record<Language, number> = { PT: 0, ES: 0, EN: 0, Indeterminado: 0 };
  const examplesByLang: Record<Language, string[]> = { PT: [], ES: [], EN: [], Indeterminado: [] };
  for (const c of categories) {
    const lang = detectLanguage(c.name);
    langCounts[lang]++;
    if (examplesByLang[lang].length < 8) examplesByLang[lang].push(c.name);
  }
  console.log(`\n— Distribuição de idioma (heurística lexical, ver cabeçalho do script) —`);
  for (const lang of ["PT", "ES", "EN", "Indeterminado"] as Language[]) {
    console.log(`  ${lang}: ${langCounts[lang]} (${((langCounts[lang] / categories.length) * 100).toFixed(1)}%) — ex: ${examplesByLang[lang].join(", ")}`);
  }

  console.log(`\nBrands totais: ${brands.length}`);
  const brandGroups = new Map<string, BrandRow[]>();
  for (const b of brands) {
    const norm = normalizeBrandName(b.name);
    if (!brandGroups.has(norm)) brandGroups.set(norm, []);
    brandGroups.get(norm)!.push(b);
  }
  const duplicateGroups = [...brandGroups.entries()].filter(([, rows]) => rows.length > 1);
  const duplicateBrandRows = duplicateGroups.reduce((sum, [, rows]) => sum + rows.length, 0);

  console.log(`\n— Duplicatas de marca (normalização de caixa/pontuação/sufixo corporativo) —`);
  console.log(`Grupos com 2+ variantes do mesmo nome normalizado: ${duplicateGroups.length}`);
  console.log(`Linhas de brands envolvidas: ${duplicateBrandRows} / ${brands.length} (${((duplicateBrandRows / brands.length) * 100).toFixed(1)}%)`);
  console.log(`\n— Todos os grupos de duplicata encontrados —`);
  for (const [norm, rows] of duplicateGroups.sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  "${norm}" <- [${rows.map((r) => `"${r.name}"`).join(", ")}]`);
  }

  console.log("\n[kappa2-taxonomy-audit] done.");
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
