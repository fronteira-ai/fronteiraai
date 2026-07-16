# CONFIDENCE_ENGINE.md
# Program Ξ (Xi) — Mission Ξ-1 — Autonomous Marketplace Engine

**Categoria**: `docs/architecture/`
**Criado**: 2026-07-16
**Status**: Proposta arquitetural pura — árvore de decisão conceitual, não um algoritmo novo. Reaproveita os 3 tiers de confiança já existentes e aprovados pelo CTO (`auto=95, probable=85, possible=70`, `product-identity/types/enums.ts`) — nenhum threshold alterado.

---

## 1. A árvore de decisão (Objetivo 4)

```
Novo fato de extração chega (manufacturerCode, model, atributo)
  │
  ├─ Já existe na Marketplace Memory, idêntico? ──────────► REUTILIZA
  │  (mesmo brand_id + manufacturerCode já visto             (zero recomputação, zero revisão —
  │   e confirmado por pelo menos 1 merge executado)          é literalmente o mesmo fato de novo)
  │
  ├─ Extração de alta confiança, nunca visto antes,
  │  mas todos os fatores concordam
  │  (brand + category + manufacturerCode idênticos
  │   entre 2+ ofertas) ──────────────────────────────────► CONFIRMA SOZINHO A EXTRAÇÃO
  │                                                            (não o merge — só persiste o fato de
  │                                                             identidade; a decisão de UNIR dois
  │                                                             canonical_products continua exigindo
  │                                                             aprovação humana, Shadow Mode intocado)
  │
  ├─ Confiança Média (85-94%, tier já existente) ─────────► APRENDE, MAS SINALIZA PARA REVISÃO
  │  (sinal parcial — ex.: manufacturerCode bate,             (mesmo tier "Média" que já existe hoje —
  │   mas nome diverge mais que o esperado)                    esta proposta não cria um tier novo)
  │
  └─ Confiança Manual (70-84%) ou conflito
     (ex.: mesmo manufacturerCode, categorias
     diferentes — sinal contraditório) ────────────────────► PEDE REVISÃO HUMANA
                                                                (mesmo piso "possible=70" já existente;
                                                                 abaixo disso, nem chega a ser candidato,
                                                                 comportamento já em produção desde
                                                                 Program Ω)
```

## 2. Eliminando revisões repetidas (o pedido explícito do Objetivo 4)

O mecanismo não é "revisar menos" — é "nunca pedir para revisar a mesma coisa duas vezes." Hoje, `findByPair()` (Program Ω, já existente) já impede sugerir o mesmo par de produtos duas vezes — mas **não impede o mesmo padrão** de aparecer disfarçado de par diferente. Exemplo real, medido em Mission OPS-1: dos 10 candidatos cross-merchant de confiança Média gerados, 2 eram a mesma dupla física em direções opostas (A→B e B→A) — o sistema atual trata isso como 2 decisões, não 1. A árvore acima resolveria isso na camada de Memória (§1, "Reutiliza"): uma vez que a dupla (A,B) é resolvida em qualquer direção, a Memória marca o par como resolvido, e a direção reversa nunca chega a virar um candidato pendente.

## 3. Knowledge Reuse (Objetivo 5) — como um fato aprendido se propaga

```
Fato confirmado sobre 1 produto (ex.: brand_id=Apple, manufacturerCode=A3257 → "iPhone 17 Pro Max")
  │
  ├─► Todos os produtos futuros com o mesmo (brand_id, manufacturerCode)
  │    entram no mesmo grupo automaticamente — nenhum reprocessamento do Engine
  │    necessário para o grupo já existente, só uma comparação de chave
  │    (exatamente a chave que a simulação de Mission Π-1 já usou: `brand_id::manufacturerCode`)
  │
  ├─► Todas as lojas — a Memória não é por loja, é por identidade de produto;
  │    uma loja nova que traga o mesmo manufacturerCode se beneficia no primeiro
  │    sync, não depois de N syncs de "aprendizado"
  │
  ├─► Todas as buscas — Search já lê o estado resolvido (canonical_product_id),
  │    nenhuma mudança necessária em `SEARCH_EVOLUTION.md` além do que já proposto
  │
  ├─► Todas as comparações — Comparable Coverage já é, por definição, a contagem
  │    de grupos com 2+ lojas — cresce automaticamente à medida que a Memória
  │    resolve mais grupos, sem nenhuma mudança no cálculo de CPC
  │
  └─► Todos os Advisors — consomem Comparable Coverage/Opportunity como já
       consomem hoje (confirmado em `CROSS_MERCHANT_ACTIVATION_PILOT.md`,
       Mission OPS-1: 0 linhas de `BestDealComposer` mudaram, e ainda assim
       passou a mostrar economia real de 14,9% em um produto que segundos
       antes não tinha nenhuma comparação)
```

**Por que "sem reprocessamento desnecessário" já é comprovável, não hipotético**: a simulação de Mission Π-1 (`KNOWLEDGE_GRAPH_ROADMAP.md`) já demonstrou isso na prática — agrupar por `(brand_id, manufacturerCode)` uma única vez sobre os 17.983 produtos ativos produziu 397 grupos automaticamente, sem nenhuma iteração adicional por produto além da primeira. Reutilização não é uma promessa desta Mission, é um resultado já medido em uma Mission anterior desta mesma sequência.
