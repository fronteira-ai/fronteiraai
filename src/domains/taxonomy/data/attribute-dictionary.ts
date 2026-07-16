import type { AttributeDictionaryEntry } from "../types/taxonomy.types";

// Program Κ — Mission Κ-2, Objetivo 6. The official attribute vocabulary —
// every future structured-attribute extraction (Sprint 2.5/2.6's
// `specifications` enrichment work) should converge its keys to these,
// never free text from a merchant's own page. `key` is what actually goes
// into `canonical_products.specifications` (the same jsonb field
// ProductIdentityEngine's `specOverlap` factor already reads) — labels are
// presentation-only, never compared by the engine.
export const ATTRIBUTE_DICTIONARY: AttributeDictionaryEntry[] = [
  { key: "color", labelPt: "Cor", labelEs: "Color", category: "physical", description: "Cor declarada do produto, normalizada (ex.: 'preto', não 'Preto Fosco Premium')." },
  { key: "capacity_gb", labelPt: "Capacidade", labelEs: "Capacidad", category: "technical", description: "Armazenamento em GB, valor numérico apenas (ex.: '256', não '256GB')." },
  { key: "ram_gb", labelPt: "Memória", labelEs: "Memoria", category: "technical", description: "RAM em GB, valor numérico apenas." },
  { key: "screen_size_in", labelPt: "Tela", labelEs: "Pantalla", category: "physical", description: "Tamanho de tela em polegadas, valor numérico apenas." },
  { key: "processor", labelPt: "Processador", labelEs: "Procesador", category: "technical", description: "Modelo do processador/chip, forma canônica (ex.: 'M3', 'A17_PRO')." },
  { key: "voltage", labelPt: "Voltagem", labelEs: "Voltaje", category: "technical", description: "Voltagem elétrica declarada ('110V', '220V', 'bivolt')." },
  { key: "model", labelPt: "Modelo", labelEs: "Modelo", category: "identifier", description: "Forma canônica do modelo (ver src/domains/taxonomy/data/model-normalization.ts) — nunca o nome de marketing bruto." },
  { key: "ean", labelPt: "EAN", labelEs: "EAN", category: "identifier", description: "Código de barras EAN/GTIN-13, quando declarado pela loja — hoje não populado por nenhum conector (achado real, não hipotético)." },
  { key: "mpn", labelPt: "MPN", labelEs: "MPN", category: "identifier", description: "Manufacturer Part Number — código de peça do fabricante (ex.: 'A3257', 'ICE-21RP1' — confirmado presente em nomes reais, não extraído estruturadamente ainda)." },
  { key: "manufacturer_sku", labelPt: "SKU do Fabricante", labelEs: "SKU del Fabricante", category: "identifier", description: "Código interno do fabricante quando distinto do MPN (ex.: SKUs próprios da JBL, 'JBLFLIP7BLKAM')." },
  // Program Κ — Mission Κ-3. Adicionados após auditoria real de
  // canonical_products.specifications (scripts/kappa3-attribute-audit.ts,
  // 2026-07-15) — cada um grounded em uma chave real de alta frequência,
  // nunca especulativo (ver docs/engineering/ATTRIBUTE_EXTRACTION.md §2).
  { key: "gpu", labelPt: "GPU", labelEs: "GPU", category: "technical", description: "Modelo da GPU/placa gráfica, forma canônica (ex.: 'ARM Mali-G615', 'Adreno 710')." },
  { key: "power_w", labelPt: "Potência", labelEs: "Potencia", category: "technical", description: "Potência em Watts, valor numérico apenas (ex.: '900', não '900 watts')." },
  { key: "bundle_includes", labelPt: "Itens Inclusos", labelEs: "Incluye", category: "physical", description: "Lista normalizada de itens que acompanham o produto (ex.: cabo, manual, carregador) — nunca o texto livre bruto." },
];
