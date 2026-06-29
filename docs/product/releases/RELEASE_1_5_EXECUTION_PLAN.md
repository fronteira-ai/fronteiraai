# RELEASE_1_5_EXECUTION_PLAN.md
# Plano de Execução Técnica — Trust & Reputation

**Versão**: 1.0  
**Criado**: 2026-06-29  
**Status**: Aguardando aprovação do CTO antes da Sprint 1  
**Referência**: `docs/product/releases/RELEASE_1_5_BLUEPRINT.md`  
**Arquitetura base**: Release 1.4 — `docs/architecture/ARCHITECTURE.md`  

---

## Premissa

Este documento transforma o Blueprint estratégico do Release 1.5 em execução técnica precisa.

Nenhuma linha de código é escrita aqui. Nenhuma migration é criada. Nenhum componente é implementado.

O que existe aqui é o plano completo: épicos, backlog, sequência, ADRs, migrations, APIs, frontend, conexões com o Brain, quality gates e sprints.

A execução começa apenas após aprovação explícita deste plano.

---

## Estado de Partida (Release 1.4)

Antes de decompor, registrar com precisão o que existe e o que não existe:

**Existe e funciona:**
- `price_history` tabela com dados acumulados; `getOfferPriceMetrics()` implementado em service
- `merchant_analytics_events` tabela existente (sem eventos de comprador ainda)
- `favorites` tabela existe no banco mas nenhum código a usa — useFavorites usa localStorage
- `requireMerchant()` e `requireAdmin()` — guards de auth funcionais
- Merchant Score, Trust Score e `verified_level` no banco de merchants
- `stores.rating` é campo manual — sem origem verificável

**Existe mas é placeholder vazio:**
- `types/user.ts` — arquivo existe, sem conteúdo
- `types/review.ts` — arquivo existe, sem conteúdo
- `hooks/useOffers.ts` — arquivo existe, vazio

**Existe mas é legacy (candidato a remoção):**
- `hooks/useProduct.ts` — sem consumidor desde Sprint 4.1
- `hooks/useStore.ts` — sem consumidor desde Sprint 4.1
- `hooks/useCompare.ts` — sem consumidor desde Sprint 4.1

**Não existe:**
- Tabela `users` para compradores autenticados
- Tabela `reviews`
- Tabela `search_logs`
- `requireUser()` guard
- Qualquer rota de autenticação de comprador
- Componentes: MerchantBadge, TrustSignalPanel, PriceHistoryChart, ReviewForm, ReviewCard, ReviewsList
- `/admin/reviews` — rota de moderação
- `/merchant/analytics` — rota de analytics detalhado
- `/conta/entrar` e `/conta/criar` — auth de comprador

**Migration pendente mas criada:**
- Migration 0013 (`profiles_role_check`) — listada no MASTER_ROADMAP como necessária para Fase 2, não aplicada

---

# ETAPA 1 — ÉPICOS

Oito épicos. Cada um com objetivo, valor, ativo, moat, dependências, risco e critério de aceite.

---

## Épico E1 — Foundation: Contexto do Comprador

**Objetivo**: criar a entidade de comprador autenticado no domínio — tabela `users`, role, guard `requireUser()` e fluxo básico de auth.

**Valor entregue**: compradores podem criar conta e fazer login. Todo o Release 1.5 que requer identidade de comprador se torna possível.

**Ativo fortalecido**: C-6 Buyer Behavioral Knowledge (começa a existir com compradores autenticados).

**Moat fortalecido**: Data Flywheel — a identidade de comprador é o pré-requisito para correlacionar comportamento ao longo do tempo.

**Dependências de entrada**: Migration 0013 aplicada. Nenhuma dependência de outro épico.

**Dependências de saída**: E4 (Favoritos), E5 (Reviews). Estes não podem começar sem E1.

**Risco principal**: conflito entre a tabela `users` de compradores e a tabela `profiles` de operadores. Precisam ser semanticamente distintas — profiles é para operadores do sistema (admin, operator, merchant); users é para compradores do marketplace.

**Critério de aceite**: comprador consegue criar conta, confirmar e-mail, fazer login e ter sessão validada por `requireUser()`. Role `user` é corretamente atribuído em `profiles`.

---

## Épico E2 — Intelligence: Search Logs

**Objetivo**: registrar silenciosamente toda busca executada em `searchEverything()` na nova tabela `search_logs`.

**Valor entregue**: o Brain começa a acumular o mapa de intenção de busca — o ativo mais estratégico de curto prazo. Invisível para o comprador, fundamental para o sistema.

**Ativo fortalecido**: C-4 Search Intelligence (nasce neste épico).

**Moat fortalecido**: Search Intelligence Moat.

**Dependências de entrada**: nenhuma.

**Dependências de saída**: nenhuma — épico independente.

**Risco principal**: impacto de performance. O log deve ser fire-and-forget — nunca bloquear a resposta da busca para o comprador.

**Critério de aceite**: toda execução de `searchEverything()` gera uma entrada em `search_logs` com query, contagens por tipo e timestamp. A latência da busca não aumenta de forma perceptível (< 50ms de overhead).

---

## Épico E3 — Produto: Histórico de Preço Visível

**Objetivo**: exibir o histórico de preços de cada oferta na página `/product/[slug]`, usando dados que já existem em `price_history`.

**Valor entregue**: compradores veem o histórico de preço e tomam decisões melhores. Ativo que já existe se torna percebido.

**Ativo fortalecido**: C-1 Historical Price Data (já existe; este épico o torna percebido).

**Moat fortalecido**: Historical Data Moat (visibilidade reforça a percepção do moat pelos compradores).

**Dependências de entrada**: nenhuma — `getOfferPriceMetrics()` já está implementado.

**Dependências de saída**: nenhuma — épico independente.

**Risco principal**: exibir histórico com apenas 1 entrada cria gráfico sem sentido. Definir threshold mínimo de 2 entradas para exibição.

**Critério de aceite**: página `/product/[slug]` exibe timeline ou gráfico de histórico de preço para ofertas com ≥ 2 entradas em `price_history`. Exibe preço mínimo histórico e variação percentual. Não exibe a seção quando não há histórico suficiente.

---

## Épico E4 — Comprador: Favoritos Persistidos

**Objetivo**: migrar a persistência de favoritos de localStorage para o banco de dados para compradores autenticados, mantendo localStorage para não-autenticados.

**Valor entregue**: compradores com conta têm favoritos sincronizados entre dispositivos.

**Ativo fortalecido**: C-6 Buyer Behavioral Knowledge (favoritos são o primeiro sinal de preferência persistido).

**Moat fortalecido**: Data Flywheel.

**Dependências de entrada**: E1 (Contexto do Comprador) — `users` table e `requireUser()` devem existir.

**Dependências de saída**: E5 (Reviews) — a elegibilidade de review usa a existência de favorito como critério.

**Risco principal**: regressão no `useFavorites` para usuários não autenticados. A lógica dual (localStorage vs. banco) precisa ser transparente — o FavoriteButton não deve saber qual caminho está sendo usado.

**Critério de aceite**: comprador não-autenticado usa localStorage (comportamento atual preservado). Comprador autenticado tem favoritos salvos na tabela `favorites` e sincronizados entre sessões. A transição de não-autenticado para autenticado não perde favoritos existentes do localStorage.

---

## Épico E5 — Trust: Reviews v1

**Objetivo**: implementar o sistema de reviews verificados de compradores sobre lojas, com fluxo de elegibilidade, moderação e exibição pública.

**Valor entregue**: compradores veem avaliações verificadas de outros compradores nas páginas de loja. O Trust System começa a acumular sinais reputacionais.

**Ativo fortalecido**: S-4 Review & Reputation Data (nasce neste épico).

**Moat fortalecido**: Merchant Trust Network.

**Dependências de entrada**: E1 (users table + requireUser), E4 (favorites — elegibilidade usa favorito como critério).

**Dependências de saída**: E6 (Trust Signal usa review_count e rating médio de reviews).

**Risco principal**: reviews falsos ou abusivos. Mitigação: elegibilidade verificada + moderação humana obrigatória antes de publicação. Reviews não aprovados não aparecem publicamente.

**Critério de aceite**: comprador elegível consegue submeter review. Review fica em `status: pending`. Admin vê a fila em `/admin/reviews` e pode aprovar ou rejeitar. Após aprovação, review aparece em `/lojas/[slug]` e `/store/[slug]`. `stores.review_count` e `stores.rating` são atualizados a cada aprovação.

---

## Épico E6 — Trust: Merchant Badge & Trust Signal

**Objetivo**: implementar o Trust Signal calculado e exibi-lo como badge em todas as páginas onde lojas aparecem.

**Valor entregue**: comprador vê, em qualquer card ou página de loja, o nível verificável de confiança — com critérios explicados ao passar o mouse.

**Ativo fortalecido**: C-2 Merchant Trust Score (componente temporal explicitado e exposto publicamente).

**Moat fortalecido**: Merchant Trust Network.

**Dependências de entrada**: E5 (review_count e rating precisam existir para compor o Signal).

**Dependências de saída**: E7 (Merchant Profile Expanded usa o Trust Signal).

**Risco principal**: Trust Signal mal calibrado que penaliza merchants novos de forma injusta ou recompensa merchants antigos com dados ruins. ADR-041 deve definir a fórmula antes da implementação.

**Critério de aceite**: `getStoreTrustSignal(storeId)` retorna dados calculados. `MerchantBadge` exibe o nível correto em `/compare`, `/product`, `/store` e `/lojas`. Hover/tap mostra critérios específicos verificáveis (tempo, percentuais, reviews). Nenhum merchant recebe badge `Verificada` sem ter `verified_level = 'verified'` no banco.

---

## Épico E7 — Trust: Merchant Profile Expandido

**Objetivo**: expandir a página `/lojas/[slug]` com painel de Trust Signal completo e seção de reviews verificados.

**Valor entregue**: a página de loja passa a ser a fonte de informação de confiança mais completa da plataforma — não apenas catálogo e contato.

**Ativo fortalecido**: C-2 Merchant Trust Score, S-4 Review & Reputation Data.

**Moat fortalecido**: Merchant Trust Network, Merchant OS Switching Cost.

**Dependências de entrada**: E5 (reviews), E6 (Trust Signal).

**Dependências de saída**: nenhuma.

**Risco principal**: página de loja ficar pesada com muitos dados. Usar Suspense para seções independentes e garantir que o catálogo de produtos carrega sem esperar os reviews.

**Critério de aceite**: `/lojas/[slug]` exibe painel de confiança com: tempo de presença verificada, percentual de produtos com preço atualizado nos últimos 30 dias, contagem de reviews verificados e rating médio, e badge de nível. Reviews aparecem paginados ao final da página.

---

## Épico E8 — Merchant: Analytics Real Data

**Objetivo**: implementar a nova seção de analytics no portal do merchant, exibindo dados reais de comportamento de compradores derivados de `merchant_analytics_events`.

**Valor entregue**: merchants passam a operar com dados reais de comportamento — não apenas métricas de qualidade de catálogo.

**Ativo fortalecido**: Merchant Intelligence (Supporting Asset do Brain).

**Moat fortalecido**: Merchant OS Switching Cost (analytics específico por merchant, disponível apenas dentro do ecossistema).

**Dependências de entrada**: novos tipos de evento (`buyer_view_store`, `buyer_click_offer`, `buyer_add_favorite`) devem estar sendo registrados pelos épicos anteriores.

**Dependências de saída**: nenhuma.

**Risco principal**: `merchant_analytics_events` não ter volume suficiente de dados para exibir métricas significativas no primeiro mês. Solução: exibir UI completa mas com estado vazio honesto quando há poucos dados.

**Critério de aceite**: `/merchant/analytics` exibe visualizações de produtos, cliques em oferta e favoritos adicionados, com seletor de período (7/30/90 dias). Dados são reais — derivados de `merchant_analytics_events`. Dashboard principal tem nova seção de preview de analytics com link para a página completa.

---

# ETAPA 2 — SEQUÊNCIA DE DEPENDÊNCIAS

```
E2 (Search Logs) ──────────────── independente, pode ser o primeiro
E3 (Price History) ─────────────── independente, pode ser o primeiro

E1 (Buyer Context) ─────────────── pré-requisito de E4 e E5
      │
      ├──► E4 (Favorites) ──────── pré-requisito de E5 (elegibilidade)
      │         │
      │         └──► E5 (Reviews) ──── pré-requisito de E6
      │                   │
      │                   └──────► E6 (Trust Signal) ── pré-requisito de E7
      │                                   │
      │                                   └──► E7 (Merchant Profile)
      │
      └──► [E8 precisa de eventos gerados por E4/E5, mas pode começar em paralelo]

Migration 0013 ──────────────────── deve ser aplicada antes de E1
```

**Caminho crítico**: E1 → E4 → E5 → E6 → E7

**Paralelos possíveis**: E2 e E3 podem rodar em qualquer Sprint independentemente.

---

# ETAPA 3 — BACKLOG TÉCNICO

---

## E1 — Contexto do Comprador (Foundation)

### T1.1 — Aplicar Migration 0013

**Descrição**: aplicar a migration `profiles_role_check` que está criada mas não aplicada.  
**Motivação**: constraint que garante que `profiles.role` só aceita valores válidos. Necessária antes de adicionar o novo role `user`.  
**Banco**: `profiles` — adiciona CHECK constraint em `role`.  
**Arquivos**: `database/migrations/0013_profiles_role_check.sql` (existe, precisa ser executada no Supabase SQL Editor).  
**Complexidade**: Baixa.  
**Prioridade**: P0 — bloqueante para todo o Release.

---

### T1.2 — Migration: Tabela `users` (compradores)

**Descrição**: criar a tabela `users` para compradores autenticados, distinta de `profiles` (operadores do sistema).  
**Motivação**: compradores precisam de identidade persistente para favoritos, reviews, alertas e personalização futura.  
**Banco**:
- Nova tabela `users`: `id` (uuid PK FK → auth.users.id), `display_name` (text nullable), `created_at` (timestamptz), `last_active_at` (timestamptz)
- RLS: comprador lê/atualiza apenas seu próprio registro; service role acessa tudo
**Arquivos**: novo arquivo `database/migrations/0014_buyer_users.sql`.  
**Complexidade**: Média.  
**Prioridade**: P0 — bloqueante para E4 e E5.  
**ADR**: ADR-040.

---

### T1.3 — Implementar `types/user.ts`

**Descrição**: implementar o type `User` (comprador) que hoje é placeholder vazio.  
**Motivação**: type safety para a entidade de comprador em todo o codebase.  
**Arquivos impactados**: `types/user.ts`.  
**Complexidade**: Baixa.

---

### T1.4 — Criar `lib/buyer-auth.ts`

**Descrição**: criar `requireUser()` paralelo a `requireMerchant()` — valida sessão + `profiles.role = 'user'`.  
**Motivação**: guard de autenticação de comprador reutilizável em todos os Route Handlers que requerem comprador autenticado.  
**Arquivos impactados**: novo arquivo `lib/buyer-auth.ts`.  
**Complexidade**: Baixa — padrão idêntico ao `requireMerchant()`.

---

### T1.5 — Criar rotas de auth de comprador

**Descrição**: criar `/conta/entrar` e `/conta/criar` — fluxo de sign-in e sign-up para compradores.  
**Motivação**: compradores precisam de ponto de entrada para autenticação, distinto do fluxo de merchant (`/merchant/login`).  
**Arquivos impactados**:
- Novo `app/conta/entrar/page.tsx` (Server Component com form Client)
- Novo `app/conta/criar/page.tsx` (Server Component com form Client)
- Novo `app/conta/layout.tsx` (layout mínimo)
- Atualizar `app/auth/callback/route.ts` para redirecionar compradores para `/conta/dashboard` ou `/` após confirmação  
**Componentes novos**: `BuyerLoginForm` (Client), `BuyerRegisterForm` (Client)  
**Complexidade**: Média.

---

### T1.6 — Atualizar Navbar para comprador

**Descrição**: adicionar opção de login de comprador no Navbar, além do botão "Entrar" que hoje vai para `/merchant/login`.  
**Motivação**: comprador precisa de caminho de acesso ao seu dashboard de conta.  
**Arquivos impactados**: `components/layout/Navbar.tsx`, `HeroCTAs.tsx`.  
**Complexidade**: Baixa.

---

### T1.7 — Criar `POST /api/buyer/auth/register`

**Descrição**: Route Handler para registrar comprador após auth Supabase, criando entrada em `profiles` com role `user` e em `users`.  
**Motivação**: análogo a `POST /api/merchant/auth/register`.  
**Arquivos impactados**: novo `app/api/buyer/auth/register/route.ts`.  
**Permissões**: requer sessão válida (qualquer role inicial).  
**Contrato**: `POST` sem body → `{ data: { userId, alreadyExists } }`.  
**Complexidade**: Baixa.

---

## E2 — Search Logs

### T2.1 — Migration: Tabela `search_logs`

**Descrição**: criar tabela `search_logs` para registro anônimo de buscas.  
**Banco**:
- Nova tabela `search_logs`: `id` (uuid PK), `query` (text NOT NULL), `products_found` (int), `stores_found` (int), `brands_found` (int), `categories_found` (int), `total_results` (int), `created_at` (timestamptz default now())
- RLS: INSERT para anon (qualquer busca pode registrar), SELECT apenas para service role
- Índice em `created_at` para queries de analytics
**Arquivos**: novo `database/migrations/0015_search_logs.sql`.  
**Complexidade**: Baixa.  
**ADR**: ADR-042.

---

### T2.2 — Instrumentar `searchEverything()`

**Descrição**: adicionar registro em `search_logs` ao final de `searchEverything()`, de forma fire-and-forget.  
**Motivação**: toda busca deve ser registrada sem impactar a latência da resposta ao comprador.  
**Arquivos impactados**: `services/search.service.ts`.  
**Detalhe crítico**: usar `void supabase.from('search_logs').insert(...)` — não await, não bloqueia, não lança. Se o insert falhar, a busca continua funcionando normalmente.  
**Complexidade**: Baixa.  
**Teste necessário**: verificar que busca retorna resultado normalmente quando a tabela `search_logs` tem RLS bloqueando — o insert deve falhar silenciosamente.

---

## E3 — Price History Visível

### T3.1 — Criar componente `PriceHistoryChart`

**Descrição**: componente Server que exibe timeline de histórico de preço de uma oferta.  
**Motivação**: transformar o ativo C-1 (Historical Price Data) em valor percebido pelo comprador.  
**Arquivos impactados**: novo `components/product/PriceHistoryChart.tsx`.  
**Props**: `metrics: OfferPriceMetrics` (retorno de `getOfferPriceMetrics()`), `offerStoreName: string`.  
**UI**: preço atual, preço mínimo histórico, preço máximo histórico, variação percentual desde o mínimo. Indicador contextual: "Próximo do mínimo histórico" ou "Acima do preço médio histórico". Sem biblioteca de gráfico — usar CSS puro ou SVG inline para evitar dependência de terceiro.  
**Threshold**: somente renderizar se `priceHistory.length >= 2`. Retornar `null` caso contrário.  
**Complexidade**: Média.

---

### T3.2 — Integrar `PriceHistoryChart` em `/product/[slug]`

**Descrição**: adicionar PriceHistoryChart na página de produto, abaixo de `ProductOffers`.  
**Motivação**: comprador vê histórico de preço no mesmo contexto em que avalia a oferta.  
**Arquivos impactados**: `app/product/[slug]/page.tsx`, `app/product/[slug]/_cache.ts`.  
**Detalhe arquitetural**: `getOfferPriceMetrics()` já está implementado — verificar se já está sendo chamado em `_cache.ts` ou se precisa ser adicionado. Usar `<Suspense>` para a seção de histórico — não deve bloquear o render das ofertas.  
**Complexidade**: Baixa.

---

## E4 — Favoritos Persistidos

### T4.1 — Migration: Atualizar tabela `favorites`

**Descrição**: adicionar `user_id` (FK → `users.id`) e `store_id` opcional (FK → `stores.id`) na tabela `favorites`.  
**Motivação**: a tabela existe mas sem FK de comprador — não estava sendo usada por código.  
**Banco**: 
- `ALTER TABLE favorites ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE`
- `ALTER TABLE favorites ADD COLUMN store_id uuid REFERENCES stores(id) ON DELETE SET NULL` (para favoritar lojas além de produtos)
- RLS: comprador lê/escreve apenas seus próprios favoritos; anon sem acesso
**Arquivos**: novo `database/migrations/0016_favorites_user_fk.sql`.  
**Complexidade**: Baixa.  
**ADR**: ADR-044 (Estratégia Dual de Favoritos).

---

### T4.2 — Criar endpoints de favoritos para comprador

**Descrição**: CRUD de favoritos para compradores autenticados.  
**Arquivos impactados**:
- Novo `app/api/buyer/favorites/route.ts` (GET lista, POST adiciona)
- Novo `app/api/buyer/favorites/[id]/route.ts` (DELETE remove)
**Permissões**: `requireUser()` em todos.  
**Contratos**:
- `GET` → `{ data: Favorite[] }`
- `POST` body: `{ product_id: string }` → `{ data: { id } }`
- `DELETE` → `{ data: { ok: true } }`
**Complexidade**: Baixa.

---

### T4.3 — Atualizar `useFavorites` para persistência dual

**Descrição**: refatorar `useFavorites` para detectar estado de auth e usar banco vs. localStorage.  
**Motivação**: comportamento transparente — `FavoriteButton` não muda; a lógica de persistência é encapsulada no hook.  
**Arquivos impactados**: `hooks/useFavorites.ts`.  
**Lógica**: usar `createSupabaseBrowserClient` para detectar sessão. Se autenticado → API calls. Se anônimo → localStorage (comportamento atual preservado).  
**Transição**: quando comprador faz login, migrar favoritos de localStorage para banco (chamada única de sincronização).  
**Complexidade**: Média.

---

### T4.4 — Registrar evento `buyer_add_favorite` em `merchant_analytics_events`

**Descrição**: quando comprador adiciona favorito de produto associado a uma loja, registrar evento.  
**Motivação**: este evento alimenta o Brain (C-6 Buyer Behavioral Knowledge) e a elegibilidade de review.  
**Arquivos impactados**: `hooks/useFavorites.ts` ou `app/api/buyer/favorites/route.ts`.  
**Complexidade**: Baixa.

---

## E5 — Reviews v1

### T5.1 — Migration: Tabela `reviews`

**Descrição**: criar tabela `reviews` com schema completo.  
**Banco**:
- `id` (uuid PK), `user_id` (uuid NOT NULL FK → users.id), `store_id` (uuid NOT NULL FK → stores.id), `rating` (integer CHECK 1-5, NOT NULL), `body` (text nullable, max 500 chars), `status` (text CHECK IN ('pending','approved','rejected') default 'pending'), `rejection_reason` (text nullable), `created_at` (timestamptz), `moderated_at` (timestamptz nullable), `moderated_by` (uuid nullable FK → profiles.id)
- UNIQUE `(user_id, store_id)` — um review por comprador por loja
- RLS: comprador cria e lê seus próprios; anon lê apenas approved; service role acessa tudo
- Index em `(store_id, status)` para queries de exibição
**Arquivos**: novo `database/migrations/0017_reviews.sql`.  
**Complexidade**: Média.  
**ADR**: ADR-038.

---

### T5.2 — Migration: Colunas em `stores`

**Descrição**: adicionar `review_count` (integer default 0) e recalcular `rating` a partir de reviews.  
**Banco**:
- `ALTER TABLE stores ADD COLUMN review_count integer NOT NULL DEFAULT 0`
- A coluna `rating` existente passa a ser computada (não manual) — estratégia: atualizar via function chamada pelo service ao aprovar review
**Arquivos**: novo `database/migrations/0018_stores_review_count.sql`.  
**Complexidade**: Baixa.

---

### T5.3 — Implementar `types/review.ts`

**Descrição**: implementar o type `Review` que hoje é placeholder vazio.  
**Arquivos impactados**: `types/review.ts`.  
**Complexidade**: Baixa.

---

### T5.4 — Criar `review.service.ts`

**Descrição**: service com funções de domínio de review.  
**Arquivos impactados**: novo `services/review.service.ts`.  
**Funções**:
- `getStoreReviews(storeId, page?)` — lista reviews aprovados de uma loja (anon client)
- `getUserReview(storeId)` — review do comprador atual para uma loja (server client)
- `checkEligibility(userId, storeId)` — verifica elegibilidade (service client)
- `submitReview(userId, storeId, rating, body?)` — insere review em pending (service client)
- `moderateReview(reviewId, status, moderatedBy, rejectionReason?)` — aprova ou rejeita (service client)
- `updateStoreRatingAndCount(storeId)` — recalcula `stores.rating` e `review_count` após moderação (service client)  
**Convenção**: todas retornam `null` em erro, nunca lançam.  
**Complexidade**: Média.

---

### T5.5 — Verificação de elegibilidade

**Descrição**: implementar a lógica de elegibilidade para submissão de review.  
**Regras de elegibilidade** (OR):
1. Comprador tem a loja em `favorites` (`favorites.store_id = storeId AND favorites.user_id = userId`)
2. Comprador clicou em oferta da loja nos últimos 90 dias (`merchant_analytics_events.event_type = 'buyer_click_offer' AND store_id = storeId AND user_id = userId AND created_at > now() - interval '90 days'`)
**Arquivos impactados**: `services/review.service.ts` (função `checkEligibility`).  
**Complexidade**: Baixa.

---

### T5.6 — Criar `ReviewForm` (Client Component)

**Descrição**: formulário de submissão de review para comprador elegível.  
**Arquivos impactados**: novo `components/store/ReviewForm.tsx`.  
**UI**: seleção de nota 1-5 (estrelas clicáveis), campo de texto opcional (max 500 chars), botão de envio, feedback de sucesso.  
**Estados**: não elegível (mostra mensagem de como se tornar elegível), elegível (mostra formulário), já revisou (mostra review existente com opção de editar), pendente (mostra aviso de que está aguardando moderação).  
**Dependências**: `requireUser()` via API call, `review.service.ts`.  
**Complexidade**: Média.

---

### T5.7 — Criar `ReviewCard` (Server Component)

**Descrição**: card de exibição de um review aprovado.  
**Arquivos impactados**: novo `components/store/ReviewCard.tsx`.  
**Props**: `Review` (approved).  
**UI**: nome de exibição do revisor, nota (estrelas), texto, data formatada.  
**Complexidade**: Baixa.

---

### T5.8 — Criar `ReviewsList` (Server Component)

**Descrição**: lista paginada de reviews aprovados de uma loja.  
**Arquivos impactados**: novo `components/store/ReviewsList.tsx`.  
**Props**: `storeId`, `initialReviews`, `totalCount`.  
**UI**: lista de `ReviewCard`, paginação simples, estado vazio honesto ("Ainda sem avaliações verificadas").  
**Complexidade**: Baixa.

---

### T5.9 — Criar endpoint `POST /api/buyer/reviews`

**Descrição**: submeter review de comprador autenticado.  
**Arquivos impactados**: novo `app/api/buyer/reviews/route.ts`.  
**Permissões**: `requireUser()`.  
**Lógica**: verificar elegibilidade → inserir review com status `pending` → registrar evento em `merchant_analytics_events`.  
**Contrato**: body `{ store_id, rating, body? }` → `{ data: { id, status: 'pending' } }` ou `{ error }`.  
**Complexidade**: Média.

---

### T5.10 — Criar endpoint `GET /api/buyer/reviews/eligibility/[storeId]`

**Descrição**: verificar elegibilidade de comprador autenticado para revisar uma loja.  
**Arquivos impactados**: novo `app/api/buyer/reviews/eligibility/[storeId]/route.ts`.  
**Permissões**: `requireUser()`.  
**Contrato**: `{ data: { eligible: boolean, reason?: string } }`.  
**Complexidade**: Baixa.

---

### T5.11 — Criar `/admin/reviews` — Moderação

**Descrição**: nova rota de admin para moderar reviews pendentes.  
**Arquivos impactados**:
- Novo `app/admin/reviews/page.tsx`
- Novo `app/api/admin/reviews/route.ts` (GET lista pendentes, com filtros)
- Novo `app/api/admin/reviews/[id]/route.ts` (PATCH para aprovar/rejeitar)
**Permissões**: `requireAdmin()`.  
**UI**: tabela de reviews pendentes com: nome do revisor, loja, nota, texto, data. Botões "Aprovar" e "Rejeitar" (com seleção de motivo). Filtros por loja, nota, data.  
**Atualização pós-moderação**: ao aprovar, chamar `updateStoreRatingAndCount(storeId)`.  
**Complexidade**: Média.

---

### T5.12 — Integrar ReviewsList e ReviewForm em `/lojas/[slug]` e `/store/[slug]`

**Descrição**: adicionar seção de reviews nas páginas de loja.  
**Arquivos impactados**: `app/lojas/[slug]/page.tsx`, `app/store/[slug]/page.tsx`.  
**Detalhe**: usar `<Suspense>` para a seção de reviews — não deve bloquear o carregamento do catálogo.  
**Complexidade**: Baixa.

---

## E6 — Merchant Badge & Trust Signal

### T6.1 — Implementar `getStoreTrustSignal(storeId)`

**Descrição**: função que calcula o Trust Signal de uma loja com base em dados verificáveis.  
**Arquivos impactados**: `services/store.service.ts` (adicionar função).  
**Dados calculados**:
- Tempo de cadastro em meses (desde `stores.created_at`)
- Percentual de ofertas com `price_history` atualizado nos últimos 30 dias
- Percentual de produtos com imagem real (`image_url NOT NULL`)
- Nível de verificação (`merchants.verified_level`)
- Contagem de reviews verificados e rating médio (`stores.review_count`, `stores.rating`)
**Retorno**: `{ verified_level, months_active, data_freshness_pct, image_coverage_pct, review_count, avg_rating }`.  
**Cliente**: usa service role (precisa de dados de merchants que são privados).  
**Complexidade**: Média.  
**ADR**: ADR-041.

---

### T6.2 — Criar `MerchantBadge` (Server Component)

**Descrição**: badge visual de confiança de merchant com dados verificáveis.  
**Arquivos impactados**: novo `components/store/MerchantBadge.tsx`.  
**Props**: `trustSignal: StoreTrustSignal`.  
**UI**:
- Badge pequeno: ícone + nível (`Loja` / `Verificada` / `Verificada Premium`)
- Hover/tooltip: critérios específicos ("16 meses · 94% preços atualizados · 12 avaliações verificadas")
- Cores: neutro para "Loja", azul para "Verificada", dourado para "Verificada Premium"
**Complexidade**: Média.

---

### T6.3 — Integrar `MerchantBadge` em páginas de produto e comparação

**Descrição**: adicionar MerchantBadge nas páginas onde lojas aparecem ao lado de ofertas.  
**Arquivos impactados**:
- `components/compare/CompareOfferCard.tsx` — badge abaixo do nome da loja
- `components/product/ProductOffers.tsx` — indicador mínimo por oferta
- `components/store/StoreCard.tsx` — badge no card de listagem
**Detalhe arquitetural**: `getStoreTrustSignal()` usa service role — deve ser chamado apenas em Server Components ou Route Handlers, nunca em Client Components. `CompareOfferCard` é Client Component — receberá o trustSignal como prop do Server Component pai.  
**Complexidade**: Média.

---

## E7 — Merchant Profile Expandido

### T7.1 — Criar `TrustSignalPanel` (Server Component)

**Descrição**: painel completo de confiança para a página da loja.  
**Arquivos impactados**: novo `components/store/TrustSignalPanel.tsx`.  
**Props**: `trustSignal: StoreTrustSignal`.  
**UI**: painel com tempo de presença, percentuais verificáveis, badge de nível com critério público explicado.  
**Complexidade**: Baixa.

---

### T7.2 — Expandir `/lojas/[slug]`

**Descrição**: integrar `TrustSignalPanel`, `MerchantBadge` e `ReviewsList` em posições específicas da página de loja premium.  
**Arquivos impactados**: `app/lojas/[slug]/page.tsx`.  
**Estrutura de página pós-Release 1.5**:
1. Hero da loja (existente)
2. `TrustSignalPanel` (novo — antes do catálogo)
3. Catálogo de produtos (existente)
4. `ReviewsList` + `ReviewForm` (novo — ao final)  
**Detalhe**: Trust Signal requer chamada com service role — usar `stores-public.service.ts` que já usa service client para esta rota.  
**Complexidade**: Média.

---

## E8 — Merchant Analytics Real Data

### T8.1 — Registrar novos tipos de eventos em `merchant_analytics_events`

**Descrição**: garantir que eventos de comprador (`buyer_view_store`, `buyer_click_offer`, `buyer_add_favorite`, `buyer_submit_review`) são registrados no momento correto.  
**Arquivos impactados**:
- `app/lojas/[slug]/page.tsx` → registrar `buyer_view_store` (via API call do Client, ou via middleware)
- `app/api/buyer/favorites/route.ts` → registrar `buyer_add_favorite`
- `app/api/buyer/reviews/route.ts` → registrar `buyer_submit_review`
- `components/compare/CompareOfferCard.tsx` → já chama `analytics.clickExternalOffer()` — expandir para incluir `buyer_click_offer` em `merchant_analytics_events`
**Complexidade**: Baixa (padrão já existe, apenas novos event types).

---

### T8.2 — Criar `GET /api/merchant/analytics`

**Descrição**: endpoint que retorna dados reais de comportamento de compradores para o merchant autenticado.  
**Arquivos impactados**: novo `app/api/merchant/analytics/route.ts`.  
**Permissões**: `requireMerchant()`.  
**Parâmetros**: `period` (`7d` / `30d` / `90d`).  
**Dados retornados**: visualizações por produto, cliques em oferta por produto, adições a favorito por produto, total de visualizações da loja.  
**Contrato**:
```json
{
  "data": {
    "period": "30d",
    "store_views": 142,
    "offer_clicks": 38,
    "favorites_added": 12,
    "top_products": [
      { "product_name": "...", "views": 45, "clicks": 12, "favorites": 3 }
    ]
  }
}
```
**Complexidade**: Média.

---

### T8.3 — Criar `/merchant/analytics` (nova rota)

**Descrição**: página de analytics detalhado para o merchant.  
**Arquivos impactados**: novo `app/merchant/analytics/page.tsx`.  
**UI**: seletor de período, métricas por produto (tabela), tendência simples (comparação com período anterior).  
**Complexidade**: Média.

---

### T8.4 — Atualizar `/merchant/dashboard` com preview de analytics

**Descrição**: adicionar seção de preview no dashboard existente com as métricas mais importantes e link para `/merchant/analytics`.  
**Arquivos impactados**: `app/merchant/dashboard/page.tsx`.  
**Complexidade**: Baixa.

---

## Limpeza — Legacy Hooks

### T9.1 — Remover hooks legados

**Descrição**: verificar e remover `useProduct.ts`, `useStore.ts` e `useCompare.ts` que não têm consumidor desde Sprint 4.1, e `useOffers.ts` que é placeholder vazio.  
**Arquivos impactados**: `hooks/useProduct.ts`, `hooks/useStore.ts`, `hooks/useCompare.ts`, `hooks/useOffers.ts`.  
**Processo**: grep para confirmar zero importações antes de deletar.  
**Complexidade**: Baixa.

---

# ETAPA 4 — ROADMAP INTERNO / SEQUÊNCIA ÓTIMA

A sequência elimina retrabalho e garante que cada task tem seus pré-requisitos satisfeitos:

```
FASE 0 — PRÉ-REQUISITOS (antes de qualquer Sprint)
  T1.1 — Aplicar Migration 0013 (profiles_role_check)
  T9.1 — Remover hooks legados (cleanup antes de começar)

FASE 1 — PARALLEL QUICK WINS (independentes, alto valor imediato)
  T2.1 → T2.2  (Search Logs: tabela + instrumentação)
  T3.1 → T3.2  (Price History: componente + integração)

FASE 2 — BUYER FOUNDATION (bloqueante para tudo buyer-related)
  T1.2  (Migration: users table)
  T1.3  (types/user.ts)
  T1.4  (lib/buyer-auth.ts)
  T1.5  (Rotas /conta/*)
  T1.6  (Navbar update)
  T1.7  (POST /api/buyer/auth/register)

FASE 3 — TRUST DATA LAYER (favoritos + reviews: fundação de dados)
  T4.1  (Migration: favorites user_id)
  T4.2  (API endpoints de favoritos)
  T4.3  (useFavorites dual persistence)
  T4.4  (evento buyer_add_favorite)
  T5.1  (Migration: reviews)
  T5.2  (Migration: stores review_count)
  T5.3  (types/review.ts)
  T5.4  (review.service.ts)
  T5.5  (Eligibility check)

FASE 4 — TRUST PRESENTATION (UI de reviews + analytics)
  T5.6  (ReviewForm)
  T5.7  (ReviewCard)
  T5.8  (ReviewsList)
  T5.9  (POST /api/buyer/reviews)
  T5.10 (GET eligibility)
  T5.11 (/admin/reviews moderation)
  T5.12 (integração /lojas e /store)
  T8.1  (novos event types)
  T8.2  (GET /api/merchant/analytics)
  T8.3  (/merchant/analytics page)
  T8.4  (dashboard preview)

FASE 5 — TRUST SIGNAL (badge + perfil expandido)
  T6.1  (getStoreTrustSignal)
  T6.2  (MerchantBadge component)
  T6.3  (integração em compare, product, store)
  T7.1  (TrustSignalPanel)
  T7.2  (expandir /lojas/[slug])
```

---

# ETAPA 5 — ADRs NECESSÁRIOS

Lista de decisões arquiteturais que requerem ADR antes da implementação correspondente. ADRs devem ser criados e aprovados antes do início da Fase que os utiliza.

| ADR | Título | Necessário antes de | Decisão central |
|---|---|---|---|
| ADR-038 | Sistema de Reviews | Fase 3 | Schema, elegibilidade, moderação, impacto no stores.rating |
| ADR-039 | Merchant Analytics Real | Fase 4 | Como merchant_analytics_events são consumidos, granularidade |
| ADR-040 | Contexto do Comprador | Fase 2 | Schema de users, distinção de profiles, RLS |
| ADR-041 | Trust Signal — Cálculo | Fase 5 | Fórmula, componentes, pesos, frequência de recálculo |
| ADR-042 | Search Logs — Coleta | Fase 1 | Schema, anonimização, fire-and-forget, retenção futura |
| ADR-043 | Autenticação de Comprador | Fase 2 | Rotas, fluxo PKCE, callback redirect para compradores |
| ADR-044 | Favoritos Dual Persistence | Fase 3 | Estratégia localStorage vs. banco, migração na autenticação |

---

# ETAPA 6 — MIGRATIONS

Ordenadas pela dependência lógica. Nenhuma deve ser executada sem o ADR correspondente aprovado.

| # | Nome | Depende de | Conteúdo |
|---|---|---|---|
| 0013 | `profiles_role_check` | nada | CHECK constraint em profiles.role — já existe, apenas aplicar |
| 0014 | `buyer_users` | 0013 | CREATE TABLE users (id → auth.users.id, display_name, timestamps). RLS. |
| 0015 | `search_logs` | nada | CREATE TABLE search_logs (id, query, contagens por tipo, created_at). RLS anon INSERT. Index em created_at. |
| 0016 | `reviews` | 0014 | CREATE TABLE reviews (id, user_id→users, store_id→stores, rating 1-5, body, status, moderation fields). UNIQUE(user_id, store_id). RLS. |
| 0017 | `favorites_user_fk` | 0014 | ALTER favorites: ADD user_id FK→users, ADD store_id FK→stores. RLS para comprador. |
| 0018 | `stores_review_count` | 0016 | ALTER stores: ADD review_count integer DEFAULT 0. Preparar para cálculo via service. |

**Ordem de execução obrigatória**: 0013 → (0014 e 0015 em paralelo) → (0016 e 0017 em paralelo, ambas dependem de 0014) → 0018.

**Regra de rollback**: cada migration deve ter script de rollback documentado no mesmo arquivo. Se uma migration falhar em produção, o rollback deve restaurar o estado anterior sem perda de dados.

---

# ETAPA 7 — APIs

### Novas APIs do Release 1.5

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/api/buyer/auth/register` | Sessão válida | Registrar comprador após auth Supabase |
| `GET` | `/api/buyer/favorites` | `requireUser()` | Listar favoritos do comprador |
| `POST` | `/api/buyer/favorites` | `requireUser()` | Adicionar favorito (`{ product_id }`) |
| `DELETE` | `/api/buyer/favorites/[id]` | `requireUser()` | Remover favorito |
| `POST` | `/api/buyer/reviews` | `requireUser()` | Submeter review (`{ store_id, rating, body? }`) |
| `GET` | `/api/buyer/reviews/eligibility/[storeId]` | `requireUser()` | Verificar elegibilidade de review |
| `GET` | `/api/admin/reviews` | `requireAdmin()` | Listar reviews para moderação (paginado, filtros) |
| `PATCH` | `/api/admin/reviews/[id]` | `requireAdmin()` | Aprovar ou rejeitar review |
| `GET` | `/api/merchant/analytics` | `requireMerchant()` | Analytics real de comportamento de compradores |

### Modificações em APIs existentes

| Rota | Modificação |
|---|---|
| `app/auth/callback/route.ts` | Adicionar redirect para compradores (`/conta/dashboard` ou `/`) além do redirect atual de merchants |

### Contratos detalhados das novas APIs

**POST /api/buyer/reviews**
```
Request:  { store_id: string, rating: number (1-5), body?: string (max 500) }
Response 201: { data: { id: string, status: "pending" } }
Response 400: { error: "rating deve ser entre 1 e 5" }
Response 403: { error: "comprador não elegível para avaliar esta loja" }
Response 409: { error: "comprador já avaliou esta loja" }
```

**GET /api/admin/reviews**
```
Query: page (default 1), status (default "pending"), store_id (opcional)
Response 200: { data: Review[], total, page, totalPages }
```

**PATCH /api/admin/reviews/[id]**
```
Request: { status: "approved" | "rejected", rejection_reason?: string }
Response 200: { data: { ok: true } }
```

**GET /api/merchant/analytics**
```
Query: period ("7d" | "30d" | "90d", default "30d")
Response 200: { data: { period, store_views, offer_clicks, favorites_added, top_products[] } }
```

---

# ETAPA 8 — FRONTEND

### Novas páginas

| Rota | Tipo | Propósito |
|---|---|---|
| `/conta/entrar` | Server (form Client) | Login de comprador |
| `/conta/criar` | Server (form Client) | Cadastro de comprador |
| `/conta/layout.tsx` | Server | Layout mínimo para rotas de conta |
| `/merchant/analytics` | Server (autenticado) | Analytics detalhado do merchant |
| `/admin/reviews` | Server (autenticado) | Moderação de reviews |

### Novos componentes

| Componente | Tipo | Localização | Propósito |
|---|---|---|---|
| `BuyerLoginForm` | Client | `components/buyer/` | Formulário de login de comprador |
| `BuyerRegisterForm` | Client | `components/buyer/` | Formulário de cadastro de comprador |
| `PriceHistoryChart` | Server | `components/product/` | Histórico de preço de oferta |
| `ReviewForm` | Client | `components/store/` | Submissão de review verificado |
| `ReviewCard` | Server | `components/store/` | Exibição de review individual |
| `ReviewsList` | Server | `components/store/` | Lista paginada de reviews |
| `MerchantBadge` | Server | `components/store/` | Badge de confiança verificável |
| `TrustSignalPanel` | Server | `components/store/` | Painel completo de confiança |
| `AnalyticsStatsPanel` | Server | `components/merchant/dashboard/` | Preview de analytics no dashboard |

### Hooks modificados

| Hook | Modificação |
|---|---|
| `hooks/useFavorites.ts` | Persistência dual: localStorage (anon) ou banco (autenticado). Migração automática na autenticação. |

### Services modificados

| Service | Modificações |
|---|---|
| `services/search.service.ts` | Adicionar registro fire-and-forget em `search_logs` em `searchEverything()` |
| `services/store.service.ts` | Adicionar `getStoreTrustSignal(storeId)` usando service client |
| `services/stores-public.service.ts` | Expandir dados retornados para incluir Trust Signal nas páginas /lojas |

### Services novos

| Service | Propósito |
|---|---|
| `services/review.service.ts` | CRUD de reviews: criação, listagem, moderação, update de rating |
| `services/user.service.ts` | Criação e leitura de compradores autenticados |

### Novos tipos implementados

| Arquivo | Conteúdo |
|---|---|
| `types/user.ts` | Interface `User` (comprador): id, display_name, created_at, last_active_at |
| `types/review.ts` | Interface `Review`: id, user_id, store_id, rating, body, status, timestamps |

### Novo lib

| Arquivo | Conteúdo |
|---|---|
| `lib/buyer-auth.ts` | `requireUser()` — guard de auth de comprador |

### Páginas modificadas

| Página | Modificação |
|---|---|
| `app/product/[slug]/page.tsx` | Adicionar PriceHistoryChart abaixo de ProductOffers |
| `app/product/[slug]/_cache.ts` | Adicionar getOfferPriceMetrics se não estiver no cache |
| `app/lojas/[slug]/page.tsx` | Adicionar TrustSignalPanel, ReviewsList, ReviewForm |
| `app/store/[slug]/page.tsx` | Adicionar ReviewsList e ReviewForm |
| `app/merchant/dashboard/page.tsx` | Adicionar seção de analytics preview |
| `app/auth/callback/route.ts` | Adicionar redirect para compradores |
| `components/layout/Navbar.tsx` | Adicionar opção de login de comprador |
| `components/compare/CompareOfferCard.tsx` | Adicionar MerchantBadge como prop |
| `components/store/StoreCard.tsx` | Adicionar MerchantBadge |

### Arquivos removidos

| Arquivo | Motivo |
|---|---|
| `hooks/useProduct.ts` | Legacy sem consumidor desde Sprint 4.1 |
| `hooks/useStore.ts` | Legacy sem consumidor desde Sprint 4.1 |
| `hooks/useCompare.ts` | Legacy sem consumidor desde Sprint 4.1 |
| `hooks/useOffers.ts` | Placeholder vazio, sem implementação |

---

# ETAPA 9 — BRAIN

### Eventos que começam a alimentar o Brain no Release 1.5

| Evento | Fonte | Ativo alimentado | Moat fortalecido |
|---|---|---|---|
| Busca com resultado | `search_logs` entry com total > 0 | C-4 Search Intelligence | Search Intelligence Moat |
| Busca sem resultado | `search_logs` entry com total = 0 | C-4 Search Intelligence — gap detection | Search Intelligence Moat |
| Visualização de loja | `buyer_view_store` em merchant_analytics_events | C-6 Buyer Behavioral Knowledge | Data Flywheel |
| Clique em oferta | `buyer_click_offer` em merchant_analytics_events | C-6 Buyer Behavioral Knowledge | Data Flywheel |
| Adição de favorito | `buyer_add_favorite` em merchant_analytics_events | C-6 Buyer Behavioral Knowledge | Data Flywheel, Merchant Trust Network |
| Submissão de review | `buyer_submit_review` em merchant_analytics_events | S-4 Review & Reputation Data | Merchant Trust Network |
| Review aprovado | entrada aprovada em `reviews` | S-4 Review & Reputation Data, C-2 Merchant Trust Score | Merchant Trust Network |
| Histórico de preço visível | comprador interage com PriceHistoryChart | C-1 Historical Price Data (percepção aumenta retenção) | Historical Data Moat |

### Como cada evento fortalece os ativos

**Search Logs → C-4 Search Intelligence**  
Cada busca adiciona um dado ao mapa de intenção: o que os compradores buscam, com que frequência, o que encontram e o que não encontram. Buscas com `total_results = 0` são o sinal mais valioso — identificam gaps de catálogo que representam demanda não atendida. Em 6 meses de coleta, o sistema terá um mapa de demanda que orientará expansão de catálogo com precisão impossível sem esses dados.

**Analytics Events → C-6 Buyer Behavioral Knowledge**  
Cada evento de comportamento de comprador (visualização, clique, favorito) começa a construir o perfil de comportamento real — não declarado. A correlação entre visualizações e cliques revela a taxa de conversão de interesse em visita por categoria. A correlação entre favoritos e reviews revela o comportamento de compradores engajados.

**Reviews → S-4 Review & Reputation Data + C-2 Merchant Trust Score**  
Cada review verificado aprovado adiciona um sinal qualitativo ao Trust Score do merchant. O texto do review alimentará análise de sentimento futura (Brain 2.0). O conjunto de reviews por merchant começa a construir o ativo S-4 que, com volume suficiente, poderá ser promovido a Core Asset independente.

### Conexão Brain → Knowledge

O Brain ainda não está em operação no Release 1.5 — mas os dados que o alimentarão estão sendo coletados pela primeira vez. A Knowledge Graph do Brain, quando ativado, terá:

- `Busca → Produto (encontrado)` — relação que revela relevância
- `Busca → zero resultados (não encontrado)` — relação que revela gap
- `Comprador → Store (visualizou)` — relação de interesse
- `Comprador → Store (favoritou)` — relação de preferência forte
- `Comprador → Store (revisou)` — relação de experiência real

Estas relações são os nós e arestas do Knowledge Graph. O Release 1.5 começa a preenchê-lo.

---

# ETAPA 10 — QUALITY GATES

### Gate 0 — Pré-Release (antes de qualquer código)

- [ ] Blueprint aprovado pelo CTO
- [ ] Execution Plan aprovado pelo CTO
- [ ] ADRs 038–044 criados (pode ser incremental — antes de cada Fase)
- [ ] Migration 0013 aplicada no ambiente de desenvolvimento

### Gate 1 — Após Fase 1 (Search Logs + Price History)

- [ ] `search_logs` sendo populados a cada execução de `searchEverything()` (verificar via query no banco)
- [ ] Busca retorna resultados normalmente mesmo se o insert em `search_logs` falhar
- [ ] PriceHistoryChart renderiza corretamente para produtos com histórico
- [ ] PriceHistoryChart não renderiza quando há < 2 entradas em `price_history`
- [ ] Build sem erro (`npm run build`)
- [ ] Sem erro de TypeScript (`npm run lint`)
- [ ] Nenhuma regressão em busca, comparação, produtos, lojas e admin

### Gate 2 — Após Fase 2 (Buyer Context)

- [ ] Comprador consegue criar conta, confirmar e-mail e fazer login em `/conta/criar`
- [ ] `requireUser()` bloqueia acesso não-autenticado corretamente (testar com request sem sessão)
- [ ] Role `user` atribuído corretamente em `profiles` após registro
- [ ] Tabela `users` tem entrada após registro de comprador
- [ ] `lib/supabase/service.ts` NÃO é importado por nenhum componente de conta (verificar)
- [ ] Build + lint sem erro
- [ ] Nenhuma regressão em merchant login e admin login

### Gate 3 — Após Fase 3 (Favoritos + Reviews Data Layer)

- [ ] Comprador autenticado: favorito salvo em banco (verificar via query)
- [ ] Comprador não-autenticado: favorito salvo em localStorage (comportamento preservado)
- [ ] Transição auth→não-auth: favoritos do localStorage migrados para banco
- [ ] `reviews` table com RLS correta: anon vê apenas `approved`; comprador vê seus próprios; service role acessa tudo
- [ ] `search_logs` com RLS correta: anon pode inserir, não pode ler
- [ ] Build + lint sem erro
- [ ] Nenhuma regressão em funcionalidades existentes

### Gate 4 — Após Fase 4 (Reviews UI + Analytics)

- [ ] Comprador elegível consegue submeter review (testar com conta real com favorito)
- [ ] Comprador não-elegível vê mensagem de eligibilidade (não formulário)
- [ ] Review em `pending` NÃO aparece publicamente (verificar como anon)
- [ ] Admin consegue aprovar review em `/admin/reviews`
- [ ] Após aprovação, review aparece em `/lojas/[slug]` e `/store/[slug]`
- [ ] `stores.review_count` e `stores.rating` atualizados após aprovação
- [ ] `/merchant/analytics` retorna dados reais de `merchant_analytics_events` (verificar com dados reais)
- [ ] Build + lint sem erro
- [ ] Nenhuma regressão

### Gate 5 — Após Fase 5 (Trust Signal + Release Final)

- [ ] `MerchantBadge` exibe nível correto para pelo menos 3 merchants diferentes
- [ ] Hover/tap em MerchantBadge exibe critérios verificáveis corretos
- [ ] Nenhum merchant com `verified_level != 'verified'` recebe badge de verificado
- [ ] `/lojas/[slug]` exibe TrustSignalPanel com dados reais
- [ ] `getStoreTrustSignal()` não é chamado em nenhum Client Component (verificar imports)
- [ ] Definition of Done completa (ver Blueprint, Seção 15)
- [ ] Documentação atualizada: ARCHITECTURE.md, DOMAIN_MODEL.md, COMPONENT_INDEX.md, API_CONTRACTS.md, CHANGELOG.md, PROJECT_STATUS.md
- [ ] Build + lint sem erro
- [ ] Nenhuma regressão em nenhuma rota existente

---

# ETAPA 11 — PLANO DE SPRINTS

6 sprints de aproximadamente 1 semana cada. Cada sprint entrega valor utilizável ao final.

---

## Sprint 1.5.1 — "Intelligence Foundation"

**Semana**: 1  
**Objetivo**: duas fontes de dados estratégicos começam a acumular. Comprador vê histórico de preço pela primeira vez.

**Tarefas**:
- T0: Aplicar Migration 0013 (pré-requisito)
- T2.1: Migration search_logs
- T2.2: Instrumentar searchEverything()
- T3.1: Componente PriceHistoryChart
- T3.2: Integrar PriceHistoryChart em /product/[slug]
- T9.1: Remover hooks legados

**ADRs antes de começar**: ADR-042 (Search Logs)

**Entrega verificável**: comprador vê histórico de preço em produtos com dados. Busca funciona normalmente e logs são registrados no banco.

**Não entra**: nenhum código de comprador, favoritos ou reviews.

---

## Sprint 1.5.2 — "Buyer Exists"

**Semana**: 2  
**Objetivo**: o comprador passa a existir como entidade no sistema.

**Tarefas**:
- T1.2: Migration users table
- T1.3: types/user.ts
- T1.4: lib/buyer-auth.ts
- T1.5: Rotas /conta/entrar e /conta/criar
- T1.6: Navbar update
- T1.7: POST /api/buyer/auth/register

**ADRs antes de começar**: ADR-040 (Contexto do Comprador), ADR-043 (Auth de Comprador)

**Entrega verificável**: comprador consegue criar conta, confirmar e-mail e fazer login. `requireUser()` funciona.

**Não entra**: favoritos, reviews, trust signal.

---

## Sprint 1.5.3 — "Trust Data Layer"

**Semana**: 3  
**Objetivo**: as tabelas de dados de confiança são criadas e os primeiros dados começam a ser coletados.

**Tarefas**:
- T4.1: Migration favorites user_id
- T4.2: API endpoints de favoritos
- T4.3: useFavorites dual persistence
- T4.4: Evento buyer_add_favorite
- T5.1: Migration reviews
- T5.2: Migration stores review_count
- T5.3: types/review.ts
- T5.4: review.service.ts
- T5.5: Eligibility check

**ADRs antes de começar**: ADR-038 (Reviews), ADR-044 (Dual Favorites)

**Entrega verificável**: comprador autenticado tem favoritos no banco. Tabela `reviews` existe e aceita inserções. `checkEligibility()` funciona.

**Não entra**: UI de reviews visível publicamente (ainda em moderação).

---

## Sprint 1.5.4 — "Reviews Go Live"

**Semana**: 4  
**Objetivo**: reviews aparecem publicamente e merchants veem dados reais de analytics.

**Tarefas**:
- T5.6: ReviewForm
- T5.7: ReviewCard
- T5.8: ReviewsList
- T5.9: POST /api/buyer/reviews
- T5.10: GET eligibility endpoint
- T5.11: /admin/reviews moderation
- T5.12: Integrar nas páginas de loja
- T8.1: Novos event types em analytics
- T8.2: GET /api/merchant/analytics
- T8.3: /merchant/analytics page
- T8.4: Dashboard preview analytics

**ADR antes de começar**: ADR-039 (Merchant Analytics)

**Entrega verificável**: comprador elegível consegue submeter review. Admin pode moderar. Review aprovado aparece publicamente. Merchant vê dados reais de comportamento.

---

## Sprint 1.5.5 — "Trust is Visible"

**Semana**: 5  
**Objetivo**: a confiança se torna visível e verificável em toda a plataforma.

**Tarefas**:
- T6.1: getStoreTrustSignal()
- T6.2: MerchantBadge component
- T6.3: Integração em compare, product, store
- T7.1: TrustSignalPanel
- T7.2: Expandir /lojas/[slug]

**ADR antes de começar**: ADR-041 (Trust Signal Fórmula)

**Entrega verificável**: MerchantBadge visível em todos os contextos de loja. /lojas/[slug] com TrustSignalPanel completo. Critérios verificáveis exibidos no hover.

---

## Sprint 1.5.6 — "Release QA & Documentation"

**Semana**: 6  
**Objetivo**: garantir qualidade completa e atualizar toda a documentação antes do merge.

**Tarefas**:
- Gate 5 completo — todas as verificações
- Atualizar ARCHITECTURE.md
- Atualizar DOMAIN_MODEL.md
- Atualizar COMPONENT_INDEX.md
- Atualizar API_CONTRACTS.md
- Criar CHANGELOG.md entry para Release 1.5
- Atualizar PROJECT_STATUS.md
- Testar todos os fluxos críticos end-to-end

**Entrega verificável**: Definition of Done completa. Documentação atualizada. Deploy autorizado.

---

# ETAPA 12 — RISCOS

### Riscos Técnicos

**R1 — Performance do Trust Signal em páginas de alto tráfego**  
`getStoreTrustSignal()` usa service client e faz múltiplas queries. Em `/compare/[slug]` com N ofertas de N lojas distintas, pode resultar em N+1 queries.  
*Mitigação*: verificar se é possível fazer batch query para múltiplos storeIds ao mesmo tempo. Documentar como issue de otimização se necessário — não bloquear o Release por isso.

**R2 — Search Logs com alto volume impactando performance**  
Em produção com alto volume de buscas, inserts frequentes em `search_logs` podem criar contenção.  
*Mitigação*: o insert é fire-and-forget (sem await). Index em `created_at` reduz overhead de scan. Monitorar após deploy.

**R3 — Conflito de roles entre `profiles` e `users`**  
Um comprador que tenta se registrar como merchant, ou um merchant que tenta criar conta de comprador, pode gerar estado inconsistente em `profiles`.  
*Mitigação*: `requireUser()` verifica `profiles.role = 'user'`. `requireMerchant()` verifica `profiles.role = 'merchant'`. Roles são mutuamente exclusivos por design — documentar no ADR-040.

**R4 — Regressão no useFavorites para usuários não-autenticados**  
A lógica dual (localStorage vs. banco) é complexa e pode introduzir bug que afeta o comportamento atual de localStorage.  
*Mitigação*: testar extensivamente o fluxo de usuário anônimo antes de fazer merge. O comportamento de localStorage deve ser 100% preservado.

### Riscos Arquiteturais

**R5 — Service Role exposto em Client Component de Trust Signal**  
`getStoreTrustSignal()` requer service client. Se consumido incorretamente em Client Component (ex: `CompareOfferCard` que é Client), expõe service role.  
*Mitigação*: `CompareOfferCard` recebe `trustSignal` como prop — o Server Component pai (`/compare/[slug]/page.tsx`) faz a query e passa o dado. Verificar todos os imports antes do merge.

**R6 — Migration 0013 com constraint que invalida dados existentes**  
Se existirem entradas em `profiles` com role fora do conjunto esperado, a constraint vai falhar ao ser aplicada.  
*Mitigação*: rodar query de verificação antes de aplicar: `SELECT DISTINCT role FROM profiles`. Corrigir entradas inválidas antes de aplicar a migration.

### Riscos de Produto

**R7 — Volume de reviews insuficiente para demonstrar valor**  
No primeiro mês após o Release, poucas lojas terão reviews suficientes para que o Trust Signal seja diferenciado por reviews.  
*Mitigação*: o Trust Signal tem múltiplos componentes além de reviews (tempo, percentuais de dados). Mesmo sem reviews, o badge é informativo. Documentar no roadmap que reviews ganham peso progressivo.

**R8 — Merchant resistência ao analytics real**  
Merchants podem se preocupar com exposição de dados de suas lojas.  
*Mitigação*: analytics mostra apenas dados da loja do merchant autenticado. Nunca dados de concorrentes. Comunicar claramente na UI.

### Riscos de UX

**R9 — Formulário de review mal posicionado bloqueia conversão**  
Se ReviewForm aparece de forma proeminente antes do catálogo, pode distrair compradores da função principal.  
*Mitigação*: ReviewForm aparece somente ao final da página da loja, após o catálogo.

**R10 — Estado vazio honesto não implementado em algum componente**  
Se PriceHistoryChart, ReviewsList ou TrustSignalPanel não tratar adequadamente o estado sem dados, pode renderizar UI quebrada.  
*Mitigação*: todo componente tem critério explícito de "não renderizar quando não há dados suficientes" (ver Critérios de Aceite por épico).

### Riscos de Dados

**R11 — Dados históricos de favorites em localStorage perdidos na transição**  
Ao migrar para banco, favoritos de usuários que se autenticam podem ser perdidos se a migração não for implementada corretamente.  
*Mitigação*: implementar migração de localStorage → banco no momento do login. Testar com dados reais de localStorage.

### Riscos de Governança

**R12 — Review abusivo aprovado por falta de critério de moderação claro**  
Sem critério explícito de moderação, reviews podem ser aprovados ou rejeitados de forma inconsistente.  
*Mitigação*: ADR-038 deve definir critérios de moderação antes de implementar o `/admin/reviews`. A lista de `rejection_reason` deve ser predefinida (não texto livre).

---

# ETAPA 13 — CHECKLIST FINAL

Este checklist deve ser verificado no início e no final de cada Sprint.

### Checklist de Início de Sprint

- [ ] ADRs da Sprint criados e aprovados
- [ ] Migrations da Sprint documentadas com rollback
- [ ] Critérios de aceite do épico revisados
- [ ] Dependências de entradas satisfeitas (verificar se Sprint anterior está completa)
- [ ] Build limpo na branch de partida

### Checklist de Tasks Individuais

Para cada task:
- [ ] ADR correspondente aprovado (quando aplicável)
- [ ] Schema de banco documentado antes de criar migration
- [ ] Contrato de API documentado antes de implementar Route Handler
- [ ] Props de componente definidas antes de implementar
- [ ] Nenhum `lib/supabase/service.ts` importado por Client Component
- [ ] Service function retorna `[]` ou `null` em erro, nunca lança

### Checklist de Segurança

- [ ] `SUPABASE_SERVICE_ROLE_KEY` não tem prefixo `NEXT_PUBLIC_*`
- [ ] `requireUser()` em todos os endpoints que exigem comprador autenticado
- [ ] RLS testada com credenciais anon para tabelas `reviews`, `users`, `search_logs`, `favorites`
- [ ] Review não aparece publicamente antes de aprovação (testar como anon)
- [ ] `getStoreTrustSignal()` não é importado por nenhum Client Component

### Checklist de Quality

- [ ] `npm run build` — sem erro
- [ ] `npm run lint` — sem violação configurada como erro
- [ ] Todos os estados vazios tratados (EmptyState ou retorno null)
- [ ] Nenhum `console.log` em código de produção (somente `console.error` em services)
- [ ] Nenhum `any` TypeScript não justificado

### Checklist de Definition of Done (Release completo)

**Técnico:**
- [ ] Build sem erros em produção
- [ ] TypeScript sem erros
- [ ] Todas as tabelas novas com RLS configurada e testada
- [ ] `requireUser()` funcional e testado com conta real
- [ ] Favoritos persistidos em banco para usuário autenticado
- [ ] Review submetido → moderado → publicado (fluxo completo verificado)
- [ ] Price History visível em produto com dados reais
- [ ] Search logs sendo registrados (verificado via query)
- [ ] Merchant analytics exibindo dados reais

**Produto:**
- [ ] MerchantBadge visível em compare, product, store e lojas
- [ ] TrustSignalPanel com dados reais em /lojas/[slug]
- [ ] Reviews aprovados visíveis publicamente
- [ ] Nenhum estado vazio sem tratamento

**Brain:**
- [ ] search_logs acumulando dados (verificar contagem após 7 dias)
- [ ] merchant_analytics_events com novos tipos de evento registrados
- [ ] reviews table com primeiros dados verificados

**Documentação:**
- [ ] ADRs 038–044 completos
- [ ] DOMAIN_MODEL.md atualizado (users, reviews, search_logs)
- [ ] ARCHITECTURE.md atualizado (novo contexto do Comprador)
- [ ] COMPONENT_INDEX.md atualizado
- [ ] API_CONTRACTS.md atualizado
- [ ] CHANGELOG.md com entry do Release 1.5
- [ ] PROJECT_STATUS.md atualizado
- [ ] MASTER_ROADMAP.md: Fase 2 iniciada, Release 1.5 marcado como concluído

---

## Quality Gate Final do Plano

✅ **Release completamente decomposto** — 8 épicos, 35+ tasks com granularidade executável  
✅ **Sem ambiguidades** — cada task especifica arquivos, banco, APIs e critério de aceite  
✅ **Dependências conhecidas** — grafo de dependências explícito; caminho crítico identificado  
✅ **Entregas independentes por Sprint** — cada Sprint entrega valor utilizável sem depender da próxima  
✅ **Minimiza riscos** — 12 riscos identificados com mitigação; riscos críticos de segurança explicitados  
✅ **Maximiza ativos estratégicos** — C-1, C-2, C-4, C-6, S-4 fortalecidos; Brain começa a ser alimentado  

---

**Aguardando aprovação do CTO para iniciar a Sprint 1.5.1.**
