/**
 * Merchant Feed Platform — declarative source configuration (JSON/XML/CSV).
 *
 * A configuração de um feed é DECLARATIVA: mapeia campos comuns do feed do
 * lojista (external_id/title/preço/estoque/imagem/...) para o contrato
 * canônico RawOffer — SEM eval / sem JS arbitrário / sem shell. Assim um
 * lojista com um formato diferente (product.codigo, id, sku, variant_id,
 * images.primary.url) é configurado sem tocar em código de aplicação.
 *
 * Paths aninhados usam pontos (ex.: "product.id", "pricing.usd",
 * "inventory.quantity", "images.primary.url"). Segurança: o resolver só lê
 * campos planos de objetos — nunca executa código.
 */

/** Campo canônico (lado ParaguAI) que um path de origem preenche. */
export type MerchantFieldSlot =
  | "external_id"
  | "title"
  | "title_es"
  | "description"
  | "brand"
  | "category"
  | "price"
  | "price_iva"
  | "regular_price"
  | "currency"
  | "stock"
  | "availability"
  | "image"
  | "product_url"
  | "updated_at";

export type MerchantFieldMapping = Partial<Record<MerchantFieldSlot, string>>;

/** Raiz da lista (array) no documento JSON. Ex.: "$" (array raiz) ou "products". */
export interface MerchantPaginationConfig {
  /** Campo com o cursor/offset para a próxima página (se a API paginar). */
  nextPageField?: string;
  /** Offset inicial da primeira página. */
  initial?: number;
  /** Incremento por página. */
  step?: number;
  /** Campo que indica se existe próxima página (bool/truthy). */
  hasNextField?: boolean;
}

/** Security: headers configuráveis permitidos (seguros de persistir). */
export interface MerchantSourceHeaders {
  /** Sem credenciais; apenas headers inócuos para feeds públicos. */
  userAgent?: string;
  accept?: string;
}

/** Config declarativa de UM source de lojista (persistida em connectors.config). */
export interface MerchantSourceConfig {
  sourceType: "XML_FEED" | "JSON_FEED" | "CSV_FEED" | "PUBLIC_API";
  feedUrl: string;
  /** Root path da lista (JSON). "$" = raiz; "data.items" = nested. */
  rootPath?: string;
  fieldMapping: MerchantFieldMapping;
  /** Comportamento de moeda: "use_feed" (default) ou "force" cs.e. "USD". */
  currency?: "use_feed" | "force_usd" | "force_pyg";
  /** Mapeamento de disponibilidade quando o feed não usa palavras padrão. */
  availabilityValues?: {
    available?: string[];
    outOfStock?: string[];
  };
  pagination?: MerchantPaginationConfig;
  /** Headers seguros (sem secret). */
  headers?: MerchantSourceHeaders;
}

export const DEFAULT_FIELD_MAPPING: MerchantFieldMapping = {
  external_id: "codigo",
  title: "title",
  title_es: "title_es",
  description: "description",
  brand: "marca",
  category: "categoria",
  price: "preco",
  price_iva: "price_iva",
  regular_price: "preco_normal_sem_liquidacao",
  currency: "moeda",
  stock: "estoque",
  availability: "disponibilidade",
  image: "link_imagem",
  product_url: "link_comprar",
  updated_at: "updated_at",
};

/** Alias comuns de campo de origem → slot canônico (para configs curtos). */
const COMMON_FIELD_ALIASES: Record<string, MerchantFieldSlot> = {
  id: "external_id",
  sku: "external_id",
  variant_id: "external_id",
  codigo: "external_id",
  product_id: "external_id",
  code: "external_id",
  name: "title",
  titulo: "title",
  product_name: "title",
  descricao: "description",
  brand: "brand",
  marca: "brand",
  categoria: "category",
  category: "category",
  price: "price",
  preco: "price",
  price_usd: "price",
  currency: "currency",
  moeda: "currency",
  stock: "stock",
  estoque: "stock",
  availability: "availability",
  disponibilidade: "availability",
  image: "image",
  image_url: "image",
  imagem: "image",
  link_imagem: "image",
  url: "product_url",
  producto_url: "product_url",
  updated_at: "updated_at",
};

/**
 * Valida uma config declarativa de forma estrita ANTES da ativação.
 * Lança `Error` se alguma parte for inválida/insegura — nunca ativa cego.
 */
export function validateMerchantSourceConfig(cfg: MerchantSourceConfig): void {
  if (!cfg?.fieldMapping || typeof cfg.fieldMapping !== "object") {
    throw new Error("CONFIG_INVALID: fieldMapping requerido");
  }
  const slots = new Set<MerchantFieldSlot>(Object.keys(cfg.fieldMapping) as MerchantFieldSlot[]);
  for (const slot of slots) {
    if (!isMerchantFieldSlot(slot)) {
      throw new Error(`CONFIG_INVALID: campo desconhecido "${slot}"`);
    }
  }
  // external_id é o mínimo para identidade determinística.
  const mapping = normalizeFieldMapping(cfg.fieldMapping);
  if (!mapping.external_id || !mapping.price) {
    throw new Error("CONFIG_INVALID: fieldMapping deve incluir external_id e price");
  }
  if (cfg.currency && !["use_feed", "force_usd", "force_pyg"].includes(cfg.currency)) {
    throw new Error(`CONFIG_INVALID: moeda "${cfg.currency}" não suportada`);
  }
  if (cfg.sourceType && !["XML_FEED", "JSON_FEED", "CSV_FEED", "PUBLIC_API"].includes(cfg.sourceType)) {
    throw new Error(`CONFIG_INVALID: sourceType "${cfg.sourceType}" não suportado`);
  }
  // Segurança estrutural: qualquer path de mapping/nested não pode rotear p/ execução.
  for (const [, path] of Object.entries(mapping)) {
    if (typeof path !== "string" || !/^[a-zA-Z0-9_.$]+$/.test(path)) {
      throw new Error("CONFIG_INVALID: path de campo malformado (só letras/dígitos/ponto/$)");
    }
    if (path.includes("..") || /[()@$&;]/.test(path)) {
      throw new Error("CONFIG_INVALID: path contém tokens não permitidos");
    }
  }
}

export function isMerchantFieldSlot(slot: string): slot is MerchantFieldSlot {
  return [
    "external_id", "title", "title_es", "description", "brand", "category",
    "price", "price_iva", "regular_price", "currency", "stock", "availability",
    "image", "product_url", "updated_at",
  ].includes(slot);
}

/**
 * Normaliza uma config: resolve aliases comuns (id/sku/codigo → external_id,
 * name → title, preco → price, etc.) para o contrato canônico.
 */
export function normalizeFieldMapping(input: MerchantFieldMapping): MerchantFieldMapping {
  const out: MerchantFieldMapping = {};
  for (const [key, path] of Object.entries(input ?? {})) {
    const slot = isMerchantFieldSlot(key) ? key : (COMMON_FIELD_ALIASES[key] ?? undefined);
    if (slot && typeof path === "string" && path.length > 0) {
      out[slot] = path;
    }
  }
  return out;
}

/**
 * Resolve um path de pontos/ex. "$" "products" "product.code" "a.b.c" em um
 * valor de um object — somente leitura, sem execução. Retorna undefined se
 * o caminho não existir.
 */
export function resolvePath(obj: unknown, path: string | undefined): unknown {
  if (!path) return undefined;
  const parts = path.split(".").filter((p) => p.length > 0);
  let cur: unknown = obj;
  for (const p of parts) {
    if (p === "$") continue; // "$" = raiz
    if (cur === null || cur === undefined) return undefined;
    if (typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

/** Extrai a lista de itens de um JSON usando o rootPath. Suporta array raiz. */
export function extractItems(json: unknown, rootPath?: string): unknown[] {
  const root = resolvePath(json, rootPath ?? "$");
  if (Array.isArray(root)) return root;
  if (root && typeof root === "object" && !Array.isArray(root)) {
    // ex.: { "products": [...] } já foi resolvido por rootPath; tenta a primeira chave array.
    const firstArr = Object.values(root as Record<string, unknown>).find((v) => Array.isArray(v));
    if (Array.isArray(firstArr)) return firstArr;
  }
  return [];
}
