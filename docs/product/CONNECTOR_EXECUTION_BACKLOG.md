# CONNECTOR_EXECUTION_BACKLOG.md
# PROGRAM Δ — Mission Δ-1 — Backlog Priorizado de Conectores

**Categoria**: `docs/product/` (companion de Program Ω/Δ)
**Data**: 2026-07-08
**Restrição respeitada**: nenhum conector foi implementado nesta missão. Este documento organiza a execução; não a executa.

---

## Item 1 — Shopping China: Recertificação (não é um conector novo)

| Campo | Valor |
|---|---|
| Merchant | Shopping China |
| Tipo de integração | Recertificação de connector existente (`src/domains/connectors/crawler/shoppingchina/`) — sitemap-driven em vez de 3 categorias hardcoded |
| Complexidade | **Baixa** — `SitemapParser`/`SitemapCrawler` já genéricos e usados por Mega Eletrônicos/Roma Shopping/Atacado Connect; retry/backoff já existe em `HttpFetchStrategy` desde a Wave 4 (`TECH_DEBT.md` — item já resolvido, não é mais um bloqueio) |
| Risco | Baixo-Médio — bug de moeda pré-existente (Gs. gravado como `price_usd`, `TECH_DEBT.md`) deve ser corrigido na mesma janela ou explicitamente adiado, nunca ignorado silenciosamente |
| Impacto | **Alto** — de 35 ofertas ativas (2–3,5% do estimado) para uma faixa comparável aos outros 3 connectors (~1.000–1.500), maior ganho de densidade de todo este backlog por esforço investido |
| Estimativa | Pequena — é troca de estratégia de descoberta (hardcoded → sitemap), padrão já provado 3 vezes nos outros connectors |
| Dependências | Nenhuma — todos os componentes reutilizáveis já existem (`Tier1_Merchants.md` §7) |
| Status | **Não iniciado** — maior prioridade deste backlog |

## Item 2 — Ativação de sync automático para os 4 connectors já certificados

| Campo | Valor |
|---|---|
| Merchant | Shopping China, Mega Eletrônicos, Roma Shopping, Atacado Connect (todos) |
| Tipo de integração | Configuração, não código — `CRON_SECRET`/`CRON_APP_URL` em GitHub Actions Secrets |
| Complexidade | Baixa (configuração de ambiente) |
| Risco | Baixo |
| Impacto | **Alto** — achado real desta auditoria: **nenhum dos 4 connectors sincronizou desde 2026-07-04**, 4 dias antes desta missão, apesar do cron existir em código desde a Release 1.8. Toda métrica de Price History/Freshness (`KPI_BASELINE.md`) fica estagnada até isso ser corrigido |
| Estimativa | Trivial — pendência já nomeada em `PRODUCTION_BASELINE_1.9.md` §9, nunca fechada |
| Dependências | Nenhuma técnica |
| Status | **Não iniciado**, bloqueando crescimento orgânico de Price History independente de qualquer novo connector |

## Item 3 — Mobile Zone: Spike Técnico

| Campo | Valor |
|---|---|
| Merchant | Mobile Zone |
| Tipo de integração | Spike de investigação (Playwright/DevTools) — não é implementação de connector |
| Complexidade | Média-Alta até o spike confirmar; pode cair para Baixa se houver API JSON explorável (`Tier1_Merchants.md` §5.7) |
| Risco | Baixo (é investigação, não escrita em produção) |
| Impacto | Médio — depende do resultado do spike para saber se o impacto real é alto (catálogo real desconhecido) |
| Estimativa | Pequena (spike, não construção) |
| Dependências | Nenhuma |
| Status | Não iniciado |

## Item 4 — Visão VIP: Spike Técnico

| Campo | Valor |
|---|---|
| Merchant | Visão VIP |
| Tipo de integração | Spike de investigação — mesma natureza do Item 3 |
| Complexidade | Média-Alta até confirmação |
| Risco | Baixo |
| Impacto | Médio — catálogo real desconhecido, sitemap não cobre produto |
| Estimativa | Pequena |
| Dependências | Nenhuma |
| Status | Não iniciado |

## Fora deste backlog — pertence ao pipeline comercial, não a engenharia

Cellshop, Nissei, Casa Americana, New Zone — os 4 merchants com `Integration Strategy: Data Partnership` **não têm item de engenharia possível hoje** (bloqueio de política confirmado, nunca contornado). Backlog de execução para eles vive em `docs/business/TIER1_PARTNERS.md`, não aqui — misturar os dois criaria exatamente a duplicação que `docs/business/README.md` já previne por convenção.

## Ordem de execução recomendada

1. **Item 2** (ativar sync automático) — mais barato de todo o backlog, desbloqueia crescimento orgânico de Price Freshness para os 4 connectors já certificados sem esperar nenhum outro item
2. **Item 1** (recertificar Shopping China) — maior impacto de densidade por esforço, zero dependência
3. **Itens 3/4** (spikes) — podem rodar em paralelo entre si, resultado determina se viram itens de backlog técnico ou são substituídos por parceria comercial
