/**
 * Merchant Feed Platform — CSV feed parser (V1).
 *
 * Implementação mínima mas segura de CSV p/ o Merchant Console (imports) e p/
 * feed URL: normaliza no MESMO contrato RawOffer dos parsers XML/JSON (reuso
 * `rowToOffer`). Suporta:
 *   - UTF-8 (e BOM); encoding inválido/não-utf8 é rejeitado com erro claro
 *   - linha de cabeçalho com nomes arbitrários da loja → field mapping declarativo
 *     (ex.: "codigo_produto"→external_id, "valor"→price, "saldo"→stock, ...)
 *   - malformado (linha com nº de colunas diferente do esperado) → item isolado
 *   - segurança: contorna injeção de fórmula (prefixos '=','+','-','@' neutralizados
 *     nas células textuais) e rejeita campos de fórmula perigosos sem executar nada.
 *
 * NÃO executa planilhas/fórmulas. Nada aqui é eval.
 */

import type { RawOffer } from "../../connectors/types/raw.types";
import type { MerchantFeedParseResult } from "./MerchantFeedParser";
import { type MerchantSourceConfig, type MerchantFieldSlot } from "../config/MerchantSourceConfig";
import { rowToOffer } from "./rowNormalizer";

const MAX_CSV_BYTES = 5 * 1024 * 1024; // 5 MiB — oversized upload é rejeitado

/** Prefixos de fórmula que ameaçam exportação (CSV injection). */
const FORMULA_PREFIX = new Set(["=", "+", "-", "@", "\t", "\r"]);

export interface CsvMappingResult {
  headers: string[];
  /** schema mapeado por estado: header → slot. */
  mapping: Partial<Record<string, MerchantFieldSlot>>;
}

export class MerchantCsvFeedParser {
  /**
   * @param cfg config declarativa (sourceType CSV_FEED + fieldMapping opcional).
   *   Se fieldMapping ausente/parcial, pode-se passar `mapping` por coluna na
   *   chamada (ex.: UI de mapeamento do Merchant Console).
   */
  constructor(private readonly cfg: MerchantSourceConfig, private readonly columnMapping?: Record<string, MerchantFieldSlot>) {}

  parse(csvText: string): MerchantFeedParseResult & { headers: string[] } {
    const offers: RawOffer[] = [];
    const errors: Array<{ codigo?: string; reason: string }> = [];
    let totalItems = 0;

    // --- encoding/segurança básica ---
    if (Buffer.byteLength(csvText, "utf8") > MAX_CSV_BYTES) {
      return { offers, totalItems: 0, validItems: 0, invalidItems: 0, errors: [{ reason: "CSV_TOO_LARGE" }], headers: [] };
    }
    // Rejeita bytes binários (encodings não-textuais/UTF-16 sem BOM são lidos como lixo).
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(csvText.slice(0, 2000))) {
      return { offers, totalItems: 0, validItems: 0, invalidItems: 0, errors: [{ reason: "CSV_BINARY_ENCODING" }], headers: [] };
    }

    const rows = parseCsvRows(csvText.replace(/^\uFEFF/, ""), detectDelimiter(csvText.replace(/^\uFEFF/, ""))); // remove BOM
    if (rows.length === 0) {
      return { offers, totalItems: 0, validItems: 0, invalidItems: 0, errors: [{ reason: "CSV_EMPTY" }], headers: [] };
    }

    // Cabeçalho = primeira linha.
    const headers = rows[0].map((h) => sanitizeHeader(h));
    const dataRows = rows.slice(1);
    totalItems = dataRows.length;

    // Mapa coluna(header) → slot.
    const headerToSlot = this.buildHeaderMapping(headers);

    for (const row of dataRows) {
      if (row.length === 0 || row.every((c) => c.trim() === "")) continue; // linha vazia ignorada
      if (row.length !== headers.length) {
        errors.push({ reason: `CSV_COLUMN_COUNT row(${row.length}) != header(${headers.length})` });
        continue;
      }
      const record: Record<string, string> = {};
      for (let i = 0; i < headers.length; i++) {
        record[headers[i]] = neutralizeFormula(row[i] ?? "");
      }
      const read = this.makeFieldReader(record, headerToSlot);
      const res = rowToOffer(read);
      if (res.reason || !res.offer) {
        errors.push({ codigo: res.codigo, reason: res.reason ?? "INVALID" });
        continue;
      }
      offers.push(res.offer);
    }

    return { offers, totalItems, validItems: offers.length, invalidItems: totalItems - offers.length, errors, headers };
  }

  /** Detecta e devolve o mapeamento coável para a UI (header → slot). */
  detectCsvMapping(csvText: string): CsvMappingResult {
    const clean = csvText.replace(/^\uFEFF/, "");
    const rows = parseCsvRows(clean, detectDelimiter(clean));
    const headers = (rows[0] ?? []).map((h) => sanitizeHeader(h));
    const headerToSlot = this.buildHeaderMapping(headers);
    const mapping: Partial<Record<string, MerchantFieldSlot>> = {};
    for (const h of headers) if (headerToSlot[h]) mapping[h] = headerToSlot[h];
    return { headers, mapping };
  }

  private buildHeaderMapping(headers: string[]): Record<string, MerchantFieldSlot> {
    // Inverte fieldMapping (slot→coluna) para procurar coluna→slot por nome de coluna.
    const slotByColumn: Record<string, MerchantFieldSlot> = {};
    for (const [slot, col] of Object.entries(this.cfg.fieldMapping ?? {})) {
      if (isSlotCol(col)) slotByColumn[col] = slot as unknown as MerchantFieldSlot;
    }
    const out: Record<string, MerchantFieldSlot> = {};
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      const slot = this.columnMapping?.[h] ?? inferSlotFromHeader(h) ?? slotByColumn[h];
      if (slot) out[h] = slot;
    }
    return out;
  }

  private makeFieldReader(record: Record<string, string>, map: Record<string, MerchantFieldSlot>) {
    return (slot: MerchantFieldSlot): string | undefined => {
      const header = Object.keys(map).find((k) => map[k] === slot);
      if (!header) return undefined;
      return record[header];
    };
  }
}

function sanitizeHeader(h: string): string {
  return h.trim().replace(/^\uFEFF/, "");
}

/** true se `v` for um nome de slot canônico (external_id/price/...). */
function isSlotCol(v: string | undefined): v is MerchantFieldSlot {
  return !!v && [
    "external_id", "title", "title_es", "description", "brand", "category", "price",
    "price_iva", "regular_price", "currency", "stock", "availability", "image",
    "product_url", "updated_at",
  ].includes(v);
}

/** Infere o slot canônico a partir de um nome de coluna comum da loja. */
function inferSlotFromHeader(h: string): MerchantFieldSlot | undefined {
  const k = h.trim().toLowerCase().replace(/[_\-\s]+/g, "");
  switch (k) {
    case "codigo": case "id": case "sku": case "codigoproduto": case "codprod": case "productid": case "productcode": return "external_id";
    case "produto": case "nome": case "name": case "titulo": case "product": case "description": case "descricao": case "tituloproduto": return "title";
    case "marca": case "brand": case "marcaprod": return "brand";
    case "preco": case "price": case "valor": case "precofinal": case "preciousd": return "price";
    case "precoiva": case "priceiva": return "price_iva";
    case "preconormal": case "precoregular": case "regularprice": case "precosemdesconto": return "regular_price";
    case "estoque": case "stock": case "quantidade": case "saldo": case "qtd": return "stock";
    case "disponibilidade": case "availability": case "disponivel": return "availability";
    case "imagem": case "image": case "foto": case "imagemurl": case "imageurl": case "linkimagem": return "image";
    case "url": case "link": case "producturl": case "produtourl": case "linkcompra": return "product_url";
    case "moeda": case "currency": return "currency";
    case "categoria": case "category": return "category";
    default: return undefined;
  }
}

/** Neutraliza injeção de fórmula em CÉLULAS exportadas/importadas (prefixos '='/+/-/@'). */
export function neutralizeFormula(value: string): string {
  if (!value) return value;
  const first = value.charAt(0);
  if (FORMULA_PREFIX.has(first)) return `'${value}`;
  return value;
}

/** Detecta o delimitador de colunas da primeira linha (`,` / `;` / `\t`). */
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/)[0]?.slice(0, 4000) ?? "";
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  let inQ = false;
  for (let i = 0; i < firstLine.length; i++) {
    const c = firstLine[i];
    if (c === '"') inQ = !inQ;
    else if (!inQ && counts[c] !== undefined) counts[c]++;
  }
  if (counts[";"] >= counts[","] && counts[";"] > 0) return ";";
  if (counts["\t"] >= counts[","] && counts["\t"] > 0) return "\t";
  return ",";
}

/** Parse CSV simples (citações ", escapes "", CRLF/LF) sem dependência. */
function parseCsvRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === delimiter) { row.push(field); field = ""; i++; continue; }
    if (c === "\n" || (c === "\r" && text[i + 1] === "\n") || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 0 || rows.length === 0) rows.push(row);
      row = [];
      i++; continue;
    }
    field += c; i++;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}
