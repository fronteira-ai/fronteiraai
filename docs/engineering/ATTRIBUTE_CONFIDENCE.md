# ATTRIBUTE_CONFIDENCE.md
# Program Κ — Mission Κ-3 — Objetivo 4

**Categoria**: `docs/engineering/`
**Criado**: 2026-07-15

---

## 1. O contrato

Todo campo de `ProductSignature` é um `AttributeValue<T>` (`src/domains/product-intelligence/types/product-intelligence.types.ts`):

```ts
interface AttributeValue<T> {
  value: T | null;
  source: "specifications" | "name" | "brand_id" | null;
  confidence: "high" | "medium" | "low" | null;
  extractedFrom: string | null;
}
```

**Regra permanente (Quality Gate desta Mission)**: `value === null` sempre que `source`/`confidence`/`extractedFrom` também são `null` — nunca um valor sem proveniência, nunca uma proveniência sem valor. Testado explicitamente (`ProductSignatureExtractor.test.ts`, "never fabricates a value").

## 2. As 3 fontes

| Fonte | O que significa | Exemplo |
|---|---|---|
| `brand_id` | Lookup direto de uma FK já resolvida — não é extração | `brand: "Apple"` |
| `specifications` | Uma chave de `canonical_products.specifications` foi resolvida via `ATTRIBUTE_KEY_ALIASES` e o valor foi normalizado com sucesso | `color: "TITANIO_PRETO"` de `COR: "Titânio Preto"` |
| `name` | Extraído do texto de `canonical_products.name` via heurística (regex) | `manufacturerCode: "A3257"` |

## 3. As 3 confianças

| Confiança | Quando se aplica | Por quê |
|---|---|---|
| `high` | Fonte `brand_id`, ou fonte `specifications` com chave já resolvida por alias + valor parseado com sucesso | O alias map (`attribute-key-aliases.ts`) só contém chaves cujo significado foi medido como não-ambíguo (ver `ATTRIBUTE_EXTRACTION.md` §3) — a incerteza real está só no parse do valor, já feito com sucesso quando `confidence: "high"` é atribuído |
| `medium` | Fonte `name` — qualquer heurística de texto livre (modelo Apple, código de fabricante) | Nunca validado contra um registro externo; um regex que casa não prova que o token é de fato um MPN/modelo — é a melhor evidência disponível, não uma certeza |
| `low` | Reservado, não usado nesta Mission | Nenhum extrator construído aqui produz um resultado abaixo de `medium` — quando a confiança seria "low", o extrator retorna `null` em vez disso (ex.: `normalizeColorToken` recusa cores compostas em vez de arriscar um valor de baixa confiança) |

## 4. "Nunca inventar valores" — como isso é garantido em código, não só em prosa

- Todo normalizador (`value-normalizers.ts`) retorna `null` no primeiro sinal de ambiguidade — nunca um valor "aproximado". Exemplo: `normalizeColorToken("Relógio: Red Pink - Pulseira: Mango")` retorna `null` em vez de adivinhar qual parte é "a" cor.
- `extractManufacturerCode` nunca é `confidence: "high"` — o próprio tipo garante isso: é chamado apenas no branch `source: "name"`, que só pode produzir `"medium"`.
- Nenhum extrator tem acesso a um LLM ou modelo generativo (restrição do mandato) — todo resultado é 100% reproduzível: mesmo input, mesmo output, sempre (garantido pelos testes de cada normalizador).

## 5. `extractedFrom` — auditabilidade

Todo valor não-nulo carrega o texto de origem exato. Para `specifications`: `"COR=\"Titânio Preto\""` (chave bruta + valor bruto). Para `name`: o nome inteiro do produto (o extrator de código também expõe todos os candidatos avaliados, não só o vencedor, via `ManufacturerCodeMatch.candidates`). Isso permite auditar qualquer valor de volta à sua origem sem re-executar a extração.

## Fontes

`src/domains/product-intelligence/types/product-intelligence.types.ts`, `src/domains/product-intelligence/__tests__/ProductSignatureExtractor.test.ts`.
