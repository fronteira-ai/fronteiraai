# HOME_COMPONENTS.md

**Categoria**: `docs/design/` (registro operacional vivo — regras permanentes ficam em `DESIGN_CONSTITUTION.md`)
**Criado**: 2026-07-06 (PROGRAM Z — RC-7, ADR-053)
**Atualizado a cada Sprint de componente** — este documento reflete o estado real, não a intenção.

> Todo componente listado aqui está **Frozen** por padrão (`DESIGN_CONSTITUTION.md` v1.2). Nenhuma Sprint pode alterar mais de um componente por vez sem autorização explícita do CTO (ADR-053). "Impacto" descreve o blast radius de uma mudança — quanto maior, mais cuidado a Sprint exige.

## Legenda de Status

- **Frozen** — congelado, nenhuma mudança visual sem Sprint aprovada.
- **Em desenvolvimento** — Sprint aprovada e em andamento.
- **Em revisão** — Sprint implementada, aguardando aprovação do resultado (passo 7).
- **Concluído** — Sprint aprovada e commitada; volta a "Frozen" na prática.

---

## Hero e busca

| Componente | Arquivo | Status | Última alteração | Responsável | Dependências | Impacto |
|---|---|---|---|---|---|---|
| Hero | `components/home/Hero.tsx` | Frozen | 2026-07-06 (RC-6 — largura `max-w-[1600px]`) | CTO | `lib/home-premium-service.ts` (`getHomeStats`), `HeroStats`, `public/hero-bridge.png`, `components/ui/Reveal.tsx` | Alto — primeira dobra da Home; qualquer regressão é a mais visível do site |
| HeroStats | `components/home/HeroStats.tsx` | Frozen | 2026-07-06 (RC-5 — criado na v0 realignment) | CTO | Recebe `stats: HomeStats` via prop de `Hero.tsx` — nenhuma chamada própria a service | Baixo — isolado, só renderiza props |
| HeroCTAs | `components/home/HeroCTAs.tsx` | Frozen | 2026-07-06 (RC-6 — restyle de tokens) | CTO | `lib/supabase/client.ts` (auth client-side), tabela `merchants` | Médio — único ponto de auth client-side na Home; contém lógica de negócio (estado "Sou Lojista"/"Minha Loja") |
| SearchBar | `components/home/SearchBar.tsx` | Frozen | 2026-07-06 (RC-6 — remoção do cap `max-w-5xl`) | CTO | `hooks/useSearch.ts`, `components/ui/Chip.tsx` | Médio — ponto de entrada de busca real (navega para `/search`) |

## Navegação e rodapé (compartilhados sitewide)

| Componente | Arquivo | Status | Última alteração | Responsável | Dependências | Impacto |
|---|---|---|---|---|---|---|
| Navbar | `components/layout/Navbar.tsx` | Frozen | 2026-07-06 (RC-6 — alinhado a `max-w-[1600px]`) | CTO | `components/ui/Logo.tsx`, `components/ui/Button.tsx` | **Muito alto — renderizado em todo o site, não só na Home** |
| Footer | `components/layout/Footer.tsx` | Frozen | Sem alteração nesta série (RC-5/6/7) | CTO | `components/ui/Logo.tsx`, `components/ui/Container.tsx` (estático, sem service) | **Muito alto — renderizado em todo o site, não só na Home** |

## Dashboard — fileira de 4 cards

| Componente | Arquivo | Status | Última alteração | Responsável | Dependências | Impacto |
|---|---|---|---|---|---|---|
| DashboardStrip (container) | `components/home/DashboardStrip.tsx` | Frozen | 2026-07-06 (RC-6 — wrapper `max-w-[1600px]`, sem `<Section>`) | CTO | Compõe todos os `*Card` abaixo + `StoreCarousel` + `CategoriesCard` + `LiveCameras` + `BottomCta` | Alto — layout de todo o bloco de dashboard depende deste wrapper |
| DashboardCardShell (shell compartilhado) | `components/home/dashboard/DashboardCardShell.tsx` | Frozen | 2026-07-06 (RC-5 — chrome `glass-card`) | CTO | Usado por todos os `*Card` do dashboard | **Alto — mudança aqui afeta Market Pulse, Economia do Dia, Câmbio, Live Marketplace, Categorias simultaneamente** |
| Economia do Dia (card) | `components/home/dashboard/FlashOffersCard.tsx` | Frozen | 2026-07-06 (RC-5 — chrome estilo "Deal of Day") | CTO | `getFlashOffers` (`lib/home-premium-service.ts` → Market Intelligence/`PriceIntelligenceService`) | Baixo — isolado ao próprio card |
| Market Pulse | `components/home/dashboard/MarketPulseCard.tsx` | Frozen | 2026-07-06 (RC-5 — `topDrops`/`topGains` reais) | CTO | `getMarketPulseHighlights` (`lib/home-premium-service.ts` → Real-Time Commerce/`MarketPulseService`) | Baixo — isolado ao próprio card |
| Câmbio ao Vivo | `components/home/dashboard/CambioCard.tsx` | Frozen | 2026-07-06 (RC-5 — par USD→BRL/USD→PYG) | CTO | `getExchangeSnapshot` (`lib/home-premium-service.ts` → Exchange Intelligence) | Baixo — isolado ao próprio card |
| Live Marketplace | `components/home/dashboard/LiveMarketplaceCard.tsx` | Frozen | 2026-07-06 (RC-5 — restyle) | CTO | `getLiveMarketplaceFeed` (`lib/home-premium-service.ts` → Real-Time Commerce) | Baixo — isolado ao próprio card |

## Dashboard — fileira de 3 colunas

| Componente | Arquivo | Status | Última alteração | Responsável | Dependências | Impacto |
|---|---|---|---|---|---|---|
| Lojas em Destaque | `components/home/StoreCarousel.tsx` | Frozen | 2026-07-06 (RC-7 — `content-center` no preenchimento vertical) | CTO | `getFeaturedStores` (`lib/home-premium-service.ts` → Marketplace Operations/`MerchantPriorityService` + `ConnectorDirectoryService`), `DashboardCardShell` | Baixo — isolado ao próprio card |
| Categorias Principais | `components/home/dashboard/CategoriesCard.tsx` | Frozen | 2026-07-06 (RC-7 — `content-center` no preenchimento vertical) | CTO | `getTopCategories` (`lib/home-premium-service.ts` → Marketplace Operations `coverageService` + `services/category.service.ts`), `DashboardCardShell` | Baixo — isolado ao próprio card |
| Câmeras ao Vivo | `components/home/LiveCameras.tsx` | Frozen | 2026-07-06 (RC-5 — relocado para a fileira, grid 2×2, mantém "Em breve" honesto) | CTO | Nenhum service — `PLANNED_LOCATIONS` estático, arquitetura pronta para feed real futuro | Baixo — isolado ao próprio card |

## Faixa de confiança / CTA de lojista

| Componente | Arquivo | Status | Última alteração | Responsável | Dependências | Impacto |
|---|---|---|---|---|---|---|
| BottomCta | `components/home/BottomCta.tsx` | Frozen | 2026-07-06 (RC-5 — criado, sem equivalente anterior) | CTO | Estático — link real para `/para-lojistas` | Baixo — isolado, sem service |

## Seções sem equivalente no export do v0 (mantidas como estavam)

| Componente | Arquivo | Status | Última alteração | Responsável | Dependências | Impacto |
|---|---|---|---|---|---|---|
| Produtos Mais Buscados | `components/home/Offers.tsx` | Frozen | Sem alteração nesta série | CTO | `services/product.service.ts` (`getProductsCatalog`) — **bypassa `home-premium-service.ts`**, exceção já documentada em `HOME_AUDIT_2026_07_06.md` | Baixo — isolado ao próprio bloco |
| Economia do Dia (seção completa) | `components/home/EconomiaDoDia.tsx` | Frozen | Sem alteração nesta série | CTO | `getBestSavingsToday` (`lib/home-premium-service.ts`) | Baixo — isolado ao próprio bloco |
| Inteligência da IA | `components/home/AIShowcase.tsx` | Frozen | Sem alteração nesta série | CTO | Estático — chat não implementado, conforme mandato original | Baixo |
| Benefícios | `components/home/Benefits.tsx` | Frozen | Sem alteração nesta série | CTO | Estático | Baixo |
| Como Funciona | `components/home/HowItWorks.tsx` | Frozen | Sem alteração nesta série | CTO | Estático | Baixo |
| Marcas | `components/home/Brands.tsx` | Frozen | Sem alteração nesta série | CTO | `services/brand.service.ts` (`getBrands`), chamado diretamente em `app/page.tsx` — mesma exceção de "bypassa a facade" já documentada | Baixo |
| Para Lojistas (seção completa) | `components/home/ForLojistasSection.tsx` | Frozen | Sem alteração nesta série | CTO | Estático — links reais (`/merchant/register`, `/para-lojistas`) | Baixo |
| CTA final | `components/home/CTASection.tsx` | Frozen | Sem alteração nesta série | CTO | Estático | Baixo |

## Página (composição, não componente)

| Item | Arquivo | Status | Última alteração | Responsável | Dependências | Impacto |
|---|---|---|---|---|---|---|
| Composição da Home | `app/page.tsx` | Frozen | 2026-07-06 (RC-6 — wrapper de Search/CTAs) | CTO | Compõe todos os componentes acima; carrega fontes Sora/Inter escopadas via `--font-home-*` | **Muito alto — qualquer mudança de ordem/estrutura aqui é, por definição, redesign da Home** |

---

## Como usar este documento numa Sprint

1. Antes de propor qualquer mudança, encontre o componente-alvo nas tabelas acima.
2. Confirme "Dependências" — nada fora da lista pode ser tocado na mesma Sprint (ADR-053).
3. Confirme "Impacto" — componentes de impacto alto/muito alto (Hero, Navbar, Footer, `DashboardCardShell`, `app/page.tsx`) exigem mais cautela e devem ser nomeados explicitamente como tal ao CTO antes da aprovação.
4. Ao concluir a Sprint (passo 8 do processo, `DESIGN_CONSTITUTION.md` §7), atualize a linha do componente: Status → `Concluído`, "Última alteração" com data e resumo, e volte o Status para `Frozen` na entrada seguinte (o ciclo de vida normal de uma Sprint aprovada).
