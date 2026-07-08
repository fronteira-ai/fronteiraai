# MARKETPLACE_DOMINATION_STRATEGY.md
# PROGRAM Ξ — Mission Ξ-1 — Marketplace Domination Strategy

**Categoria**: `docs/product/` (companion de Program Ω/Δ/Ξ)
**Data**: 2026-07-08
**Natureza**: Estratégia operacional. Nenhum código, nenhuma arquitetura, nenhum conector, nenhum dado estrutural alterado — todas as afirmações quantitativas vêm de `Ω-4.0`, `Ω-4.1`, `Δ-1`, `Δ-2`, `Δ-3`, nunca de opinião.
**Companions**: `MERCHANT_LANDSCAPE.md`, `COMPETITIVE_DENSITY_MATRIX.md`, `CATEGORY_DOMINATION_PLAN.md`, `ACQUISITION_ROADMAP.md`, `EXECUTION_WAVES.md`, `GO_TO_MARKET_ALIGNMENT.md`

---

## A pergunta central

> Como o ParaguAI se tornará o marketplace de referência da fronteira?

**Resposta em uma frase, fundamentada nos 5 missões anteriores**: não construindo mais infraestrutura — a infraestrutura já está pronta e comprovada (Marketplace Density Score 83,2/100) — mas **integrando merchants que competem entre si pelos mesmos produtos**, porque hoje, de 1.262 produtos no catálogo, exatamente 1 tem mais de uma loja vendendo (`MARKETPLACE_TRUTH_REPORT.md`). O diferencial competitivo do ParaguAI — comparação de preço real — não existe ainda em volume. Esta estratégia é inteiramente sobre fechar essa lacuna, na ordem certa.

---

## Parte 4 — Modelo de Efeito de Rede

**Princípio, não fórmula fabricada**: com apenas 1 par de merchants realmente medido em convergência (Shopping China × Mega Eletrônicos, 1 produto), não existe dado suficiente para uma fórmula matemática precisa de "quanto cada merchant novo aumenta Offer Density" — apresentar uma não seria ciência, seria decoração. O modelo abaixo é direcional, ancorado no único dado real, e cada Wave (`EXECUTION_WAVES.md`) deve substituir a projeção por medição assim que o merchant for integrado.

### Relação qualitativa observada

```
Merchant novo, MESMO cluster de categoria de um já conectado
  → Offer Density sobe (evidência: o único par medido é intra-cluster)
  → Comparação de preço real aumenta
  → AI Readiness Score sobe (mais produtos com 2+ ofertas)
  → Marketplace Health sobe (mais sinal para Market Pulse/Volatility)
  → Valor para o usuário sobe (resposta não-trivial a "qual loja é mais barata")

Merchant novo, cluster de categoria DISTINTO dos já conectados
  → Offer Density permanece estável (evidência: Roma Shopping/Atacado Connect,
     372 e 392 produtos, 0% de sobreposição com qualquer parceiro)
  → Cobertura de catálogo aumenta, comparação de preço não
  → AI Readiness Score sobe pouco (mais produtos "single-offer", que já
     dominam 99,68% do catálogo)
  → Valor para o usuário aumenta para "descoberta", não para "comparação"
```

### Indicadores para acompanhar semanalmente (propostos, não implementados — reaproveitam KPIs já definidos)

| Indicador | Fonte já existente | Frequência |
|---|---|---|
| Offer Density | `database/health_checks/marketplace_density.sql` (Ω-4.0) | Semanal |
| Produtos Comparáveis (2+ ofertas) | Mesmo script, extensão já usada em Δ-3 | Semanal |
| Marketplace Density Score | Fórmula de `MARKETPLACE_OBSERVATORY_BASELINE.md` | Semanal |
| AI Readiness Score | Fórmula de `MARKETPLACE_TRUTH_REPORT.md` | Semanal |
| Overlap por par de merchant | `MERCHANT_OVERLAP_MATRIX.md`, reexecutável | A cada merchant novo integrado |

Nenhum indicador novo precisa ser construído — todos já têm query/fórmula definida em missões anteriores. "Semanalmente" é uma cadência operacional, não uma nova capacidade técnica.

---

## Parte 6 — Metas Quantitativas para o Launch

Todas justificadas por referência direta, nenhuma arbitrária:

| Meta | Valor | Justificativa |
|---|---|---|
| Merchants ativos | ≥8 de 10 Tier 1 | `GO_TO_MARKET_ALIGNMENT.md`, critério de Launch Candidate |
| Categorias dominadas | ≥2 | Idem — menor barra que "todas as 9", reconhecendo que Games é gap estrutural não endereçável com o universo atual |
| Produtos comparáveis | ≥15% do catálogo | Salto de ordem de magnitude sobre os 0,32% medidos hoje — âncora em `CATEGORY_DOMINATION_PLAN.md` |
| Ofertas por produto (Offer Density) | ≥1,5 | Meta de Launch já definida em `OFFER_DENSITY_STRATEGY.md` (Δ-1), reafirmada aqui com dado mais recente |
| Cobertura de marcas | Auditoria nominal concluída (não um número — `KPI_BASELINE.md` já mostra 100% de preenchimento, o gap é qualidade/fragmentação, nunca medido) | `MARKETPLACE_TRUTH_REPORT.md` |
| Atualização de preços | Sync automático ponta-a-ponta, sem execução manual | Bloqueado hoje por limite de arquitetura (`PRODUCTION_ACTIVATION_REPORT.md`) — meta condicional a uma decisão fora do escopo desta missão |
| Tempo máximo de sincronização | Por conector, dentro do já observado (~2-5 min/conector) — não uma meta nova, uma confirmação de que o tempo atual é aceitável para o volume atual | `CONNECTOR_RECERTIFICATION_REPORT.md` |
| AI Readiness Score | ≥40/100 | Salto sobre os 34,2/100 medidos — meta de Beta Público em `GO_TO_MARKET_ALIGNMENT.md` |

---

## Síntese — Definition of Done

### Qual Wave deve ser executada primeiro

**Wave Ξ-1 — Cluster Ignition (Cellshop + Nissei)**, ver `EXECUTION_WAVES.md`.

### Quais merchants devem compô-la

**Cellshop** e **Nissei** — os dois merchants com maior prioridade comercial já estabelecida (`docs/business/TIER1_PARTNERS.md`) *e* maior sobreposição de categoria projetada (`COMPETITIVE_DENSITY_MATRIX.md`), ancorada no único par de convergência real medido em todo o marketplace.

### Aumento de valor esperado, por dimensão

| Dimensão | Aumento esperado |
|---|---|
| **Comparação de preços** | De 1 para uma ordem de magnitude maior de produtos comparáveis (projeção — Cellshop replica o perfil do único par real medido) — meta de Beta Público (≥50 produtos comparáveis) passa a ser alcançável |
| **Experiência do usuário** | Primeira vez em que um usuário real pode ver "3 lojas, 3 preços" para um smartphone específico, não apenas 1 caso isolado |
| **Inteligência Artificial** | AI Readiness Score sobe do componente hoje quase zerado (Comparable Products, 0,32%) — é o único caminho identificado nesta missão para mover esse número sem esperar meses de acúmulo orgânico de histórico de preço |
| **Efeito de rede do marketplace** | Primeira prova pública de que o ParaguAI compara preços de verdade — o gatilho que `AI_CONSTITUTION.md` Seção X descreve como o início do flywheel (mais compradores atraídos por comparação real → mais dado → mais lojistas querendo estar presentes) |

### O que esta missão não decide

Não decide se/quando contatar Cellshop e Nissei (isso é execução do pipeline comercial já existente, `docs/business/TIER1_PARTNERS.md`, fora do escopo "sem código/sem execução" desta missão). Não resolve o limite de sincronização automática (arquitetural, nomeado, não corrigido). Não constrói nenhum indicador novo — todos já existem em missões anteriores, prontos para reuso.
