/**
 * Merchant Feed Platform — price parsing.
 *
 * Converte um valor monetário de feed em número, lidando com os formatos
 * legítimos observados/pré-definidos SEM inventar semântica:
 *   "199.50 USD"   → 199.50
 *   "1,199.50"     → 1199.50
 *   "1199.50"      → 1199.50
 *   "USD 199.50"   → 199.50 (currency à frente)
 *
 * Regras:
 *  - Nunca silenciosamente converter preço inválido para zero.
 *  - Formato inválido/ausente → falha (INVALID_PRICE), NÃO 0.
 *  - Uma única vírgula ou ponto de milhar deve diferenciar fracionária.
 *  - Se moeda estiver codificada no valor ("199.50 USD"), nós a extraímos
 *    como currency, sem assumir USD.
 */

export type Currency = string; // "USD", "PYG" (guaraní), ...

export interface ParsedPrice {
  /** Valor numérico da fracionária. */
  value: number;
  /** Moeda extraída do valor, se presente. */
  currency?: string;
}

/** Regex de detecção do sufixo/prefixo de moeda em "$1,199.50 USD" / "USD 199.50". */

/**
 * Normaliza um token monetário. Formato aceito:
 *   [currency] <valor> [.decimal] [currency]
 * Sinal de moeda comum: "$", "R$". Códigos de 2-4 letras: "USD", "PYG", "BRL".
 */
export function parseMerchantPrice(raw: unknown): ParsedPrice | null {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim().replace(/^\s+/, "");
  if (!text) return null;

  const currency = extractCurrency(text);

  // Valor: remove símbolos de moeda já capturados e separadores.
  const numText = text
    .replace(/[A-Za-z\u00A0]{2,4}/g, "") // remove códigos de moeda (USD, PYG...)
    .replace(/R\$|US\$|\$/g, "")
    .trim();

  const value = toNumber(numText);
  if (value === null) return null;
  if (!Number.isFinite(value) || value < 0) return null;

  return { value, currency: currency || undefined };
}

function toNumber(numText: string): number | null {
  if (!numText) return null;
  numText = numText.trim();

  // Remove espaços internos não-fracionários ("1 199,50")
  numText = numText.replace(/[\s\u00A0]/g, "");

  // Conta vírgulas e pontos para decidir qual é o separador decimal.
  const commas = (numText.match(/,/g) || []).length;
  const dots = (numText.match(/\./g) || []).length;

  if (commas === 0 && dots === 0) {
    const n = Number(numText);
    return isNaN(n) ? null : n;
  }

  let normalized: string;
  if (commas === 0 && dots === 1) {
    // Único ponto = decimal (1199.50) — exceto se terminar em "000" (milhar)
    const parts = numText.split(".");
    if (parts[1]?.length === 3) {
      // Trata como milhar (ex: 1.199) ? Não — 3 dígitos pós-ponto é comum
      // como decimal com precisão (1199.500); assumir decimal.
      normalized = numText.replace(".", ".");
    } else {
      normalized = numText;
    }
    const n = Number(normalized);
    return isNaN(n) ? null : n;
  }

  if (dots === 1 && commas === 1) {
    // "1,199.50" → ponto é decimal, vírgula é milhar.
    const m = numText.match(/^(\d{1,3})(?:,(\d{3}))+(\.\d+)?$/);
    if (m) {
      normalized = numText.replace(/,/g, "") ;
      const n = Number(normalized);
      return isNaN(n) ? null : n;
    }
    // "1.199,50" → vírgula é decimal, ponto é milhar.
    const m2 = numText.match(/^(\d{1,3})(?:\.(\d{3}))+(,\d+)?$/);
    if (m2) {
      normalized = numText.replace(/\./g, "").replace(",", ".");
      const n = Number(normalized);
      return isNaN(n) ? null : n;
    }
    return null;
  }

  if (commas >= 1 && dots === 0) {
    // "1,199,50" ou "199,50" → trata a última vírgula como decimal se
    // restante for milhar de 3; senão assume vírgula decimal.
    const parts = numText.split(",");
    if (parts.length > 1) {
      const last = parts[parts.length - 1];
      const isDecimal = last.length > 0 && last.length <= 3;
      if (isDecimal) {
        parts.pop();
        const integer = parts.join("");
        normalized = `${integer}.${last}`;
        const n = Number(normalized);
        return isNaN(n) ? null : n;
      }
    }
    const n = Number(numText.replace(/,/g, ""));
    return isNaN(n) ? null : n;
  }

  if (dots >= 2 && commas === 0) {
    // "1.199.000" (inteiro com milhar) → remove pontos se tudo for dígitos.
    const stripped = numText.replace(/\./g, "");
    if (/^\d+$/.test(stripped)) {
      const n = Number(stripped);
      return isNaN(n) ? null : n;
    }
    // ".." ou "1.2.3.4" não é preço válido → inválido.
    return null;
  }

  return null;
}

function extractCurrency(text: string): string | null {
  // Suporte a prefixo/sufixo: "$", "R$", "US$", "USD", "PYG", "BRL", "AR$", "€".
  const m = text.match(/^\s*(R\$\s?|US\$\s?|[A-Za-z]{2,4}\s?|\$\s?|€\s?)/);
  if (m) {
    let c = m[1].trim();
    if (c === "$" ) c = "USD";
    else if (c === "€") c = "EUR";
    else if (c === "R$") c = "BRL";
    else if (c.toUpperCase() === "US$") c = "USD";
    return c.toUpperCase();
  }
  const suffix = text.match(/[A-Za-z]{3}\s*$/);
  if (suffix) {
    const s = suffix[0].toUpperCase();
    if (["USD", "PYG", "BRL", "EUR", "ARS", "COP", "MXN"].includes(s)) return s;
  }
  return null;
}
