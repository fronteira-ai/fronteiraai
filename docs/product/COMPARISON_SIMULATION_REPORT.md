# COMPARISON_SIMULATION_REPORT.md
# FASE 2 — SPRINT 2.3 — Product Comparison Validation — Objetivo 4

**Categoria**: `docs/product/`
**Data**: 2026-07-11
**Natureza**: Simulação em memória, `scripts/product-comparison-simulation.ts`. **Nenhuma escrita em `merge_candidates`, `canonical_products` ou `offers`. Nenhuma mudança em Shadow Mode ou Product Identity.** Os números abaixo não existem em nenhuma tabela — são recomputados a cada execução do script, a partir de dados já públicos (`products.name`).

---

## 1. Metodologia

Como `PRODUCT_COMPARISON_AUDIT.md` §3 mostrou que `category_id` é a dimensão mais fragmentada entre lojas, a simulação agrupa as 370 ofertas da amostra estratégica por uma **assinatura normalizada** que ignora `category_id` deliberadamente: `marca + capacidade de armazenamento (regex \d+(TB|GB)) + cor (lista fixa de termos PT/EN) + primeiros 6 tokens do nome (excluindo códigos de SKU tipo "A3257")`. Isto **não é o `ProductIdentityEngine` real** — é uma aproximação client-side, propositalmente mais permissiva que o engine em produção, para responder "mesmo no melhor caso razoável, quanto isso moveria a agulha?" sem reimplementar nem alterar a engine.

## 2. Resultado, produto a produto

| Produto | Ofertas | Clusters HOJE (canonical_product_id) | Comparáveis HOJE (2+) | Clusters SIMULADO (assinatura) | Comparáveis SIMULADO (2+) | Comparáveis SIMULADO (3+) |
|---|---|---|---|---|---|---|
| iPhone 17 Pro Max | 26 | 26 | 0 | 23 | 0 | 0 |
| iPhone 17 Pro | 10 | 10 | 0 | 10 | 0 | 0 |
| Samsung Galaxy Ultra | 16 | 15 | 1 | 15 | 1 | 0 |
| MacBook Air | 43 | 42 | 1 | 42 | 1 | 0 |
| MacBook Pro | 39 | 39 | 0 | 38 | 0 | 0 |
| AirPods Pro | 7 | 7 | 0 | 5 | 0 | 0 |
| Apple Watch | 41 | 41 | 0 | 34 | 0 | 0 |
| PlayStation 5 | 43 | 42 | 0 | 39 | 1* | 0 |
| Nintendo Switch | 80 | 80 | 0 | 76 | 0 | 0 |
| **Total** | **305** | **302** | **2** | **282** | **3** | **0** |

`*` — ver ressalva §3, este par é provavelmente um falso positivo da simulação, não um ganho real.

**Ganho líquido simulado na amostra inteira: +1 produto comparável (2+ lojas), de 2 para 3.**

## 3. Ressalva importante — a simulação também produz falso positivo

O único "ganho" novo da simulação (`sony|console-sony-playstation-5-slim-cfi|1tb|no-color`) agrupou:

- `"Console Sony PlayStation 5 Slim CFI-2015A Edição Standard 1TB Japão Bivolt"` (roma-shopping)
- `"Console Sony PlayStation 5 Slim CFI-2115A 8K 1TB SSD + Fortnite Flowering Chaos Bundle"` (atacado-connect)

Estes são **provavelmente produtos diferentes** (edições/bundles diferentes — um inclui jogo, o outro não; códigos de modelo `CFI-2015A` vs `CFI-2115A` são de revisões distintas do console). A assinatura simplificada (6 primeiros tokens + capacidade) não captura essa diferença. Este é o achado mais importante da simulação: **até uma heurística permissiva de agrupamento erra na direção de falso positivo** — reforça por que o `ProductIdentityEngine` real é conservador por desenho (gate duro de marca+categoria, threshold alto) e por que a correção certa não é "afrouxar o matching", é **melhorar os dados de entrada** (`specifications`, taxonomia de categoria) para que o matching real, sem afrouxar nada, tenha informação suficiente para decidir corretamente.

## 4. Por que o ganho é tão pequeno mesmo removendo a fragmentação de categoria

A causa não é (só) o gate de categoria — é que, **na granularidade de SKU exato (capacidade + cor específicas)**, as 5 lojas hoje majoritariamente **não vendem a mesma configuração exata** do mesmo produto. Cada loja tende a ter seu próprio mix de armazenamento/cor por modelo. Isso é uma característica real do catálogo atual (5 merchants, coberturas de categoria ainda em expansão — ver `MARKETPLACE_COVERAGE_MAP.md`, `MERCHANT_OVERLAP_MATRIX.md`), não um artefato do pipeline de identidade. Comparação por **modelo** (ex.: "iPhone 17 Pro Max", ignorando capacidade/cor, com um seletor de variante na UI) capturaria mais sobreposição real — mas isso é uma decisão de produto/escopo de comparação, não uma correção de bug, e está fora do mandato desta Sprint (nenhuma heurística nova, nenhuma mudança de arquitetura). Nomeado aqui como pergunta em aberto para Sprint 2.4, não respondido.

## 5. Impacto na Offer Density e na experiência do usuário, extrapolado com cautela

Não é fabricado um número marketplace-wide a partir de uma amostra de 305/9.552 ofertas (3,2% do catálogo). O que a amostra permite dizer com confiança:

- **Offer Density não muda** com esta simulação — ela mede ofertas por produto, não comparabilidade; os 305 registros continuam sendo 305 ofertas independentemente do agrupamento.
- **Experiência do usuário**: mesmo no cenário mais otimista simulado (que já demonstrou gerar 1 falso positivo em 3 ganhos), o usuário buscando por qualquer um dos 8 produtos estratégicos nomeados nesta Sprint continuaria a ver, hoje, **essencialmente zero comparação de preço real entre lojas** para a configuração exata que procura. A promessa central do marketplace ("compare preços entre lojas") não se sustenta para produtos de alto interesse no estado atual dos dados — isto é o achado central desta Sprint, não uma hipótese.
