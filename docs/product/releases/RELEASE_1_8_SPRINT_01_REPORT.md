# RELEASE_1_8_SPRINT_01_REPORT.md
# Sprint 0.1 — Critical Readiness Fixes — Relatório Final

**Versão**: 1.0
**Criado**: 2026-07-02
**Status**: Entregue
**Mandato**: resolver integralmente as duas inconsistências críticas que o Sprint Zero (`RELEASE_1_8_SPRINT_ZERO_REPORT.md`) identificou, antes de iniciar qualquer Wave do Release 1.8. Sem funcionalidades novas.

---

## PRIORIDADE 1 — Analytics Activation

### O que a investigação encontrou (mais grave do que o Sprint Zero sabia)

O Sprint Zero identificou que `hooks/useAnalytics.ts` nunca era importado. A investigação deste Sprint descobriu a causa raiz, que é maior: **as migrations `0018` a `0021` — todo o Release 1.6 a partir do Epic 2 (Analytics, Decision Engine, Catalog Intelligence, Growth Engine) — nunca tinham sido aplicadas em produção**, apesar de documentadas como entregues em todo lugar ("Merchant OS complete"). Confirmado por query direta contra `information_schema.tables` do banco live — não por suposição. Só `merchant_reviews` e `trust_signals` (migrations `0014`-`0017`, Trust Foundation/Experience) existiam de fato.

### O que foi corrigido

1. **As 4 migrations foram aplicadas.** Movidas para `supabase/migrations/` (`20260702090000_analytics_platform.sql` até `20260702090300_growth_engine.sql`, seguindo o mesmo padrão de `0022`-`0026`) e aplicadas via `supabase db push`. Confirmado: `buyer_events`, `buyer_sessions`, `merchant_analytics_daily`, `merchant_decision_actions`, `merchant_catalog_snapshots`, `merchant_growth_history` — todas as 6 tabelas — existem agora em produção.
2. **`useAnalytics` foi conectado**, cobertura mínima e representativa (não arquitetura nova, não reescrita — apenas uso do que já existia): `BuyerSessionTracker` (novo, `components/analytics/`) montado globalmente em `app/layout.tsx`, mesmo padrão do `<Analytics />` (GA4/Clarity) já existente — garante que `buyer_sessions` recebe uma linha em toda visita. `ProductViewTracker` em `/product/[slug]`, `StoreViewTracker` em `/lojas/[slug]`, `SearchViewTracker` em `/search` — três ilhas client mínimas, mesmo padrão de `FavoriteButton`/`ShareButton` já usado nessas páginas.
3. **`database/migrations/README.md` corrigido** — a versão anterior afirmava, incorretamente, que `0018`-`0021` "já estavam aplicadas" e que editá-las era higiene de repositório apenas. Não era verdade. Corrigido com a história real.

### Evidências (demonstradas, não presumidas)

- Build de produção local rodado (`npm run start`).
- `POST /api/analytics/session` real → sessão criada, `session_id` real retornado.
- `POST /api/analytics/events` real, usando esse `session_id` → `{"success":true,"inserted":1}`.
- Query direta contra o banco confirmou a linha em `buyer_events` (`event_type: SearchPerformed`, `search_query: sprint-0.1-evidence`) e em `buyer_sessions`.
- Ambas as linhas de teste foram **removidas** depois da confirmação — dado sintético não deve poluir o comportamento real que `C-6 Buyer Behavioral Knowledge` acumula.

### O que continua não funcionando — nomeado, não corrigido

**O Brain não recebe nenhum `buyer_events`.** Confirmado por busca cruzada entre `src/domains/merchant-analytics/` e `src/domains/trust/`: zero referência em qualquer direção. Não é (só) o gap de mapeamento já documentado (21 `TrustEventType` sem `TRUST_EVENT_BRAIN_IMPACT`, achado da Wave 4) — é mais fundamental: nenhum código chama `EventService.recordEvent` a partir de um evento de comprador real. Construir essa ponte — decidir quais eventos de comprador viram eventos do Brain, em que limiar, mapeados para qual `TrustEventType` — é arquitetura nova de verdade. Fora do mandato explícito deste Sprint ("não criar arquitetura nova"). Registrado em `TECH_DEBT.md` como candidato a uma Wave própria do Release 1.8.

---

## PRIORIDADE 2 — Canonical Route Audit

### Rotas auditadas

Produtos (`/product/[slug]`), Categorias (não existe rota ainda — `TECH_DEBT.md` já documentava isso, sem duplicação possível), Marcas (idem), Merchant (`/merchant/*`, dashboard interno, sem duplicação com nenhuma rota pública), e o achado do Sprint Zero: `/store/[slug]` vs. `/lojas/[slug]`.

### Decisão oficial

**`/lojas/[slug]` é a URL canônica única para loja.** Justificativa: implementação mais completa (`generateMetadata`, JSON-LD, breadcrumbs, Merchant Score, `ClaimStoreButton`), alcançada pelo ponto de navegação principal (Navbar/Footer).

### O que foi implementado

1. **`app/store/[slug]/` removida** (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `_cache.ts`) — o código morto, não apenas o problema de duplicação.
2. **Redirect 308 permanente** — `next.config.ts`, `redirects()`, `/store/:slug` → `/lojas/:slug`. Config-level (não `permanentRedirect()` por página) porque é um mapeamento 1:1 incondicional, sem lookup de dado — a escolha idiomática correta segundo a própria documentação do Next.js 16. **Verificado em tempo real**: `curl` contra um build de produção local confirmou `Status: 308`, `Redirect: /lojas/test-slug`.
3. **`app/sitemap.ts` corrigido, com uma armadilha real evitada**: o `case "stores"` (apontando para a rota removida) foi eliminado — mas o `case "lojas"` que sobrou usava `getStoresRanking(100)` (top-100 apenas), enquanto o `case "stores"` removido usava `getStores()` (todas as lojas). Trocar só removendo a duplicata teria **encolhido silenciosamente a cobertura de SEO de "todas as lojas" para "top 100"**. Corrigido: `case "lojas"` agora usa `getStores()`.
4. **`app/robots.ts` corrigido** — tinha sua própria cópia hardcoded da lista de sitemaps (`["static", "stores", "lojas"]`), desatualizada separadamente do `sitemap.ts`.
5. **`constants/routes.ts`**: `storePath()`/`storeUrl()` (geravam `/store/...`) substituídos por `lojaPath()`/`lojaUrl()` (geram `/lojas/...`, nome correspondendo à rota real). Único call site (`components/store/StoreCard.tsx`) atualizado.
6. **Link morto adicional corrigido, mesmo escopo**: `components/home/FeaturesStores.tsx` linkava para `/stores` (rota que nunca existiu, achado do Sprint Zero) — corrigido para `/lojas`.
7. **Efeito colateral encontrado e corrigido**: remover `/store/[slug]` órfãou `components/store/StoreDetails.tsx` (zero importadores confirmado) — `/lojas/[slug]` já renderiza contato/endereço/horário inline, nunca usou esse componente. Removido, não deixado como dívida nova recém-criada.

### Evidências

Build de produção limpo, `curl` confirmando o 308 real, `npm run lint`/`tsc`/`test`/`db:lint` todos verdes após a mudança.

---

## PRIORIDADE 3 — Knowledge System

Auditado: `docs/README.md`, `FOUNDATION_INDEX.md` (sem alteração — já íntegro desde o Sprint Zero), Blueprints, Certificações, Roadmaps. Achados corrigidos nesta passagem (efeito direto das Prioridades 1/2, não itens novos de escopo): `docs/architecture/ARCHITECTURE.md`, `COMPONENT_INDEX.md`, `DEPENDENCY_GRAPH.md`, `docs/product/FEATURES.md` — todos tinham referências de estado-atual a `/store/[slug]` e a `storePath()`/`storeUrl()`, agora corrigidas para `/lojas/[slug]`/`lojaPath()`/`lojaUrl()`. `database/migrations/README.md` corrigido com a história real das migrations `0018`-`0021` (ver Prioridade 1).

Não alterado (fora de escopo, achados incidentais menores, não bloqueantes): algumas menções ilustrativas de `/store/[slug]` em `docs/engineering/GLOSSARY.md` como exemplo genérico do padrão de rota dinâmica — não fazem uma alegação forte de "esta rota existe", baixo risco de confundir.

---

## PRIORIDADE 4 — Tech Debt

`docs/engineering/TECH_DEBT.md` atualizado: os dois achados 🔴 Crítico do Sprint Zero marcados resolvidos, com o detalhe completo de cada correção. Um achado novo adicionado (Brain não recebe `buyer_events`, ver Prioridade 1). Nenhuma dívida crítica ficou de fora do documento — os achados 🟠 Alto do Sprint Zero (2 páginas admin inalcançáveis, links mortos para `/merchant/catalog`) continuam abertos, nomeados, não escondidos, fora do escopo deste Sprint específico (que tratava só das duas inconsistências 🔴 Crítico nomeadas pelo CTO).

---

## QUALITY GATE

| Critério | Status |
|---|---|
| Analytics comprovadamente funcional | ✅ — migrations aplicadas, hook conectado, evidência end-to-end |
| `buyer_events` recebendo dados | ✅ — verificado por teste real contra a API + query direta |
| `buyer_sessions` recebendo dados | ✅ — idem |
| Brain recebendo eventos | ❌ — **não corrigido, nomeado explicitamente** (ver Prioridade 1) |
| URL canônica única | ✅ — `/lojas/[slug]`, `/store/[slug]` removida e redirecionada |
| Sitemap consistente | ✅ — corrigido, cobertura de SEO preservada (não reduzida) |
| Nenhuma duplicação SEO | ✅ |
| Documentação sincronizada | ✅ |
| `lint`/`tsc`/`test`/`db:lint`/`build` | ✅ — 0/0/281 de 281/OK/sucesso |

---

## RESPOSTA À PERGUNTA OBRIGATÓRIA DO CTO

> "O ParaguAI agora está realmente pronto para iniciar a primeira Wave do Release 1.8 sem riscos estruturais remanescentes?"

**Quase — com um impedimento explícito que não estava no escopo original deste Sprint, mas que a própria investigação da Prioridade 1 tornou impossível ignorar**: o Brain não recebe nenhum evento de comprador. Isso não bloqueia a Wave 1 (Exchange Engine) nem a Wave 3 (Marketplace Expansion) — nenhuma delas depende de eventos de comprador chegando ao Brain. Bloqueia parcialmente a premissa da Wave 6 (Buyer Experience): a maturação de `C-6 Buyer Behavioral Knowledge` via Buyer Identity Model (ADR-046) assume que o comportamento acumulado eventualmente alimenta o Brain — hoje isso é estruturalmente falso, não apenas "ainda sem volume".

Todo o resto está genuinamente resolvido, não apenas documentado como resolvido: as migrations que faltavam foram aplicadas e verificadas contra o banco real; o pipeline de analytics tem evidência de ponta a ponta, não só configuração; a duplicação de rota foi eliminada com um redirect real testado, não apenas planejada; a cobertura de SEO foi preservada, não silenciosamente reduzida no processo; a documentação reflete o código real nos pontos que este Sprint tocou.

**Recomendação**: os Programas A e B do Release 1.8 (`ROADMAP_1_8.md`) podem começar agora. A ponte Brain ↔ `buyer_events` deveria virar uma decisão explícita do CTO — via ADR, como todo o resto deste Release — antes ou durante a Wave 6, não descoberta de novo nesse momento.
