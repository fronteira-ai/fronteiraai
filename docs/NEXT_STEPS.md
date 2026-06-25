# NEXT_STEPS.md

Proposta de continuação, baseada no estado real do código (não no roadmap aspiracional original) e no roadmap pré-existente em `docs/ROADMAP.md`.

## Sprint 3.2 (encerrada)

Consolidação de engenharia sem features novas: unificação de `process.env` em `lib/env.ts`, correção do `.gitignore`/`.env.example`, limpeza de `package.json`, e criação de 6 documentos permanentes (`DECISIONS`, `CONVENTIONS`, `API_CONTRACTS`, `DOMAIN_MODEL`, `COMPONENT_INDEX`, `DEPENDENCY_GRAPH`). Ver `docs/CHANGELOG.md` para o detalhe completo. `npm run lint`/`typecheck`/`build` confirmados limpos após as mudanças.

## Sprint 3.3 (encerrada nesta auditoria)

Diferente do que esta seção propunha anteriormente (fechar o Domínio de Loja), a sprint que efetivamente rodou implementou o **Domínio de Busca** (Release 0.4, parte 1 — equivalente à antiga "Sprint B" proposta abaixo): `app/search/page.tsx` lê `searchParams.q` e ganha `generateMetadata`; `hooks/useSearch.ts` e `services/search.service.ts` saem de placeholder/código morto; `SearchResults` renderiza resultados reais agrupados por tipo; `loading.tsx`/`error.tsx`/`SearchResultsSkeleton` espelham o padrão de `/product/[slug]`; `app/layout.tsx` ganhou metadata real + JSON-LD `WebSite`/`SearchAction`. Ver `docs/CHANGELOG.md` para o detalhe completo. Validado com `npm run lint`/`typecheck`/`build`.

O **Domínio de Loja** (Release 0.3), que esta seção recomendava priorizar, continua pendente — vira a Sprint 3.4 proposta abaixo.

## Sprint 3.4 (encerrada)

Fecha o Domínio de Loja (Release 0.3), replicando deliberadamente a arquitetura do Domínio de Produto: `getStoreBySlug`/`getRelatedStores` (`store.service.ts`), `getOffersByStore` (`offer.service.ts`, novo tipo `OfferWithProduct`), `hooks/useStore.ts`, `StoreDetails`/`StoreOffers`/`StoreGrid`, `app/store/[slug]/` completo (`layout`/`page`/`loading`/`error`/`not-found`), `storePath`/`storeUrl`. Ver `docs/CHANGELOG.md` para o detalhe completo. Validado com `npm run lint`/`typecheck`/`build`.

**Dois achados importantes desta sprint, registrados em `docs/DECISIONS.md`**:
- **ADR-006**: contato e horário de funcionamento da loja não foram implementados — concluiu-se (incorretamente, ver Sprint 3.4.1 abaixo) que não existiam no schema real do Supabase. Proposta de migration em `database/migrations/0001_proposed_store_contact_hours.sql`, **não aplicada**.
- **ADR-007**: testando manualmente contra o Supabase real, as 5 lojas cadastradas têm `slug: null`, e `products` tem 0 linhas. Os três domínios centrais da Home (Produto, Busca, Loja) estão **code-complete**, mas sem dado real navegável em produção hoje. Isso não é resolvido por código — precisa de alguém com acesso ao Supabase popular `slug` e cadastrar produtos/ofertas.

## Sprint 3.4.1 (encerrada nesta auditoria) — Consolidação da Camada de Dados

Sprint de diagnóstico puro, a pedido explícito do CTO ("não implemente novas funcionalidades de interface"), antes de iniciar qualquer Sprint 3.5. Auditou `stores`/`products`/`offers`/`brands`/`categories` direto no Supabase (consulta real, não inferência a partir dos tipos TS).

**Achado crítico — corrige a ADR-006**: a conclusão da Sprint 3.4 estava errada. As colunas de contato/horário **já existem** em `stores` (`phone`, `whatsapp`, `email`, `website`, `address`, `opening_hours`) — a Sprint 3.4 só verificou os campos que `types/store.ts` já declarava, sem fazer `select("*")` real. `database/migrations/0001_proposed_store_contact_hours.sql` foi marcado **superado**; `0002_revised_store_data_layer.sql` o substitui.

**Achado crítico novo — bug real, não dívida técnica**: `types/offer.ts` também diverge do schema real. `offer.price`/`stock`/`installments`/`url` **não existem** — o banco usa `price_usd`/`price_brl` (dois valores independentes, não 1 valor + taxa de conversão), `in_stock`/`available`/`stock_quantity`, e `product_url`. `store.banner_url`/`verified` também estão errados (`cover_image`/`is_verified`). Resultado: assim que houver uma oferta real, `ProductOffers`/`StoreOffers` vão mostrar preço `NaN`, estoque sempre "indisponível" e nunca o botão "Ver oferta"; o banner/badge de verificação da loja nunca aparecem. Nenhum erro de lint/TS/build pega isso. Ver `docs/DECISIONS.md` ADR-008 e `docs/DOMAIN_MODEL.md` (schema real completo, lado a lado com cada tipo).

**Também confirmado**: as 4 FKs usadas pelos services são reais (joins resolvidos pelo PostgREST); nenhuma das 14 tabelas "futuras" existe ainda (`reviews` incluída); duas tabelas reais não documentadas (`profiles`, `favorites`) foram descobertas.

Nenhum código de produção foi alterado nesta sprint — só documentação e a migration revisada (não aplicada).

## Sprint 3.5 (encerrada) — Catálogo Premium de Produtos

Diferente do que esta seção propunha anteriormente (duas sprints separadas, "3.5" para corrigir dados e "3.6" para o catálogo), o CTO decidiu — diante da pergunta de decisão levantada nesta sessão — tratar as duas frentes em uma única Sprint 3.5, corrigindo o modelo de dados **antes** de construir o catálogo sobre ele (mesma ordem recomendada abaixo, só que sem abrir uma sprint extra). Escopo executado:

1. **Correção do modelo de dados** (ADR-009, equivalente ao antigo plano de "Sprint 3.5" abaixo): `types/offer.ts`/`types/store.ts` corrigidos para os nomes reais; `utils/currency.ts` perdeu a conversão por taxa fixa; `services/offer.service.ts` corrigido (`order("price_usd")`); todos os componentes consumidores atualizados; `StoreDetails.tsx` ganhou a seção de Contato/Horário.
2. **Catálogo de produtos `/products`** (equivalente ao antigo plano de "Sprint 3.6" abaixo, exceto a parte de seed de dados — não incluída): `getProductsCatalog` (filtros via PostgREST embedding, paginação real, ordenação por preço "best effort" — ADR-011), `category.service.ts`/`brand.service.ts` implementados, `ProductGrid`/`ProductGridSkeleton`/`ProductFilters` novos, `hooks/useProductFilters.ts` novo, `Breadcrumb`/`Pagination`/`Input`/`Select` novos/preenchidos em `ui/`, `ProductCard`/`ProductHighlightCard` unificados (ADR-010), `app/products/{page,loading,error}.tsx` com SEO completo.

**Não incluído**: seed de dados (popular `stores.slug`/`products`/`offers` reais) — continua exigindo aprovação separada para alterar produção (ADR-007); ordenação por preço com agregação real no banco (proposta em `0003_proposed_product_catalog_price_view.sql`, não aplicada, ADR-011).

Ver `docs/CHANGELOG.md` para o detalhe completo. Validado com `npm run lint`/`typecheck`/`build`.

## Sprint 3.6 (encerrada) — Data Foundation

Diferente do que esta seção propunha anteriormente (uma única sprint bundlando seed de dados + início da Comparação de Produtos), o CTO redefiniu o escopo na missão recebida nesta sessão: Sprint 3.6 ficou só com a auditoria/diagnóstico da camada de dados, sem executar seed e sem tocar UI — mesmo padrão de divergência documentada já visto nas Sprints 3.3 e 3.5. Seed e Comparador ficam para a Sprint 3.7, proposta abaixo.

**Executado**: auditoria do banco (relacionamentos `products↔brands/categories`, `offers↔products/stores` reconfirmados sem erro de FK); auditoria de dados ao vivo via consulta direta ao Supabase (`products: 0`, `offers: 0`, `brands: 0`, `categories: 0`, `stores: 5`, todas com `slug`/`active`/`cover_image` nulos — achado novo: `website`/`opening_hours` já preenchidos nas 5 lojas reais, `address` em 4/5); auditoria dos 6 services implementados contra o schema real (nenhuma divergência nova, nenhuma correção necessária); revisão das 3 migrations propostas (`0001` superada, `0002` fase 1 segura para aplicar, `0003` prematura sem dados reais); plano de seed proposto (não executado). Ver `docs/CHANGELOG.md` e o relatório completo da sprint para o detalhe.

**Não incluído, por instrução explícita**: nenhuma migration foi aplicada, nenhum insert foi executado, nenhuma funcionalidade de interface foi implementada.

## Sprint 3.7 (encerrada) — Data Foundation v2

Diferente do que esta seção propunha (execução do seed + início do Comparador), a missão recebida nesta sessão manteve o foco em fundação de dados, explicitamente sem interface ("Nesta Sprint o foco NÃO será interface") — mesmo padrão de divergência documentada das Sprints 3.3/3.5/3.6. Execução do seed e Comparador ficam para a Sprint 3.8, proposta abaixo.

**Executado**: sistema oficial de seed implementado como código (`database/seed/` — `brands`/`categories`/`stores`/`products`/`offers`/`lib`/`index.js`/`validate.js`, dry-run por padrão, ver ADR-012); `validate.js` rodado ao vivo contra o Supabase real (nenhum problema novo, achado de `slug` reconfirmado); migrations propostas `0004` (constraints `UNIQUE (slug)` + índices de FK/preço) e `0005` (`store_ranking_summary`); arquitetura do Price Engine documentada (ADR-013) e estratégia de Offer Ranking v1 documentada (ADR-014), nenhuma implementada; services revisados de novo (nenhuma divergência). Ver `docs/CHANGELOG.md` e o relatório completo da sprint para o detalhe.

**Não incluído, por instrução explícita/Restrição Absoluta**: nenhum insert real (`--execute` nunca rodado), nenhuma migration aplicada, nenhuma tela do Comparador.

## Sprint atual (avaliação)

🔴 **Achado crítico não resolvido (ADR-019)**: a chave anônima — a única usada pela aplicação inteira — não lê `brands`/`categories`/`products`/`offers`/`price_history`. O catálogo provavelmente está vazio para usuários reais agora, apesar de todo o trabalho de seed/Price Engine das Sprints 3.8/3.9. Isso é a prioridade #1, antes de qualquer outra entrega de produto.

Release 0.2 (Produto + Catálogo), Release 0.3 (Loja) e Release 0.4 parte 1 (Busca) seguem concluídos na **arquitetura e no código**. A fundação de dados existe no banco desde a Sprint 3.8 (ADR-007 resolvido a nível de banco) e o Price Engine está validado e correto (ADR-018) — mas nenhum dos dois é visível para um usuário real até `0007_proposed_public_read_policies.sql` ser aplicada.

**Próxima sprint recomendada**: Sprint 4.0 — ver proposta abaixo, começando pela correção crítica de leitura pública.

---

## Roadmap proposto (próximos passos imediatos)

## Sprint 3.8 (encerrada) — Seed Execution & Catalog Validation

Diferente do que esta seção propunha anteriormente (seed + início da Comparação de Produtos numa única sprint), a missão recebida nesta sessão manteve o foco só em dados — execução do seed e validação de integridade —, sem nenhuma funcionalidade de interface nova, por instrução explícita do CTO. Comparação de Produtos fica para a Sprint 3.9, proposta abaixo.

**Executado**:
1. Auditoria de ambiente antes de qualquer escrita: confirmado que `SUPABASE_SERVICE_ROLE_KEY` não existia em nenhum lugar do ambiente (`.env.local`, `.vercel/.env.development.local`, variáveis de processo/usuário/máquina) — só `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. Snapshot do banco antes do seed: `stores: 5` (slug/active nulos), `brands/categories/products/offers: 0`.
3. Dry-run reconfirmado idêntico ao plano esperado.
4. **1ª tentativa de `--execute` (chave anônima)**: bloqueada por RLS — `INSERT` falhou explicitamente em `brands`/`categories`/`products`; o `UPDATE` de `stores` foi filtrado silenciosamente pela RLS (0 linhas afetadas, log `[OK]` falso-positivo). Confirmado por snapshot que nenhuma escrita real ocorreu. Parado para investigação, conforme regra da missão — reportado ao CTO, que adicionou `SUPABASE_SERVICE_ROLE_KEY` a `.env.local`.
5. **2ª tentativa de `--execute` (chave de serviço)**: sucesso total — `stores` (5/5 backfill), `brands` (5), `categories` (5), `products` (6), `offers` (9). Reexecução confirmou idempotência.
6. Auditoria de integridade: `npm run db:validate` (0 problemas) + anti-join real complementar via chave de serviço (0 FKs órfãs, 0 duplicatas). Nenhuma correção de dados necessária.
7. Documentação atualizada: `docs/DECISIONS.md` (ADR-016), `docs/PROJECT_STATUS.md`, `docs/TECH_DEBT.md`, `docs/CHANGELOG.md`, este arquivo.

Ver relatório completo da Sprint 3.8 para o detalhe ambiente/snapshot/auditoria.

**Não incluído, por instrução explícita**: nenhuma migration (`0002`, `0004`, `0005`) aplicada; nenhuma alteração de policy de RLS; nenhuma tela do Comparador; bug de log falso-positivo em `database/seed/index.js` (ADR-016) documentado, não corrigido.

## Sprint 3.9 (encerrada) — Price Engine v1 + Compare Foundation

Diferente do que esta seção propunha (Price Engine + início da tela de Comparação no mesmo escopo), a missão recebida nesta sessão limitou o escopo a só Price Engine — registrar preço/histórico, métricas, correção do bug do ADR-016 — explicitamente sem UI/páginas novas ("preparar estrutura para `/compare`, sem implementar interface final"). Tela de Comparação fica para a Sprint 4.0, proposta abaixo.

**Executado**: `database/migrations/0006_proposed_price_history.sql` (schema do histórico de preço, proposta — ver bloqueio abaixo); `types/priceHistory.ts` novo; `services/offer.service.ts` ganhou `updateOfferPrice()`/`getOfferPriceMetrics()`, code-complete e testados ao vivo contra o Supabase real (degradação graciosa confirmada); bug de log do ADR-016 corrigido em `database/seed/index.js` (testado contra o Supabase real com a chave anônima); `docs/DECISIONS.md` ADR-017. Validado com `npm run lint`/`tsc --noEmit`/`npm run build`/`db:validate`/reexecução do seed (idempotência). Ver `docs/CHANGELOG.md` e o relatório completo da sprint para o detalhe.

**Bloqueio real, não decisão de escopo**: a migration `0006` não foi aplicada porque nenhuma ferramenta deste projeto executa DDL contra o Supabase (sem `pg`/`DATABASE_URL`, sem CLI configurado, sem RPC de SQL exposta) — diferente de `0002`/`0004`/`0005`, que ficaram propostas por decisão de aprovação, esta ficou proposta por impossibilidade técnica com as credenciais/ferramentas hoje disponíveis. Ver ADR-017.

**Não incluído, por instrução explícita**: nenhuma tela `/compare`; nenhuma migration aplicada; nenhuma alteração de RLS; nenhuma autenticação/scraping/IA.

### Adendo (mesmo dia) — Price Engine validado + achado crítico de leitura pública

O CTO aplicou `0006` manualmente. Validação fim a fim contra a tabela real encontrou e corrigiu um bug de cálculo em `getOfferPriceMetrics` (ADR-018) e revelou um achado crítico não relacionado a preço: a chave anônima — a única usada pela aplicação inteira — não lê nenhuma linha de `brands`/`categories`/`products`/`offers`/`price_history` (ADR-019). Isso significa que o catálogo provavelmente está vazio para usuários reais desde a Sprint 3.8, sem que nenhuma auditoria anterior tivesse pegado isso (elas usavam, sem intenção, a chave de serviço). Correção proposta: `database/migrations/0007_proposed_public_read_policies.sql`. Classificação final do Price Engine: **"Backend Production Ready"**, não "Production Ready" de ponta a ponta.

## Sprint 4.0 (encerrada) — Compare Engine v1 (Release 0.5)

Entregou o Compare Engine v1 completo: `services/compare.service.ts`, `app/api/compare/route.ts`, `hooks/useCompare.ts`, `components/compare/` e `app/compare/[slug]/` com SSR, `generateMetadata`, todos os estados de UI, validação em 6 cenários contra o Supabase real. Algoritmo de ranking (ADR-014) implementado pela primeira vez em código. Ver `docs/CHANGELOG.md` para o detalhe completo.

**Pendência crítica remanescente (ADR-019, pré-existe à sprint)**: a chave anônima não lê `products`/`offers`/`price_history`. O Compare Engine está correto e testado com a chave de serviço, mas retorna `null` para usuários reais até `0007_proposed_public_read_policies.sql` ser aplicado. Isso afeta todo o catálogo, não só o comparador.

## Sprint 4.1 (encerrada) — Public Release Readiness (Release 0.6)

**Executado**:
- ✅ Home convertida para `async` server component com dados reais do Supabase (`force-dynamic`)
- ✅ Double-fetch eliminado em `/product/[slug]` e `/store/[slug]` via `_cache.ts` compartilhado (ADR-021)
- ✅ Pages de produto e loja convertidas de `"use client"` para Server Components
- ✅ Botão "Comparar preços" adicionado à página de produto
- ✅ `constants/categories.ts` esvaziado (mock substituído por `getCategories()` real)
- ✅ Build, lint, TypeScript, db:validate — todos limpos

## ADR-019 ENCERRADO (2026-06-25, hotfix pós Sprint 4.1)

- ✅ `0007_proposed_public_read_policies.sql` aplicada no Supabase SQL Editor (pelo CTO)
- ✅ Hotfix na migration: `CREATE OR REPLACE POLICY` (inválido no PostgreSQL) substituído por `DROP POLICY IF EXISTS` + `CREATE POLICY` (padrão idiomático, idempotente, compatible com qualquer versão)
- ✅ **22 asserções validadas** com `database/seed/validate_adr019.js` usando **exclusivamente** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `brands`, `categories`, `products`, `offers`, `price_history`, `stores` — todos retornam dados reais
- ✅ Escrita bloqueada para `anon`/`authenticated` (nenhuma policy de INSERT/UPDATE/DELETE criada)
- ✅ Fluxo completo operacional: Home → Produto → Comparar preços → Loja → Busca

**ADR-019 não existe mais como bloqueador.** O catálogo inteiro é visível para usuários reais.

## Sprint 4.2 (encerrada) — MVP Público (Release 0.7)

**Executado**:
- ✅ `next/image` em todos os 5 componentes com `<img>` — 0 warnings de lint (era 5)
- ✅ `next.config.ts` com `remotePatterns` para Supabase Storage + HTTPS
- ✅ Navbar: links mortos `/stores` e `/compare` removidos. Menu: Início / Produtos / Buscar / IA
- ✅ Footer: links para páginas inexistentes convertidos para `<span>` com badge "em breve"
- ✅ `app/sitemap.ts` → `/sitemap.xml` (dinâmico: produtos + compare + lojas + estáticas)
- ✅ `app/robots.ts` → `/robots.txt` (Allow: /, Disallow: /api/ /_next/)
- ✅ `app/not-found.tsx` — 404 global com design de marca
- ✅ Home: metadata OG + Twitter + keywords + canonical
- ✅ Root layout: JSON-LD Organization + robots + openGraph base
- ✅ Compare: double-fetch eliminado via `cache(getProductComparisonBySlug)`
- ✅ Build 10 rotas, lint 0, tsc 0, db:validate 0

## Sprint 4.3 (encerrada) — Data Integrity & Media Foundation

**Executado**:
1. **Auditoria pré-migração**: 0 slugs duplicados, 0 slugs nulos, 0 orphans, 0 preços inválidos — banco íntegro, seguro para aplicar constraints
2. **`database/migrations/0008_data_integrity.sql`** criada: consolida 0002 + 0004 num SQL idempotente — 4 UNIQUE constraints em slugs + 6 índices de performance
3. **Storage Foundation**: bucket `catalog` criado (público, webp/jpeg/png/avif, 5 MB); `utils/storage.ts` com builders de URL; `database/storage/init.js` (`npm run storage:init`); ADR-022
4. **`database/seed/validate_sprint43.js`** (`npm run db:validate:43`): 23/23 OK
5. **Documentação**: ADR-022 + ADR-023, CHANGELOG Sprint 4.3, PROJECT_STATUS 83%
6. **Validações**: lint 0, tsc 0, build 10 rotas, db:validate 0, db:validate:43 23/23

**Pendência manual** (ação no Supabase — não automatizável sem DATABASE_URL ou PAT):
- Aplicar `database/migrations/0008_data_integrity.sql` no SQL Editor
- Upload de imagens reais no bucket `catalog` seguindo convenção do ADR-022

## Release 0.8 (encerrado) — Go Live Foundation

**Executado**:
- ✅ Imagens: `database/seed/update_images.js` popula 16 URLs no banco (`npm run db:images`)
- ✅ Favicon: `app/icon.tsx` (512px) + `app/apple-icon.tsx` (180px) via ImageResponse
- ✅ Manifesto PWA: `app/manifest.ts` → `/manifest.webmanifest`
- ✅ Analytics: `components/analytics/Analytics.tsx` (GA4 + Clarity) + `utils/analytics.ts`
- ✅ Eventos: `CompareOfferCard` + `StoreCard` com rastreamento de interação
- ✅ SEO: viewport themeColor, preconnect Supabase, Search Console + Bing via env vars
- ✅ Segurança: 6 security headers em next.config.ts
- ✅ `.env.example` completo com todas as variáveis documentadas
- ✅ Build 13 rotas, lint 0, tsc 0, db:validate 23/23

**Pendências manuais** (para Go Live 100%):
1. Aplicar `database/migrations/0008_data_integrity.sql` no Supabase SQL Editor
2. Configurar `NEXT_PUBLIC_GA_MEASUREMENT_ID` no painel Vercel
3. Configurar `NEXT_PUBLIC_CLARITY_PROJECT_ID` no painel Vercel
4. Registrar em Google Search Console → copiar código para `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
5. Registrar em Bing Webmaster Tools → copiar código para `NEXT_PUBLIC_BING_SITE_VERIFICATION`
6. Atualizar `NEXT_PUBLIC_SITE_URL` no painel Vercel para o domínio de produção

## Release 0.9 (proposta) — Escala e Autenticação

**Escopo proposto**:
1. **Autenticação**: Supabase Auth (login com e-mail/Google/Apple), perfil de usuário.
2. **Favoritos reais**: migrar `localStorage` para tabela `favorites` no Supabase (com sincronização de dados locais existentes).
3. **Upload de imagens reais**: carregar fotos reais no bucket `catalog` e substituir as URLs do placehold.co.
4. Avaliar `0003` (materialized view de preço para ordenação escalável no catálogo).
5. Avaliar `0005` (store_ranking_summary) para melhorar o algoritmo de Offer Ranking.
6. CI básico: GitHub Actions com `npm run check` em PRs.

### Sprint C — Eliminar dívidas técnicas críticas antes de crescer mais
- **Prioridade**: 🟡 Média (mas crescente — quanto mais o código cresce, mais caro fica)
- **Risco**: Baixo
- **Complexidade**: Baixa–Média
- **Estimativa**: 1–2 dias
- Tarefas restantes: resolver o double-fetch de produto e de loja (mover fetch para o server, reduzir `app/product/[slug]/page.tsx` e `app/store/[slug]/page.tsx` a ilhas client — `/products`, Sprint 3.5, já segue esse padrão e serve de referência); trocar `<img>` por `next/image` nos componentes apontados pelo lint; aplicar a materialized view de preço (`0003_proposed_product_catalog_price_view.sql`) quando o volume de dados justificar.

### Releases seguintes (sem mudança em relação ao roadmap pré-existente)
0.5 Comparação de produtos → 0.6 Assistente de IA → 0.7 Painel Admin → 0.8 Crawler → 0.9 Plataforma de usuário (Auth/Favoritos reais/Histórico) → 1.0 Produção (SEO/Performance/Acessibilidade/PWA/Monitoramento). Ver `docs/ROADMAP.md` para o detalhamento original — segue válido como visão de longo prazo.

---

## Auditoria final (notas de 1 a 5)

| Critério | Nota | Justificativa |
|---|---|---|
| Arquitetura | ★★★★☆ | Camadas bem definidas e majoritariamente respeitadas, agora em 2 domínios completos (Produto, Loja); perde 1 ponto pelo double-fetch (replicado deliberadamente em Loja) e pelas páginas serem 100% client. |
| UX | ★★★☆☆ | Home, produto, busca e loja têm boa execução visual; mas sem dados reais navegáveis hoje (ADR-007) e, quando houver, preço/estoque exibidos incorretamente até a Sprint 3.5 (ADR-008) — links mortos remanescentes (`/products`, `/compare`, `/categories/[slug]`, etc.). |
| SEO | ★★★★☆ | Produto, Busca e Loja têm metadata+JSON-LD bem feitos (`Product`, `WebSite`/`SearchAction`, `LocalBusiness`); falta só Home ganhar Open Graph/canonical próprios e sitemap/robots.txt. |
| Performance | ★★★☆☆ | `<img>` em vez de `next/image` em 6 lugares, e fetch duplicado em produto e loja a cada visita. |
| Escalabilidade | ★★★★☆ | Modelagem relacional (FKs confirmadas na Sprint 3.4.1) e separação em camadas são boas bases; padrão Produto→Loja replicado com sucesso. |
| Organização | ★★★★☆ | Estrutura de pastas clara e consistente; ruído real remanescente é o volume de placeholders vazios sem marcação padronizada. |
| Código | ★★★☆☆ | TypeScript estrito e convenções de service consistentes, mas a Sprint 3.4.1 confirmou que `as Tipo[]` sem validação em runtime esconde bugs reais (`offer`/`store`) que nenhum lint/TS pega — perde 1 ponto a mais do que na auditoria anterior. |
| Manutenibilidade | ★★★★☆ | Convenções claras e documentadas (`CLAUDE.md`), fácil para outro dev continuar; risco principal é justamente assumir que um tipo reflete o banco sem verificar — exatamente a causa raiz do achado desta sprint. |
| Prontidão para Produção | ★★☆☆☆ | Código pronto para os 3 domínios centrais, mas **sem dados reais** (ADR-007) e com bugs confirmados de tipo↔schema que vão aparecer assim que houver dados (ADR-008) — duas camadas de risco antes de estar pronto para usuários reais. |

**Média geral: ≈ 3,5/5** (avaliação congelada na Sprint 3.4.1, antes da correção). **Atualização Sprint 3.5**: a correção da camada de tipos (ADR-009) e a entrega do catálogo elevam principalmente "Código" e "Prontidão para Produção" — ver `docs/PROJECT_STATUS.md` (**50%**) para o número atualizado; esta tabela não foi reavaliada item a item nesta sprint.
