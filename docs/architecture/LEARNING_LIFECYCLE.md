# LEARNING_LIFECYCLE.md
# Program Ξ (Xi) — Mission Ξ-2 — Marketplace Learning Engine

**Categoria**: `docs/architecture/`
**Criado**: 2026-07-16
**Status**: Proposta arquitetural pura.

---

## O ciclo de vida completo (Objetivo 3) — quando cada etapa acontece, exatamente

```
Novo conhecimento
  │  QUANDO: um conector sincroniza uma oferta nova, ou `diffFromProduct` (Κ-4, já existente)
  │  detecta que `products.specifications`/`name` mudou para um produto já conhecido.
  │  Nunca "periodicamente" — sempre disparado por um evento real de sincronização.
  ▼
Validação
  │  QUANDO: imediatamente após a extração, usando o `confidence` que `AttributeValue`
  │  já carrega por campo (Κ-3, `product-intelligence.types.ts` — já existe, hoje calculado
  │  e descartado junto com o resto). "high" confidence → prossegue para persistência.
  │  "medium"/"low" → prossegue, mas marcado para revisão futura mais fácil (nunca bloqueia
  │  o produto de ter QUALQUER fato salvo — persistir parcialmente é sempre melhor que
  │  recalcular tudo de novo depois).
  ▼
Persistência
  │  QUANDO: no mesmo ciclo de sincronização que gerou o fato — nunca em lote separado
  │  (um fato não persistido é um fato que será recalculado da próxima vez, o problema
  │  que esta Mission existe para resolver).
  ▼
Versionamento
  │  QUANDO: no momento da persistência — o fato carrega a versão do extrator que o
  │  produziu (mesmo padrão de `PRODUCT_IDENTITY_ALGORITHM_VERSION`, já existente).
  │  Nunca recalculado depois só porque uma versão nova do extrator existe — ver
  │  "Reaprendizado" abaixo para quando isso de fato acontece.
  ▼
Reutilização
  │  QUANDO: toda vez que qualquer consumidor (Identity, Merge, Search, Advisor —
  │  ver `KNOWLEDGE_PROPAGATION.md`) precisaria do mesmo fato para o mesmo produto,
  │  identificado pelo mesmo `canonical_product_id` ou pela mesma chave de agrupamento
  │  (`brand_id` + `manufacturerCode`). Este é o passo que elimina o fator de redundância
  │  624,2x medido em `MARKETPLACE_LEARNING_ENGINE.md` §2.
  ▼
Atualização
  │  QUANDO: `diffFromProduct` (já existente) detecta que o dado de origem mudou —
  │  o mesmo gatilho de "Novo conhecimento", reaplicado a um produto já conhecido.
  │  Nunca um recálculo "só para garantir" — sempre motivado por uma mudança real
  │  detectada no dado de origem.
  ▼
Invalidação
  │  QUANDO: (a) o dado de origem mudou de um jeito que contradiz o fato salvo
  │  (ex.: `specifications["COR"]` mudou de valor); ou (b) um humano rejeita
  │  explicitamente um merge_candidate cujo fato de origem foi este — o mesmo sinal
  │  que hoje só ensina `findByPair` a não repetir aquele par específico passaria a
  │  também marcar o fato subjacente como suspeito, não confiável por padrão.
  ▼
Reaprendizado
     QUANDO: (a) após invalidação, na próxima sincronização que toca o produto; ou
     (b) quando a versão do extrator muda — mas nunca em massa, automaticamente,
     no momento do deploy de uma versão nova. Reaprendizado em massa por mudança de
     versão é uma decisão de Mission futura, explicitamente fora do escopo desta
     proposta (que é "exclusivamente arquitetural") — o mecanismo de versionamento
     só garante que a decisão é possível de tomar depois, não que ela acontece sozinha.
```

## Por que este ciclo nunca aumenta trabalho humano

Os únicos dois pontos que envolvem um humano ("Validação" quando a confiança é baixa, "Invalidação" via rejeição de merge) já são exatamente os pontos onde um humano já está envolvido hoje (revisão de `merge_candidates` Manual/Média). O ciclo não adiciona uma nova fila de aprovação — ele faz com que a mesma decisão humana que já acontece hoje (aprovar ou rejeitar um merge) tenha um efeito mais amplo e permanente do que tem hoje (`KNOWLEDGE_PROPAGATION.md`).
