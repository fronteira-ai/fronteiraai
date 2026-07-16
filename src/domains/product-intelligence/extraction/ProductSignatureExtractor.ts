import type { AttributeValue, ProductSignature } from "../types/product-intelligence.types";
import { resolveOfficialKey } from "./attribute-key-aliases";
import {
  normalizeCapacityToGb,
  normalizeVoltage,
  normalizePowerW,
  normalizeEan,
  normalizeColorToken,
  normalizeBundleIncludes,
} from "./value-normalizers";
import { extractManufacturerCode } from "./manufacturer-code-extractor";
import { normalizeAppleModelToken } from "../../taxonomy";

// Program Κ — Mission Κ-3, Objetivo 2/3/4. The single composer that builds
// a ProductSignature — pure function, zero I/O, zero dependency on
// product-identity/ or canonical-catalog/ (same discipline as taxonomy/).
// Never invents a value: every field either resolves from real input via a
// grounded rule (attribute-key-aliases.ts + value-normalizers.ts, both
// measured against real production data) or stays null.

function empty<T>(): AttributeValue<T> {
  return { value: null, source: null, confidence: null, extractedFrom: null };
}

interface SpecMatch<T> {
  raw: string;
  rawKey: string;
  normalized: T | null;
}

// Scans specifications for the first key that resolves (via the alias map)
// to the requested official key, and applies the given normalizer. Returns
// null if no matching key exists or the normalizer couldn't parse the value
// — "no signal found" and "signal found but unparseable" both collapse to
// null, since neither should ever become a guessed value.
function fromSpecifications<T>(specifications: Record<string, string>, officialKey: string, normalize: (raw: string) => T | null): SpecMatch<T> | null {
  for (const [rawKey, rawValue] of Object.entries(specifications)) {
    if (resolveOfficialKey(rawKey) !== officialKey) continue;
    const normalized = normalize(rawValue);
    return { raw: rawValue, rawKey, normalized };
  }
  return null;
}

function attributeFromSpec<T>(match: SpecMatch<T> | null): AttributeValue<T> {
  if (!match || match.normalized === null) return empty<T>();
  return {
    value: match.normalized,
    source: "specifications",
    // "high" only when the raw key already resolved unambiguously (the
    // alias map is the confidence source, not the value parse itself) —
    // matches Objetivo 4's "nunca inventar": a resolved key + a
    // successfully parsed value is the strongest evidence this domain has.
    confidence: "high",
    extractedFrom: `${match.rawKey}="${match.raw}"`,
  };
}

export interface ExtractableProduct {
  id: string;
  name: string;
  brandName: string | null;
  specifications: Record<string, string> | null;
}

export function buildProductSignature(product: ExtractableProduct): ProductSignature {
  const spec = product.specifications ?? {};

  const brand: AttributeValue<string> = product.brandName
    ? { value: product.brandName, source: "brand_id", confidence: "high", extractedFrom: "brands.name (FK, already resolved)" }
    : empty<string>();

  const color = attributeFromSpec(fromSpecifications(spec, "color", normalizeColorToken));
  const capacityGb = attributeFromSpec(fromSpecifications(spec, "capacity_gb", normalizeCapacityToGb));
  const ramGb = attributeFromSpec(fromSpecifications(spec, "ram_gb", normalizeCapacityToGb));
  const screenSizeIn = attributeFromSpec(
    fromSpecifications(spec, "screen_size_in", (raw) => {
      const m = raw.match(/(\d+(?:\.\d+)?)\s*["”]/);
      return m ? parseFloat(m[1]) : null;
    })
  );
  const voltage = attributeFromSpec(fromSpecifications(spec, "voltage", normalizeVoltage));
  const powerW = attributeFromSpec(fromSpecifications(spec, "power_w", normalizePowerW));
  const ean = attributeFromSpec(fromSpecifications(spec, "ean", normalizeEan));
  const bundleIncludes = attributeFromSpec(fromSpecifications(spec, "bundle_includes", normalizeBundleIncludes));

  // processor/gpu: normalized only by trim+whitespace-collapse — real chip
  // names ("MediaTek Dimensity 9300+ (4 nm) Octa Core...") are too varied
  // to safely reduce further without inventing an equivalence table this
  // Mission didn't measure. Still real, still sourced, still auditable.
  const processorMatch = fromSpecifications(spec, "processor", (raw) => raw.trim().replace(/\s+/g, " ") || null);
  const processor = attributeFromSpec(processorMatch);
  const gpuMatch = fromSpecifications(spec, "gpu", (raw) => raw.trim().replace(/\s+/g, " ") || null);
  const gpu = attributeFromSpec(gpuMatch);

  // model: reuses Κ-2's normalizeAppleModelToken (unmodified — Quality
  // Gate forbids altering existing algorithms) — only ever populated when
  // that parser recognizes the name, honestly null otherwise.
  const appleModel = normalizeAppleModelToken(product.name);
  const model: AttributeValue<string> = appleModel
    ? { value: appleModel, source: "name", confidence: "medium", extractedFrom: product.name }
    : empty<string>();

  const codeMatch = extractManufacturerCode(product.name);
  const manufacturerCode: AttributeValue<string> = codeMatch
    ? { value: codeMatch.code, source: "name", confidence: "medium", extractedFrom: `candidates: [${codeMatch.candidates.join(", ")}]` }
    : empty<string>();

  return {
    canonicalProductId: product.id,
    brand,
    model,
    color,
    capacityGb,
    ramGb,
    screenSizeIn,
    processor,
    gpu,
    voltage,
    powerW,
    ean,
    manufacturerCode,
    bundleIncludes,
  };
}
