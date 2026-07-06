# PREMIUM_HOME_EXPERIENCE.md
# Premium Home Experience — Wave 1

**Versão**: 1.0
**Criado**: 2026-07-04 (Release 1.9 — Program F — Wave 1)
**Status**: Registro de arquitetura + auditoria desta Wave
**Categoria**: `docs/engineering/`

---

## 1. Princípio desta Wave

Mandato do CTO: reconstruir a Home consumindo exclusivamente os ativos estratégicos já consolidados na Release 1.8 (Market Intelligence, Canonical Catalog, Marketplace Operations, Exchange Intelligence, Connector Platform) — "nenhuma regra de negócio poderá ficar dentro dos componentes React." Toda a arquitetura descrita abaixo existe para cumprir essa restrição literalmente, não apenas em espírito.

---

## 2. Arquitetura

**Nova camada única de leitura**: `lib/home-premium-service.ts` — o único lugar onde a Home/`/categorias` leem dado. Cada função exportada compõe um serviço de domínio já existente (nunca uma query nova a um domínio estratégico) e retorna um DTO simples, pronto para renderizar — zero cálculo de negócio acontece dentro de um componente React.

**Componentes de bloco são Server Components que se auto-alimentam**: cada bloco novo (`MarketPulse`, `EconomiaDoDia`, `CambioAoVivo`, `LiveMarketplace`, `FlashOffers`, `Categories`, `FeaturesStores`, `Offers`, `Hero`) é uma função `async` que chama sua própria fatia de `home-premium-service.ts` e é envolvida em `<Suspense>` individual em `app/page.tsx` — streaming granular (Next.js 16, "parallel streaming with sibling boundaries"): a casca estática (Navbar, título/busca do Hero, Footer) pinta instantaneamente enquanto cada seção resolve de forma independente.

**Cache**: `app/page.tsx` trocou `export const dynamic = "force-dynamic"` por `export const revalidate = 60` — ISR real, confirmado no build (`○ /` com `Revalidate: 1m`), em vez de renderizar tudo a cada requisição. Nenhuma personalização por usuário existe na Home (nenhum cookie/sessão é lido nela), então ISR é seguro.

**Nova fábrica**: `lib/market-insights-factory.ts` — o domínio `market-insights/` (Release 1.8 — Program C — Wave 1) nunca teve uma fábrica porque nada fora de seus próprios testes o consumia até agora. Mesmo padrão dos outros 9 `lib/*-factory.ts` já existentes.

---

## 3. Auditoria prévia (obrigatória pelo mandato)

- `app/page.tsx`, todos os `components/home/*.tsx`, `services/*.service.ts`, `hooks/*` foram lidos antes de qualquer código novo.
- **Reaproveitado sem alteração**: `Hero`/`SearchBar`/`HeroCTAs` (estrutura), `AIShowcase` (já era exatamente "preparar integração, sem chat" — nada a mudar), `HowItWorks`/`Brands`/`ForLojistasSection`/`CTASection` (mantidos após os 12 blocos do mandato, conteúdo de valor já existente, mandato não pediu remoção).
- **`Stats.tsx` removido**: duplicava exatamente os 3 números que o Hero já mostra na própria seção (mockup de referência mostra as estatísticas dentro do Hero, não como bloco separado) — muito havia números fictícios hardcoded (500.000/350/2.000.000), agora substituídos por `MarketplaceMetricsService.snapshot()` real (6 lojas / 650 produtos / 653 ofertas, confirmado ao vivo).
- **3 pequenas extensões aditivas necessárias** (auditadas contra duplicação antes de escrever): `ICanonicalCatalogRepository.findAll()` (nenhum método existente listava todos os produtos canônicos sem escopo de marca/categoria — necessário para ranquear economia no catálogo inteiro); `StoreCard` ganhou `qualityScore`/`lastSyncAt` opcionais (aditivo, os 3 outros consumidores do componente continuam funcionando sem passar essas props); `parseAmountUSFormat`/achados de Wave anteriores reaproveitados sem mudança.

---

## 4. Mapeamento bloco → serviço real

| Bloco | Serviço(s) reaproveitado(s) | Novo código |
|---|---|---|
| Hero (estatísticas) | `MarketplaceMetricsService` (marketplace-operations) | Nenhum novo cálculo — só leitura |
| Produtos Mais Buscados | `services/product.service.ts` (pré-existente) | Nenhum |
| Economia do Dia / Ofertas Relâmpago | `PriceIntelligenceService.getSavingsOpportunity` (market-insights, Program C — Wave 1) | `rankSavingsAcrossCatalog` — aplica a função já existente a uma amostra do catálogo, não recalcula economia |
| Market Pulse | `MarketPulseService.getTopMovers`/`computeForRange` + `VolatilityService.computeForProduct` (realtime-commerce, Program A — Wave 2) | Nenhum cálculo novo — só agrega/filtra o que os dois serviços já retornam |
| Marketplace em Tempo Real | `MarketPulseService.getTopMovers` (mesma fonte do Market Pulse, apresentação diferente) | Nenhum |
| Câmbio ao Vivo | `ExchangeRateService`/`ExchangeHistoryService` (exchange, Program A — Wave 1) | Nenhum |
| Lojas em Destaque | `MerchantPriorityService` (marketplace-operations) + `ConnectorDirectoryService` (Connector Platform, Program B — Wave 2) | Nenhum cálculo — só composição |
| Categorias (Home top-8 + `/categorias`) | `MarketplaceCoverageService.compute()` (marketplace-operations) | Contagem de ofertas por categoria (`getOfferCountsByCategory`) — a única métrica genuinamente nova, porque nenhum serviço existente separava contagem de produtos de contagem de ofertas por categoria |
| Câmeras ao Vivo | — | Arquitetura preparada (`LiveCameraFeed` contrato), zero integração, conforme mandato |

---

## 5. Achados reais durante a implementação (não hipotéticos)

- **`exchange_rates` está vazia em produção**: o código do Exchange Intelligence (Program A — Wave 1) nunca teve seu `refresh()` executado com sucesso — `EXCHANGE_RATE_API_KEY` não está configurada neste ambiente. Confirmado via `exchange_provider_runs`: `status: "failure"`, mensagem explícita. **Não é um bug desta Wave** — é uma lacuna de infraestrutura pré-existente, exposta pela primeira vez porque esta foi a primeira tentativa real de consumir o dado. `CambioAoVivo.tsx` degrada honestamente ("Cotação em sincronização") em vez de fabricar uma taxa.
- **`market_changes` só tem eventos de criação** (`offer_created`/`product_created`, 1230 no total, zero `price_increased`/`price_decreased`): esperado — os 4 conectores reais (Program D — Wave 1) só sincronizaram uma vez cada até agora, então não existe ainda uma segunda leitura de preço para comparar. `MarketPulse.tsx` mostra estados vazios honestos em vez de dado fabricado.
- **Link morto evitado**: `productSlug` de uma economia (`SavingsOpportunity`) inicialmente apontava para `canonical_products.canonical_slug`, mas `/product/[slug]` busca por `products.slug` — são identidades diferentes. Corrigido resolvendo o produto bruto vencedor (loja mais barata) antes de montar o link.

---

## 6. Prova real de integração ponta a ponta

Um "Galaxy S25 Ultra 256GB" é vendido tanto por Shopping China (USD 1099, já existente) quanto por Mega Eletrônicos (USD 1080, Program D — Wave 1) — `PriceIntelligenceService.getSavingsOpportunity` calculou uma economia real de USD 19 (1,73%) automaticamente, sem nenhum código específico desta Wave para esse produto. O card "Economia do Dia" da Home mostra hoje um resultado ainda maior (iPhone 16 Pro, Cellshop vs. catálogo existente, USD 51/4,86%) — confirmando que o mecanismo generaliza, não é um caso único.

---

## 7. Performance

- `revalidate = 60` (ISR) em vez de `force-dynamic` — confirmado no build (`○ /`, `Revalidate: 1m`).
- Streaming granular via `<Suspense>` por bloco — cada seção resolve independentemente, a casca estática (Navbar, H1, busca, Footer) não espera nenhuma consulta a banco.
- `next/image` já em uso em `StoreCard`/`ProductCard` (pré-existente) — nenhuma imagem nova sem otimização.
- Nenhum client-side data fetching foi introduzido — toda leitura acontece em Server Components.

---

## 8. Acessibilidade

- `HeroGlobe` (decorativo) marcado `aria-hidden="true"` — a cópia ao lado já transmite a mesma informação em texto.
- Inputs de busca (Home e `/categorias`) ganharam `aria-label` explícito — o `placeholder` sozinho não é suficiente para leitores de tela (WCAG).
- Hierarquia de headings verificada: `h1` único por página (Hero na Home, título em `/categorias`), `h2` em `SectionTitle` (um por bloco), `h3` em cards internos — sem saltos.
- `Reveal` (animação de entrada) já respeitava `prefers-reduced-motion` antes desta Wave — nenhuma mudança necessária.
- Toda navegação nova (`/categorias`, filtros de categoria, ordenação, paginação) é `<Link>`/`<form method="get">` — funciona sem JavaScript, indexável, navegável por teclado por padrão.

---

## 9.1. Revisão — layout denso ("dashboard") (2026-07-04, mesmo dia)

O CTO enviou uma segunda imagem de referência, mais específica e substancialmente mais densa que a primeira (estilo "cockpit"/Bloomberg em vez de seções empilhadas). Após confirmação explícita ("reconstruir a Home inteira nesse layout denso"), esta Wave foi revisada:

- **`StoreCarousel.tsx`** (novo) — faixa horizontal de chips de loja (logo, nome, rating, ofertas) diretamente abaixo da busca, substituindo o grid de 3 colunas mais abaixo na página (`FeaturesStores.tsx`, removido — dado idêntico, mostrar duas vezes seria redundante).
- **`DashboardStrip.tsx`** (novo) — faixa densa de 5 colunas (Ofertas Relâmpago | Market Pulse | Câmbio ao Vivo | Live Marketplace | Categorias Principais), cada card em `components/home/dashboard/` self-fetching + `<Suspense>` próprio. As versões anteriores de largura total (`MarketPulse.tsx`, `CambioAoVivo.tsx`, `LiveMarketplace.tsx`, `FlashOffers.tsx`, `Categories.tsx`) foram removidas — mesma fonte de dado, apresentação mais compacta.
- **Sparklines reais**: `components/ui/Sparkline.tsx` renderiza um polyline SVG a partir de série real — `MarketPulseCard` usa uma nova função `getDailyChangeSeries` (7 chamadas reais a `MarketPulseService.computeForRange`, uma por dia) e `CambioCard` usa o `history` já existente de `getExchangeSnapshot`. Nunca fabrica pontos — uma série vazia/curta mostra "Sem histórico suficiente" em vez de um gráfico falso.
- **`Benefits.tsx`** reescrito como faixa horizontal fina (5 itens ícone+texto) em vez de grid de cards maiores.
- **`LiveCameras.tsx`** reescrito como grid denso de 4 slots nomeados (Ponte da Amizade, Shopping China, Pedro Juan Caballero, Ciudad del Este) — **decisão deliberada**: a referência mostra essas 4 câmeras com badge "Ao vivo" e thumbnails de vídeo, mas nenhum feed real existe. Em vez de fabricar um estado "ao vivo" falso, cada slot mostra honestamente "Em breve" — a densidade visual da referência foi reproduzida, o dado fictício não.
- **`HeroGlobe.tsx`** enriquecido (silhueta de skyline via SVG, arco de conexão Brasil↔Paraguai) — ainda não é a ilustração fotorrealista da referência (fora do alcance de um agente de código gerar uma imagem 3D renderizada), mas mais próximo do que a primeira versão.
- **Hero** ganhou 3 marcadores de recurso (ícone+texto) entre o subtítulo e a busca, e um 5º card qualitativo "Economia garantida" ao lado dos 3 stats numéricos reais.

**Verificado novamente contra o dev server real** após a revisão: todos os blocos novos confirmados renderizando com dado real (6 lojas no carrossel, contagens honestas em zero no Market Pulse, estado gracioso "Cotação em sincronização" no Câmbio, badges "Em breve" corretos nas câmeras, `Ao vivo` aparecendo exatamente 1 vez — no card Live Marketplace, que genuinamente tem dado ao vivo).

---

## 10. Limitações honestas — o que fica para Waves futuras

- **Câmbio ao Vivo depende de uma credencial externa não configurada** (`EXCHANGE_RATE_API_KEY`) — não é algo que uma Wave de engenharia resolve sozinha; precisa da chave real provisionada.
- **Market Pulse/Marketplace em Tempo Real ainda não têm volume real de `price_increased`/`price_decreased`** — vão preencher sozinhos conforme os 4 conectores rodarem novos ciclos de sync (nenhuma mudança de código necessária).
- **Câmeras ao Vivo**: arquitetura pronta (`LiveCameraFeed`), zero integração — aguardando decisão de fonte real de stream.
- **"Perguntar à IA"**: botão e posição preservados, integração de chat explicitamente fora do escopo desta Wave (mandato: "apenas preparar integração").
- **Página de detalhe de categoria** (`/categorias/[slug]`) não foi criada — o mandato pediu apenas a página de listagem (`/categorias`); cada card já linka para `/products?category=slug` (rota real, existente), não para uma rota nova.
