# EXECUTION_WAVES.md
# PROGRAM Ξ — Mission Ξ-1 — Parte 7: Ondas de Execução

**Categoria**: `docs/product/` (companion de Program Ω/Δ/Ξ)
**Data**: 2026-07-08
**Nota de governança**: nenhuma Wave abaixo está aberta. Esta é uma proposta de sequenciamento, mesmo status que `ROADMAP_2_0.md` tinha antes de Program Ω ser formalmente aprovado — abertura exige mandato explícito e separado do CTO por Wave, mesma disciplina de todo o programa até aqui.

---

## Wave Ξ-1 — Cluster Ignition (Cellshop + Nissei)

- **Objetivo**: converter os 2 merchants de maior prioridade comercial e maior sobreposição projetada em parceiros de dado reais, gerando o primeiro caso de convergência de preço em volume (não apenas o 1 produto isolado medido hoje).
- **Merchants envolvidos**: Cellshop, Nissei
- **Categorias impactadas**: Smartphones/Celulares (Cellshop), Apple/Fotografia/Informática premium (Nissei)
- **Ganho esperado**: Offer Density acima de 1,01 (hoje 1,0024); pelo menos 5 comparações de preço reais e verificáveis
- **Critérios de aceite**: pelo menos 1 dos 2 merchants com feed de dado real recebido e processado pelo pipeline existente (mesma disciplina de `docs/business/MERCHANT_PARTNERSHIP_PROGRAM.md` — vira `IConnector`, entra no pipeline padrão sem mudança de arquitetura); remedição completa (`database/health_checks/marketplace_density.sql`) confirmando ganho real, não projetado

## Wave Ξ-2 — Technical Spike Resolution (Mobile Zone + Visão VIP)

- **Objetivo**: resolver a incerteza técnica dos 2 merchants "Needs Technical Spike" — decidir entre Connector Público ou rota comercial
- **Merchants envolvidos**: Mobile Zone, Visão VIP
- **Categorias impactadas**: Celulares/Eletrônicos (Mobile Zone), Informática (Visão VIP)
- **Ganho esperado**: decisão técnica definitiva para os 2 últimos merchants em estado "Pending Decision" — não necessariamente ganho de densidade nesta Wave (o spike em si não integra dado)
- **Critérios de aceite**: spike de investigação concluído para os 2 (Playwright/DevTools), `Integration Strategy` atualizado de "Pending Decision" para "Public Connector" ou "Data Partnership" em `docs/marketplace/Tier1_Merchants.md`

## Wave Ξ-3 — Coverage Completion (Casa Americana + New Zone)

- **Objetivo**: fechar a cobertura dos 10 merchants Tier 1 originalmente auditados, mesmo com menor prioridade de densidade
- **Merchants envolvidos**: Casa Americana, New Zone
- **Categorias impactadas**: Eletrônicos/Geral (Casa Americana), Importados/Atacado (New Zone)
- **Ganho esperado**: cobertura de mercado ampliada; ganho de Offer Density esperado **baixo** (nomeado explicitamente, não inflado — ver `ACQUISITION_ROADMAP.md`)
- **Critérios de aceite**: parceria de dado formalizada para pelo menos 1 dos 2; nenhuma expectativa de convergência de preço alta seja usada para justificar prioridade desta Wave

## Wave Ξ-4 — Category Domination Validation

- **Objetivo**: reexecutar `MARKETPLACE_TRUTH_REPORT.md`/`MERCHANT_OVERLAP_MATRIX.md`/`CATEGORY_DOMINATION_PLAN.md` com dado real pós-Ξ-1/Ξ-2/Ξ-3, substituindo toda projeção desta missão por medição
- **Merchants envolvidos**: todos os ativos até então
- **Categorias impactadas**: todas listadas em `CATEGORY_DOMINATION_PLAN.md`
- **Ganho esperado**: confirmar ou refutar as projeções desta missão com dado real — se as projeções de overlap alto (Cellshop/Mobile Zone/Nissei) não se confirmarem, a estratégia de categoria precisa ser revisada antes de prosseguir
- **Critérios de aceite**: toda métrica de `CATEGORY_DOMINATION_PLAN.md` remedida; pelo menos 1 categoria efetivamente "dominada" pela definição formal do documento

## Ordem — não paralela entre Ξ-1 e Ξ-2/Ξ-3

Ξ-1 precede as demais porque tem a maior evidência de impacto e nenhuma dependência técnica bloqueante (só comercial). Ξ-2 (spike técnico) pode rodar em paralelo com Ξ-1 sem competir por recursos (natureza de investigação, não de negociação comercial). Ξ-3 é deliberadamente última — menor evidência de ganho de densidade, não deve competir por atenção comercial com Ξ-1. Ξ-4 é sempre a última de cada ciclo — nunca simultânea com as demais, porque seu propósito é medir o resultado delas.
