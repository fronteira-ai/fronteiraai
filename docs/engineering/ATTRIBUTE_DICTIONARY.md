# ATTRIBUTE_DICTIONARY.md
# Program Κ — Mission Κ-2 — Objetivo 6

**Categoria**: `docs/engineering/`
**Criado**: 2026-07-15

---

## 1. Vocabulário oficial (10 atributos)

`src/domains/taxonomy/data/attribute-dictionary.ts`. `key` é o que efetivamente vai em `canonical_products.specifications`/`products.specifications` (o mesmo campo jsonb que `ProductIdentityEngine`'s fator `specifications` já lê) — labels são só apresentação, nunca comparadas pelo Engine.

| Key | Label PT | Label ES | Categoria | Observação real |
|---|---|---|---|---|
| `color` | Cor | Color | physical | — |
| `capacity_gb` | Capacidade | Capacidad | technical | Valor numérico apenas |
| `ram_gb` | Memória | Memoria | technical | Valor numérico apenas |
| `screen_size_in` | Tela | Pantalla | physical | Valor numérico apenas |
| `processor` | Processador | Procesador | technical | Forma canônica (ex.: "M3") |
| `voltage` | Voltagem | Voltaje | technical | — |
| `model` | Modelo | Modelo | identifier | Ver `MODEL_NORMALIZATION.md` — nunca o nome de marketing bruto |
| `ean` | EAN | EAN | identifier | **Hoje não populado por nenhum conector — achado real, não hipotético** |
| `mpn` | MPN | MPN | identifier | Confirmado presente em nomes reais (ex.: "A3257", "ICE-21RP1"), não extraído estruturadamente ainda |
| `manufacturer_sku` | SKU do Fabricante | SKU del Fabricante | identifier | Confirmado em nomes reais (ex.: "JBLFLIP7BLKAM") |

## 2. Por que "nunca depender do texto livre da loja"

Hoje, `specifications` é preenchido de forma heterogênea por conector (Sprint 2.4/2.5 já documentaram isso) — cada loja usa suas próprias chaves. O Attribute Dictionary não migra dado existente (fora do escopo — esta Mission não altera `products`/`canonical_products`); ele define o alvo que qualquer extração futura (conectores, Sprint 2.6-style backfill) deveria convergir, para que o fator `specifications` do Engine compare a mesma chave nos dois lados de um par, em vez de nunca encontrar overlap por causa de nomenclatura divergente.

## 3. Achado real que motiva os 3 atributos `identifier`

`scripts/kappa2-model-variance-sample.ts` confirmou, em nomes reais de produção, códigos de peça do fabricante já presentes como texto (`A3257`, `ICE-21RP1`, `JBLFLIP7BLKAM`) — mas **nunca estruturados** como campo próprio. Isso é o gap mais concreto e acionável desta auditoria: o dado já existe fisicamente no texto, só não está extraído.

## Fontes

`src/domains/taxonomy/data/attribute-dictionary.ts`, `scripts/kappa2-model-variance-sample.ts`, `src/domains/product-identity/domain/ProductIdentityEngine.ts` (`specOverlap`).
