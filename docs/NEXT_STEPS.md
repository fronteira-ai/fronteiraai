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

Release 0.2 (Produto + Catálogo), Release 0.3 (Loja) e Release 0.4 parte 1 (Busca) seguem concluídos na **arquitetura e no código**. A fundação de dados está pronta em produção desde a Sprint 3.8 (seed executado, ADR-007 resolvido). A partir da Sprint 3.9, o Price Engine também está **code-complete** (ADR-017) — falta só uma ação humana (aplicar `0006_proposed_price_history.sql` no SQL Editor do Supabase) para ele passar de "testado em degradação graciosa" para "operacional com histórico real".

**Próxima sprint recomendada**: Sprint 4.0 — ver proposta abaixo (aplicar a migration `0006` + tela `/compare`).

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

## Sprint 4.0 (proposta) — Aplicar Price Engine + Comparação de Produtos

**Objetivo**: tornar o Price Engine (Sprint 3.9) operacional de fato e entregar a primeira tela do Release 0.5.

**Escopo proposto**:
1. **Aplicar `0006_proposed_price_history.sql`** no SQL Editor do Supabase (ação humana — CTO ou alguém com acesso ao painel) — depois disso, `updateOfferPrice`/`getOfferPriceMetrics` já funcionam sem nenhuma mudança de código.
2. **Comparação de produtos (`/compare`)**: tela de seleção (2–4 produtos) com tabela de especificações/preços lado a lado, reaproveitando `ProductCard`/`ProductGrid`/`getProductsCatalog` e `getOfferPriceMetrics` para mostrar variação de preço por oferta.
3. **Aplicar as migrations `0002` (fase 1) e `0004`** (constraints `UNIQUE (slug)` + índices) — agora que o seed confirmou 0 duplicata, requer aprovação separada para aplicar contra produção.
4. Avaliar se `updateOfferPrice` precisa de uma policy de RLS dedicada (ou credencial própria) antes do Admin/Crawler existirem de fato — a chave anônima provavelmente não tem permissão de escrita em `offers`/`price_history`, pelo mesmo padrão confirmado em `brands`/`categories`/`products` (ADR-016), mas isso não foi testado nesta sprint.
5. Reavaliar `0003`/`0005` (views de preço e ranking de loja) — agora há volume real (6 produtos, 9 ofertas, 5 lojas) para validar a agregação, mas ainda pequeno; decisão do CTO se aplica agora ou espera mais volume.

**Riscos**: 🟡 Médio — aplicar `0006` é uma ação humana fora do meu controle nesta sessão; o resto é código de baixo risco, reaproveitando componentes já validados.

**Estimativa**: 2–3 dias de código + tempo para a ação manual da migration.

**Impacto no produto**: primeira infraestrutura de histórico de preço de fato operacional, e a primeira fatia do Release 0.5 (Comparação) testável com dados e preços reais.

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
