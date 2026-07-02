# DOMAIN_MODEL.md
# Modelo de Domínio do ParaguAI

**Versão**: 2.0  
**Criado**: 2026-06-27 (v1.0, dump de schema)  
**Reescrito**: 2026-06-28 (v2.0, modelo de conhecimento de negócio)  
**Status**: Referência permanente — atualizar a cada Release que introduz nova entidade ou rompe invariante  
**Alinhado com**: Release 1.4 · `docs/architecture/ARCHITECTURE.md` · `docs/foundation/AI_CONSTITUTION.md` · `docs/foundation/BUSINESS_MODEL.md`

---

## 1. Filosofia do Modelo de Domínio

**Um modelo de domínio não é um espelho do banco de dados. É o conhecimento do negócio expresso em linguagem precisa.**

O banco de dados é uma implementação física. Ele descreve *como* os dados são armazenados. O modelo de domínio descreve *o quê* eles representam e *por quê* existem. A distinção é fundamental:

| Perspectiva | Responde | Exemplo |
|---|---|---|
| Banco de dados | Como os dados são armazenados | `offers.price_usd NUMERIC(10,2) NOT NULL` |
| Modelo de domínio | Por que o preço pertence à oferta | Um produto não tem preço intrínseco. O mesmo iPhone custa diferente na Cellshop e na Nissei — preço é uma propriedade da relação produto-loja, não do produto em si |

O modelo de domínio do ParaguAI existe para responder três perguntas permanentes:

1. **Quais entidades existem e por que existem?** — o problema que cada uma resolve
2. **Como elas se relacionam?** — as relações de negócio, não apenas as FKs
3. **Quais regras são invioláveis?** — os invariantes que, se quebrados, corrompem o conhecimento

Este documento é escrito para desenvolvedores novos, sistemas de IA e arquitetos. Não é uma referência de schema — é uma referência de domínio. Quem precisar entender o schema real consulta `types/*.ts` e as migrations. Quem precisar entender o negócio consulta este arquivo.

---

## 2. Grandes Contextos do ParaguAI

O domínio do ParaguAI é dividido em contextos delimitados. Cada contexto tem responsabilidade própria, entidades próprias e ciclo de vida independente. A separação não é arbitrária — reflete como o negócio cria valor em diferentes dimensões.

### 2.1 Catálogo

**O quê**: o conhecimento canônico do que existe no mercado.

**Responsabilidade**: manter uma representação normalizada, deduplicada e verificada de produtos, marcas e categorias. O Catálogo é a fundação de tudo — sem ele, não há comparação, busca, recomendação ou histórico.

**Entidades**: `Product`, `Brand`, `Category`

**Quem alimenta**: Connector Platform (conectores automáticos e importação manual)

**Quem consome**: Marketplace (Offer), Busca, Compare, Merchant OS, SEO

**Princípio central**: um produto existe uma única vez no catálogo, independente de quantas lojas o vendem. Duplicação é um bug, não uma feature.

---

### 2.2 Marketplace

**O quê**: o estado operacional de preços e disponibilidade.

**Responsabilidade**: representar as ofertas reais de cada loja para cada produto, com preço, estoque, condições e validade. O Marketplace é onde o mercado acontece — o Catálogo diz o que existe; o Marketplace diz quanto custa, onde e se está disponível.

**Entidades**: `Offer`, `Store`

**Quem alimenta**: Connector Platform, Admin Platform

**Quem consome**: Compare Engine, Busca, Comprador, Price Engine

**Princípio central**: preço pertence à oferta, não ao produto. Regra permanente e inviolável (AI_CONSTITUTION.md, Seção VI, Regra #4).

---

### 2.3 Price Engine

**O quê**: o histórico de preços e a inteligência derivada dele.

**Responsabilidade**: registrar toda variação de preço de uma oferta, calcular mínimos, máximos e tendências, e tornar esse histórico disponível para compradores e para a IA. O Price Engine transforma um dado pontual (preço de hoje) em um ativo estratégico (histórico verificável).

**Entidades**: `PriceHistoryEntry`, `OfferPriceMetrics`

**Quem alimenta**: `updateOfferPrice()` — único caminho de escrita (ADR-017)

**Quem consome**: Compare Engine, futuramente alertas de preço e IA

**Princípio central**: todo preço anterior é histórico imutável. A tabela `price_history` só recebe INSERTs; nunca UPDATEs ou DELETEs.

---

### 2.4 Busca e Comparação

**O quê**: a inteligência de descoberta e decisão do comprador.

**Responsabilidade**: permitir que o comprador encontre o que procura (Busca) e compare as opções disponíveis com contexto histórico e score de qualidade (Compare). Não é um dump de dados — é curadoria inteligente de ofertas.

**Entidades**: `SearchResponse`, `CompareResult`, `RankedOffer`, `CompareSummary`

**Quem alimenta**: Catálogo, Marketplace, Price Engine

**Quem consome**: comprador, futuramente IA (padrões de busca como dado de treinamento)

**Princípio central**: resultado de busca e comparação reflete qualidade real (preço, disponibilidade, confiabilidade da loja, qualidade do catálogo) — nunca posição de pagamento.

---

### 2.5 Merchant OS

**O quê**: a camada operacional do lojista.

**Responsabilidade**: permitir que lojistas gerenciem seu catálogo, acompanhem seu desempenho, entendam sua posição no mercado e recebam recomendações de crescimento. O Merchant OS é o produto B2B do ParaguAI — a razão pela qual lojistas pagam.

**Entidades**: `Merchant`, `MerchantPlan`, `MerchantStore`, `MerchantAuditLog`, `MerchantRecommendation`, `MerchantAnalyticsEvent`

**Quem alimenta**: portal do lojista (`/merchant/*`), Connector Platform

**Quem consome**: lojista, Admin Platform

**Princípio central**: o sucesso do lojista e o crescimento do ParaguAI têm incentivos completamente alinhados. O Merchant OS é um ativo de retenção construído sobre valor entregue, não sobre lock-in.

---

### 2.6 Acquisition

**O quê**: o pipeline de entrada de dados.

**Responsabilidade**: buscar dados de fontes externas (arquivos JSON/CSV, conectores de loja, crawlers futuros), validar, normalizar, deduplicar e persistir no Catálogo. O Connector Platform é o mecanismo pelo qual o conhecimento externo se torna conhecimento interno.

**Entidades**: `ImportLog`, `PipelineMetrics` (in-memory), conectores e parsers (módulo standalone em `src/domains/connectors/`)

**Quem alimenta**: conectores externos (ShoppingChina, JSON, CSV)

**Quem consome**: Catálogo (Products, Brands, Categories), Marketplace (Offers)

**Princípio central**: dado só entra no banco depois de validado, normalizado e deduplicado. O banco armazena dado limpo, não dado bruto. (AI_CONSTITUTION.md, Seção VI)

---

### 2.7 Identidade e Acesso

**O quê**: autenticação, autorização e perfis de **staff e lojista** — não de comprador (ver §2.8, domínio próprio, deliberadamente separado).

**Responsabilidade**: identificar quem está operando o sistema (admin, operator, merchant), validar permissões e garantir que cada papel só acessa o que lhe cabe.

**Entidades**: `Profile` (tabela `profiles`, `role IN ('admin', 'operator', 'merchant')` — ADR-031 estendeu de admin/operator para incluir merchant na Release 1.2, reaproveitando a mesma sessão/auth em vez de duplicar infraestrutura), `auth.users` (Supabase Auth)

**Quem alimenta**: Supabase Auth (trigger `handle_new_user()`, cria `profiles` com `role='operator'` por padrão em todo signup) + processo de cadastro de merchant (atualiza para `role='merchant'`)

**Quem consome**: `requireAdmin()`, `requireMerchant()`, todas as API routes protegidas

**Princípio central**: credenciais privilegiadas (service role) nunca alcançam o browser. A separação de acesso é arquitetural, não configurável (ADR-028, ADR-030).

**Dívida conhecida (achada pela auditoria da ADR-046, não corrigida)**: `handle_new_user()` roda incondicionalmente em todo `INSERT` em `auth.users` — se um comprador se cadastrasse hoje, seria rotulado `'operator'` por engano. É precisamente por isso que o Buyer Domain (§2.8) nunca reaproveita `profiles`.

---

### 2.8 Comprador (Buyer Identity Model — ADR-045/046, Pré-Release 1.8)

**O quê**: identidade, comportamento e preferências do comprador — domínio próprio, deliberadamente desacoplado de `profiles` (§2.7, staff/merchant) e de `auth.users` (tratado como implementação de autenticação, nunca referenciado diretamente por fora do domínio).

**Responsabilidade**: aggregate root `buyers` (identificador canônico `buyers.id`, estável para sempre — sobrevive até à anonimização por LGPD), registrar intenção de compra, favoritos, alertas e consentimento, com ciclo de vida de 6 estados (Visitante Anônimo → Anonymous Session → Buyer Conhecido [não verificado/verificado] → Buyer Autenticado → Buyer Recorrente [rótulo derivado] → Buyer Premium [futuro]) mais um estado terminal de Anonimização. Detalhamento completo, incluindo por que `profiles`/`auth.users` foram descartados como identidade canônica: `docs/product/releases/RELEASE_1_8_BUYER_IDENTITY_MODEL.md`.

**Entidades**: `Favorite` (localStorage hoje — Wave 6 do Release 1.8 migra para `buyer_favorites` server-side); `buyers`/`buyer_consent_log` (schema definido em ADR-045, ainda não criado — arquitetura apenas); futuramente `Review`, `Alert`, `Wishlist`, todos ancorados em `buyers.id`.

**Dívida conhecida (achada pela auditoria da ADR-046, não corrigida)**: `buyer_events`/`buyer_sessions.buyer_id` (Release 1.6, ver §2.10/Analytics) já referenciam `auth.users(id)` diretamente — um acoplamento entre identidade de domínio e mecanismo de autenticação que a Wave 6 do Release 1.8 corrige, migrando o alvo da FK para `buyers.id`.

**Status**: Release 1.5+ — estrutura de dados e ciclo de vida completo definidos (ADR-045/046); persistência em banco e código pendentes para a Wave 6 do Release 1.8.

---

### 2.9 Administração

**O quê**: operações internas da plataforma.

**Responsabilidade**: permitir que admins e operadores gerenciem o catálogo, monitorem importações, auditem dados e resolvam problemas de qualidade. É o backoffice do ParaguAI.

**Entidades**: `Profile` (role admin/operator), `ImportLog`, `QualityReport`, `QualityIssue`

**Quem acessa**: somente usuários com `profiles.role IN ('admin', 'operator')`

---

### 2.10 Inteligência Artificial (Preparação)

**O quê**: a camada de inteligência que transforma dados em decisões.

**Responsabilidade futura**: personalizar busca, gerar recomendações, detectar anomalias de preço, responder perguntas de compradores com contexto local. Hoje: infraestrutura de dados está sendo construída; `ai/` está vazio; `services/ai.service.ts` é um placeholder.

**Entidades futuras**: `ai_embeddings`, `search_logs`, vetores de produto/loja

**Status**: Release 2.0+ — dados sendo acumulados agora para alimentar modelos futuros.

---

### 2.11 Turismo (Reserva Estratégica)

**O quê**: a vertical de planejamento de viagens comerciais.

**Responsabilidade futura**: roteiros de compra, reservas de loja, informações de fluxo turístico por período. O turista tem perfil de intenção de compra diferente do comprador recorrente — planeja com antecedência, compara mais, tem orçamento definido.

**Status**: não implementado. Nenhuma entidade de domínio existe ainda. Reservado como contexto futuro porque a Tríplice Fronteira tem características turísticas estruturais que diferem de outros mercados.

---

## 3. Entidades

### 3.1 Product

**Propósito**: representar um produto físico único, independente de onde é vendido ou a que preço.

**Responsabilidade**: ser a entidade canônica de referência do catálogo. Tudo que é único de um produto — nome, especificações, imagem, marca, categoria — pertence ao `Product`. O que varia por loja — preço, estoque, condições — pertence à `Offer`.

**Quem pode criar**: Connector Platform (via `CatalogWriter`), Admin Platform.

**Quem pode modificar**: Admin Platform, Connector Platform (via deduplicação e normalização).

**Quem depende**: `Offer` (FK obrigatório), Busca, Compare, SEO (página `/product/[slug]`).

**Relacionamentos**:
- Pertence a uma `Brand` (N:1)
- Pertence a uma `Category` (N:1)
- Tem N `Offer`s — uma por loja que o vende

**Ciclo de vida**:
- *Nasce*: no Connector Platform, após validação e normalização
- *Evolui*: especificações, imagem e descrição atualizam via importação ou admin
- *Matura*: quando tem imagem real, especificações completas, marca e categoria confirmadas
- *Arquivado*: campo `active` (existe no banco, ainda não exposto no tipo) — produto desativado mas não deletado

**Invariantes**:
- `slug` é único no sistema (UNIQUE constraint — ADR-023)
- Nunca tem `price_*` em nenhuma coluna — violação da regra mais importante do domínio
- `brand_id` e `category_id` são FKs obrigatórios

---

### 3.2 Store

**Propósito**: representar uma empresa comercial cadastrada na plataforma.

**Responsabilidade**: ser a identidade pública de um lojista no catálogo. A `Store` é o que o comprador vê — nome, localização, contato, horário, reputação. É diferente de `Merchant`, que é quem *opera* a loja na plataforma.

**Quem pode criar**: Admin Platform, processo de onboarding de merchant, Discovery (`src/domains/connectors/discovery/`, Release 1.7 — Wave 2 — via sitemap/robots.txt público, nunca scraping agressivo).

**Quem pode modificar**: Merchant OS (dados operacionais), Admin Platform (verificação, rating).

**Quem depende**: `Offer` (FK obrigatório), `MerchantStore` (junction), Busca, Compare, `/store/[slug]`, `/lojas`.

**Relacionamentos**:
- Tem N `Offer`s — um produto pode ser vendido por ela com preço e estoque próprios
- Vinculada a Merchants via `MerchantStore` (M:N)
- Ranqueada publicamente em `/lojas` via `Merchant Score` do merchant associado

**Ciclo de vida**:
- *Nasce*: cadastrada pelo admin, durante onboarding do merchant, ou descoberta automaticamente (Discovery)
- *Evolui*: `slug` populado, dados de contato completados, `is_verified` atualizado
- *Matura*: verificação concedida (`is_verified = true`), merchant vinculado, ofertas ativas
- *Suspensa*: `active = false` — loja oculta do catálogo público, dados preservados

**Invariantes**:
- `slug` é único (UNIQUE constraint)
- `rating` é um número direto na tabela (não calculado de reviews — tabela `reviews` não existe ainda; ADR-038)
- **"Não reivindicada" não é um campo — é a ausência de uma linha em `merchant_stores`.** `stores` nunca ganhou (e não deve ganhar) uma coluna de ownership direta (`owner_user_id` ou equivalente) — isso duplicaria o modelo M:N já estabelecido por `MerchantStore`. Release 1.7 — Wave 2 adicionou apenas colunas de **proveniência** (migration `0023`): `discovered_at timestamptz`, `discovery_connector_key text` (ambas `NULL` para lojas criadas pelo admin/onboarding; preenchidas apenas quando a linha nasce via Discovery). A reivindicação em si (criar a linha em `merchant_stores`) é escopo da Wave 4 (Merchant Claim).

---

### 3.3 Offer

**Propósito**: representar a relação produto-loja com todas as condições comerciais de um momento específico.

**Responsabilidade**: ser o único lugar onde preço vive. Uma `Offer` é a resposta para: "quanto a loja X está cobrando pelo produto Y, com quais condições, com que disponibilidade?". É a entidade mais operacional do domínio.

**Quem pode criar**: Connector Platform, Admin Platform.

**Quem pode modificar**: `updateOfferPrice()` para preço (único caminho — ADR-017); Admin Platform para demais campos.

**Quem depende**: `PriceHistoryEntry` (registra cada mudança de preço), Compare Engine, Busca, página `/product/[slug]`, dashboard do Merchant.

**Relacionamentos**:
- Pertence a um `Product` (N:1 — FK obrigatório)
- Pertence a uma `Store` (N:1 — FK obrigatório)
- Tem N `PriceHistoryEntry`s — uma por mudança de preço

**Ciclo de vida**:
- *Nasce*: criada pelo Connector Platform com preço inicial
- *Evolui*: `updateOfferPrice()` atualiza `price_usd`/`price_brl` e registra automaticamente uma linha em `price_history`
- *Esgotada*: `in_stock = false` — oferta permanece visível, marcada "Sem estoque", histórico intacto
- *Arquivada*: `available = false` — oferta desativada, histórico de preço preservado indefinidamente

**Invariantes**:
- `price_usd` e `price_brl` são valores independentes — nunca um derivado do outro por taxa de conversão fixa (ADR-009)
- Toda alteração de `price_usd`/`price_brl` passa obrigatoriamente por `updateOfferPrice()` (ADR-017)
- `in_stock` é a fonte da UI para disponibilidade — não `available` nem `stock_quantity` isolados

---

### 3.4 Brand

**Propósito**: representar um fabricante ou marca comercial.

**Responsabilidade**: ser a entidade de referência para agrupamento de produtos por fabricante. Permite que compradores filtrem por marca e que a plataforma agrupe concorrentes. Dados simples e estáveis — raramente muda após criação.

**Quem pode criar**: Connector Platform (via normalização de nome de marca), Admin Platform.

**Quem depende**: `Product` (FK N:1), Busca, filtros de catálogo.

**Invariantes**:
- `slug` é único (UNIQUE constraint)
- Uma `Brand` nunca tem preço, estoque ou oferta — só produtos a referenciam

---

### 3.5 Category

**Propósito**: classificar produtos em grupos semânticos que fazem sentido para compradores.

**Responsabilidade**: organizar o catálogo em hierarquia navegável. A Category alimenta filtros, seções da home, SEO e futuramente análises de demanda por segmento.

**Quem pode criar**: Admin Platform (curadoria manual), Connector Platform.

**Quem depende**: `Product` (FK N:1), Busca, filtros de `/products`, seção de categorias da Home.

**Invariantes**:
- `slug` é único
- `icon` é string livre (hoje usada como emoji) — sem constraint de formato

---

### 3.6 PriceHistoryEntry

**Propósito**: ser o registro imutável de toda variação de preço de uma oferta.

**Responsabilidade**: criar o histórico que transforma dados pontuais em conhecimento temporal. Uma série com 18 meses de entradas responde: qual foi o preço mais baixo? O preço está subindo ou caindo? Esse desconto de hoje é real ou artificial?

**Quem pode criar**: `updateOfferPrice()` exclusivamente — qualquer outro caminho viola a integridade do histórico.

**Quem depende**: `getOfferPriceMetrics()` (calcula mínimos, máximos e variação), Compare Engine, futuramente alertas e IA.

**Relacionamentos**:
- Pertence a uma `Offer` (N:1, `ON DELETE CASCADE`)
- Nunca pertence a um `Product` diretamente

**Ciclo de vida**:
- *Nasce*: quando `updateOfferPrice()` detecta diferença entre preço novo e preço atual
- *Permanece*: para sempre — nenhum processo deleta linhas de `price_history`
- *Compõe*: quanto mais entradas acumula, mais precisa fica a inteligência de preço derivada

**Invariantes**:
- INSERT-only: sem UPDATE, sem DELETE
- `source` identifica a origem da mudança (`seed`, `manual`, `admin`, `crawler`) — rastreabilidade obrigatória
- `old_price_usd` registra o preço anterior — o "antes" é tão importante quanto o "depois"

---

### 3.7 Merchant

**Propósito**: representar a empresa lojista como entidade operacional da plataforma.

**Responsabilidade**: ser o ponto de controle de todas as operações B2B — plano, score, verificação, onboarding, recomendações e analytics. O `Merchant` é diferente da `Store` — a `Store` é o que o comprador vê; o `Merchant` é quem opera o portal.

**Quem pode criar**: processo de cadastro via `/merchant/register`.

**Quem pode modificar**: o próprio merchant (via `/merchant/settings`), Admin Platform.

**Quem depende**: `MerchantStore`, `MerchantAuditLog`, `MerchantRecommendation`, `MerchantAnalyticsEvent`, `Merchant Score`, `MerchantLevel`, `NextStep`.

**Relacionamentos**:
- Vinculado a um `Profile` via `user_id` (1:1 com `auth.users`)
- Vinculado a um `MerchantPlan` via `plan` (N:1)
- Vinculado a N `Store`s via `MerchantStore` (M:N)

**Ciclo de vida**:
- *Nasce*: cadastro com dados mínimos; `status = 'draft'`
- *Onboarding*: preenche perfil, vincula loja, faz primeira importação; `onboarding_step` avança
- *Ativo*: `status = 'active'`, catálogo no ar, `merchant_score` calculado a cada load do dashboard
- *Verificado*: `verified_level` evolui de `'none'` para `'verified'` / `'premium'` / `'official'`
- *Suspenso/Bloqueado*: `status = 'suspended'` ou `'blocked'` — portal inacessível, catálogo oculto

**Invariantes**:
- `merchant_score` varia 0–100 e é calculado on-demand por `computeMerchantScore()` (ADR-034)
- `trust_score` é calculado por `computeTrustScore()` — ambos persistidos em `merchants` após cálculo
- `user_id` é imutável após criação — o merchant é vinculado a um usuário de autenticação permanentemente

---

### 3.8 MerchantPlan

**Propósito**: definir os limites operacionais e features disponíveis para cada merchant.

**Responsabilidade**: determinar quantos produtos, lojas e importações o merchant pode ter, e quais features avançadas (analytics, conectores, suporte) estão disponíveis. O plano é um acordo comercial que determina capacidade, não um conjunto de permissões técnicas.

**Entidade**: tabela `merchant_plans` — seed de 4 planos: `free`, `pro`, `business`, `enterprise`.

**Invariantes**:
- Planos são definidos por seed, não por configuração de usuário
- Não há gateway de pagamento implementado — upgrade é manual por ora (ADR-035)
- O plano gratuito sempre oferece valor real (AI_CONSTITUTION.md, Seção XIII)

---

### 3.9 MerchantStore (junction)

**Propósito**: vincular merchants a stores com flexibilidade M:N.

**Responsabilidade**: permitir que um merchant gerencie múltiplas lojas e que, futuramente, uma loja possa ser transferida entre merchants sem alterar dados de loja ou catálogo. `is_primary` identifica a loja principal quando um merchant tem múltiplas.

**Invariantes**:
- UNIQUE `(merchant_id, store_id)` — sem duplicação de vínculo
- Um store pode ter no máximo um merchant principal (`is_primary = true`)

---

### 3.10 MerchantAuditLog

**Propósito**: criar trilha de auditoria imutável das ações do merchant.

**Responsabilidade**: registrar toda ação relevante — login, importação, mudança de plano, vinculação de loja — com contexto suficiente para auditoria e diagnóstico. Write-only nesta fase.

**Invariantes**:
- INSERT-only — nunca deletar logs de auditoria
- `event_type` é um enum fechado definido em `AuditEventType` (`types/merchant.ts`)

---

### 3.11 MerchantRecommendation

**Propósito**: comunicar ao merchant ações concretas que melhoram seu desempenho.

**Responsabilidade**: transformar métricas de dados (produtos sem imagem, catálogo desatualizado, preços ausentes) em ações priorizadas com prioridade `critical`, `warning` ou `info`. Geradas por `generateRecommendations()` com base em `MerchantDashboardStats`.

**Ciclo de vida**: gerada on-demand → exibida no dashboard → marcada como lida (`read_at`) → substituída na próxima geração se o problema persistir.

---

### 3.12 ImportLog — **SUPERADA (Release 1.7 — Wave 2)**

**Propósito histórico**: registrar o resultado de cada execução do Connector Platform.

**Status atual**: nenhum código escreve ou lê mais a tabela `import_logs` diretamente. `SyncOrchestrator` grava toda execução em `connector_sync_runs` (viva desde o Epic 1, migration `0022`); `app/admin/logs/page.tsx` e `app/merchant/imports/page.tsx` foram repontados para `connector_sync_runs` via `lib/sync-run-mapper.ts::toImportLogShape()`, que traduz a nova linha para o formato `ImportLog` que essas páginas já esperavam — zero mudança de UI. A tabela `import_logs` não foi removida (sem ferramenta de DDL neste projeto), apenas marcada como superada (mesmo padrão de `connector_configs`, migration 0010).

**Quem consulta hoje**: Admin Dashboard (`/admin/logs`), Merchant Dashboard (`/merchant/imports`), Ecosystem Monitor (`/admin/monitor`) — todos via `connector_sync_runs`.

**Invariantes (agora de `connector_sync_runs`)**:
- `status` é um `CHECK` (`running|success|partial|failed`), não um booleano `success`
- `totals`/`errors` JSONB contêm o `PipelineMetrics`/lista de erros completos
- `merchant_id` é opcional — `NULL` para runs administrativos/globais e para runs de cron sem merchant resolvido

**Release 1.7 — Epic 1**: `import_logs` recebe escrita dupla temporária ao lado de duas novas tabelas — `connectors` (registro persistente de conectores, substitui o `ConnectorRegistry` apenas-em-memória) e `connector_sync_runs` (execução de sincronização, com `merchant_id` opcional para runs administrativos, status `running`/`success`/`partial`/`failed`). `connector_sync_runs` é a fonte de verdade a partir do Epic 2, quando a escrita dupla em `import_logs` é removida.

---

### 3.13 Profile

**Propósito**: estender `auth.users` com o papel do usuário no sistema — **staff e merchant, nunca comprador** (ADR-046 tornou essa exclusão explícita e definitiva, depois de confirmar que `profiles` já era compartilhada por decisão deliberada da ADR-031).

**Responsabilidade**: ser a fonte de verdade sobre quem pode fazer o quê na plataforma. Um `Profile` vincula um usuário de autenticação a um role que determina acesso.

**Invariantes**:
- `role IN ('admin', 'operator', 'merchant')` — enum fechado com CHECK constraint (ADR-031)
- `id` é FK para `auth.users.id` — 1:1
- `requireAdmin()` verifica `role IN ('admin', 'operator')` antes de retornar service client
- `requireMerchant()` verifica `role = 'merchant'` antes de retornar service client
- **Nunca ganha um quarto valor `'buyer'`** — decisão permanente da ADR-046; Buyer tem aggregate root próprio (`buyers`, §2.8), justamente para não repetir, pela segunda vez, o acoplamento de identidade que motivou originalmente esta tabela ser estendida uma vez (ADR-031)

---

### 3.14 Favorite (estado atual)

**Propósito**: permitir que o comprador salve produtos de interesse.

**Status atual**: implementado em `localStorage` via `useFavorites.ts`. A tabela `favorites` existe no Supabase mas não é usada pelo código (órfã — nunca teve um `buyer_id` real para associar). `types/favorite.ts` existe como representação achatada para localStorage.

**Status futuro**: Wave 6 do Release 1.8 — persistência em `buyer_favorites`, ancorada em `buyers.id` (ADR-045/046, `RELEASE_1_8_BUYER_IDENTITY_MODEL.md`), sincronização entre dispositivos, base para alertas de preço. Favoritos continuam funcionando 100% anônimos (localStorage) sem exigir login — a persistência server-side é um upgrade opcional, não um requisito.

---

## 4. Relacionamentos de Negócio

Os relacionamentos do domínio não são apenas FKs — são vínculos de significado de negócio.

### 4.1 Produto → Oferta (1:N)

**Significado**: um produto existe uma vez no catálogo; pode ter múltiplas ofertas de lojas diferentes. Cada oferta é uma instância de "onde esse produto pode ser comprado, a que preço, com quais condições".

**Regra de negócio**: nenhuma informação comercial (preço, estoque, URL de compra) vive no produto. Tudo isso vive na oferta.

### 4.2 Loja → Oferta (1:N)

**Significado**: uma loja oferece N produtos. A oferta é o ponto de encontro entre o catálogo (produto) e o mercado (loja).

**Regra de negócio**: uma loja sem ofertas existe no catálogo mas não aparece em comparações. Uma oferta sem loja é inválida — FK obrigatório.

### 4.3 Oferta → PriceHistory (1:N)

**Significado**: cada oferta tem uma linha do tempo de preços. A história de preços de uma oferta transforma um número pontual (preço de hoje) em inteligência (tendência, mínimo histórico, oportunidade real vs. artificial).

**Regra de negócio**: `price_history` nunca perde entradas. O preço mais antigo é tão valioso quanto o mais recente — o primeiro dá o contexto de toda a série.

### 4.4 Merchant → Store (M:N via MerchantStore)

**Significado**: um merchant (empresa lojista) pode operar múltiplas lojas físicas ou online. Uma loja pode, futuramente, ser transferida para outro merchant sem perda de histórico ou dados de catálogo.

**Regra de negócio**: a loja é a identidade pública; o merchant é a identidade operacional. Um comprador nunca interage diretamente com `Merchant` — interage com `Store`.

### 4.5 Merchant → MerchantPlan (N:1)

**Significado**: o plano do merchant define sua capacidade operacional. Mudar de plano muda o que pode fazer, não quem é.

**Regra de negócio**: `plan` é uma FK para `merchant_plans` — não um enum hardcoded no código. Isso permite que planos evoluam sem redeploy.

### 4.6 Produto → Marca e Categoria (N:1 cada)

**Significado**: todo produto pertence a uma marca (quem fabricou) e a uma categoria (o que é). Esses vínculos organizam o catálogo para filtros, SEO e análise de demanda por segmento.

**Regra de negócio**: `brand_id` e `category_id` são obrigatórios. Produto sem marca ou categoria é produto incompletamente classificado — reduz descobribilidade e impossibilita análise de demanda por segmento.

### 4.7 Profile → Merchant (1:1)

**Significado**: um merchant é operado por um único usuário de autenticação. O profile é a porta de entrada para o Merchant OS.

**Regra de negócio**: `user_id` em `merchants` é imutável. A identidade de autenticação não muda — o perfil do merchant pode evoluir, mas não trocar de dono.

---

## 5. Ciclos de Vida

### 5.1 Produto

```
[Fonte Externa]
      │  dados brutos (JSON, CSV, conector)
      ▼
[Connector Platform]
  Validation → Normalization → Deduplication
      │
      ▼ (produto novo detectado)
[CatalogWriter]
  INSERT em brands → categories → products
      │
      ▼
[Catálogo Ativo]
  image_url preenchida, specifications completas
      │
      ▼ (quando uma loja o vende)
[Offer criada]
  produto agora tem preço via oferta
      │
      ▼
[Pesquisável e Comparável]
  aparece em /products, /search, /compare/[slug]
      │
      ▼ (descontinuação)
[active = false]
  produto oculto do catálogo público
  dados e histórico preservados
```

### 5.2 Oferta e Preço

```
[Connector Platform / Admin]
  INSERT em offers com price_usd inicial
      │
      ▼
[Oferta Ativa]
  in_stock = true, preço visível, historicizado
      │
      ▼ (mudança de preço detectada)
[updateOfferPrice()]
  1. lê preço atual
  2. INSERT em price_history (old_price, new_price, source)
  3. UPDATE em offers.price_usd / price_brl
      │
      ▼ (esgotamento)
[in_stock = false]
  oferta permanece visível, marcada "Sem estoque"
  histórico de preço intacto
      │
      ▼ (descontinuação)
[available = false]
  oferta arquivada
  histórico de preço preservado indefinidamente
```

### 5.3 Merchant

```
[Cadastro]
  auth.users → profiles (role='merchant') → merchants (status='draft')
      │
      ▼
[Onboarding]
  company_name, contact_phone, store vinculada
  onboarding_step avança até onboarding_done = true
      │
      ▼
[Primeira Importação]
  SyncOrchestrator → products/offers entram no catálogo
  merchant_score calculado e persistido
      │
      ▼
[Operação Contínua]
  sync periódico → catálogo atualizado
  recomendações geradas on-demand
  goals alcançadas → MerchantLevel evolui
  (iniciante → bronze → prata → ouro → diamante → elite)
      │
      ▼ (verificação)
[verified_level = 'verified']
  badge visível em /lojas/[slug]
  destaque no ranking público
      │
      ▼ (problema)
[status = 'suspended' / 'blocked']
  acesso ao portal negado
  catálogo oculto do público
  dados preservados para reativação
```

### 5.4 Entrada de Conhecimento (PriceHistory)

```
[Preço inicial]
  (registrado apenas em offers — sem entrada em price_history)
      │
      ▼ (primeira mudança de preço)
[updateOfferPrice() detecta diferença]
  INSERT: offer_id, price_usd (novo), old_price_usd (anterior), source
      │
      ▼ (acumula ao longo do tempo)
[Série temporal cresce]
  getOfferPriceMetrics() calcula:
    - lowestPriceUSD:       mínimo de toda a série (incluindo old_price_usd do primeiro registro)
    - highestPriceUSD:      máximo da série
    - priceChangePercent:   variação desde o primeiro preço registrado
    - lastPriceChangeAt:    timestamp da última mudança
      │
      ▼ (nunca acontece)
[Deleção]
  Não existe. Histórico é permanente.
```

---

## 6. Agregados

Um agregado é um conjunto de entidades tratadas como unidade de consistência. A raiz do agregado é a única entidade que o mundo externo referencia diretamente.

### 6.1 Agregado Catálogo

**Raiz**: `Product`  
**Referências externas**: `Brand`, `Category` (existem de forma independente, referenciadas por FK)  
**Fronteira de consistência**: um produto é criado somente quando brand e category já existem. A FK garante que não há produto sem classificação.  
**Regra de acesso**: o mundo externo referencia `Product` pelo `slug`. Nunca acessa `Brand` ou `Category` diretamente para decidir sobre um produto específico.

### 6.2 Agregado Oferta

**Raiz**: `Offer`  
**Membros**: `PriceHistoryEntry[]` (pertence exclusivamente à oferta — `ON DELETE CASCADE`)  
**Fronteira de consistência**: toda mutação de preço acontece via `updateOfferPrice()`. Nenhum consumidor escreve diretamente em `offers.price_usd` ou em `price_history`.  
**Referências externas**: `Store` e `Product` são referenciadas, mas não controladas pela oferta.

### 6.3 Agregado Merchant

**Raiz**: `Merchant`  
**Membros**: `MerchantStore[]`, `MerchantAuditLog[]`, `MerchantRecommendation[]`, `MerchantAnalyticsEvent[]`  
**Fronteira de consistência**: nenhuma entidade membro é criada sem passar pelo contexto do merchant correspondente. Score, level, goals e next step são sempre calculados em relação ao merchant raiz.  
**Referências externas**: `Store` vinculada via `MerchantStore` — o merchant gerencia o vínculo, não os dados da store.

### 6.4 Agregado Identidade

**Raiz**: `auth.users` (Supabase Auth)  
**Membros**: `Profile` (extensão com role), `Merchant` (se role = 'merchant')  
**Fronteira de consistência**: `profiles.id = auth.users.id` — o profile não existe sem o usuário de auth. O merchant não existe sem o profile de role 'merchant'.

### 6.5 Agregado Importação

**Raiz**: `ImportLog`  
**Membros**: `PipelineMetrics` (in-memory durante execução, persistido como JSONB em `metrics`)  
**Fronteira de consistência**: cada execução do pipeline produz exatamente um `ImportLog`. O log só é criado ao final — nunca durante execução parcial.

---

## 7. Invariantes

Regras permanentes que, se violadas, corrompem o conhecimento do domínio. Nenhuma tem exceção válida — quando uma exceção parece necessária, o invariante deve ser revisado formalmente, nunca contornado silenciosamente.

| # | Invariante | Entidade | Onde é garantido |
|---|---|---|---|
| I-01 | `slug` é único por tipo de entidade | Product, Store, Brand, Category | UNIQUE constraint (ADR-023) |
| I-02 | Preço pertence à oferta, nunca ao produto | Offer, Product | Ausência de colunas price_* em products |
| I-03 | Toda mudança de preço passa por `updateOfferPrice()` | Offer, PriceHistory | Caminho único de escrita (ADR-017) |
| I-04 | `price_history` é insert-only | PriceHistoryEntry | Sem UPDATE/DELETE na tabela |
| I-05 | `price_usd` e `price_brl` são independentes | Offer | Sem conversão por taxa fixa (ADR-009) |
| I-06 | Uma oferta pertence a exatamente um produto e uma loja | Offer | FKs NOT NULL obrigatórias |
| I-07 | Credenciais de serviço nunca alcançam o browser | Todos | SUPABASE_SERVICE_ROLE_KEY sem prefixo NEXT_PUBLIC_ |
| I-08 | `profiles.role IN ('admin', 'operator', 'merchant')` | Profile | CHECK constraint no banco (ADR-031) |
| I-09 | `merchant_score` é calculado, nunca editado manualmente | Merchant | Computed by `computeMerchantScore()` — ADR-034 |
| I-10 | Dados históricos não são deletados | PriceHistory, AuditLog | Sem lógica de deleção nesses registros |
| I-11 | Dado entra no banco apenas após validação e normalização | Product, Offer | SyncOrchestrator: Validation → Normalization → CatalogWriter |
| I-12 | Types TypeScript espelham o schema real do banco | Todos os types | Corrigido na Sprint 3.5 (ADR-009); divergência tipo↔banco é bug silencioso |
| I-13 | O banco é a fonte de verdade | Todos | Qualquer divergência tipo↔banco é corrigida a favor do banco |
| I-14 | Services retornam `[]` ou `null` em erro; nunca lançam exceção | Todos os services | Convenção `try/catch → return []` em todo service |

---

## 8. Fluxo do Conhecimento

Como um dado percorre o domínio do ParaguAI — da fonte bruta à inteligência entregue ao comprador.

```
[FONTE EXTERNA]
  Arquivo JSON/CSV do lojista, conector de loja (ShoppingChina), crawler futuro
              │
              ▼
[ACQUISITION ENGINE]  (src/domains/connectors/ — módulo standalone, não importado pela app Next.js)
  Connector.fetch()    → RawOffer[] (offer-first: produto embutido na oferta — ADR-026)
  ValidationEngine     → rejeita dados inválidos (campos obrigatórios, tipos, ranges)
  NormalizationEngine  → padroniza nomes, preços, slugs, categorias
  DeduplicationEngine  → detecta produto/oferta já existentes pelo slug
  MediaPipeline        → baixa e converte imagens para WebP (via sharp)
  CatalogWriter        → persiste: brands → categories → products → offers
  ImportLog            → registra métricas do run (total_raw, total_persisted, errors)
              │
              ▼
[CATÁLOGO + MARKETPLACE]
  Products com brand, category, image normalizada
  Offers com price_usd, price_brl, in_stock, store vinculada
              │
              ▼
[PRICE ENGINE]
  updateOfferPrice()      → detecta diferença → INSERT em price_history + UPDATE em offers
  getOfferPriceMetrics()  → lowestPriceUSD, highestPriceUSD, priceChangePercent
              │
              ▼
[BUSCA E COMPARAÇÃO]
  searchEverything()               → produtos, lojas, marcas, categorias (ilike, 8 por seção)
  getProductComparisonBySlug()     → 3 queries batch → RankedOffer[] com score composto (ADR-020)
  Ranking (ADR-014):
    preço (50%) + disponibilidade (25%) + confiabilidade da loja (15%) + qualidade do cadastro (10%)
              │
              ▼
[COMPRADOR]
  Descobre produtos → compara ofertas → verifica histórico de preço → decide
  Salva favoritos (localStorage hoje; banco em Release 1.5)
              │
              ▼
[ANALYTICS]  (em formação)
  Buscas sem resultado           → sinal de gap de catálogo
  Buscas com resultado sem clique → sinal de gap de relevância ou apresentação
  MerchantAnalyticsEvents        → comportamento do lojista (write-only, ADR-039)
              │
              ▼
[INTELIGÊNCIA — ParaguAI Brain]  (Release 2.0+)
  ai_embeddings    → busca semântica contextual
  Padrões de busca → recomendações personalizadas
  Histórico preços → alertas de oportunidade e predição de tendência
  Dados de turismo → planejamento de roteiros de compra
```

---

## 9. Crescimento

Como o domínio suporta expansão sem exigir reestruturação de entidades.

### 9.1 Novos países e cidades

`Store.city` e `Store.country` são campos livres — sem enum hardcoded. Adicionar lojas de Assunção, Foz do Iguaçu ou Buenos Aires não exige alteração de schema ou tipo. O domínio suporta expansão geográfica por design desde o início.

### 9.2 Novos conectores de dados

O Connector Platform tem um `ConnectorRegistry` — qualquer novo conector implementa a interface `Connector` e é registrado sem alterar o pipeline. A validação, normalização e persistência são compartilhadas. O custo marginal de um novo conector é apenas a lógica de parsing da fonte específica.

### 9.3 Novos canais de venda

O modelo `Offer → Store` é agnóstico de canal. Uma oferta de loja física, de e-commerce paraguaio, de marketplace integrado ou de WhatsApp Business usa o mesmo schema. O canal pode ser metadado da store, não uma entidade separada.

### 9.4 Novos módulos de inteligência

`SearchResponse`, `CompareResult`, `RankedOffer` e `OfferPriceMetrics` são contratos estáveis. A camada de IA que consumir esses dados (embeddings, alertas, recomendações) pode ser adicionada sem alterar os contratos — apenas consumindo dados já existentes.

### 9.5 Novos papéis de usuário

`profiles.role` é um CHECK constraint com enum extensível via migration. Adicionar `'partner'` ou outro role é uma migration de uma linha. O padrão de autenticação (`requireAdmin()`, `requireMerchant()`) é replicável para qualquer novo role.

### 9.6 Turismo como contexto

O Merchant OS já produz dados de interesse turístico como efeito colateral: categorias com maior volume de ofertas, sazonalidade de preços, stores verificadas por cidade. Quando o contexto de Turismo for construído, consumirá esses dados sem precisar criá-los — o domínio já os produz.

### 9.7 Marketplace transacional (longo prazo)

A arquitetura de `Offer` com `product_url` por loja já tem o ponto de handoff para transação. Adicionar mediação de pagamento é um módulo novo que referencia `Offer` — não exige restrução do modelo existente.

---

## 10. Anti-Patterns

O que evitar para preservar a integridade do modelo de domínio.

| Anti-Pattern | Por que é um problema | Alternativa correta |
|---|---|---|
| Adicionar `price_*` ao `Product` | Rompe o invariante mais fundamental; torna comparação entre lojas estruturalmente impossível | Preço sempre em `Offer` |
| Atualizar `price_usd` diretamente por UPDATE fora de `updateOfferPrice()` | Bypassa o Price Engine; histórico fica incompleto silenciosamente | Sempre via `updateOfferPrice()` |
| Deletar linhas de `price_history` | Destrói o ativo histórico; mínimo/máximo calculado fica incorreto | Nunca deletar — dados históricos são permanentes |
| Copiar lógica de score entre módulos | Cria divergência silenciosa; score do dashboard difere do score do ranking | Um dono por lógica: `merchant.service.ts` |
| Usar `profiles` para dados de comprador | `profiles` é para operadores; misturar cria ambiguidade de role e permissão | Tabela `users` separada (Release 1.5+) |
| Criar entidade navegável sem `slug` único | Impede URLs canônicas, dificulta deduplicação, cria ambiguidade em buscas | Todo entity navegável tem slug com UNIQUE constraint |
| Ler `price_history` para calcular "preço atual" | O preço atual vive em `offers.price_usd`, não no último registro histórico | Combinar `offers` (preço atual) + `price_history` (tendência) |
| Importar `lib/supabase/service.ts` em Client Components | Expõe credenciais privilegiadas ao browser | Usar apenas em Server Components e Route Handlers |
| Entidade sem responsabilidade clara | Entidades que "guardam tudo" crescem sem limite e acoplam contextos distintos | Um contexto, uma responsabilidade |
| Relacionamento implícito (sem FK) | Cria dados órfãos silenciosamente; validator não detecta inconsistência | FK com `ON DELETE CASCADE` ou `RESTRICT` conforme necessidade |
| Services que lançam exceção | Quebra a cadeia de render de Server Components por um dado ausente | Services retornam `[]` ou `null` em erro — convenção do projeto |

---

## 11. Futuras Extensões

Extensões previstas com evidência no código ou nos ADRs. Não são funcionalidades inventadas — são implicações diretas do modelo atual.

### 11.1 Sistema de Reviews (Release 1.5 — ADR-038)

**Tabela planejada**: `reviews`  
**Função**: avaliações verificadas de compradores sobre lojas e produtos  
**Impacto no domínio**: `store.rating` hoje é campo manual; será derivado de `reviews` após implementação  
**Dependências**: requer `users` (compradores autenticados), tabelas `stores` e `products`

### 11.2 Sistema de Alertas de Preço

**Tabela planejada**: `alerts`  
**Função**: notificar compradores quando produto atinge preço-alvo  
**Dependências**: `price_history` (fonte do gatilho está pronta), usuário autenticado  
**Pré-requisito**: Price Engine já em produção — fundação pronta (ADR-018)

### 11.3 Search Logs

**Tabela planejada**: `search_logs`  
**Função**: registrar buscas — o que foi buscado, o que foi encontrado, o que não foi  
**Valor**: gap de catálogo detectado automaticamente; padrões de intenção de compra para IA  
**Impacto**: busca sem resultado torna-se sinal de produto a adicionar, não silêncio

### 11.4 AI Embeddings (Release 2.0+)

**Tabela planejada**: `ai_embeddings`  
**Função**: vetores de produto/loja para busca semântica  
**Dependência crítica**: catálogo normalizado com qualidade de dado alta — fundação sendo construída agora  
**Habilitará**: "me mostra um celular bom para foto por menos de USD 300" retorna resultado relevante

### 11.5 Tabela `users` (Compradores Autenticados)

**Distinção com `profiles`**: `profiles` é para operadores da plataforma. `users` representará o comprador registrado  
**Habilitará**: favoritos persistidos, histórico de compras, personalização real, alertas de preço  
**Pré-requisito**: fluxo de autenticação para compradores (não existe hoje)

### 11.6 Import Jobs

**Tabela planejada**: `import_jobs` (prevista em `docs/database/DATABASE.md`)  
**Função**: rastrear jobs de importação assíncronos — estado (pending, running, done, failed), progresso, retry  
**Diferença de `import_logs`**: log registra resultado de execução completa; job rastreia execução em andamento  
**Necessidade**: quando imports demorarem mais que um request HTTP síncrono pode tolerar

### 11.7 View Materializada de Preço por Produto

**Migration proposta**: `0003_proposed_product_catalog_price_view.sql` (`product_price_summary`)  
**Função**: preço mínimo/máximo por produto para ordenação correta do catálogo entre páginas  
**Bloqueio atual**: ordenação por preço é "best effort" dentro de uma página, não garante ordem global (ADR-011)  
**Impacto**: resolve o único caso onde o catálogo não tem ordenação perfeita

---

## 12. Conclusão

**Um modelo de domínio bem definido é um ativo estratégico — não um documento de referência técnica.**

Quando o domínio está claro, as decisões locais se tornam coerentes globalmente. Um desenvolvedor que entende que "preço pertence à oferta" não precisa consultar ninguém antes de implementar histórico de preço — sabe onde os dados vivem, quem os produz e quem os consome. Um sistema de IA que lê este documento antes de qualquer tarefa não vai sugerir adicionar campos de preço ao produto.

O modelo de domínio do ParaguAI tem três propriedades que o tornam estrategicamente valioso:

**1. É o mapa do conhecimento acumulado**  
Cada entidade representa um problema real do mercado resolvido com estrutura de dados. A distinção `Product` vs `Offer` não é uma convenção — é a solução para o fato de que o mesmo produto tem preços diferentes em lojas diferentes. Quem entende o modelo entende o problema que ele resolve.

**2. É a barreira de entrada para novos participantes**  
Um concorrente pode copiar a interface e replicar o pipeline. Não pode comprar nem recriar retroativamente o histórico de preços, os padrões de busca, a reputação verificável de lojas e os dados de comportamento de compradores que este modelo foi desenhado para capturar. A qualidade do modelo determina a qualidade do moat.

**3. É a fundação que torna a IA possível**  
O ParaguAI Brain não será construído sobre dados arbitrários — será construído sobre `price_history`, `search_logs`, `merchant_analytics_events` e `ai_embeddings`, todos com contratos explícitos, responsabilidades claras e integridade verificável. A qualidade da inteligência futura é diretamente proporcional à qualidade do modelo presente.

Um modelo de domínio correto não precisa de comentários explicando por que algo foi feito — ele é autoexplicativo para quem entende o negócio que modela. Quando este documento precisar de revisão porque o negócio mudou, isso é sinal de que o ParaguAI cresceu — não de que o modelo estava errado.

---

## Apêndice A: Entidades por Contexto

| Contexto | Entidades Existentes | Entidades Planejadas |
|---|---|---|
| Catálogo | Product, Brand, Category | product_images |
| Marketplace | Offer, Store | — |
| Price Engine | PriceHistoryEntry, OfferPriceMetrics | product_price_summary (view) |
| Busca e Comparação | SearchResponse, CompareResult, RankedOffer, CompareSummary | search_logs |
| Merchant OS | Merchant, MerchantPlan, MerchantStore, MerchantAuditLog, MerchantRecommendation, MerchantAnalyticsEvent | — |
| Acquisition | ImportLog, PipelineMetrics (in-memory) | import_jobs, crawler_logs |
| Identidade | Profile, auth.users | — |
| Comprador | Favorite (localStorage) | User, Review, Alert |
| Admin | DashboardStats, QualityReport, QualityIssue | — |
| Inteligência (IA) | — | ai_embeddings |
| Turismo | — | (contexto futuro, sem entidades definidas) |

---

## Apêndice B: Diagrama de Relacionamentos

```
Brand ──────────────────┐  N:1
                        │
Category ───────────────┤  N:1
                        │
                    Product ──────────────────────── ProductCatalogItem
                        │  1:N                         (computed: lowestPriceUSD)
                        ▼
                      Offer ◄──────────────────────── CompareResult
                        │  N:1                         RankedOffer (scored 0-100)
                      Store ─────────── MerchantStore (M:N) ──── Merchant
                   (pública)            is_primary                    │
                   /store/[slug]                               MerchantPlan (N:1)
                   /lojas/[slug]                               MerchantAuditLog
                                                               MerchantRecommendation
                                                               MerchantAnalyticsEvent

                      Offer ──── price_history (INSERT-only)
                                 PriceHistoryEntry
                                       │
                                OfferPriceMetrics (computed)
                                lowest / highest / changePercent


        auth.users ──── Profile (role) ──── Merchant  (se role='merchant')
                                       ──── Admin/Op  (se role='admin'/'operator')

        Favorite (localStorage — sem FK real, persistência em banco Release 1.5+)
```

---

*Este documento representa o estado real do domínio no Release 1.4. Entidades planejadas estão marcadas explicitamente como tais. Quando este documento divergir do código (`types/*.ts`, `services/*.ts`), o código prevalece — e o documento deve ser corrigido. Documentação que diverge do estado real é mais perigosa que ausência de documentação (AI_CONSTITUTION.md, Seção V).*
