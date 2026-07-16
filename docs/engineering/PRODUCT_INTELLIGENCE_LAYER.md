# PRODUCT_INTELLIGENCE_LAYER.md
# Program Κ — Mission Κ-3 — Visão geral

**Categoria**: `docs/engineering/`
**Criado**: 2026-07-15
**Status**: Construído, testado, verificado ao vivo contra produção (simulação read-only) — nenhuma escrita em `products`/`canonical_products`/`offers`. Nenhuma linha de `ProductIdentityEngine`/`CanonicalMergeSuggestionService`/Merge Engine foi alterada.

---

## 1. O gap que esta Mission fecha

Mission Κ-2 provou que a Taxonomia Universal funciona, mas moveu Comparable Product Coverage de 6 para apenas 7 produtos (+1) — porque, mesmo com categoria/marca corrigidas, **82.689 pares cross-merchant já passavam no gate e ainda falhavam por divergência de nome/especificação**. Esta Mission ataca exatamente esse gargalo: `src/domains/product-intelligence/` extrai atributos estruturados (cor, capacidade, RAM, voltagem, potência, processador, GPU, EAN, código de fabricante) de dado já existente (`specifications` + texto do nome) e os alimenta de volta ao `ProductIdentityEngine` já existente através do único canal que ele já sabe ler — o campo `specifications` de `EvaluableProduct`/`MatchCandidate` — **sem tocar uma linha do Engine**.

## 2. Por que isso funciona sem alterar o Engine

`ProductIdentityEngine`'s fator `specifications` (`specOverlap`, `src/domains/product-identity/domain/ProductIdentityEngine.ts`) já faz comparação exata chave+valor entre os dois lados de um par — construído desde o Release 1.7. O problema nunca foi esse fator estar quebrado; foi o dado que ele recebia: `canonical_products.specifications` bruto tem 323 chaves distintas fragmentadas (`COR`/`Color`/`cor` todas separadas) e 36,5% dos produtos com o campo vazio. Este Mission só substitui o QUE é passado para esse campo — nunca COMO ele é comparado.

## 3. Arquitetura

`src/domains/product-intelligence/` — pure functions, zero I/O, zero dependência de `product-identity/`/`canonical-catalog/`/`connectors/` (mesma disciplina de `taxonomy/`):

```
types/product-intelligence.types.ts   — AttributeValue<T>, ProductSignature
extraction/
  attribute-key-aliases.ts            — Objetivo 1/2: mapa de chaves fragmentadas → chave oficial
  value-normalizers.ts                — Objetivo 5: parsers de unidade/cor/EAN
  manufacturer-code-extractor.ts      — Objetivo 2: EAN/MPN/Part Number heurístico, do texto do nome
  ProductSignatureExtractor.ts        — Objetivo 3: compositor final
index.ts
```

## 4. Resultado medido (não projetado) — o teste real

`scripts/kappa3-cross-merchant-simulation.ts` rodou o `ProductIdentityEngine.evaluate()` real (inalterado) sobre ~1,3M pares cross-merchant, comparando 2 cenários:

| Cenário | Alta | Média | Manual | Produtos desbloqueados |
|---|---:|---:|---:|---:|
| CATEGORIA+MARCA (resultado final Κ-2) | 0 | 0 | 2 | 2 |
| **+ PRODUCT SIGNATURE (esta Mission)** | 0 | **10** | **306** | **199** |

Ver `docs/engineering/ATTRIBUTE_EXTRACTION.md` para a auditoria completa. A projeção de Comparable Coverage (2/3/4/5+ lojas, Objetivo 7) está na resposta desta missão — reproduzível via `scripts/kappa3-coverage-projection.ts`, não persistida como um 6º documento (a Mission mandata exatamente 5).

## 5. O que esta Layer deliberadamente não faz

- Não gera `MergeCandidate`s (isso continua `CanonicalMergeSuggestionService`, intocado).
- Não aprova nem executa merges (isso continua `MergeExecutorService`, intocado, Program Ω).
- Não usa IA generativa nem LLM — cada extrator é regex/heurística determinística, 100% reproduzível (mesmo output para o mesmo input, sempre).
- Não inventa valor algum — todo campo que não pode ser extraído com confiança fica `null`, nunca um palpite.

## 6. Ver também

`ATTRIBUTE_EXTRACTION.md`, `PRODUCT_SIGNATURE.md`, `ATTRIBUTE_CONFIDENCE.md`, `PRODUCT_NORMALIZATION_GUIDE.md`.
