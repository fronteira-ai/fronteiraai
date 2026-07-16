# PRODUCT_NORMALIZATION_GUIDE.md
# Program Κ — Mission Κ-3 — Objetivo 5

**Categoria**: `docs/engineering/`
**Criado**: 2026-07-15

---

## 1. Princípio

Cada normalizador (`src/domains/product-intelligence/extraction/value-normalizers.ts`) é uma função pura testada contra valores reais de `canonical_products.specifications` (nunca um exemplo hipotético) — e retorna `null`, nunca um palpite, quando o padrão não é reconhecido.

## 2. Capacidade (GB/TB) — `normalizeCapacityToGb`

| Entrada real | Saída |
|---|---:|
| `"512GB"` | 512 |
| `"512 GB"` | 512 |
| `"512 G"` | 512 |
| `"1TB"` | 1024 |

Regra: extrai o primeiro número seguido de `TB`/`GB`/`G`; `TB` é convertido `× 1024`.

## 3. Voltagem — `normalizeVoltage`

| Entrada real | Saída | Nota |
|---|---|---|
| `"220V"` | `"220V"` | — |
| `"110 - 220V ~ 50/60 Hz"` | `"110V-220V"` | Range com unidade implícita no primeiro número — **bug real encontrado e corrigido nesta Mission**: a primeira versão só capturava `"220V"`, perdendo o `110` porque ele não carrega o `V` diretamente. Corrigido para reconhecer o padrão `A - BV` como aplicando a unidade a ambos os lados (mesma convenção de `"10-20kg"`), nunca inventando a palavra "bivolt". |

## 4. Potência — `normalizePowerW`

`"900 watts"` → 900, `"1600W"` → 1600. Toma o primeiro número — valores multi-canal (`"4 de 100 watts RMS em 4 Ohms..."`) deliberadamente não somados (somar exigiria uma regra de negócio não presente no texto fonte).

## 5. Cor — `normalizeColorToken`

```
Titanium Black    → TITANIUM_BLACK
Titânio Preto     → TITANIO_PRETO
Preto / PRETO / preto → PRETO (case/diacrítico-insensível)
```

**Limitação deliberada, não escondida**: `"Titanium Black"` e `"Black Titanium"` **não** colapsam ao mesmo token — a ordem das palavras é preservada como está no texto fonte. Reordenar exigiria uma tabela de equivalência que esta Mission não mediu contra dado real; inventá-la violaria "nunca inventar valores". Cores compostas por parte do produto (ex.: `"Relógio: Red Pink - Pulseira: Mango"`, um valor real encontrado na auditoria) retornam `null` — não há forma segura de escolher "a" cor sem adivinhar.

## 6. EAN — `normalizeEan`

Valida exatamente 13 dígitos numéricos (GTIN-13). Não calcula nem corrige checksum — apenas confirma o formato. Exemplo real: `"8801046989869"` (medido em `Código de barras`).

## 7. Bundle — `normalizeBundleIncludes`

Divide em itens por `" - "`, `"|"` ou `","` — real: `"Cabo USB-C - Manual"` → `["Cabo USB-C", "Manual"]`. Nunca classifica semanticamente o que cada item é.

## 8. Modelo (reuso, não recriação) — `normalizeAppleModelToken`

Reaproveitado sem alteração de `src/domains/taxonomy/data/model-normalization.ts` (Mission Κ-2) — Quality Gate desta Mission ("nenhum algoritmo existente poderá ser alterado") impede reescrevê-lo aqui. Cobertura continua restrita à família Apple, documentada em `docs/engineering/MODEL_NORMALIZATION.md`.

## 9. Código de fabricante (EAN/MPN/Part Number/SKU) — heurística de token

Não é normalização de um valor já identificado — é extração de um token candidato do texto do nome. Ver `ATTRIBUTE_EXTRACTION.md` §4 para a metodologia completa e os 2 bugs reais encontrados via spot-check.

## Fontes

`src/domains/product-intelligence/extraction/value-normalizers.ts`, `src/domains/product-intelligence/__tests__/value-normalizers.test.ts` (todos os exemplos desta página são casos de teste reais, não ilustrações).
