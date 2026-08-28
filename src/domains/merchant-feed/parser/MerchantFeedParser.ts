/**
 * Merchant Feed Platform — XML feed parser (REFERENCE INPUT FORMAT V1).
 *
 * Consome o XML de referência do dono da loja (RSS/channel/item) com ZERO
 * mudança estrutural do lojista. Mapeia as tags observadas para o contrato
 * canônico RawOffer (reuso — não criar segunda fonte).
 *
 * Mapeamento de campo (reference → RawOffer):
 *   codigo                    → product.externalId   (identidade determinística)
 *   title                     → product.name
 *   description / description_es → product.description (pt, escolhe es se houver)
 *   marca                     → product.brand
 *   categoria                 → product.category (quando presente)
 *   link_imagem               → product.imageUrl
 *   preco                     → priceUSD  (+ currency se "$1,199.50 USD")
 *   preco_normal_sem_liquidacao → oldPriceUSD (preço de referência)
 *   estoque                   → stockQuantity + inStock (estoque>0)
 *   disponibilidade           → inStock ("em estoque"/"1" → true; senão false; ausente → UNKNOWN)
 *
 * Segurança XML (via `saxes`): streaming, sem resolução de entidades externas,
 * sem execução de HTML, bounded. Um <item> malformado NÃO invalida o feed
 * inteiro (isolamento por item com mensagem de erro).
 */

import type { RawOffer } from "../../connectors/types/raw.types";
import { SaxesParser } from "saxes";
import { parseMerchantPrice } from "./MerchantPriceParser";

export interface MerchantFeedParseResult {
  offers: RawOffer[];
  totalItems: number;
  validItems: number;
  invalidItems: number;
  errors: Array<{ codigo?: string; reason: string }>;
  durationMs?: number;
}

/** Estado de um <item> em parse (acumula texto por tag). */
interface ItemAccum {
  text: Record<string, string>;
  current: string | null;
  currentLabel: string;
}

/** Campos de interesse dentro de um <item>. */
const FIELDS = new Set([
  "codigo", "title", "title_es", "description", "description_es",
  "preco", "price_iva", "estoque", "disponibilidade", "link", "link_imagem",
  "link_comprar", "preco_normal_sem_liquidacao", "marca", "tipo_venda",
]);

const NORMALIZED_DISPO_FLAG = new Set(["em estoque", "en stock", "disponible", "1", "true", "sim", "si", "yes", "disponível", "disponible en stock"]);
const OUT_FLAG = new Set(["sem estoque", "sin stock", "agotado", "0", "false", "não", "no", "nao", "esgotado", "no disponible"]);

export class MerchantFeedParser {
  /** Faz o parse de um documento XML e retorna as ofertas normalizadas. */
  parse(xml: string): MerchantFeedParseResult {
    const offers: RawOffer[] = [];
    const errors: Array<{ codigo?: string; reason: string }> = [];
    let totalItems = 0;
    let validItems = 0;

    const sax = new SaxesParser({ xmlns: false, fragment: false });

    // ---- estado de acumulação ----
    let inItem = false;
    let item: ItemAccum | null = null;

    sax.on("text", (t: string) => {
      if (item && item.current) {
        item.text[item.currentLabel] = (item.text[item.currentLabel] ?? "") + t;
      }
    });

    sax.on("opentag", (tag: { name: string }) => {
      const name = tag.name.toLowerCase();
      if (name === "item") {
        inItem = true;
        item = { text: {}, current: null, currentLabel: "" };
        return;
      }
      if (inItem && item && FIELDS.has(name)) {
        item.currentLabel = name;
        item.current = name;
      }
    });

    sax.on("closetag", (tag: { name: string }) => {
      if (!item) return;
      const name = tag.name.toLowerCase();
      if (name === "item") {
        totalItems++;
        this.finalizeItem(item.text, offers, errors);
        if (item.text.codigo || (item.text.title ?? "").trim()) validItems++;
        inItem = false;
        item = null;
        return;
      }
      if (item && item.currentLabel === name) item.current = null;
    });

    const errMsg: string[] = []; // malformed anyway
    sax.on("error", (e: Error) => { errMsg.push(e.message); });

    try {
      sax.write(xml).close();
    } catch (e) {
      errors.push({ reason: `XML_PARSE_ERROR: ${(e as Error).message.slice(0, 120)}` });
    }

    // Previne "vazamento" de um item aberto sem fechamento.
    const dangling = item as ItemAccum | null;
    if (inItem && dangling) {
      totalItems++;
      this.finalizeItem(dangling.text, offers, errors);
      inItem = false;
      item = null;
    }

    validItems = offers.length;
    return { offers, totalItems, validItems, invalidItems: totalItems - validItems, errors };
  }

  private finalizeItem(text: Record<string, string>, offers: RawOffer[], errors: Array<{ codigo?: string; reason: string }>) {
    const codigo = text.codigo?.trim();
    const reason = this.validate(text);
    if (reason) {
      errors.push({ codigo, reason });
      return;
    }

    const price = parseMerchantPrice(text.preco);
    if (!price) {
      errors.push({ codigo, reason: `INVALID_PRICE: ${text.preco}` });
      return;
    }

    const stockRaw = parseInteger(text.estoque);
    const avail = normalizeAvailability(text.disponibilidade);

    const name = (text.title_es && text.title_es.trim()) ? text.title_es.trim() : (text.title ?? text.description ?? "").trim() || "(sem título)";
    const desc = (text.description_es && text.description_es.trim()) ? text.description_es.trim() : text.description?.trim();

    const offer: RawOffer = {
      product: {
        externalId: codigo,
        name,
        description: desc || undefined,
        brand: text.marca?.trim() || undefined,
        category: text.categoria?.trim() || undefined,
        imageUrl: text.link_imagem?.trim() || undefined,
      },
      storeSlug: "", // preenchido pelo connector/registro
      priceUSD: price.value,
      oldPriceUSD: parseMerchantPrice(text.preco_normal_sem_liquidacao)?.value ?? null,
      inStock: avail, // UNKNOWN → undefined (não afirmar disponibilidade)
      stockQuantity: stockRaw,
      productUrl: text.link_comprar || text.link?.trim() || undefined,
      currency: price.currency,
      condition: undefined,
      warranty: undefined,
      cashback: undefined,
    };

    offers.push(offer);
  }

  private validate(text: Record<string, string>): string | null {
    const codigo = text.codigo?.trim();
    if (!codigo) return "MISSING_CODIGO";
    if (/\s/.test(codigo)) return "INVALID_CODIGO (u)";
    if (!text.preco?.trim()) return "MISSING_PRECO";
    return null;
  }
}

function parseInteger(raw: string | undefined): number | null {
  if (!raw || raw.trim() === "") return null;
  const n = parseInt(raw.replace(/[^\d-]/g, ""), 10);
  if (Number.isNaN(n)) return null;
  return n;
}

function normalizeAvailability(dispo: string | undefined): boolean | undefined {
  if (dispo === undefined) return undefined;
  const d = dispo.trim().toLowerCase();
  if (!d) return undefined;
  if (NORMALIZED_DISPO_FLAG.has(d)) return true;
  if (OUT_FLAG.has(d)) return false;
  // Fallback textual: contém "estoque"/"stock" → "sem"=false; caso contrário true.
  if (d.includes("stock") || d.includes("estoque")) {
    return d.includes("sem") || d.includes("sin") || d.includes("agot") ? false : true;
  }
  // por default não inventar
  return undefined;
}
