# COMPONENT_INDEX.md
# Mapa da Camada de Interface do ParaguAI

**Versão**: 2.0  
**Criado**: 2026-06-28  
**Status**: Referência permanente — atualizar a cada Release que introduz, remove ou promove/depreca componente  
**Alinhado com**: Release 1.4 · `docs/architecture/ARCHITECTURE.md` · `docs/architecture/DOMAIN_MODEL.md`

---

## 1. Filosofia

**Componentes são ativos reutilizáveis — não páginas, não features.**

Um componente bem concebido resolve um único problema de interface e pode ser reutilizado em qualquer contexto que tenha o mesmo problema. A soma de componentes bem delimitados constrói features; features compõem páginas. A direção é sempre de baixo para cima.

Três princípios guiam a camada de UI do ParaguAI:

**1. Server por padrão.** Todo componente é Server Component a menos que precise de estado interativo, evento de browser ou API de DOM. A consequência: menor bundle de JavaScript entregue ao comprador, melhor performance de Core Web Vitals, e renderização que funciona mesmo antes do hydration. Client Components são a exceção justificada, não o padrão.

**2. URL como fonte de verdade para estado de busca e filtros.** Nenhum filtro ou query de busca vive em `useState` isolado. Ambos usam `useProductFilters` e `useSearch` — hooks que leem e escrevem na URL. O resultado é compartilhável, recarregável e funciona com SSR. Esta decisão é irreversível enquanto a busca for Server-rendered.

**3. Separação entre container e apresentação.** Páginas (em `app/`) orquestram: buscam dados, gerenciam loading e error states, compõem componentes. Componentes (em `components/`) apresentam: recebem props, renderizam UI. Componentes nunca chamam services diretamente — pages sim. Hooks preenchem o gap onde o estado precisar de interatividade.

---

## 2. Estrutura Hierárquica

```
components/
  analytics/              Infraestrutura de analytics (1 componente)
  compare/                Comparação de ofertas entre lojas (2 componentes)
  home/                   Seções da Home pública (12 componentes)
  layout/                 Chrome global: Navbar e Footer (2 componentes)
  product/                Detalhe e catálogo de produto (11 componentes)
  search/                 Resultados de busca (2 componentes)
  store/                  Páginas de loja (4 componentes)
  ui/                     Kit compartilhado (20 componentes)
  admin/
    catalog/              Formulários CRUD do catálogo (5 formulários)
    layout/               Layout e navegação do painel admin (1 componente)
    ui/                   Primitivos UI exclusivos do admin (5 componentes)
  merchant/
    dashboard/            Widgets do dashboard do lojista (6 componentes)
    layout/               Layout e navegação do portal merchant (1 componente)
    onboarding/           Wizard de onboarding (1 componente)

contexts/
  admin/                  ToastContext (compartilhado entre admin e merchant)

hooks/                    7 hooks (6 implementados + 1 placeholder)

app/                      Rotas (não são componentes — são orquestradores)
  page.tsx                Home
  search/                 Busca global
  products/               Catálogo com filtros
  product/[slug]/         Detalhe de produto
  store/[slug]/           Detalhe de loja
  compare/[slug]/         Comparação de lojas por produto
  lojas/                  Ranking público de lojas
  lojas/[slug]/           Página premium de loja
  para-lojistas/          Landing page institucional
  admin/                  Plataforma de operações (12+ páginas)
  merchant/               Portal do lojista (11 páginas)
```

---

## 3. Fluxo de Composição

Como uma página nasce no ParaguAI — da rota ao dado.

```
Route Page  (app/ — Server Component)
    │  busca dados via services, monta estrutura, gerencia Suspense
    ▼
Layout Components  (components/layout/ — Navbar, Footer)
    │  chrome global da aplicação
    ▼
Feature Components  (components/home/, product/, store/, compare/, search/)
    │  compõem seções de domínio com dados passados via props
    ▼
Shared UI Components  (components/ui/)
    │  primitivos: botões, cards, inputs, badges, estados
    ▼
Hooks  (hooks/ — Client-side state)
    │  gerenciam estado interativo; chamam services quando necessário
    ▼
Services  (services/ — Supabase queries)
    │  queries tipadas; retornam [] ou null em erro; nunca lançam
    ▼
Database  (Supabase)
```

**Exceção — Client Components diretos**: `HeroCTAs` lê sessão diretamente via `createSupabaseBrowserClient`. `AdminSidebar` e `MerchantSidebar` chamam `supabase.auth.signOut()` diretamente. Estes são os únicos Client Components que tocam o Supabase — aceitável porque são pontos de integração auth, não lógica de domínio.

---

## 4. Catálogo de Componentes

### 4.1 Layout Global

Dois componentes definem o chrome da aplicação pública. Não pertencem a nenhum domínio de produto — existem em todas as páginas.

---

**`Navbar`**  
`components/layout/Navbar.tsx` | **Client Component**

Responsabilidade: barra de navegação global com scroll listener. Altera aparência (blur, opacidade) conforme posição de scroll. Contém menu principal, ícone de busca e CTA "Entrar" que redireciona para `/merchant/login`.

Quem usa: `app/layout.tsx` (Root Layout) — presente em todas as rotas públicas exceto admin e merchant (que têm seus próprios layouts).

Dependências: `Logo`, `Button` do kit ui; `useEffect`/`useState` para scroll.

Status: **Stable**. Limitação: o botão "Entrar" leva ao login de merchant — não existe fluxo de autenticação de comprador na versão atual.

---

**`Footer`**  
`components/layout/Footer.tsx` | Server Component

Responsabilidade: rodapé com links informativos, direitos autorais e identidade da marca.

Quem usa: `app/layout.tsx`.

Status: **Stable**.

---

### 4.2 Home

Doze componentes compõem a Home pública (`/`). A página é um `async` Server Component com `force-dynamic` que busca dados reais em paralelo e os distribui via props.

---

**`Hero`**  
`components/home/Hero.tsx` | Server Component

Responsabilidade: orquestrar a primeira dobra da Home. Compõe `SearchBar`, `HeroCTAs`, `StatCard` e `Reveal` sem lógica própria — é um layout component que posiciona seus filhos.

Quem usa: `app/page.tsx`.

Dependências: `SearchBar`, `HeroCTAs`, `StatCard`, `Reveal`, `Badge`.

Status: **Stable**.

---

**`SearchBar`**  
`components/home/SearchBar.tsx` | **Client Component**

Responsabilidade: campo de busca principal com sugestões estáticas. Ao submeter (Enter ou clique), navega para `/search?q=<query>`. Não realiza a busca — apenas governa a experiência do input.

Quem usa: `Hero.tsx` (Home), reutilizável em qualquer contexto de busca.

Dependências: `useSearch`, `Chip`.

Invariante: nunca chama `searchEverything` diretamente. A busca acontece no servidor em `/search/page.tsx`.

Status: **Stable**.

---

**`HeroCTAs`**  
`components/home/HeroCTAs.tsx` | **Client Component**

Responsabilidade: botões de CTA da hero com comportamento dinâmico baseado no estado de autenticação. Detecta se o usuário é merchant, comprador não-merchant ou anônimo, e adapta o texto e destino do botão "Sou Lojista". Inclui modal de confirmação para compradores já logados.

Quem usa: `Hero.tsx`.

Dependências: `createSupabaseBrowserClient` — único componente público que lê sessão.

Status: **Stable**.

---

**`Categories`**  
`components/home/Categories.tsx` | Server Component

Responsabilidade: grid de categorias com ícones e links para `/products?category=<slug>`.

Quem usa: `app/page.tsx` com dados de `getCategories()`.

Status: **Stable**.

---

**`Brands`**  
`components/home/Brands.tsx` | Server Component

Responsabilidade: lista de marcas em destaque.

Quem usa: `app/page.tsx` com dados de `getBrands()`.

Status: **Stable**.

---

**`Offers`**  
`components/home/Offers.tsx` | Server Component

Responsabilidade: ofertas em destaque da home (produtos com menor preço ou mais recentes).

Quem usa: `app/page.tsx` com dados de offers.

Status: **Stable**.

---

**`Stats`**  
`components/home/Stats.tsx` | Server Component

Responsabilidade: seção de estatísticas da plataforma (350+ lojas, 500k+ produtos, etc.).

Quem usa: `app/page.tsx`.

Status: **Stable**.

---

**`HowItWorks`**  
`components/home/HowItWorks.tsx` | Server Component

Responsabilidade: seção explicativa do fluxo de uso da plataforma (3 passos).

Quem usa: `app/page.tsx`.

Status: **Stable**.

---

**`AIShowcase`**  
`components/home/AIShowcase.tsx` | Server Component

Responsabilidade: seção de showcase das capacidades de IA planejadas.

Quem usa: `app/page.tsx`.

Status: **Experimental** — descreve funcionalidade futura, não implementada.

---

**`FeaturesStores`**  
`components/home/FeaturesStores.tsx` | Server Component

Responsabilidade: seção de features para lojistas na Home pública.

Quem usa: `app/page.tsx`.

Status: **Stable**.

---

**`CTASection`**  
`components/home/CTASection.tsx` | Server Component

Responsabilidade: seção de CTA geral ao final da Home.

Quem usa: `app/page.tsx`.

Status: **Stable**.

---

**`ForLojistasSection`**  
`components/home/ForLojistasSection.tsx` | Server Component

Responsabilidade: seção de conteúdo institucional para `/para-lojistas`.

Quem usa: `app/para-lojistas/page.tsx`.

Status: **Stable**.

---

### 4.3 Produto

Onze componentes cobrem catálogo e detalhe de produto.

---

**`ProductCard`**  
`components/product/ProductCard.tsx` | Server Component

Responsabilidade: card individual de produto para exibição em grid — imagem, nome, marca, preço mínimo e link para `/product/[slug]` e `/compare/[slug]`.

Quem usa: `ProductGrid`.

Quem pode reutilizar: qualquer contexto que exiba uma lista de produtos.

Status: **Stable**.

---

**`ProductGrid`**  
`components/product/ProductGrid.tsx` | Server Component

Responsabilidade: renderiza um grid de `ProductCard`s com layout responsivo.

Quem usa: `app/products/page.tsx`, `RelatedProducts`.

Dependências: `ProductCard`.

Status: **Stable**.

---

**`ProductGridSkeleton`**  
`components/product/ProductGridSkeleton.tsx` | Server Component

Responsabilidade: placeholder visual para o `<Suspense>` do catálogo — exibe cards skeleton enquanto os dados carregam.

Quem usa: `app/products/page.tsx` como `fallback` do Suspense.

Status: **Stable**.

---

**`ProductHeader`**  
`components/product/ProductHeader.tsx` | Server Component

Responsabilidade: cabeçalho da página de detalhe — nome do produto, marca, categoria, badges de disponibilidade.

Quem usa: `app/product/[slug]/page.tsx`.

Status: **Stable**.

---

**`ProductGallery`**  
`components/product/ProductGallery.tsx` | **Client Component**

Responsabilidade: galeria de imagens com imagem ativa selecionável. Mantém estado local da imagem em foco.

Quem usa: `app/product/[slug]/page.tsx`.

Status: **Stable**.

---

**`ProductOffers`**  
`components/product/ProductOffers.tsx` | Server Component

Responsabilidade: lista de ofertas disponíveis para um produto — preço, loja, disponibilidade, link para `/compare/[slug]`.

Quem usa: `app/product/[slug]/page.tsx`.

Status: **Stable**.

---

**`ProductFilters`**  
`components/product/ProductFilters.tsx` | **Client Component**

Responsabilidade: painel de filtros do catálogo. Gerencia busca textual (debounced 400ms), categoria, marca, loja, faixa de preço, disponibilidade e ordenação. A URL é a única fonte de verdade — qualquer alteração de filtro dispara `router.push()` com os novos params.

Quem usa: `app/products/page.tsx`.

Dependências: `useProductFilters`, `Input`, `Select`, `Chip`.

Detalhe arquitetural: busca textual e faixa de preço são debounced para não disparar navegação por tecla. Os demais filtros aplicam imediatamente. Padrão `useUrlSyncedState` implementado internamente para sincronizar campo local com navegações externas (botão voltar, URL direta).

Status: **Stable**.

---

**`ProductSpecifications`**  
`components/product/ProductSpecifications.tsx` | Server Component

Responsabilidade: tabela de especificações técnicas do produto (exibe `product.specifications` JSONB).

Quem usa: `app/product/[slug]/page.tsx`.

Status: **Stable**.

---

**`RelatedProducts`**  
`components/product/RelatedProducts.tsx` | Server Component

Responsabilidade: grid de produtos relacionados da mesma categoria.

Quem usa: `app/product/[slug]/page.tsx`.

Dependências: `ProductGrid`.

Status: **Stable**.

---

**`FavoriteButton`**  
`components/product/FavoriteButton.tsx` | **Client Component**

Responsabilidade: botão de salvar/remover produto dos favoritos. Persiste em `localStorage` via `useFavorites`.

Quem usa: `ProductCard`, página de produto.

Dependências: `useFavorites`.

Limitação: sem persistência em banco — favoritos são locais e não sincronizam entre dispositivos. Evolução planejada para Release 1.5+.

Status: **Experimental** — funcionalidade real, persistência parcial.

---

**`ShareButton`**  
`components/product/ShareButton.tsx` | **Client Component**

Responsabilidade: botão de compartilhar produto via `navigator.share` ou cópia de URL.

Quem usa: página de produto.

Status: **Stable**.

---

### 4.4 Loja

Quatro componentes cobrem listagem e detalhe de loja.

---

**`StoreCard`**  
`components/store/StoreCard.tsx` | **Client Component**

Responsabilidade: card de loja para listagens — logo, nome, cidade, rating, badge de verificada, link para `/store/[slug]` ou `/lojas/[slug]`.

Quem usa: `StoreGrid`, `/lojas/page.tsx`.

Status: **Stable**.

---

**`StoreGrid`**  
`components/store/StoreGrid.tsx` | Server Component

Responsabilidade: grid responsivo de `StoreCard`s.

Quem usa: páginas de listagem de lojas.

Dependências: `StoreCard`.

Status: **Stable**.

---

**`StoreDetails`**  
`components/store/StoreDetails.tsx` | Server Component

Responsabilidade: detalhes completos da loja — endereço, contato, horário de funcionamento, redes sociais, mapa (coordenadas).

Quem usa: `app/store/[slug]/page.tsx`, `app/lojas/[slug]/page.tsx`.

Status: **Stable**.

---

**`StoreOffers`**  
`components/store/StoreOffers.tsx` | Server Component

Responsabilidade: lista de ofertas ativas de uma loja específica.

Quem usa: `app/store/[slug]/page.tsx`.

Status: **Stable**.

---

### 4.5 Comparação

Dois componentes compõem a página `/compare/[slug]`.

---

**`CompareOfferCard`**  
`components/compare/CompareOfferCard.tsx` | **Client Component**

Responsabilidade: card de oferta ranqueada com todos os dados de comparação — posição no ranking, score composto, preço atual, preço em BRL, mínimo/máximo histórico, variação %, badges de disponibilidade/garantia/condição/cashback, e link externo para a loja. Usa `memo` para evitar re-render desnecessário. Chama `analytics.clickExternalOffer()` em cliques.

Quem usa: `app/compare/[slug]/page.tsx`.

Dependências: `RankedOffer` (type), `analytics` (utils), `formatUSD`/`formatBRL` (utils).

Status: **Stable**.

---

**`CompareSummary`**  
`components/compare/CompareSummary.tsx` | Server Component

Responsabilidade: resumo da comparação — produto, melhor preço encontrado, total de ofertas.

Quem usa: `app/compare/[slug]/page.tsx`.

Status: **Stable**.

---

### 4.6 Busca

Dois componentes compõem a página `/search`.

---

**`SearchResults`**  
`components/search/SearchResults.tsx` | Server Component

Responsabilidade: renderizar resultados agrupados por tipo (produtos, lojas, marcas, categorias). Exibe `EmptyState` quando total === 0 ou quando não há query.

Quem usa: `app/search/page.tsx` dentro de `<Suspense>`.

Dependências: `EmptyState`.

Status: **Stable**.

---

**`SearchResultsSkeleton`**  
`components/search/SearchResultsSkeleton.tsx` | Server Component

Responsabilidade: placeholder visual enquanto os resultados carregam.

Quem usa: `app/search/page.tsx` como `fallback` do Suspense.

Status: **Stable**.

---

### 4.7 Analytics

**`Analytics`**  
`components/analytics/Analytics.tsx` | **Client Component**

Responsabilidade: injetar scripts de Google Analytics 4 e Microsoft Clarity com `next/script` (`strategy="afterInteractive"`). Renderiza `null` se nenhuma variável de ambiente estiver definida — zero impacto em ambientes de desenvolvimento sem configuração.

Quem usa: `app/layout.tsx` (Root Layout) — presente em toda a aplicação.

Dependências: `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_CLARITY_PROJECT_ID`.

Status: **Stable**.

---

### 4.8 Kit UI Compartilhado

Vinte primitivos em `components/ui/`. Todos são Server Components exceto `Reveal` e `StatCard`. Nenhum tem lógica de domínio — são puramente visuais.

| Componente | Tipo | Responsabilidade |
|---|---|---|
| `Button` | Server | Botão com variantes (`primary`, `secondary`, `ghost`); aceita `href` para Link |
| `Input` | Server | Campo de texto com label e estados de validação |
| `Select` | Server | Select/dropdown com label e opções tipadas |
| `Chip` | Server | Tag clicável — filtros, sugestões de busca |
| `Badge` | Server | Label pequeno — status, categorias, destaques |
| `Card` | Server | Container com borda e fundo slate |
| `GlassCard` | Server | Card com efeito glass morfismo (backdrop-blur) |
| `GradientCard` | Server | Card com gradiente de fundo |
| `Container` | Server | Wrapper `max-w-7xl` com padding horizontal |
| `Section` | Server | Wrapper de seção com espaçamento vertical |
| `SectionTitle` | Server | Título de seção com subtítulo opcional |
| `Loading` | Server | Indicador de carregamento (spinner) |
| `EmptyState` | Server | Estado vazio com ícone, título e descrição |
| `Logo` | Server | Logotipo do ParaguAI em variantes de tamanho |
| `Breadcrumb` | Server | Breadcrumb de navegação com separadores |
| `Pagination` | Server | Controles de paginação com props `page`, `total`, `pageSize` |
| `CategoryCard` | Server | Card de categoria com ícone e link |
| `FeatureCard` | Server | Card de feature com ícone, título e descrição |
| `StatCard` | **Client** | Contador numérico animado com IntersectionObserver — anima ao entrar na viewport |
| `Reveal` | **Client** | Wrapper de animação de entrada (fade + slide) com IntersectionObserver e delay configurável |

**Regra de uso**: componentes de `ui/` não importam nada de `services/` ou `hooks/`. Recebem tudo via props.

---

### 4.9 Merchant OS — Dashboard

Seis componentes compõem o dashboard do lojista (`/merchant/dashboard`). São instanciados pela página de dashboard que busca `MerchantDashboardStats` via API route.

---

**`ScoreCard`**  
`components/merchant/dashboard/ScoreCard.tsx` | Server Component

Responsabilidade: exibir o Merchant Score (0–100) com barra de progresso dentro do nível atual, escada visual de níveis (Iniciante→Bronze→Prata→Ouro→Diamante→Elite) e breakdown detalhado dos 8 critérios. Recebe `MerchantScoreBreakdown` e `MerchantLevel` como props.

Quem usa: `app/merchant/dashboard/page.tsx`.

Status: **Stable**.

---

**`StatsGrid`**  
`components/merchant/dashboard/StatsGrid.tsx` | Server Component

Responsabilidade: grid de métricas do dashboard — total de produtos, ofertas ativas, lojas vinculadas, último import.

Quem usa: `app/merchant/dashboard/page.tsx`.

Status: **Stable**.

---

**`RecommendationsPanel`**  
`components/merchant/dashboard/RecommendationsPanel.tsx` | **Client Component**

Responsabilidade: painel de recomendações priorizadas (critical/warning/info) com dismiss individual. Client por causa do handler `onDismiss`. Exibe "Loja em ótima forma!" quando lista vazia.

Quem usa: `app/merchant/dashboard/page.tsx`.

Status: **Stable**.

---

**`NextStepCard`**  
`components/merchant/dashboard/NextStepCard.tsx` | Server Component

Responsabilidade: card do próximo passo sugerido para o merchant evoluir seu score ou completar onboarding.

Quem usa: `app/merchant/dashboard/page.tsx`.

Status: **Stable**.

---

**`GoalsPanel`**  
`components/merchant/dashboard/GoalsPanel.tsx` | Server Component

Responsabilidade: painel de metas gamificadas — quais metas o merchant atingiu e quais estão em progresso.

Quem usa: `app/merchant/dashboard/page.tsx`.

Status: **Stable**.

---

**`MerchantProgressCard`**  
`components/merchant/dashboard/MerchantProgressCard.tsx` | Server Component

Responsabilidade: card de progresso de perfil com percentual de completude e itens pendentes.

Quem usa: `app/merchant/dashboard/page.tsx`.

Status: **Stable**.

---

### 4.10 Merchant OS — Layout e Onboarding

**`MerchantSidebar`**  
`components/merchant/layout/MerchantSidebar.tsx` | **Client Component**

Responsabilidade: sidebar de navegação do portal do lojista — links ativos por pathname, logo da loja, plano atual colorido por tier, logout. Exibe initial do `companyName` no avatar.

Quem usa: páginas `app/merchant/*/page.tsx` (cada página inclui a sidebar em seu layout).

Dependências: `usePathname`, `useRouter`, `createSupabaseBrowserClient`.

Status: **Stable**.

---

**`OnboardingWizard`**  
`components/merchant/onboarding/OnboardingWizard.tsx` | **Client Component**

Responsabilidade: wizard de 5 etapas para onboarding de novos lojistas — dados da empresa, vinculação de loja, escolha de plano, método de integração e confirmação. Gerencia estado local de cada passo e persiste via API routes.

Quem usa: `app/merchant/onboarding/page.tsx`.

Status: **Stable**.

---

### 4.11 Admin — UI Primitivos

Cinco primitivos de interface exclusivos do painel admin. Todos são **Client Components** por manipularem estado de formulários, toasts e confirmações.

---

**`ToastContainer`**  
`components/admin/ui/ToastContainer.tsx` | **Client Component**

Responsabilidade: renderizar a lista de toasts ativos (success/error/warning/info) com ícones, dismiss individual e auto-dismiss em 4 segundos. Consome `ToastContext`.

Quem usa: `app/admin/layout.tsx`, `app/merchant/layout.tsx` — ambos os portais autenticados.

Dependências: `useToast` (de `ToastContext`).

Status: **Stable** — compartilhado entre admin e merchant.

---

**`ConfirmDialog`**  
`components/admin/ui/ConfirmDialog.tsx` | **Client Component**

Responsabilidade: modal de confirmação de ação destrutiva com título, mensagem e botões Confirmar/Cancelar.

Quem usa: formulários e tabelas do admin.

Status: **Stable**.

---

**`AdminDataTable`**  
`components/admin/ui/AdminDataTable.tsx` | **Client Component**

Responsabilidade: tabela de dados com suporte a paginação, ações por linha (editar, excluir) e estado vazio. Usada em todas as listagens do catálogo admin.

Quem usa: páginas de listagem em `app/admin/catalog/`.

Status: **Stable**.

---

**`AdminFormField`**  
`components/admin/ui/AdminFormField.tsx` | **Client Component**

Responsabilidade: campo de formulário com label, input/textarea/select, mensagem de erro e estado de disabled.

Quem usa: formulários CRUD do admin.

Status: **Stable**.

---

**`AdminButton`**  
`components/admin/ui/AdminButton.tsx` | **Client Component**

Responsabilidade: botão de ação com variantes de loading, disabled e destrutivo — específico para o contexto visual do admin (indigo).

Quem usa: formulários e tabelas do admin.

Diferença de `ui/Button`: tem variante loading nativa e cores calibradas para o tema do painel admin (não do catálogo público).

Status: **Stable**.

---

### 4.12 Admin — Formulários de Catálogo

Cinco formulários CRUD para gerenciamento do catálogo pela equipe interna. Todos são **Client Components** com estado de formulário, validação e chamadas a API routes.

| Componente | Entidade | Rota de uso |
|---|---|---|
| `ProductForm` | Product | `/admin/catalog/products/new`, `/admin/catalog/products/[id]` |
| `CategoryForm` | Category | `/admin/catalog/categories/new`, `/admin/catalog/categories/[id]` |
| `BrandForm` | Brand | `/admin/catalog/brands/new`, `/admin/catalog/brands/[id]` |
| `StoreForm` | Store | `/admin/catalog/stores/new`, `/admin/catalog/stores/[id]` |
| `OfferForm` | Offer | `/admin/catalog/offers/new`, `/admin/catalog/offers/[id]` |

Todos os formulários: recebem dados iniciais como props para edição, submetem via `fetch` para Route Handlers em `/api/admin/catalog/`, exibem feedback via `useToast()`, e usam `AdminFormField` e `AdminButton`.

Status: **Stable**.

---

### 4.13 Admin — Layout

**`AdminSidebar`**  
`components/admin/layout/AdminSidebar.tsx` | **Client Component**

Responsabilidade: sidebar de navegação do painel admin — menu hierárquico com grupos (Catálogo) e folhas (Dashboard, Importações, Qualidade, Logs, Configurações), highlight de rota ativa por pathname, logout.

Quem usa: `app/admin/layout.tsx`.

Dependências: `usePathname`, `useRouter`, `createSupabaseBrowserClient`.

Diferença de `MerchantSidebar`: cores indigo (vs. emerald), navegação hierárquica com grupos expansíveis como seções fixas (sempre visível).

Status: **Stable**.

---

## 5. Contextos

O ParaguAI tem um único Context no Release 1.4.

---

**`ToastContext`**  
`contexts/admin/ToastContext.tsx` | **Client Context**

Responsabilidade: fornecer sistema de notificações toast para portais autenticados. Exporta:
- `ToastProvider` — Provider que envolve os layouts admin e merchant
- `useToast()` — hook que retorna `{ toasts, toast.success/error/warning/info, dismiss }`
- `ToastType` — tipo `"success" | "error" | "warning" | "info"`

Quem usa: `ToastProvider` em `app/admin/layout.tsx` e `app/merchant/layout.tsx`; `useToast()` em `ToastContainer` e todos os formulários que precisam de feedback.

Escopo: exclusivo dos portais autenticados — a aplicação pública não tem nenhum provider de contexto.

Status: **Stable** — localizado em `contexts/admin/` mas utilizado por merchant também; candidato a ser movido para `contexts/shared/` quando surgir segundo contexto.

---

## 6. Providers

Dois providers existem no Release 1.4:

| Provider | Arquivo | Escopo | O que provê |
|---|---|---|---|
| `ToastProvider` | `contexts/admin/ToastContext.tsx` | Admin + Merchant (layouts autenticados) | Sistema de notificações toast |
| Root Layout | `app/layout.tsx` | Toda a aplicação | `<html lang="pt-BR">`, fontes Geist, JSON-LD, Analytics |

**Sem**: `ThemeProvider`, `QueryClientProvider`, `SessionProvider`, `ReactQueryProvider`. A app pública não tem estado global — dados vêm via Server Components e props.

---

## 7. Hooks

Sete hooks em `hooks/`. Todos são **client-only** — dependem de APIs de browser ou navegação do React.

---

**`useSearch`**  
`hooks/useSearch.ts` | **Client Hook**

Responsabilidade: gerenciar o input de busca e navegar para `/search?q=<query>` ao submeter. A URL é a fonte de verdade — o hook não armazena o resultado da busca, apenas governa a experiência do campo.

Interface: `{ query, setQuery, submit }`

Quem usa: `SearchBar`.

Status: **Stable**.

---

**`useProductFilters`**  
`hooks/useProductFilters.ts` | **Client Hook**

Responsabilidade: sincronizar o estado dos filtros do catálogo com a URL (`searchParams`). Mudar qualquer filtro reseta a página para 1. A URL é a única fonte de verdade — o estado é compartilhável e recarregável.

Interface: `{ filters: ProductFiltersState, setFilter(key, value), setPage(page) }`

Quem usa: `ProductFilters`.

Status: **Stable**.

---

**`useFavorites`**  
`hooks/useFavorites.ts` | **Client Hook**

Responsabilidade: CRUD de favoritos no `localStorage`. Nenhuma chamada ao Supabase.

Interface: `{ favorites, addFavorite(product), removeFavorite(productId), isFavorite(productId) }`

Quem usa: `FavoriteButton`.

Limitação: localStorage não sincroniza entre dispositivos ou sessões diferentes.

Status: **Experimental** — persistência em banco planejada para Release 1.5+.

---

**`useCompare`**  
`hooks/useCompare.ts` | **Client Hook**

Responsabilidade: buscar dados de comparação de um produto por slug. Gerencia loading e notFound.

Interface: `{ data: CompareResult | null, loading, notFound }`

Quem usa: legado de quando `/compare/[slug]` era Client Component. Hoje a página é Server Component.

Status: **Experimental** — candidato a remoção se `/compare/[slug]/page.tsx` for permanentemente Server.

---

**`useProduct`**  
`hooks/useProduct.ts` | **Client Hook**

Responsabilidade: buscar dados de produto por slug com loading state.

Interface: `{ product, loading, notFound }`

Quem usa: legado — a página `/product/[slug]` era Client Component pré-Sprint 4.1. Hoje é Server Component.

Status: **Experimental** — candidato a remoção se a migração para Server Component for permanente.

---

**`useStore`**  
`hooks/useStore.ts` | **Client Hook**

Responsabilidade: buscar dados de loja por slug.

Interface: `{ store, loading, notFound }`

Quem usa: legado — mesma situação de `useProduct`. Página migrada para Server Component no Sprint 4.1.

Status: **Experimental** — candidato a remoção.

---

**`useOffers`**  
`hooks/useOffers.ts` | **Client Hook**

Responsabilidade: placeholder — arquivo existe mas está vazio. Sem implementação.

Status: **Planned** — sem uso atual.

---

## 8. Padrões Arquiteturais

### 8.1 Server vs. Client

O princípio é Server por padrão. Um componente só deve ser marcado `"use client"` quando tiver uma razão concreta:

| Razão para Client | Exemplos no projeto |
|---|---|
| Evento de browser (scroll, click, resize) | `Navbar` (scroll), `StatCard`/`Reveal` (IntersectionObserver) |
| Estado interativo (useState, useReducer) | `SearchBar`, `ProductFilters`, `ProductGallery` |
| Leitura de sessão no browser | `HeroCTAs` |
| Navegação imperativa (router.push) | `AdminSidebar`, `MerchantSidebar` (logout) |
| APIs de browser (navigator.share, localStorage) | `ShareButton`, `FavoriteButton` |
| Animações de entrada baseadas em viewport | `Reveal`, `StatCard` |

### 8.2 Padrão `_cache.ts` (ADR-021)

Rotas com `layout.tsx` + `page.tsx` ambos Server Components compartilham fetches via `React.cache()` em um módulo `_cache.ts` por rota. Garante 1 fetch por entidade por request, mesmo quando layout e page precisam dos mesmos dados.

```
app/product/[slug]/_cache.ts    ← export const getCachedProduct = cache(getProductBySlug)
app/store/[slug]/_cache.ts      ← export const getCachedStore   = cache(getStoreBySlug)
```

Rotas afetadas: `/product/[slug]`, `/store/[slug]`.

### 8.3 Suspense para dados assíncronos

Páginas que exibem dados assíncronos usam `<Suspense>` com skeleton como fallback. Nunca bloqueiam toda a página esperando um dado — a estrutura renderiza imediatamente; o dado chega depois.

```
// Padrão em /products e /search:
<ProductFilters ... />           ← renderiza imediatamente (dados passados pelo Server)
<Suspense fallback={<Skeleton />}>
  <ProductCatalogAsync ... />    ← aguarda o fetch, não bloqueia o filtro
</Suspense>
```

### 8.4 URL como estado de busca e filtros

`useSearch` e `useProductFilters` nunca armazenam o resultado de uma busca. Apenas governam a URL. O Server Component lê `searchParams` e executa a query. Benefício: resultados são compartilháveis por link, recarregáveis e funcionam com SSR.

### 8.5 Services nunca lançam exceção

Todos os services retornam `[]` ou `null` em erro. Componentes podem assumir que o dado nunca é `undefined` — ou é um array/objeto válido, ou é `null`/`[]`. Isso elimina a necessidade de error boundaries em componentes individuais de listagem.

---

## 9. Anti-Patterns

Anti-patterns observados no Release 1.4 — registrados para que não se repitam.

| Anti-Pattern | Onde ocorreu / Risco | Alternativa correta |
|---|---|---|
| **Página inteiramente Client Component** | `/product/[slug]` e `/store/[slug]` pré-Sprint 4.1 — causava double-fetch por visita | Server Component com `_cache.ts` e `React.cache()` (ADR-021) |
| **Hook sem consumidor** | `useProduct`, `useStore`, `useCompare` — existem mas suas páginas foram migradas para Server | Remover quando confirmado sem uso |
| **Lógica de domínio em componente** | `HeroCTAs` lê sessão e consulta tabela `merchants` diretamente | Ideal: receber `authState` como prop do Server Component (que já tem sessão) — sem quebrar página pública |
| **Contexto com nome de escopo restrito** | `contexts/admin/ToastContext` — usada pelo merchant também | Mover para `contexts/shared/` ao criar segundo contexto |
| **Metadados globais padrão** | `app/layout.tsx` continha title "Create Next App" — corrigido, mas serve de aviso | Metadados globais devem ser revisados a cada Release antes do deploy |
| **`useOffers.ts` vazio** | Arquivo placeholder sem implementação — ruído no índice de hooks | Remover ou implementar; não deixar placeholder vazio em produção |
| **Ordenação por preço dentro da página** | `getProductsCatalog` ordena em memória dentro da página — não garante ordem global entre páginas | View materializada `product_price_summary` (ADR-011, proposta mas não aplicada) |
| **Cores de tema hardcoded** | Cores do MerchantSidebar (emerald) e AdminSidebar (indigo) são literais Tailwind sem design token | Centralizar em `styles/theme.ts` quando o design system evoluir |

---

## 10. Métricas

| Categoria | Quantidade |
|---|---|
| **Total de componentes** | 73 |
| **Server Components** | 47 |
| **Client Components** | 26 |
| **Hooks** | 7 (6 implementados + 1 placeholder) |
| **Contexts** | 1 |
| **Providers** | 1 (ToastProvider) |
| **Componentes reutilizáveis (ui/)** | 20 |
| **Componentes de domínio específico** | 53 |
| **Candidatos a remoção** | 3 (`useProduct`, `useStore`, `useCompare` — legados de migração) |
| **Componentes experimentais** | 4 (`AIShowcase`, `FavoriteButton`, `useFavorites`, `useOffers`) |

**Distribuição por contexto de domínio:**

| Contexto | Componentes |
|---|---|
| Kit UI compartilhado | 20 |
| Home pública | 12 |
| Produto | 11 |
| Admin | 11 |
| Merchant OS | 8 |
| Store | 4 |
| Layout global | 2 |
| Busca | 2 |
| Comparação | 2 |
| Analytics | 1 |

---

## 11. Roadmap de Componentes

Evoluções naturais derivadas do estado atual do código — sem inventar features.

### 11.1 Remover hooks legados (Release 1.5)

`useProduct`, `useStore` e `useCompare` existem de quando as páginas eram Client Components. Com a migração do Sprint 4.1 para Server Components, esses hooks ficaram sem consumidor. Confirmar ausência de uso e remover.

### 11.2 Componentes de Review (Release 1.5 — ADR-038)

Quando o sistema de reviews for implementado, serão necessários: `ReviewCard`, `ReviewList`, `ReviewForm` (Client), e atualização de `StoreCard` para exibir rating calculado de reviews (em vez do campo manual).

### 11.3 Sistema de Alertas de Preço

`PriceAlertButton` (Client Component) para configurar alertas em ofertas específicas. Depende de usuário autenticado (comprador) — requer contexto de Comprador implementado.

### 11.4 `contexts/shared/` para segundo Context

Quando surgir um segundo Context (autenticação de comprador, carrinho, preferências), mover `ToastContext` de `contexts/admin/` para `contexts/shared/` e criar estrutura de pastas adequada.

### 11.5 Limpeza do kit UI

`StatCard` e `Reveal` são Client por IntersectionObserver. Uma alternativa é usar animações CSS puras com `@keyframes` — eliminaria esses como Client Components e simplificaria o bundle. Avaliar troca no Release 1.5.

---

*Este documento representa a camada de interface no Release 1.4. Componentes planejados estão marcados como Planned. Quando este documento divergir do código em `components/` ou `hooks/`, o código prevalece — e o documento deve ser corrigido. Documentação que diverge do estado real é mais perigosa que ausência de documentação.*
