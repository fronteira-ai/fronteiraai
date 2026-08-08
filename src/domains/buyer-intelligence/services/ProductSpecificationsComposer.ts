import { FactType, type LearnedFact } from "@/src/domains/marketplace-memory";
import type { SpecificationEntry } from "../types/buyer-intelligence.types";

// Mission 03 (Decision Engine). Pure composition, no I/O — merges a
// merchant's raw `products.specifications` with this product's Marketplace
// Memory facts (already extracted, deterministic, real provenance per
// LearnedFactFactory — never invented here). The only two decisions this
// file makes: (1) which fact types matter enough to highlight for a
// purchase decision, and (2) how to avoid showing the same concept twice
// when the merchant's own raw label already covers it.

const FACT_ORDER: FactType[] = [
  FactType.CapacityGb,
  FactType.RamGb,
  FactType.ScreenSizeIn,
  FactType.Color,
  FactType.Processor,
  FactType.Gpu,
  FactType.Voltage,
  FactType.PowerW,
  FactType.BundleIncludes,
  FactType.Model,
  FactType.ManufacturerCode,
  FactType.Ean,
];

const FACT_LABELS: Partial<Record<FactType, string>> = {
  [FactType.CapacityGb]: "Armazenamento",
  [FactType.RamGb]: "Memória RAM",
  [FactType.ScreenSizeIn]: "Tamanho da tela",
  [FactType.Color]: "Cor",
  [FactType.Processor]: "Processador",
  [FactType.Gpu]: "GPU",
  [FactType.Voltage]: "Voltagem",
  [FactType.PowerW]: "Potência",
  [FactType.BundleIncludes]: "Itens inclusos",
  [FactType.Model]: "Modelo",
  [FactType.ManufacturerCode]: "Código do fabricante",
  [FactType.Ean]: "Código EAN (GTIN)",
};

const FACT_UNIT_SUFFIX: Partial<Record<FactType, string>> = {
  [FactType.CapacityGb]: " GB",
  [FactType.RamGb]: " GB",
  [FactType.ScreenSizeIn]: "\"",
  [FactType.Voltage]: "V",
  [FactType.PowerW]: "W",
};

// The specs that actually decide a purchase — storage/RAM/screen/color for
// devices in general, processor/GPU for anything compute-bound. Fixed list,
// not a heuristic, so "what's highlighted" never drifts silently.
const HIGHLIGHTED_FACTS = new Set<FactType>([
  FactType.CapacityGb,
  FactType.RamGb,
  FactType.ScreenSizeIn,
  FactType.Color,
  FactType.Processor,
  FactType.Gpu,
]);

// Keywords that, if already present in one of the merchant's own raw spec
// labels, mean that concept is already covered — showing the learned fact
// too would duplicate the same information under two rows.
const FACT_KEYWORD_OVERLAP: Partial<Record<FactType, string[]>> = {
  [FactType.CapacityGb]: ["armazenamento", "capacidade", "storage"],
  [FactType.RamGb]: ["ram"],
  [FactType.ScreenSizeIn]: ["tela", "polegada", "display"],
  [FactType.Color]: ["cor", "color"],
  [FactType.Processor]: ["processador", "cpu", "chipset"],
  [FactType.Gpu]: ["gpu", "placa de video"],
  [FactType.Voltage]: ["voltagem", "voltage", "tensao"],
  [FactType.PowerW]: ["potencia", "watt"],
  [FactType.BundleIncludes]: ["inclui", "acompanha", "conteudo da caixa"],
  [FactType.Model]: ["modelo"],
  [FactType.ManufacturerCode]: ["codigo do fabricante", "part number", "mpn"],
  [FactType.Ean]: ["ean", "gtin", "codigo de barras"],
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function titleCase(label: string): string {
  return label
    .trim()
    .split(/\s+/)
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

export function buildSpecificationEntries(
  rawSpecifications: Record<string, string> | null,
  facts: LearnedFact[]
): SpecificationEntry[] {
  const rawEntries = rawSpecifications ? Object.entries(rawSpecifications) : [];
  const normalizedRawLabels = rawEntries.map(([label]) => normalize(label));

  // The DB enforces one fact per (canonical_product_id, fact_type), so this
  // can never collide — just a convenient lookup by type.
  const factsByType = new Map<FactType, LearnedFact>();
  for (const fact of facts) {
    factsByType.set(fact.factType, fact);
  }

  const entries: SpecificationEntry[] = [];

  for (const factType of FACT_ORDER) {
    const fact = factsByType.get(factType);
    if (!fact) continue;

    const keywords = FACT_KEYWORD_OVERLAP[factType] ?? [];
    const alreadyCovered = normalizedRawLabels.some((label) =>
      keywords.some((keyword) => label.includes(keyword))
    );
    if (alreadyCovered) continue;

    entries.push({
      label: FACT_LABELS[factType] ?? factType,
      value: `${fact.factValue}${FACT_UNIT_SUFFIX[factType] ?? ""}`,
      highlight: HIGHLIGHTED_FACTS.has(factType),
      source: "learned",
    });
  }

  for (const [label, value] of rawEntries) {
    entries.push({ label: titleCase(label), value, highlight: false, source: "raw" });
  }

  return entries;
}
