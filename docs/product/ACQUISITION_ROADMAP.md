# ACQUISITION_ROADMAP.md
# PROGRAM Ξ — Mission Ξ-1 — Parte 5: Sequência Ótima de Aquisição de Merchants

**Categoria**: `docs/product/` (companion de Program Ω/Δ/Ξ)
**Data**: 2026-07-08
**Substitui, para fins de ordem, a priorização de `MERCHANT_PRIORITY_MATRIX.md` (Δ-1)** — mesma base factual, critério refinado com o dado real de sobreposição que só existiu a partir de Δ-3.

---

## Sequência recomendada

### 1º — Cellshop

- **Prioridade**: Máxima
- **Justificativa**: maior sobreposição projetada de todo o painel (`COMPETITIVE_DENSITY_MATRIX.md`) — perfil quase idêntico ao único par com convergência real medida (Shopping China × Mega Eletrônicos); já é prioridade 1 no pipeline comercial (`TIER1_PARTNERS.md`)
- **Impacto esperado**: Alto — primeiro merchant com chance real de dobrar ou mais a taxa de produtos comparáveis (hoje 0,32%)
- **Ganho estimado de densidade**: Projeção qualitativa Alta (não fabricar número — sem precedente de volume real para Cellshop, que está bloqueado)
- **Ganho estimado para IA**: Alto — primeiro caso de "múltiplos merchants, mesma categoria" em volume, não apenas 1 produto isolado
- **Dependências**: Comercial — parceria de dado (`Integration Strategy: Data Partnership`), nenhuma dependência técnica

### 2º — Nissei

- **Prioridade**: Máxima
- **Justificativa**: mesma prioridade comercial máxima de `TIER1_PARTNERS.md`; único merchant com marcas premium confirmadas (Apple/Sony/Canon/Nikon oficial) — viabiliza a categoria "Apple"/"Fotografia" sozinho
- **Impacto esperado**: Alto — categoria nova (marca premium) que nenhum conectado hoje cobre com autoridade
- **Ganho estimado de densidade**: Médio-Alto (projeção — categoria próxima de Atacado Connect/Mega Eletrônicos)
- **Ganho estimado para IA**: Alto — primeira fonte de dado de marca premium verificada
- **Dependências**: Comercial (Data Partnership), nenhuma técnica

### 3º — Mobile Zone

- **Prioridade**: Alta
- **Justificativa**: cluster celulares/eletrônicos, mesmo perfil de Cellshop; não bloqueado por política — só incerteza técnica (spike)
- **Impacto esperado**: Médio-Alto — reforça o cluster já priorizado no item 1
- **Ganho estimado de densidade**: Médio (projeção, catálogo real desconhecido até o spike)
- **Ganho estimado para IA**: Médio-Alto
- **Dependências**: **Técnica primeiro** — spike de investigação (Playwright/DevTools) para confirmar se é SPA/CSR ou tem API JSON explorável (`CONNECTOR_EXECUTION_BACKLOG.md`, Δ-1); só depois vira decisão de conector vs. parceria

### 4º — Visão VIP

- **Prioridade**: Média-Alta
- **Justificativa**: cluster informática, reforça a categoria "Notebooks/Informática" (2º lugar no `CATEGORY_DOMINATION_PLAN.md`)
- **Impacto esperado**: Médio
- **Ganho estimado de densidade**: Médio (projeção)
- **Ganho estimado para IA**: Médio
- **Dependências**: Técnica primeiro — mesmo spike do item 3, sitemap não cobre catálogo

### 5º — Casa Americana

- **Prioridade**: Média
- **Justificativa**: bloqueado comercialmente, mas prioridade comercial já estabelecida (`TIER1_PARTNERS.md` prioridade 3); perfil "geral" reduz confiança na projeção de sobreposição
- **Impacto esperado**: Baixo-Médio — precedente real (Roma Shopping, perfil "geral") sugere baixa sobreposição mesmo se integrado
- **Ganho estimado de densidade**: Baixo-Médio (projeção, risco de repetir o padrão Roma Shopping/Atacado Connect de catálogo paralelo)
- **Ganho estimado para IA**: Baixo-Médio
- **Dependências**: Comercial (Data Partnership)

### 6º — New Zone

- **Prioridade**: Baixa (para densidade) / Média (para cobertura bruta)
- **Justificativa**: perfil "atacado", o precedente real mais próximo (Roma Shopping/Atacado Connect, ambos catálogos amplos) mostra 0% de sobreposição — menor prioridade para o objetivo desta missão (competição de preço), ainda que relevante para cobertura total de mercado
- **Impacto esperado**: Baixo para comparação de preço; Médio para amplitude de catálogo
- **Ganho estimado de densidade**: Baixo (projeção)
- **Ganho estimado para IA**: Baixo-Médio (mais volume de dado, pouca comparação nova)
- **Dependências**: Comercial (Data Partnership)

## Por que esta ordem difere de `MERCHANT_PRIORITY_MATRIX.md` (Δ-1)

Δ-1 ordenou por relevância comercial e viabilidade técnica, sem dado de sobreposição real (que não existia ainda). Esta ordem mantém a mesma base (nenhum merchant novo foi descoberto), mas usa o critério refinado de `GROWTH_DECISION_REPORT.md` (Δ-3): proximidade de categoria com o único par de convergência real medido. Isso elevou Mobile Zone (era prioridade "4" em `TIER1_PARTNERS.md`, agora 3º aqui) e rebaixou New Zone (era prioridade "2" lá, agora último aqui) — a mudança é inteiramente justificada pelo dado de overlap que só passou a existir em Δ-3.
