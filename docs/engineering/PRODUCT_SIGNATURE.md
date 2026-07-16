# PRODUCT_SIGNATURE.md
# Program Κ — Mission Κ-3 — Objetivo 3

**Categoria**: `docs/engineering/`
**Criado**: 2026-07-15

---

## 1. O tipo

`ProductSignature` (`src/domains/product-intelligence/types/product-intelligence.types.ts`) — 13 campos, cada um um `AttributeValue<T>`, nunca um valor bruto:

```ts
interface ProductSignature {
  canonicalProductId: string;
  brand: AttributeValue<string>;
  model: AttributeValue<string>;
  color: AttributeValue<string>;
  capacityGb: AttributeValue<number>;
  ramGb: AttributeValue<number>;
  screenSizeIn: AttributeValue<number>;
  processor: AttributeValue<string>;
  gpu: AttributeValue<string>;
  voltage: AttributeValue<string>;
  powerW: AttributeValue<number>;
  ean: AttributeValue<string>;
  manufacturerCode: AttributeValue<string>; // MPN/Part Number/SKU unificados
  bundleIncludes: AttributeValue<string[]>;
}
```

## 2. Como é construído

`buildProductSignature()` (`src/domains/product-intelligence/extraction/ProductSignatureExtractor.ts`) — função pura, recebe `{id, name, brandName, specifications}` e retorna a assinatura completa. Zero I/O — quem chama já buscou o `canonical_product` e resolveu `brand_id → brands.name` antes.

## 3. Exemplo real (não hipotético)

Entrada real de produção:
```
name: "Apple iPhone 17 Pro Max A3257 eSIM 1TB 12GB RAM de 6.9\" 48+48+48MP 18MP - Silver"
specifications: { COR: "Titânio Preto", "MEMÓRIA INTERNA": "1TB", "MEMÓRIA RAM": "12GB", VOLTAGEM: "220V" }
```

Assinatura resultante:
```
brand:            { value: "Apple", source: "brand_id", confidence: "high" }
model:            { value: "IPHONE_17_PRO_MAX", source: "name", confidence: "medium" }
color:             { value: "TITANIO_PRETO", source: "specifications", confidence: "high" }
capacityGb:       { value: 1024, source: "specifications", confidence: "high" }
ramGb:            { value: 12, source: "specifications", confidence: "high" }
voltage:          { value: "220V", source: "specifications", confidence: "high" }
manufacturerCode: { value: "A3257", source: "name", confidence: "medium" }
```

## 4. Como o Product Identity a consome (sem ser alterado)

`signatureToSpecifications()` (nos scripts de simulação `kappa3-cross-merchant-simulation.ts`/`kappa3-coverage-projection.ts`) achata os campos populados de volta num `Record<string,string>` — exatamente o shape que `EvaluableProduct.specifications`/`MatchCandidate.specifications` já esperavam desde o Release 1.7. O `ProductIdentityEngine` nunca sabe que uma "Product Signature" existe — ele só recebe um dicionário de chave/valor mais rico e mais consistente do que o `canonical_products.specifications` bruto.

## 5. Cobertura real medida (18.010 canonical products)

| Campo | Cobertura | % |
|---|---:|---:|
| brand | 18.010 | 100,00% |
| manufacturerCode | 9.648 | 53,57% |
| color | 5.493 | 30,50% |
| bundleIncludes | 2.972 | 16,50% |
| powerW | 1.587 | 8,81% |
| voltage | 1.428 | 7,93% |
| processor | 1.289 | 7,16% |
| capacityGb | 1.172 | 6,51% |
| screenSizeIn | 815 | 4,53% |
| ramGb | 716 | 3,98% |
| model | 575 | 3,19% |
| gpu | 388 | 2,15% |
| ean | 273 | 1,52% |

**Leitura honesta**: `brand` está em 100% porque é um lookup de FK, não uma extração. `manufacturerCode` é a segunda maior cobertura, mas é `confidence: "medium"` sempre (heurística). Os demais campos refletem diretamente a cobertura real de `specifications` medida em `ATTRIBUTE_EXTRACTION.md` — esta camada não inventa dado onde ele não existe, só o organiza melhor onde já existe.

## Fontes

`scripts/kappa3-signature-coverage.ts` (rodado ao vivo, 2026-07-15).
