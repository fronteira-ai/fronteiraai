# PROJECT_STATUS.md

Auditoria gerada por leitura completa do código-fonte. Substitui o conteúdo anterior deste arquivo.

Última atualização: 2026-06-27 (Foundation 0.9 — Validation — **FOUNDATION EMPRESARIAL CERTIFICADA v1.0**)
Branch auditada: `main` — Release 1.4 + **Foundation Empresarial Certificada (8 documentos permanentes — AI_CONSTITUTION v1.2)**

> ✅ **Foundation 0.9 — FOUNDATION VALIDATION (2026-06-27)**: Validação completa da Foundation Empresarial. 9 etapas executadas: leitura completa, matriz de responsabilidades, consistência conceitual (ParaguAI Brain, Merchant OS, Merchant Score, Flywheel, Moat, Compounding, IA Transversal, Assimetria de Informação), referências cruzadas, duplicidades, lacunas, teste de governança (5 cenários), avaliação de maturidade (9.0/10), certificação. Única inconsistência real encontrada: AI_CONSTITUTION Seção XIX desatualizada (não incluía os 7 documentos criados após v1.1). Corrigida: Seção XIX atualizada para hierarquia completa de 12 documentos; AI_CONSTITUTION promovida para v1.2. Foundation Empresarial declarada **CERTIFICADA v1.0**.
>
> ✅ **Foundation 0.8 — RELEASE_STRATEGY.md (2026-06-27)**: `docs/RELEASE_STRATEGY.md` criado — o ciclo permanente de evolução da plataforma. Fecha a Foundation. 15 seções: Filosofia de Releases (evolução mensurável, não conjunto de tarefas; o que fica é mais importante do que o que entra), O Ciclo Permanente (11 estágios: Missão → Observação → Formulação → Decision Filter → ADR → Planejamento → Implementação → Validação → Release → Observação → Aprendizado → Missão), O Que É uma Release (coeso, evolução identificável, 5 propriedades), O Que NÃO É (acúmulo, sem valor, cosméticas, experimentos sem hipótese, sem critério, reversão sem aprendizado), 10 Tipos de Release (Foundation/Architecture/Platform/Feature/Quality/Infrastructure/Security/Performance/Data/AI) com objetivos e Quality Gates específicos por tipo, Critérios para Criar Release (impacto em múltiplos módulos / decisão arquitetural / novo ativo / mudança de comportamento / mudança de dados), Planejamento (problema, objetivo, escopo, critério de sucesso, dependências, riscos — sem prazo de calendário), Compounding Releases (motor/dado/contrato/IA/conhecimento; pergunta de compounding obrigatória), Definition of Ready (8 condições), Definition of Done (10 condições), Quality Gates (5 universais + gates adicionais por tipo), Versionamento (Foundation F.x / Major x.0 / Minor x.y / Patch x.y.z; CHANGELOG como significado real), Comunicação (CHANGELOG/PROJECT_STATUS/ADRs/NEXT_STEPS), Aprendizado Contínuo (4 dimensões), O Compromisso (7 compromissos permanentes). Tabela final com os 8 documentos e o ciclo fechado.
>
> ✅ **Foundation 0.7 — DECISION_FILTER.md (2026-06-27)**: `docs/DECISION_FILTER.md` criado — processo permanente de tomada de decisão. 12 seções: O Papel do Filter (alinhamento, valor, coerência, experiência), Pergunta Fundamental (reduz assimetria de informação?), Pipeline de Decisão (10 estágios sequenciais: problema real → valor gerado → missão → North Star → Business Model → Vision 2035 → Engineering → Product → custo/reversibilidade → decisão), 12 Filtros Permanentes (4 críticos bloqueadores), Critérios de Priorização (valor para missão, impacto sistêmico, compounding, esforço), Tipos de Decisão (Nível 1 operacional / Nível 2 produto / Nível 3 estratégico), Critérios de "Não" (9 situações), Critérios de "Sim" (8 situações), Conflitos Entre Critérios (velocidade vs. qualidade, curto vs. longo prazo, receita vs. confiança, automação vs. controle, completude vs. entrega, Foundation vs. circunstância), Checklist Obrigatório (reutilizável para Releases/ADRs/funcionalidades), 10 Anti-Patterns de Decisão (feature por vaidade, arquitetura por moda, escalamento prematuro, automação desnecessária, duplicação, tecnologia acima do problema, consenso por exaustão, urgência fabricada, exceção que vira regra, decisão pela ausência de questionamento), O Compromisso. Foundation de 7 documentos completa.
>
> ✅ **Foundation 0.6 — PRODUCT_PRINCIPLES.md (2026-06-27)**: `docs/PRODUCT_PRINCIPLES.md` criado — filosofia permanente de produto. 18 seções + 12 Princípios Permanentes. Filosofia de Produto (produto melhora decisões, não gera cliques), Quem Servimos (4 públicos com necessidades distintas), Simplicidade Radical (complexidade pertence ao sistema), Transparência (origem/atualização/raciocínio/incerteza), IA como Assistente (amplifica julgamento, não substitui; transparência algorítmica), Automação Inteligente (dados vs. contexto humano), Produto Orientado a Dados (cada funcionalidade produz dados), Confiança como Produto (construída, não declarada; custo de quebra assimétrico), Experiência Integrada (teste de integração, padrões compartilhados), Produto Modular (capacidades que ampliam o ecossistema), Crescimento Invisível (progressividade, padrões inteligentes), Feedback Contínuo (comportamento > pesquisa), Acessibilidade (diversidade tecnológica/experiência/linguística/física), Neutralidade (rankings orgânicos, publicidade identificada, recomendações por relevância), Efeito "Uau" (funcionalidades que mudam comportamento), Produto como Ecossistema, Produto para Décadas (implementação evolui; dados históricos são permanentes). Foundation de 6 documentos completa.
>
> ✅ **Foundation 0.5 — ENGINEERING_PRINCIPLES.md (2026-06-27)**: `docs/ENGINEERING_PRINCIPLES.md` criado — filosofia técnica permanente. 15 seções: Filosofia (tecnologia como meio), Arquitetura Evolutiva (composição, contratos > implementações), Simplicidade como Estratégia, Sistemas Orientados a Ativos, Dados como Contrato (origem/propriedade/imutabilidade), APIs e Fronteiras, Escalabilidade (O(1) no design, idempotência), Observabilidade (logs + métricas + rastreabilidade), Automação (dry-run, falha ruidosa), IA como capacidade transversal, Evolução Contínua, Qualidade como design constraint, Segurança (menor privilégio, defesa em profundidade), Resiliência (falha previsível, degradação graciosa), 12 Princípios Permanentes. Foundation de 5 documentos completa.
>
> ✅ **Foundation 0.4 — VISION_2035.md (2026-06-27)**: `docs/VISION_2035.md` criado — horizonte estratégico do ParaguAI. 15 seções: Introdução, Ambição (infraestrutura de inteligência da Tríplice Fronteira), Transformação (6 estágios evolutivos), Ecossistema (9 pilares), ParaguAI Brain (visão de convergência), Experiência do Usuário/Lojista 2035, Turismo Inteligente integrado, Plataforma Aberta, Inteligência Regional (ética de dados), Expansão, Cultura Permanente (5 princípios), O Legado, Indicadores qualitativos (6), Manifesto Final. Núcleo estratégico de 4 documentos completo.
>
> ✅ **Foundation 0.3 — BUSINESS_MODEL.md (2026-06-27)**: `docs/BUSINESS_MODEL.md` criado — modelo econômico permanente do ParaguAI. 18 seções: Tese, Assimetria de Informação, Proposta de Valor por segmento (5 grupos), Flywheel Econômico, 6 Network Effects, Monetização (7 pilares), Crescimento orgânico, Moat (5 camadas), Ativos Estratégicos (8), papel da IA/Dados/Turismo/Merchant OS/API, Indispensabilidade, Visão Econômica, 6 Riscos Estratégicos, 7 Princípios Permanentes. `CLAUDE.md` e `MASTER_ROADMAP.md` atualizados com BUSINESS_MODEL como terceiro documento obrigatório. Núcleo estratégico completo: AI_CONSTITUTION + NORTH_STAR + BUSINESS_MODEL.
>
> ✅ **Foundation 0.2.1 — NORTH_STAR.md Maturity Review (2026-06-27)**: `docs/NORTH_STAR.md` revisado v1.0 → v1.1. 4 novos capítulos: Anti Goals (9 itens), Tipos de Decisão (Tipo 1/Tipo 2), Compounding Decisions, O Compromisso (fechamento permanente). Seção 8 fortalecida com princípio de infraestrutura reutilizável. Total: 14 seções. Documento declarado permanente.
>
> ✅ **Foundation 0.2 — NORTH_STAR.md (2026-06-27)**: `docs/NORTH_STAR.md` criado — bússola operacional do ParaguAI. 10 seções: A Métrica Norte, A Pergunta Obrigatória, 10 Filtros Permanentes, Hierarquia de Prioridades, Framework de Priorização (score/100), O que nunca priorizar, Pensamento de longo prazo, Como avaliamos sucesso, Checklist Final. `CLAUDE.md` atualizado com NORTH_STAR como segundo documento obrigatório.
>
> ✅ **Foundation 0.1.1 — Revisão Estratégica da AI_CONSTITUTION.md (2026-06-27)**: `docs/AI_CONSTITUTION.md` revisado de v1.0 para v1.1. 3 novos capítulos: VII. Ativos, X. Efeito de Rede (Flywheel), XIV. Moat. Identidade reformulada: "Inteligência Operacional da Tríplice Fronteira". Organismo Vivo na Filosofia. ParaguAI Brain expandido. 14 Regras Permanentes (era 12). Missão: assimetria de informação. Total: 19 seções vs. 16 na v1.0.
>
> ✅ **Foundation 0.1 — AI_CONSTITUTION.md (2026-06-27)**: Constituição permanente do projeto criada em `docs/AI_CONSTITUTION.md`. `CLAUDE.md` atualizado com prioridade de leitura. `MASTER_ROADMAP.md` expandido com seção Foundation Documents e fases estratégicas. 16 seções: Identidade, Missão, Visão 2030, North Star, Filosofia, Dados, Automação, IA, Engenharia, Produto, Negócio, Autonomia, Regras Permanentes (12 regras), Processo de Desenvolvimento, Critério de Aceitação, Hierarquia de Documentos.
>
> ✅ **Release 1.4 — Merchant Growth Platform (2026-06-27)**: 10 módulos. Novos: `/lojas` ranking, `/lojas/[slug]` página pública premium, `MerchantProgressCard`, `GoalsPanel` expandido com 10 missões, `stores-public.service.ts` (service role). SEO: `/lojas` e `/lojas/[slug]` no sitemap. Navbar: "Lojas" adicionado. ADR-029 a ADR-032. Build: 67 rotas, lint 0, tsc 0.
>
> ✅ **Release 1.3.1 — ParaguAI Experience Integration (2026-06-27)**: `HeroCTAs`, `ForLojistasSection`, `/para-lojistas`, "Para Lojistas" no Navbar/Footer. Build: 64 rotas.
>
> ✅ **Release 1.3 — Dashboard Consultivo (2026-06-27)**: `NextStepCard`, `GoalsPanel`, 6 níveis de Merchant, `computeNextStep`/`computeGoals`/`getMerchantLevel`.
>
> ✅ **Release 1.2 — Merchant OS (2026-06-26)**: portal self-service completo, 10 endpoints, 11 rotas, migration 0012.

> ✅ **Release 0.9 — Acquisition Engine (2026-06-26)**: pipeline universal de aquisição de dados implementado. Engines: Validation, Normalization, Deduplication, Canonical, Media, CatalogWriter. Parsers: JSON e CSV (RFC 4180). Conectores de referência: JsonFileConnector, CsvFileConnector. 33/33 asserções do validate-pipeline OK. Dry-run de import JSON e CSV: 4/4 itens por run, 0 erros. Lint: 0. TypeScript: 0. Build: sucesso. A partir desta Release, adicionar uma nova loja exige apenas implementar um novo conector.
>
> ✅ **Migration 0008 aplicada (2026-06-26)**: 4 UNIQUE constraints em slug (stores, products, brands, categories) + 6 índices de performance confirmados no banco.

> ✅ **ADR-019 ENCERRADO (2026-06-25)**: migration `0007_proposed_public_read_policies.sql` aplicada manualmente no Supabase SQL Editor pelo CTO. Validação com `database/seed/validate_adr019.js` confirma: **22 OK | 0 FAIL** usando **exclusivamente** `NEXT_PUBLIC_SUPABASE_ANON_KEY`. As 6 tabelas públicas (`brands`, `categories`, `products`, `offers`, `price_history`, `stores`) retornam dados reais. Escrita continua bloqueada para `anon`/`authenticated`. O catálogo inteiro agora é visível para usuários reais.
>
> ✅ **Bugs críticos corrigidos (Sprint 3.5)**: os bugs confirmados na Sprint 3.4.1 (`offer.price`/`stock`/`installments`/`url`, `store.banner_url`/`verified` divergindo do schema real) foram corrigidos antes de construir o catálogo de produtos sobre eles — ver `docs/DECISIONS.md` ADR-009. `types/offer.ts`/`types/store.ts` agora usam os nomes reais (`price_usd`/`price_brl`, `in_stock`, `product_url`, `cover_image`, `is_verified`, mais os 13 campos de contato/horário que já existiam no banco).
>
> ⚠️ **Achado de dados (Sprint 3.8) — corrigido pelo ADR-019**: `npm run db:seed:execute` rodou com sucesso contra o Supabase real (`stores: 5`, `brands: 5`, `categories: 5`, `products: 6`, `offers: 9`) e ADR-007 (dados ausentes) está resolvido **a nível de banco**. A afirmação original de que isso tornava os domínios "navegáveis em produção" estava incompleta — não havia sido verificada com a chave anônima (ver alerta crítico acima).
>
> ✅ **Price Engine v1 validado (Sprint 3.9, adendo, ADR-018)**: `updateOfferPrice`/`getOfferPriceMetrics` testados fim a fim contra `price_history` real (criada manualmente pelo CTO) — histórico, no-op, métricas (`lowest`/`highest`/variação %) todos corretos após um bug de cálculo ser encontrado e corrigido durante a validação. Classificação: **"Backend Production Ready"** — correto e testado, mas sem nenhum caminho de chamada real ainda, e a leitura pública (`getOfferPriceMetrics` via app) está sujeita ao mesmo bloqueio de RLS do ADR-019.

## Sprint 4.1 + ADR-019 Encerramento — Public Release Readiness (Release 0.6)

**Home dinâmica** com dados reais do Supabase (stores, brands, categories, catalog) — `app/page.tsx` convertida de dados hardcoded para `async` server component com `force-dynamic`. **Double-fetch eliminado** em `/product/[slug]` e `/store/[slug]`: pages convertidas de `"use client"` + hook para server components com `React.cache()` compartilhado via `app/...[slug]/_cache.ts` (ADR-021). **Botão "Comparar preços"** adicionado ao produto, linkando para `/compare/[slug]`. `constants/categories.ts` esvaziado (mock substituído por `getCategories()` real). `ProductHighlight.priceUSD`/`storeName` tornados opcionais para compatibilidade com `ProductCatalogItem`.

**ADR-019 ENCERRADO**: `0007_proposed_public_read_policies.sql` aplicada. Validação completa com `validate_adr019.js` — 22 asserções, 0 falhas, exclusivamente com a chave anônima. Todos os domínios públicos desbloqueados.

Build: 8 rotas (`/` agora `ƒ Dynamic`). Lint: 0 erros. TypeScript: 0 erros. db:validate: 0 problemas.

---

## Visão geral

**ParaguAI** é um marketplace de comparação de preços (UI em português) para lojas do Paraguai/região de fronteira. Usuários pesquisam produtos/lojas/marcas; o produto final prevê busca assistida por IA, histórico de preços e recomendações. Mercado inicial: Ciudad del Este.

## Objetivo do produto

Tornar-se a maior plataforma inteligente de compras do Paraguai, ajudando o usuário a: pesquisar produtos, comparar preços entre lojas, descobrir lojas confiáveis e receber recomendações de compra via IA — antes de atravessar a fronteira.

## Stack utilizada

- **Next.js 16.2.9** (App Router, Turbopack) + **React 19.2.4** + **TypeScript** (strict)
- **Tailwind CSS v4** (`@theme inline` em `app/globals.css`, sem `tailwind.config`)
- **Supabase** (`@supabase/supabase-js`) como backend/DB (PostgreSQL)
- **lucide-react** para ícones
- Hospedagem/deploy: **Vercel**
- Sem suíte de testes configurada. Sem CI (não há `.github/workflows` nem `vercel.json` no repositório).

## Arquitetura atual

Fluxo em camadas, conforme `docs/CLAUDE.md`/`CLAUDE.md`:

```
types/*.ts → services/*.service.ts → hooks/use*.ts → components/* → app/*
```

Ver `docs/ARCHITECTURE.md` para o mapeamento completo, incluindo o novo fluxo do catálogo de produtos.

## Funcionalidades implementadas

- **Home (`/`)** — **Sprint 4.1**: agora busca dados reais do Supabase em paralelo (`getStores`, `getBrands`, `getCategories`, `getProductsCatalog`) com `force-dynamic`. Até `0007` ser aplicado, apenas a seção de lojas exibe dados reais (única tabela com leitura pública).
- **Página de Produto (`/product/[slug]`)** — integração real ponta-a-ponta. **Sprint 4.1**: convertida de `"use client"` + `useProduct` para Server Component com `React.cache()` via `_cache.ts` — eliminando o double-fetch. Botão "Comparar preços" adicionado, linkando para `/compare/[slug]`. `generateMetadata`, JSON-LD (Product), estados `loading`/`error`/`not-found`. Breadcrumb via `components/ui/Breadcrumb.tsx`.
- **Favoritos** — `useFavorites` funcional via `localStorage`, sem dependência de Supabase/autenticação.
- **Navbar/Footer** — completos, estáticos. `/products` deixou de ser link morto (Sprint 3.5).
- **Sistema de motion/animação** — `styles/animations.ts` + keyframes, usado na maioria dos componentes, respeitando `prefers-reduced-motion`.
- **Busca (`/search`)** — fluxo completo ponta-a-ponta, com filtros/paginação/autocomplete ainda pendentes (ver `TECH_DEBT.md`).
- **Página de Loja (`/store/[slug]`)** — integração real ponta-a-ponta, espelhando o Domínio de Produto. **Sprint 3.5**: `StoreDetails` ganhou a seção de Contato/Horário (telefone, WhatsApp, e-mail, site, endereço, horário), antes bloqueada por uma premissa de schema incorreta (ADR-006/ADR-009); avaliações continuam `EmptyState` honesto.
- **Catálogo de Produtos (`/products`)** — **novo nesta sprint (Release 0.2, parte 2)**: listagem com filtros (categoria, marca, loja, faixa de preço, disponibilidade, busca textual) e ordenação (mais recentes / menor preço / maior preço, todos sincronizados com a URL; "mais vendidos"/"melhor avaliação" como estrutura preparada), paginação SSR via `<Link>`, `generateMetadata` (canonical/OG/Twitter/robots por combinação de filtro), JSON-LD `CollectionPage`+`ItemList`+`BreadcrumbList`, `<Suspense>` em torno da listagem (filtros renderizam fora do Suspense). Ver `docs/FEATURES.md` para o detalhe completo.

## Funcionalidades parcialmente implementadas

Nenhuma nesta auditoria — `ProductGrid.tsx` (única pendência apontada na auditoria anterior) foi implementado nesta sprint.

## Funcionalidades não iniciadas

- Listagem `/stores`, `/compare`, `/favorites`, `/price-history`, `/about`, `/contact`, `/privacy`, `/terms` — ainda linkadas no `Navbar`/`Footer`, nenhuma existe (404 em produção).
- Autenticação de usuário (`types/user.ts` vazio, sem Supabase Auth configurado no código da aplicação — embora a tabela `profiles` sugira que a infraestrutura pode já existir no painel, ver `DOMAIN_MODEL.md`).
- Reviews (`types/review.ts` vazio; tabela `reviews` não existe no Supabase).
- IA/Assistente de compras (`services/ai.service.ts` vazio; `ai/` é só placeholders `.gitkeep`).
- Histórico de preços, crawler, painel admin, marketplace multi-vendedor — nada começado.
- Design system formal (`styles/theme.ts`, `typography.ts`, `spacing.ts`, `radius.ts`, `shadows.ts` — todos vazios; cores/espaçamento hoje são hardcoded inline via Tailwind arbitrary values).

## Páginas existentes

| Rota | Tipo | Status |
|---|---|---|
| `/` | Server Component (`force-dynamic`) | Dados reais, ForLojistasSection, HeroCTAs auth-aware |
| `/search` | Server Component (com `<Suspense>`) | Completa, integrada ao Supabase |
| `/products` | Server Component (com `<Suspense>`) | Completa, integrada ao Supabase |
| `/product/[slug]` | Server Component + Server layout | Double-fetch eliminado; botão "Comparar preços" |
| `/store/[slug]` | Server Component + Server layout | Double-fetch eliminado |
| `/compare/[slug]` | Server Component | Integrada ao Supabase |
| `/lojas` | Server Component (`force-dynamic`) | **Release 1.4**: ranking de lojas com Merchant Score, SEO completo |
| `/lojas/[slug]` | Server Component (`force-dynamic`) | **Release 1.4**: página pública premium, JSON-LD LocalBusiness |
| `/para-lojistas` | Server Component (estático) | Landing institucional, planos, FAQ |
| `/merchant/dashboard` | Client Component | Stats + Score + GoalsPanel + MerchantProgressCard + NextStepCard |
| `/merchant/register` | Client Component | Cadastro PKCE flow |
| `/merchant/login` | Client Component | Login com `?confirmed=true` banner |
| `/api/merchant/dashboard/stats` | Route Handler | Stats + score + goals + profileCompletion |

## Componentes existentes

- `home/`: 10 componentes implementados; `Offers` agora renderiza `ProductCard` (antes `ProductHighlightCard`, removido).
- `layout/`: Navbar, Footer — implementados.
- `product/`: `ProductCard` (unificado, ADR-010), `ProductGrid`/`ProductGridSkeleton`/`ProductFilters` (novos, Sprint 3.5), `ProductGallery`, `ProductHeader`, `ProductSpecifications`, `ProductOffers`, `RelatedProducts`, `FavoriteButton`, `ShareButton` — todos implementados. `ProductHighlightCard`/`ProductBreadcrumb` removidos.
- `store/`: StoreCard, StoreDetails, StoreOffers, StoreGrid — todos implementados.
- `search/`: SearchResults, SearchResultsSkeleton — implementados.
- `ui/`: 16 implementados (12 anteriores + `EmptyState` + `Breadcrumb`/`Pagination`/`Input`/`Select`, novos/preenchidos na Sprint 3.5). `Card`, `Loading`, `SearchInput` — vazios (3).

Ver `docs/COMPONENT_INDEX.md` para o detalhe item a item.

## Hooks existentes

- `useProduct`, `useFavorites`, `useSearch`, `useStore` — implementados.
- `useProductFilters` (Sprint 3.5) — implementado, sincroniza os filtros do catálogo com a URL.
- `useOffers` — arquivo vazio (placeholder, sem consumidor planejado nesta sprint).

## Services existentes

- `product.service.ts` — implementado (`getProducts`, `getProductBySlug`, `getRelatedProducts`, `searchProducts`, `getProductsCatalog` novo na Sprint 3.5).
- `offer.service.ts` — implementado (`getOffers`, `getOffersByProduct`, `getOffersByStore`; ordenação corrigida para `price_usd` na Sprint 3.5). **Sprint 3.9**: `updateOfferPrice`/`getOfferPriceMetrics` novos (Price Engine v1, ADR-017) — code-complete e testados (degradação graciosa confirmada), sem consumidor ainda; dependem de `price_history`, tabela proposta (`0006`) mas não aplicada no Supabase real.
- `store.service.ts` — implementado (`getStores`, `getStore`, `getStoreBySlug`, `getRelatedStores`).
- `search.service.ts` — implementado, `searchEverything`.
- `category.service.ts`, `brand.service.ts` — **implementados na Sprint 3.5** (antes vazios): `getCategories`/`getCategoryBySlug`, `getBrands`/`getBrandBySlug`.
- `ai.service.ts` — vazio.

## Tipos existentes

`Product`/`ProductWithRelations`/`ProductCatalogItem` (novo, Sprint 3.5)/`ProductHighlight`, `Offer`/`OfferWithStore`/`OfferWithProduct` (corrigidos para o schema real na Sprint 3.5, ADR-009), `Store` (corrigido, idem), `Brand`, `Category`, `Favorite`, `Search` — implementados. **`PriceHistoryEntry`/`OfferPriceMetrics`/`PriceUpdateResult`** (`types/priceHistory.ts`, novo, Sprint 3.9) — únicos tipos do projeto que descrevem um schema proposto, não confirmado no banco real (ver ADR-017). `User`, `Review` — vazios.

## Providers existentes

**Nenhum.** Sem `providers/`, sem React Context global, sem theme/auth provider. Estado global (favoritos) é resolvido via módulo singleton + `useSyncExternalStore`.

## Integração com Supabase

Cliente único em `lib/supabase.ts`, criado a partir de `lib/env.ts` (única fonte de `process.env`, ADR-001).

Esquema do banco documentado em `database/DATABASE.md`/`ERD.md` (não código, apenas descrição); `database/migrations` tem 3 propostas não aplicadas (`0001` superada, `0002` integridade de `stores`, `0003` view de agregação de preço para o catálogo — Sprint 3.5). O schema real continua existindo apenas no painel do Supabase.

Auditoria direta confirmou (Sprint 3.4.1, corrigido no código na Sprint 3.5): `stores` tem 24 colunas reais, `offers` tem 16 — ambas agora totalmente modeladas em `types/`. **Atualizado na Sprint 3.8**: `stores` tem 5 linhas reais, todas com `slug`/`active` preenchidos (ADR-007 resolvido); `brands: 5`, `categories: 5`, `products: 6`, `offers: 9` — dados de exemplo carregados via `database/seed/`, auditados sem FK órfã, slug duplicado ou inconsistência (ver relatório da Sprint 3.8).

## Integração com Vercel / Deploy

Projeto linkado a um projeto Vercel. Variáveis de ambiente do Supabase precisam estar configuradas no painel do projeto Vercel.

## CI atual

**Não existe.** Nenhum workflow de GitHub Actions, nenhum hook de pre-push automatizado além do que o Vercel roda no próprio build de deploy.

## Status do build

✅ `npm run build` — ver relatório da Sprint 3.5 para o resultado mais recente (rotas esperadas: `/`, `/_not-found`, `/product/[slug]`, `/search`, `/store/[slug]`, `/products` — nova nesta sprint).

## Status do lint

✅ `npm run lint` — ver relatório da Sprint 3.5 para o resultado mais recente.

## Status do TypeScript

✅ `npx tsc --noEmit` — ver relatório da Sprint 3.5 para o resultado mais recente.

## Sprint 3.2 — Consolidação (sem novas features de negócio)

Unificação do acesso a `process.env` em `lib/env.ts` (ADR-001), correção do `.gitignore` (ADR-002), limpeza de scripts (ADR-003/004), criação de 6 documentos permanentes de engenharia.

## Sprint 3.3 — Domínio de Busca (Release 0.4, parte 1)

Liga a busca de ponta a ponta: `app/search/page.tsx`, `hooks/useSearch.ts`, `services/search.service.ts`, `SearchResults` com estados reais, `EmptyState` (novo, reaproveitável), JSON-LD `WebSite`/`SearchAction` no root layout.

## Sprint 3.4 — Domínio de Loja (Release 0.3)

Fecha o terceiro domínio central da Home, espelhando a arquitetura do Domínio de Produto: `getStoreBySlug`/`getRelatedStores`, `getOffersByStore`, `hooks/useStore.ts`, `StoreDetails`/`StoreGrid`/`StoreOffers`, `app/store/[slug]/` completo, `storePath`/`storeUrl`.

## Sprint 3.4.1 — Consolidação da Camada de Dados (auditoria, sem novas telas)

Auditoria direta do Supabase real (sem alterar código): confirmou que `types/offer.ts`/`types/store.ts` divergem do schema real (ADR-008), que contato/horário de loja já existiam no banco (corrigindo ADR-006), e que 4 FKs usadas pelos services são reais. Nenhuma correção de código aplicada — ficou para aprovação.

## Sprint 3.5 — Catálogo Premium de Produtos (Release 0.2, parte 2)

Duas frentes, nesta ordem (decisão tomada com o CTO antes de iniciar a implementação, ver pergunta de decisão registrada na sessão):

1. **Correção do modelo de dados** (ADR-009): `types/offer.ts`/`types/store.ts` corrigidos para os nomes reais do schema (ver aviso no topo deste documento); `utils/currency.ts` perdeu a conversão por taxa fixa (não tem mais consumidor); `StoreDetails.tsx` ganhou a seção de Contato/Horário.
2. **Catálogo de produtos** (`/products`): `services/category.service.ts`/`brand.service.ts` implementados (antes vazios); `services/product.service.ts` ganhou `getProductsCatalog` (filtros via PostgREST embedding `offers!inner`/`offers!left`, paginação real via `count: "exact"`, ordenação por preço corrigida em memória por página — limitação documentada, ADR-011); `components/product/ProductGrid.tsx` implementado (antes vazio), `ProductGridSkeleton`/`ProductFilters` novos; `hooks/useProductFilters.ts` novo (URL como fonte de verdade); `components/ui/Breadcrumb.tsx`/`Pagination.tsx`/`Input.tsx`/`Select.tsx` novos/preenchidos; `ProductCard`/`ProductHighlightCard` unificados (ADR-010), `ProductBreadcrumb` substituído pelo `Breadcrumb` genérico; `app/products/{page,loading,error}.tsx` novos, com `generateMetadata`, JSON-LD `CollectionPage`+`ItemList`+`BreadcrumbList` e `<Suspense>`.

Proposta de migration (não aplicada): `database/migrations/0003_proposed_product_catalog_price_view.sql` (materialized view para ordenação de preço escalável). Validado com `npm run lint`/`typecheck`/`build` — ver relatório da sprint para o resultado.

## Sprint 3.6 — Data Foundation (auditoria, sem novas telas, sem código alterado)

Sprint de diagnóstico puro, a pedido explícito do CTO ("não implemente funcionalidades de interface", "não execute migrations", "não realize inserts sem aprovação"), preparando a base de dados para Comparação de Produtos, Histórico de Preços, Favoritos, Alertas e ParaguAI AI.

- **Banco**: relacionamentos `products→brands`, `products→categories`, `offers→products`, `offers→stores` reconfirmados sem erro de FK. Nenhuma constraint `UNIQUE`/`NOT NULL` aplicada hoje em `stores.slug` nem em campos obrigatórios de `products`/`offers` — auditoria de índices/constraints não é possível só com a chave anônima (precisa do painel do Supabase ou de uma chave de serviço), registrado como limitação, não como fato verificado.
- **Dados (consulta ao vivo)**: `products: 0`, `offers: 0`, `brands: 0`, `categories: 0`, `stores: 5` (todas com `slug`/`active`/`cover_image` nulos; `website`/`opening_hours` já preenchidos nas 5; `address` preenchido em 4/5; `phone`/`email` nulos em todas; `whatsapp` é string vazia em 1 loja, em vez de nulo — pequena inconsistência de dado, não de schema).
- **Services**: `product.service.ts`, `offer.service.ts`, `store.service.ts`, `search.service.ts`, `category.service.ts`, `brand.service.ts` revisados linha a linha contra o schema real — nenhuma divergência nova encontrada (a correção da Sprint 3.5/ADR-009 segue válida). Nenhuma correção de código necessária antes da Sprint do Comparador.
- **Migrations**: `0001` confirmada superada (mantida só por histórico); `0002` (fase 1, `UNIQUE (slug)`) revisada como segura para aplicar a qualquer momento; `0003` (view de agregação de preço) avaliada como prematura — sem produtos reais, não há nada para agregar.
- **Seed**: proposta de estratégia entregue (não executada) — backfill de `slug` a partir do `name` real de cada loja + dados de exemplo para `brands`/`categories`/`products`/`offers`. Ver relatório completo da sprint para o plano detalhado.

## Sprint 3.7 — Data Foundation v2 (Release 0.5, fundação)

Sistema oficial de seed implementado como código (`database/seed/`), constraints/índices e views de apoio propostos, arquitetura de Price Engine e estratégia de Offer Ranking documentadas — nenhum dado real inserido, nenhuma migration aplicada, nenhuma feature de interface.

- **`database/seed/`** (novo): `brands/`, `categories/`, `stores/`, `products/`, `offers/` (dados de exemplo em JavaScript puro, ver ADR-012), `lib/client.js` (cliente Supabase próprio da ferramenta), `index.js` (orquestrador idempotente, **dry-run por padrão**, só escreve com `--execute`), `validate.js` (auditoria de qualidade de dados, somente leitura). Scripts novos em `package.json`: `db:seed`, `db:seed:execute`, `db:validate`.
- **`eslint.config.mjs`**: `database/seed/**` adicionado a `globalIgnores` (tooling Node fora da árvore TypeScript da aplicação — ADR-012).
- **Migrations propostas (não aplicadas)**: `0004_proposed_catalog_integrity_and_indexes.sql` (`UNIQUE (slug)` em `products`/`brands`/`categories` + índices em `offers.product_id`/`store_id`/`price_usd`, `products.brand_id`/`category_id`); `0005_proposed_store_ranking_view.sql` (`store_ranking_summary`, insumo do Offer Ranking).
- **Arquitetura documentada, não implementada**: Price Engine (ADR-013) e algoritmo de Offer Ranking v1 (ADR-014) — ver `docs/DECISIONS.md`.
- **Validação ao vivo (`db:validate`)**: nenhum problema de qualidade de dado encontrado nas tabelas hoje vazias; achado já conhecido reconfirmado — 5/5 lojas sem `slug`.
- **Services**: revisados novamente (`product`, `offer`, `store`, `search`) — nenhuma divergência nova, nenhuma correção aplicada.

Validado com `npm run lint` (0 erros, 5 warnings pré-existentes), `npx tsc --noEmit` (0 erros) e `npm run build` (sucesso, mesmas 6 rotas).

## Sprint 3.8 — Seed Execution & Catalog Validation

Executa, pela primeira vez, escrita real contra o Supabase de produção: o seed implementado na Sprint 3.7 saiu de dry-run para `--execute`, com aprovação explícita do CTO. Nenhuma migration aplicada, nenhuma feature de interface, nenhuma alteração de arquitetura.

- **Bloqueio real encontrado e resolvido**: a primeira tentativa de `--execute`, só com `NEXT_PUBLIC_SUPABASE_ANON_KEY`, falhou — `INSERT` em `brands`/`categories`/`products` bloqueado por RLS (erro explícito) e o `UPDATE` de `stores.slug`/`active` foi **filtrado silenciosamente** pela RLS (0 linhas afetadas, sem erro, mas o script logou `[OK]` indevidamente — falso positivo confirmado por snapshot antes/depois). Nenhuma escrita real ocorreu nessa tentativa. Resolvido com `SUPABASE_SERVICE_ROLE_KEY` adicionada a `.env.local` pelo CTO. Ver ADR-016.
- **Seed executado com sucesso** (2ª tentativa, com a chave de serviço): `stores` (5/5 backfill de `slug`/`active`), `brands` (5 criadas), `categories` (5 criadas), `products` (6 criados), `offers` (9 criadas). Reexecução confirmou idempotência (`[SKIP]` em tudo, sem duplicata).
- **Auditoria de integridade**: `npm run db:validate` (0 problemas) + auditoria extra com anti-join real (não só `IS NULL`) via chave de serviço — 0 FKs órfãs (`offers.product_id`/`store_id`, `products.brand_id`/`category_id`), 0 slugs duplicados, 0 pares `product_id+store_id` duplicados, 0 produtos inativos. Único "achado" é deliberado: `playstation-5-slim` sem nenhuma oferta (testa o estado vazio da UI, conforme comentário do próprio dado de seed).
- **Nenhuma correção de dados foi necessária** — o seed já carregou de forma consistente.
- **Migrations `0002`/`0004`/`0005`**: continuam propostas, não aplicadas (fora do escopo desta sprint, por instrução explícita).
- **Price Engine (ADR-013) / Offer Ranking (ADR-014)**: continuam apenas documentados, nenhum código novo.

Ver relatório completo da Sprint 3.8 para o detalhe ambiente/snapshot/auditoria.

## Sprint 3.9 — Price Engine v1 + Compare Foundation

Implementa a primeira versão de código (não só arquitetura) do Price Engine proposto na Sprint 3.7 (ADR-013), e corrige o bug de log identificado na Sprint 3.8 (ADR-016). Nenhuma UI nova, nenhuma autenticação, nenhum scraping/IA — conforme escopo explícito da missão.

- **`database/migrations/0006_proposed_price_history.sql`** (novo): tabela `price_history` (`offer_id`, `price_usd`, `price_brl`, `old_price_usd`, `source`, `recorded_at`) + índice composto `(offer_id, recorded_at DESC)`. **Proposta, não aplicada** — bloqueio de ferramenta, não de aprovação: nenhum mecanismo disponível neste projeto executa DDL contra o Supabase (sem `pg`/`DATABASE_URL`, sem Supabase CLI, sem RPC de SQL exposta). Ver ADR-017.
- **`types/priceHistory.ts`** (novo): `PriceHistoryEntry`, `PriceChangeSource`, `OfferPriceMetrics`, `PriceUpdateResult`.
- **`services/offer.service.ts`**: `updateOfferPrice()` (caminho único de escrita de preço, grava histórico antes de atualizar a oferta, no-op se o preço não mudou, confirma linhas afetadas) e `getOfferPriceMetrics()` (menor/maior preço histórico, variação percentual, última mudança — insumo do futuro `/compare`). Ambos testados ao vivo contra o Supabase real: degradação graciosa confirmada (preço atual real, campos de histórico `null`) enquanto `price_history` não existir.
- **`database/seed/index.js`**: corrigido o bug do ADR-016 — o backfill de `stores` agora confirma linhas afetadas (`.select("id")`) antes de logar `[OK]`, e loga `[AVISO]` quando a RLS filtra a escrita silenciosamente. Testado contra o Supabase real com a chave anônima (reproduz o bug original) — detecção confirmada.
- **`docs/DECISIONS.md`**: ADR-017 (schema do Price Engine, caminho único de escrita, bloqueio de DDL).

Validado com `npm run lint` (0 erros, 5 warnings pré-existentes), `npx tsc --noEmit` (0 erros), `npm run build` (sucesso, mesmas 6 rotas), `npm run db:validate` (0 problemas) e reexecução de `npm run db:seed:execute` (idempotência confirmada, tudo `[SKIP]`).

**Não incluído, por instrução explícita**: nenhuma UI/página nova (`/compare` segue sem interface); nenhuma autenticação; nenhuma migration aplicada (`0002`/`0004`/`0005`/`0006` continuam propostas); nenhuma alteração de RLS.

### Adendo (mesmo dia) — Price Engine validado contra dados reais + achado crítico de RLS

O CTO aplicou `0006_proposed_price_history.sql` manualmente no SQL Editor do Supabase. Isso permitiu validar o Price Engine de ponta a ponta contra a tabela real, em vez de só a degradação graciosa.

- **Bug real encontrado e corrigido** (antes de qualquer escrita real): `getOfferPriceMetrics` calculava `highestPriceUSD`/`priceChangePercent` sem considerar o preço original (capturado só em `old_price_usd` da primeira entrada de histórico) — se o preço só tivesse caído, o pico original nunca apareceria. Corrigido em `services/offer.service.ts`. Ver ADR-018.
- **27 asserções passaram** num teste funcional completo contra a oferta real `iphone-16-pro-256gb-titanio-preto@cellshop`: leitura de histórico vazio, métricas baseline, duas mudanças reais de preço (999→949→1050), no-op corretamente detectado, restauração ao preço original (999, preservando 3 entradas reais de histórico), métricas finais corretas (`lowest=949`, `highest=1050`).
- **Classificação**: Price Engine v1 é **"Backend Production Ready"** — não "Production Ready" de ponta a ponta.
- **Achado crítico, não corrigido (ADR-019)**: testando a leitura com a chave anônima (a que a aplicação usa), confirmou-se que ela não vê nenhuma linha de `price_history` — nem de `brands`/`categories`/`products`/`offers`. Só `stores` tem leitura pública funcionando. Isso significa que o catálogo real provavelmente está vazio para usuários reais desde a Sprint 3.8, e nenhuma auditoria anterior pegou isso porque passou a usar, sem essa intenção, a chave de serviço (presente em `.env.local` desde a Sprint 3.8) em vez da chave anônima. Correção proposta, não aplicada: `database/migrations/0007_proposed_public_read_policies.sql`.

Validado de novo: `npm run lint`/`tsc --noEmit`/`npm run build` (sem regressão) e `npm run db:validate` (0 problemas).

## Sprint 4.0 — Compare Engine v1 (Release 0.5)

Entrega o Compare Engine v1: compara um produto entre todas as lojas disponíveis usando dados reais, com Price Engine integrado e algoritmo de ranking de ofertas (ADR-014, primeira implementação). Primeiro MVP visível da plataforma.

- **`types/compare.ts`** (novo): `RankedOffer`, `CompareSummary`, `CompareResult`.
- **`services/compare.service.ts`** (novo): `getProductComparisonBySlug`/`getProductComparison` — motor de comparação com 3 queries (produto + ofertas com loja + batch de price_history via `.in()`), ranking em memória (ADR-014), cálculo de resumo. Ver ADR-020.
- **`app/api/compare/route.ts`** (novo): GET `/api/compare?slug=` ou `?productId=` — endpoint JSON com headers de cache.
- **`hooks/useCompare.ts`** (novo): `useCompare(slug)` — hook client-side.
- **`components/compare/CompareSummary.tsx`** (novo): resumo min/max/savings.
- **`components/compare/CompareOfferCard.tsx`** (novo): card de oferta rankeada com histórico de preços e score.
- **`app/compare/[slug]/{page,loading,not-found,error}.tsx`** (novos): rota SSR Server Component, `generateMetadata`, todos os estados de UI.
- **`constants/routes.ts`**: `comparePath()`/`compareUrl()` adicionados.
- **`database/seed/validate_compare.js`** (novo): 6 cenários validados contra o Supabase real com a chave de serviço — todos passaram.

**Validação**: lint (0 erros), tsc (0 erros), build (8 rotas — `+/api/compare`, `+/compare/[slug]`), db:validate (0 problemas). Compare Engine validado fim a fim com a chave de serviço (6 cenários, todos OK). Chave anônima confirmada bloqueada (ADR-019, pré-existe à sprint).

---

## Sprint 4.2 — MVP Público (Release 0.7) — 2026-06-25

Lapidação completa da experiência existente antes do primeiro lançamento público. Nenhuma funcionalidade nova — foco em qualidade, SEO, navegação e performance.

- **`next/image` completo**: todos os 5 `<img>` substituídos (ProductCard, ProductGallery, StoreCard, store/[slug]/page) — 0 warnings de lint. `next.config.ts` com `remotePatterns` para Supabase Storage + HTTPS genérico.
- **Navegação sem links mortos**: Navbar simplificada (Início / Produtos / Buscar / IA); Footer converte links inexistentes em badges "em breve" — nenhum link aponta para 404.
- **SEO**: `app/sitemap.ts` (dinâmico, busca produtos + lojas do Supabase em paralelo → `/sitemap.xml`), `app/robots.ts` → `/robots.txt`. JSON-LD `Organization` no root layout. Metadata completa (OG + Twitter) na Home.
- **UX**: `app/not-found.tsx` (404 global com design de marca).
- **Performance**: double-fetch eliminado em `/compare/[slug]` via `cache(getProductComparisonBySlug)`.
- **Validações**: lint 0 erros/warnings, tsc 0 erros, build 10 rotas, db:validate 0 problemas.

## Sprint 4.3 — Data Integrity & Media Foundation (Release 0.7 — fase final) — 2026-06-25

Última etapa técnica antes da declaração do Release 0.7.

- **Migration `0008_data_integrity.sql`** (criada, aguarda SQL Editor): consolida 0002 + 0004 num único SQL idempotente. UNIQUE constraints em `slug` para todas as 4 tabelas de catálogo + 6 índices de performance (FKs + price_usd + price_history). Auditoria pré-migração: 0 duplicatas, 0 orphans, 0 nulos — banco já íntegro, migration só formaliza as garantias.
- **Storage Foundation**: bucket `catalog` criado no Supabase Storage (público, webp/jpeg/png/avif, 5 MB/arquivo). `utils/storage.ts` novo — builders de URL tipados + `resolveImageUrl` com fallback automático para Storage. `database/storage/init.js` (`npm run storage:init`). ADR-022.
- **Validação Sprint 4.3**: `database/seed/validate_sprint43.js` (`npm run db:validate:43`) — 23 asserções: contagem, slugs, FKs, preços, Storage. 23 OK | 0 falhas.
- **ESLint**: `database/storage/**` adicionado ao `globalIgnores` (tooling Node).
- **Documentação**: ADR-022 + ADR-023 em DECISIONS.md; Sprint 4.3 no CHANGELOG.md.
- **Validações**: lint 0, tsc 0, build 10 rotas (sem regressão), db:validate 0, db:validate:43 23/23 OK.

## Release 0.8 — Go Live Foundation — 2026-06-25

- **Imagens**: 16 URLs de placehold.co inseridas no banco (products, stores, brands) via `database/seed/update_images.js`. Catálogo agora exibe imagens representativas.
- **Favicon + PWA**: `app/icon.tsx` (512×512 PNG) + `app/apple-icon.tsx` (180×180) via `ImageResponse` + `app/manifest.ts` (manifest.webmanifest). 3 novas rotas estáticas.
- **Analytics**: `components/analytics/Analytics.tsx` (GA4 + Clarity, graceful degradation) + `utils/analytics.ts` (event helpers tipados). `CompareOfferCard` + `StoreCard` rastreiam cliques. Layout inclui `<Analytics />`.
- **SEO**: `viewport` com `themeColor` + `colorScheme`. Suporte a Google Search Console e Bing Webmaster via env vars. `<link rel="preconnect">` para Supabase. Twitter card com `site`.
- **Segurança**: 6 security headers em `next.config.ts` (HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy).
- **Scripts**: `db:images`, `db:images:dry-run`.
- **Validações**: lint 0, tsc 0, build 13 rotas, db:validate 11 OK, db:validate:43 23/23.

## Status Geral: **95%**

Release 0.8 entregue: site com imagens, favicon, manifesto, analytics, headers de segurança, SEO avançado.

---

## Release 1.1 — First Live Connector — 2026-06-26

Primeira loja real integrada: Shopping China (`shoppingchina.com.py`). FetchEngine com `HttpFetchStrategy`, parser de listagem e detalhe HTML, conector com rate limiting, persistência via `CatalogWriter`. 30 produtos reais em 3 categorias. Dry-run validado → execute → idempotência confirmada. Migrations aplicadas: 0010 (store + connector_configs) + 0011 (UNIQUE constraint em offers).

## Release 1.2 — Merchant Operating System — 2026-06-26

Portal self-service completo para lojistas (SaaS). 6 novas tabelas (merchant_plans, merchants, merchant_stores, merchant_audit_logs, merchant_analytics_events, merchant_recommendations). 10 API routes. 11 páginas `/merchant/*`. Onboarding wizard 5 passos. Dashboard com Merchant Score (0-100) e recomendações automáticas. Auditoria completa de ações. Plans engine com 4 planos seed.

**ADRs**: ADR-024 a ADR-028 (ver DECISIONS.md)

## Release 1.3 + Hotfixes Auth/Dashboard — 2026-06-27

**Release 1.3 — Dashboard Consultivo**: redesign completo. `NextStepCard`, `GoalsPanel`, 6 níveis de lojista (`MerchantLevel`), `computeNextStep`, `computeGoals`. API `/stats` estendida com `level`/`nextStep`/`goals`. `ScoreCard`/`RecommendationsPanel`/`StatsGrid` redesenhados.

**Hotfix Auth (PKCE)**: `app/auth/callback/route.ts` criado — troca code PKCE por sessão e coloca cookies. `emailRedirectTo` usa `window.location.origin` (resolve mismatch de porta). Quando verifier PKCE está ausente (link aberto em browser diferente), redireciona para `?confirmed=true` em vez de erro. Login page mostra banner verde.

**Hotfix Dashboard**: `requireMerchant()` agora checa `merchants` diretamente via service role key — não depende mais de `profiles.role`. Elimina o loop de 403 causado pelo email confirmation flow. Error states contextuais no dashboard (not_found/server/network). Migration `0013` corrige o constraint `profiles_role_check`.

**Fluxo completo validado**: Cadastro → e-mail → confirmação → login → dashboard carregando ✓

**Pendência**: Migration `0013_fix_profiles_role_merchant.sql` — aplicar no Supabase SQL Editor (idempotente, segura).

## Release 1.3.1 — ParaguAI Experience Integration — 2026-06-27

Release exclusivamente de UX, navegação e branding. Zero alterações no Merchant OS, auth, APIs ou banco.

- `HeroCTAs` — CTAs auth-aware no Hero: "Comparar preços" + "Sou Lojista" / "Minha Loja"
- `ForLojistasSection` — Seção premium para lojistas na Home (6 benefícios + CTA duplo)
- Navbar — "Para Lojistas" no menu; botão "Entrar" → `/merchant/login`
- Footer — Coluna "Para Lojistas" (Cadastrar Loja / Planos / Central do Lojista / Ajuda)
- `/para-lojistas` — Landing page institucional (Hero + Benefícios + Como Funciona + Planos + Importação + FAQ + CTA)
- Branding: user-facing usa "Área do Lojista" / "Central do Lojista" — nunca "Merchant Portal"
- SEO: metadata + canonical + OG + Twitter em `/para-lojistas`
- Qualidade: lint 0, tsc 0, build OK (64 rotas + `/para-lojistas`), zero regressões
