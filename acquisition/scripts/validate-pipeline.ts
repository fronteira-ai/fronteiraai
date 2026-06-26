import { ValidationEngine } from "../engines/validation.engine";
import { NormalizationEngine } from "../engines/normalization.engine";
import { JSONParser } from "../parsers/json.parser";
import { CSVParser } from "../parsers/csv.parser";
import type { RawOffer } from "../types/raw";

const validation = new ValidationEngine();
const normalization = new NormalizationEngine();

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.error(`  ✗ ${name}${detail ? " — " + detail : ""}`);
    failed++;
  }
}

// ─── Case 1: Valid offer ────────────────────────────────────────
console.log("\n[1] Valid offer — should pass validation and normalization");
{
  const item: RawOffer = {
    product: {
      name: "Apple iPhone 16 Pro 256GB",
      brand: "Apple",
      category: "Celulares",
      imageUrl: "https://example.com/image.jpg",
    },
    storeSlug: "cellshop",
    priceUSD: 899.99,
    priceBRL: 4999.90,
    inStock: true,
  };
  const v = validation.validate(item);
  assert("passes validation", v.valid);
  assert("no errors", v.errors.length === 0);

  // Wrap in a mock context for normalization.
  const normalized = normalization.normalize(item);
  assert("slug is kebab-case", normalized.product.slug === "apple-iphone-16-pro-256gb");
  assert("brand slug correct", normalized.product.brandSlug === "apple");
  assert("category slug correct", normalized.product.categorySlug === "celulares");
  assert("price preserved", normalized.offer.priceUSD === 899.99);
  assert("inStock preserved", normalized.offer.inStock === true);
}

// ─── Case 2: Missing product name ──────────────────────────────
console.log("\n[2] Missing product name — should fail validation");
{
  const item: RawOffer = {
    product: { name: "" },
    storeSlug: "cellshop",
    priceUSD: 100,
  };
  const v = validation.validate(item);
  assert("fails validation", !v.valid);
  assert("has product.name error", v.errors.some((e) => e.field === "product.name"));
}

// ─── Case 3: Price = 0 ─────────────────────────────────────────
console.log("\n[3] Price = 0 — should fail validation");
{
  const item: RawOffer = {
    product: { name: "Test Product" },
    storeSlug: "cellshop",
    priceUSD: 0,
  };
  const v = validation.validate(item);
  assert("fails validation", !v.valid);
  assert("has priceUSD error", v.errors.some((e) => e.field === "priceUSD"));
}

// ─── Case 4: Negative price ────────────────────────────────────
console.log("\n[4] Negative price — should fail validation");
{
  const item: RawOffer = {
    product: { name: "Test Product" },
    storeSlug: "cellshop",
    priceUSD: -50,
  };
  const v = validation.validate(item);
  assert("fails validation", !v.valid);
  assert("has priceUSD error", v.errors.some((e) => e.field === "priceUSD"));
}

// ─── Case 5: Invalid store slug ────────────────────────────────
console.log("\n[5] Invalid store slug — should fail validation");
{
  const item: RawOffer = {
    product: { name: "Test Product" },
    storeSlug: "Cellshop Store!",
    priceUSD: 100,
  };
  const v = validation.validate(item);
  assert("fails validation", !v.valid);
  assert("has storeSlug error", v.errors.some((e) => e.field === "storeSlug"));
}

// ─── Case 6: Missing brand/category — warnings only ────────────
console.log("\n[6] Missing brand and category — warnings only, still valid");
{
  const item: RawOffer = {
    product: { name: "Generic Product" },
    storeSlug: "cellshop",
    priceUSD: 99.99,
  };
  const v = validation.validate(item);
  assert("passes validation", v.valid);
  assert("has brand warning", v.warnings.some((w) => w.field === "product.brand"));
  assert("has category warning", v.warnings.some((w) => w.field === "product.category"));

  const normalized = normalization.normalize(item);
  assert("brand defaults to 'Outros'", normalized.product.brandName === "Outros");
  assert("category defaults to 'Outros'", normalized.product.categoryName === "Outros");
}

// ─── Case 7: Invalid image URL — warning, not error ────────────
console.log("\n[7] Invalid image URL — warning only");
{
  const item: RawOffer = {
    product: { name: "Test Product", imageUrl: "not-a-url" },
    storeSlug: "cellshop",
    priceUSD: 50,
  };
  const v = validation.validate(item);
  assert("passes validation", v.valid);
  assert("has imageUrl warning", v.warnings.some((w) => w.field === "product.imageUrl"));

  const normalized = normalization.normalize(item);
  assert("imageUrl is null after normalization", normalized.product.imageUrl === null);
}

// ─── Case 8: Accented characters in name — slugified correctly ─
console.log("\n[8] Accented product name — slug must be ASCII");
{
  const item: RawOffer = {
    product: { name: "Perfume Árabe Açaí & Bêbê" },
    storeSlug: "nissei",
    priceUSD: 39.99,
  };
  const v = validation.validate(item);
  assert("passes validation", v.valid);
  const normalized = normalization.normalize(item);
  assert("slug is ASCII only", /^[a-z0-9-]+$/.test(normalized.product.slug), normalized.product.slug);
  assert("slug has no accents", !normalized.product.slug.includes("á") && !normalized.product.slug.includes("ê"));
}

// ─── Case 9: JSON parser round-trip ────────────────────────────
console.log("\n[9] JSON parser — round-trip");
{
  const json = JSON.stringify([{
    product: { name: "Parsed Product", brand: "Sony", category: "Audio" },
    storeSlug: "mega-eletronicos",
    priceUSD: 199.99,
    inStock: true,
  }]);
  const parser = new JSONParser();
  const batch = parser.parse(json, "test-connector", "mega-eletronicos");
  assert("returns 1 item", batch.items.length === 1);
  assert("name preserved", batch.items[0].product.name === "Parsed Product");
  assert("price preserved", batch.items[0].priceUSD === 199.99);
}

// ─── Case 10: CSV parser round-trip ────────────────────────────
console.log("\n[10] CSV parser — round-trip");
{
  const csv = `name,brand,category,price_usd,price_brl,in_stock,store_slug
"MacBook Pro M3 14 polegadas",Apple,Notebooks,1299.99,7499.00,true,cellshop
"iPad Air M2 11 polegadas",Apple,Tablets,699.99,3999.00,false,cellshop`;
  const parser = new CSVParser();
  const batch = parser.parse(csv, "test-csv", "cellshop");
  assert("returns 2 items", batch.items.length === 2);
  assert("first product name correct", batch.items[0].product.name === "MacBook Pro M3 14 polegadas");
  assert("second in_stock false", batch.items[1].inStock === false);
  assert("price_brl parsed correctly", batch.items[0].priceBRL === 7499.00);
}

// ─── Summary ───────────────────────────────────────────────────
console.log(`\n${"═".repeat(50)}`);
console.log(`  VALIDATE PIPELINE — ${passed + failed} assertions`);
console.log(`  ✓ Passed: ${passed}   ✗ Failed: ${failed}`);
console.log("═".repeat(50) + "\n");

if (failed > 0) process.exit(1);
