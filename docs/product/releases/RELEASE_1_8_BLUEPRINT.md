# RELEASE_1_8_BLUEPRINT.md
# Blueprint Estratégico — Marketplace Expansion & Live Commerce

**Versão**: 1.0
**Criado**: 2026-07-02
**Status**: Proposto — aguardando aprovação do CTO para iniciar Wave 1
**Tipo de Release**: Growth + Real-Time Infrastructure + Monetization (compounding)
**Fase**: 5 — Expansão de Mercado e Monetização
**Número de Release**: 1.8
**Pré-requisito**: Release 1.7 CERTIFIED, LOCKED, DATABASE SYNC, FOUNDATION STABLE (`docs/operations/RELEASE_CERTIFICATION_1.7.md`)
**Nenhum código foi escrito para produzir este documento** — arquitetura estratégica apenas, conforme mandato do CTO.

---

## COMO LER ESTE DOCUMENTO

Este Blueprint tem duas partes. Os **Capítulos 1–12** respondem à pergunta "o que construir e em que arquitetura" — um por domínio, na ordem em que o mandato do CTO os apresentou. O **Relatório Executivo Final** (após o Capítulo 12) sintetiza os 12 capítulos nas 13 dimensões que o CTO pediu explicitamente (Visão, Objetivos, Problemas, Oportunidades, Arquitetura, Assets, Moats, Roadmap, Waves, Critérios de Sucesso, KPIs, Riscos, Ordem de Implementação) e responde à pergunta obrigatória de encerramento.

**Uma reconciliação importante, feita com honestidade antes de qualquer outra coisa**: o mandato do CTO nomeia novos Assets (Live Commerce Intelligence, Exchange Intelligence, Marketplace Intelligence, Buyer Intelligence, Merchant Intelligence) e novos Moats (Data Flywheel, Network Effect, Historical Knowledge, Brain, Marketplace Scale, SEO Dominance) a projetar no Capítulo 10/11. `STRATEGIC_ASSETS.md` e `MOAT_STRATEGY.md` já são documentos **PERMANENTES** com um catálogo oficial (6 Core Assets, 5 Supporting, 4 Future; 8 Moats) e uma regra de governança explícita contra duplicação (`STRATEGIC_ASSETS.md` Anti-Pattern 3 — "Duplicar ativos sem fusão"; `MOAT_STRATEGY.md` já rejeitou formalmente "Brand Trust", "Automation" e "AI Learning" como Moats independentes pelo mesmo motivo). Data Flywheel (Moat 6), Historical Data (Moat 1) e o Brain (Moat 7) **já existem**. Antes de propor qualquer coisa nova, o Capítulo 10/11 faz esse trabalho de reconciliação explicitamente — nomeando o que já existe e fortalece, versus o que é genuinamente novo e precisa de ADR. Isso não é desvio do mandato — é a aplicação do próprio `NORTH_STAR.md` Filtro 9 ("aumenta nosso moat?") com rigor, em vez de inflar o catálogo por conveniência retórica.

---

# CAPÍTULO 1 — MARKETPLACE EXPANSION

## O que já existe e o que muda

O Release 1.7 construiu — mas não usou em volume — exatamente a infraestrutura que este capítulo explora: `src/domains/connectors/` (framework de conectores reutilizável, Epic 1), `src/domains/connectors/discovery/` (Discovery via sitemap/robots parsing, Wave 2), `src/domains/product-identity/` (correspondência determinística de produto, Wave 3) e `src/domains/canonical-catalog/` (identidade permanente de produto, Wave 4). O princípio de `NORTH_STAR.md` §13 ("o primeiro conector levou semanas, o segundo levará dias, o décimo levará horas") ainda não foi testado com volume real — hoje existe um único conector de referência (Shopping China, Release 0.9) e zero conectores adicionados desde então. A Marketplace Expansion é o primeiro teste real dessa tese de compounding.

## As lojas-alvo e como classificá-las

Cellshop, Shopping China (já conectada), Nissei, Mega Eletrônicos, Atacado Games, Roma Shopping, Casa Americana, Monalisa, Elegância Company e outras não fazem parte de um lote homogêneo — cada uma exige uma abordagem técnica diferente, e a priorização deve refletir isso, não apenas "importância de marca".

**Duas trilhas de integração:**

1. **Trilha Discovery-first**: lojas com site público navegável e catálogo indexável (sitemap.xml próprio, estrutura de página de produto consistente). Usa `SitemapDiscoverySource`/`DiscoveryService` (já existentes) para descobrir a loja, e um scraper HTML genérico (novo, mas reutilizável — mesmo princípio de "conector reutilizável" do Epic 1) para extrair oferta/preço. Custo de integração: baixo, mas frágil a mudanças de layout do site-alvo — requer monitoramento de falha de parsing.
2. **Trilha Connector-first**: lojas com feed estruturado (JSON/CSV/XML de catálogo, API própria, ou parceria comercial que forneça acesso a dados). Usa o padrão `IConnector` já estabelecido (`JsonFieldMapper`/`CsvFieldMapper` já existentes). Custo de integração: mais alto inicialmente (requer entendimento do formato específico), mas resultado mais robusto e menos frágil a longo prazo — o padrão exato que `S-3 Connector Knowledge` (`STRATEGIC_ASSETS.md`) já descreve como ativo de suporte.

## Critério de priorização (score, mesmo espírito do `NORTH_STAR.md` §6)

| Dimensão | Peso | Como medir |
|---|---|---|
| **Complementaridade de categoria** | 30 pts | A loja vende categorias já presentes no catálogo (permite comparação real, mission-critical) ou categorias novas (expande cobertura, mas sem comparabilidade imediata)? Complementar pontua mais alto nesta fase — comparação é o valor central do produto hoje. |
| **Viabilidade técnica** | 25 pts | Trilha Discovery-first com site estável pontua mais alto que trilha Connector-first sem parceria comercial já iniciada (custo de integração imediato menor). |
| **Reconhecimento de marca / tráfego esperado** | 20 pts | Lojas com forte reconhecimento entre compradores brasileiros geram valor de SEO e confiança imediatos ao entrar no catálogo (efeito de rede indireto, `BUSINESS_MODEL.md` §5). |
| **Qualidade de dado esperada** | 15 pts | Loja com preços/estoque historicamente consistentes (avaliação qualitativa inicial) reduz o risco de poluir o Historical Price Data (C-1) com ruído — `S-2 Data Quality Layer` como filtro de entrada, não só de saída. |
| **Disponibilidade para claim/parceria** | 10 pts | Lojas já "descobertas" (Wave 2, `stores.discovered_at` preenchido) mas não reivindicadas são prioritárias — ativam o funil Wave 5 (Smart Claim Flow) imediatamente após a importação, sem depender de contato comercial prévio. |

**Como aplicar**: cada loja-alvo recebe o score antes de entrar na Wave 3 (ver Capítulo 12). Não é burocracia — é a diferença entre gastar o primeiro ciclo de expansão em lojas que geram comparação real hoje, versus lojas que apenas aumentam a contagem do catálogo sem aumentar decisões melhores (o Anti-Goal explícito de `NORTH_STAR.md` §11: "não existimos para maximizar volume sem problema identificado").

## O que NÃO muda nesta Wave

A garantia estrutural de `RELEASE_1_7_BLUEPRINT.md` Capítulo 8 (toda correspondência de produto converge para `product-identity/`, nunca duplicada por conector) permanece absoluta. Nenhum scraper novo implementa sua própria lógica de "é o mesmo produto" — todos alimentam o pipeline `Validation → Normalization → Deduplication → ProductIdentityShadow → Media → CatalogWrite` já existente.

---

# CAPÍTULO 2 — LIVE PRICING ENGINE

## Por que "nunca diária" é uma decisão estrutural, não uma otimização

Um comparador que atualiza preços uma vez por dia mostra preços que já podem estar errados por até 24 horas — exatamente o tipo de informação não confiável que `NORTH_STAR.md` §2 classifica como decisão pior, não melhor. Live Pricing não é uma feature de performance; é um requisito da própria missão (`AI_CONSTITUTION.md` III: "compradores... com confiança e contexto histórico suficiente para agir sem arrependimento" — arrependimento nasce de preço desatualizado).

## Arquitetura proposta: tiers de demanda, não um cron único

Hoje o scheduler (`VercelCronScheduler`, Wave 2) roda por conector, em intervalo fixo configurado por loja (`syncFrequencyHours`) — um modelo "toda a loja atualiza no mesmo ritmo" incompatível com o requisito deste capítulo. A mudança estrutural: **a unidade de refresh deixa de ser o conector e passa a ser a oferta individual**, classificada em um tier de demanda.

```
Tier "hot"   (2–5 min)   — produtos com maior volume de views/comparações/cliques
                            nos últimos N dias (sinal já existe: buyer_events,
                            Release 1.6 Epic 2 — Merchant Analytics Platform)
Tier "warm"  (10–30 min) — produtos com volume médio
Tier "cold"  (1–24h)     — produtos com volume baixo ou zero
```

**Classificação de tier**: computada periodicamente (não em tempo real) a partir de uma contagem decadente de eventos `analytics_offer_viewed`/`analytics_offer_clicked` (já emitidos, Release 1.6) por oferta — reaproveita um ativo que já existe (`C-6 Buyer Behavioral Knowledge`) em vez de instrumentar um novo. Nenhuma tabela nova para a contagem — uma view materializada ou uma coluna `demand_tier` recalculada em `offers`, atualizada por um job de baixa frequência (ex.: a cada hora), é suficiente para o volume atual.

**Execução do refresh, sem infraestrutura de fila nova**: este projeto não tem Redis/BullMQ (confirmado, ADR-042 parte 3, Wave 6) — introduzir uma fila real é uma decisão de infraestrutura Tipo 1 (`NORTH_STAR.md` §12) que este Blueprint não decide unilateralmente. A proposta pragmática para a Wave 2 (ver Capítulo 12): três endpoints de cron separados (`/api/cron/pricing/hot`, `/warm`, `/cold`), cada um no menor intervalo que o plano Vercel Cron permitir (mínimo prático: 1 min em planos pagos), cada execução processando um lote de ofertas "vencidas" (passou o tempo do seu tier desde o último check) — não uma fila, mas uma consulta priorizada por `next_check_due_at`. Isso é suficiente para os tiers propostos sem exigir uma reescrita de infraestrutura. **Se o volume de ofertas "hot" um dia exceder o que um cron de 1 minuto processa em lote**, a decisão de introduzir fila real vira um ADR explícito — nomeado aqui como risco conhecido (Capítulo 12 do Relatório Final), não resolvido silenciosamente.

**Fonte do preço em si**: reaproveita os conectores já existentes (Epic 1) — o refresh não é uma nova forma de obter dado, é uma nova cadência de quando chamar o conector já implementado para uma oferta específica, em vez de re-sincronizar a loja inteira.

## Novo ativo gerado

Cada ciclo de refresh, sua duração e seu sucesso/falha é um dado novo — a "velocidade e confiabilidade de atualização" por oferta/loja. Isso é o núcleo do que o Capítulo 10 propõe como Core Asset novo (Live Commerce Intelligence).

---

# CAPÍTULO 3 — EXCHANGE ENGINE

## Estado atual (verificado no schema, não assumido)

`offers`/`price_history` já têm `price_usd` e `price_brl` como colunas paralelas independentes (Release 0.3/Sprint 3.5) — nunca convertidas uma da outra, ambas inseridas na importação. Não existe hoje uma tabela de taxas de câmbio, nem PYG como moeda representada, nem um registro de "qual taxa foi usada" para qualquer conversão. Este capítulo substitui esse modelo dual-coluna implícito por um Exchange Engine real.

## Arquitetura proposta

**`exchange_rates`** (nova tabela, INSERT-only — mesma disciplina de `price_history`, `Anti-Pattern 5` de `STRATEGIC_ASSETS.md`: nunca sobrescrever, cada nova cotação é uma nova linha):

```
pair            text   (ex.: 'USD/PYG', 'USD/BRL', 'BRL/PYG')
rate            numeric
source          text   (nome do provedor de câmbio — decisão de fornecedor é Tipo 1, ver Riscos)
captured_at     timestamptz
```

**Regra permanente, decisão já aprovada pelo CTO**: "nunca substituir o preço original." Isso significa: `offers`/`price_history` ganham `original_currency` (a moeda em que o merchant realmente informa o preço — hoje isso não é capturado explicitamente, é inferido pela coluna preenchida) e o preço original nunca é sobrescrito por uma conversão. A conversão é sempre um valor **derivado, calculado no momento da leitura ou registrado como um snapshot adicional** — nunca substitui `price_usd`/`price_brl` originais na oferta.

**`ExchangeService`** (novo, análogo em desenho a `OfferRankingService`/`CanonicalPriceHistoryService` do Canonical Catalog — computa sob demanda, sem nova tabela de agregação): resolve a taxa aplicável (mais recente disponível, ou a taxa vigente no momento em que um preço histórico foi registrado, para consistência de gráficos históricos) e retorna `{ originalPrice, originalCurrency, rateUsed, convertedPrices: { usd, brl, pyg } }` — nunca um número opaco, mesma disciplina de explainability do `ProgressiveVerificationEngine`/`OfferRankingService`.

**Frequência de atualização da cotação**: "praticamente em tempo real" (decisão já aprovada) não significa a cada segundo — significa que a defasagem entre a cotação exibida e a cotação real de mercado nunca é perceptível para uma decisão de compra. Proposta: atualização a cada 5–15 minutos via um provedor de câmbio externo (fornecedor específico é decisão de Wave, não deste Blueprint — ver ADR pendente no Capítulo 12).

## Relação com o Cross-Border Context Model (C-5) já existente

`STRATEGIC_ASSETS.md` já define `C-5 Cross-Border Context Model` como Core Asset — hoje classificado "**Implícito, não estruturado**" na Síntese do Catálogo (linha 349). O Exchange Engine é, precisamente, a instrumentação que faz C-5 avançar do Estágio 1 (Ideia) para o Estágio 2 (Instrumentação) do Asset Lifecycle (`STRATEGIC_ASSETS.md` Capítulo 3) — não um ativo novo. Ver Capítulo 10 para o detalhamento formal dessa maturação.

---

# CAPÍTULO 4 — FRESHNESS ENGINE

## O que é, tecnicamente

Uma camada de apresentação e scoring sobre o Live Pricing Engine (Capítulo 2) — não uma nova fonte de dado. Toda oferta já tem, implicitamente, um "último check" a partir do momento em que o Live Pricing Engine passa a registrar `last_checked_at` por oferta (campo novo, trivial). O Freshness Score é uma função de `(agora − last_checked_at)` normalizada pelo tier de demanda esperado daquela oferta (Capítulo 2) — uma oferta "hot" com 20 minutos sem check é mais preocupante que uma oferta "cold" com 20 minutos sem check.

## Status visual (UI, Tipo 2 — decisão reversível, não bloqueante)

```
< 5 min          → "Atualizado agora" (verde)
5–30 min         → "Atualizado há N minutos" (verde/amarelo conforme tier)
30 min – 6h      → "Atualizado há N horas" (amarelo)
> 6h             → "Atualizado há N horas" (cinza — ainda confiável, não escondido)
> tier esperado × 3 → sinalizado como "verificação atrasada" (vermelho — sinal de alerta operacional, não escondido do comprador)
```

**Princípio permanente**: o Freshness Score nunca esconde uma oferta desatualizada — apenas a rotula honestamente. Isso é consistente com `AI_CONSTITUTION.md` V: "Estado honesto, sempre... falsos positivos são mais perigosos que falsos negativos." Uma oferta com preço antigo mostrado como "atualizado agora" seria exatamente esse falso positivo.

## Relação com `OfferRankingService` (Wave 4, já existente)

`OfferRankingService` já tem um fator de "recência" no ranking interno de ofertas (Canonical Catalog, Wave 4) — hoje um fator invisível ao comprador. O Freshness Engine é a promoção desse fator interno para um **sinal de confiança visível e nomeado**, consistente com o princípio de `PRODUCT_PRINCIPLES.md`/`NORTH_STAR.md` de transparência algorítmica: o comprador não apenas se beneficia do ranking por recência — ele vê por que uma oferta está mais alta.

---

# CAPÍTULO 5 — MARKET INTELLIGENCE

## O que já existe vs. o que este capítulo adiciona

`C-1 Historical Price Data` (preço/disponibilidade ao longo do tempo) já existe e acumula automaticamente. Este capítulo não cria uma nova fonte de dado bruto — cria a **camada analítica** sobre o que já existe: velocidade de mudança, volatilidade, sazonalidade, e rankings agregados (loja, categoria, marca) que hoje não existem em nenhuma forma.

## Componentes propostos

**Velocidade de alteração**: frequência com que uma oferta muda de preço/estoque por unidade de tempo — computável diretamente de `price_history`, sem nova coleta.

**Volatilidade**: desvio padrão do preço em uma janela móvel (ex.: 30/90 dias) por produto canônico (`canonical_products`, Wave 4 — a agregação correta é por identidade permanente, não por oferta isolada, mesma lição já aplicada em `CanonicalPriceHistoryService`).

**Sazonalidade**: correlação entre época do ano e variação de preço/demanda por categoria — requer pelo menos um ciclo anual completo de dados para ser estatisticamente significativa (`STRATEGIC_ASSETS.md` Capítulo 3, Estágio 3 "Coleta Inicial" — este componente especificamente vai ficar nesse estágio por um bom tempo, e isso deve ser comunicado honestamente, não apressado).

**Ranking de lojas**: já existe parcialmente (`stores-public.service.ts`, `getStoresRanking`, Release 1.4) — este capítulo estende o critério de ranking com os novos sinais de Live Pricing/Freshness (Capítulos 2/4), não recria do zero.

**Ranking de categorias e marcas**: genuinamente novo — nem `products`/`brands`/`categories` têm hoje nenhuma página ou cálculo de desempenho agregado. Depende de volume suficiente de ofertas por categoria/marca para ser significativo (mais uma razão para sequenciar este capítulo depois da Marketplace Expansion, ver Capítulo 12).

## Relação com o Future Asset já catalogado

`STRATEGIC_ASSETS.md` já define `F-4 Marketplace Liquidity Model` (Future Asset, "Não iniciado") como exatamente este tipo de modelagem de oferta/demanda por categoria. Este capítulo é a instrumentação que gradua F-4 de "Não iniciado" para "Coleta Inicial" — mesma lógica de maturação aplicada ao Exchange Engine no Capítulo 3. Ver Capítulo 10.

---

# CAPÍTULO 6 — BUYER EXPERIENCE

## O gap estrutural que precisa ser nomeado primeiro

`docs/engineering/TECH_DEBT.md` já registra: `useFavorites` funciona hoje só via `localStorage`, sem sincronização entre dispositivos e sem plano de migração para favoritos por usuário autenticado. Mais fundamentalmente: **este projeto não tem hoje um sistema de conta de comprador real** — `types/user.ts` existe como placeholder vazio desde o scaffold original. Toda a autenticação construída até o Release 1.7 é para `merchant`/`admin`, nunca para `buyer`. Este é o pré-requisito estrutural deste capítulo inteiro, e é uma decisão **Tipo 1** (`NORTH_STAR.md` §12 — schema de dados pessoais, modelo de domínio, segurança de acesso) que precisa de ADR formal antes de qualquer Wave começar (ver Capítulo 12).

## Evolução proposta, em ordem de dependência

1. **Buyer Account System** (pré-requisito): conta real (Supabase Auth, mesmo padrão já usado por merchant/admin), migração de `useFavorites` de `localStorage` para tabela `buyer_favorites` (server-side, sincronizada entre dispositivos) — fecha o débito já nomeado em `TECH_DEBT.md`.
2. **Favoritos** (evolução, não criação): já existe como conceito de UI; passa a persistir server-side.
3. **Comparações**: já existe (`compare.service.ts`, `/compare/[slug]`) — este capítulo não muda a mecânica, mas passa a registrar histórico de comparações por comprador autenticado (novo sinal para `C-6 Buyer Behavioral Knowledge`).
4. **Wishlist**: distinta de Favoritos por intenção — Favoritos é "gosto/acompanho", Wishlist é "quero comprar, aguardando o momento certo" (liga diretamente com Alertas e Compra Inteligente, itens 5 e 7). Requer schema novo, mas reaproveita o mesmo padrão de `buyer_favorites`.
5. **Alertas de preço**: depende estruturalmente do Live Pricing Engine (Capítulo 2) e do Freshness Engine (Capítulo 4) — um alerta baseado em preço atualizado uma vez por dia não cumpriria a mesma promessa de confiabilidade. Arquitetura: `price_alerts` (comprador, oferta ou produto canônico, preço-alvo), avaliado no mesmo ciclo de refresh do Live Pricing Engine (o alerta é verificado exatamente quando o preço é atualizado, sem um segundo job separado).
6. **Histórico**: unifica histórico de busca, comparação e visualização por comprador autenticado — hoje esses eventos já são emitidos (`buyer_events`, Release 1.6) mas atrelados a `anonymous_id`, não a uma conta persistente. A conta de comprador (item 1) é o que permite consolidar esse histórico ao longo de sessões e dispositivos.
7. **Notificações**: canal de entrega para Alertas — requer decisão de infraestrutura (push web, e-mail, ou ambos; nenhum provedor de notificação existe hoje no projeto) — Tipo 1, nomeado como pré-requisito de Wave, não decidido aqui.
8. **Compra Inteligente**: a funcionalidade mais avançada deste capítulo — recomendação de "comprar agora ou esperar", informada pela Volatilidade (Capítulo 5) e pelo histórico de preço do produto (C-1). Não é IA generativa — é uma regra explicável (mesma disciplina do `ProgressiveVerificationEngine`/`OfferRankingService`): "este produto historicamente cai de preço em [contexto]; a variação dos últimos 90 dias foi de X%; hoje está Y% abaixo/acima da média" — nunca uma previsão opaca.

---

# CAPÍTULO 7 — SEO EXPANSION

## Onde o Wave 6 (Release 1.7) já deixou a fundação

A certificação da Wave 6 (`RELEASE_CERTIFICATION_1.7.md`) já entregou sitemap-index via `generateSitemaps()` para produtos/compare (sharding automático, sem teto de ~25 mil produtos) e confirmou JSON-LD (`Product`, `LocalBusiness`, `BreadcrumbList`) já implementado em `product/[slug]`, `store/[slug]`, `lojas/[slug]`. Este capítulo não repete esse trabalho — expande a **cobertura de tipos de página**, que hoje é limitada a produto/loja/comparação.

## Páginas novas propostas

**`/categoria/[slug]`** e **`/marca/[slug]`**: hoje não existem como rotas (`TECH_DEBT.md` já registra `/categories/[slug]` como link morto desde a Sprint 3.3). Cada uma se torna uma página real, com ranking de categoria/marca (Capítulo 5) como conteúdo diferenciado — não uma lista genérica, mas "os produtos mais buscados desta categoria nesta semana, com variação de preço média" — conteúdo que só o ParaguAI pode gerar porque depende de Search Intelligence (C-4) e Market Intelligence (Capítulo 5) proprietários.

**Landing pages programáticas**: páginas geradas a partir de combinações de intenção de busca real (`C-4 Search Intelligence`, lacunas de busca já mapeadas) — ex.: "[categoria] em Ciudad del Este", "[produto] mais barato na fronteira". A regra permanente que governa este componente: **conteúdo gerado programaticamente deve sempre ser lastreado em dado real e único** (preço, histórico, disponibilidade — nunca texto template sem dado por trás). Isso não é só qualidade de produto — é proteção contra penalização de conteúdo fino/duplicado por mecanismos de busca, um risco real quando se gera centenas de milhares de páginas (ver Capítulo 13 do Relatório Final, Riscos).

**Conteúdo automático**: resumos gerados a partir de Market Intelligence (Capítulo 5) — "preço médio desta categoria caiu X% no último mês", "loja Y tem o histórico mais estável de preço nesta categoria" — nunca IA generativa criando afirmações não verificáveis; sempre uma síntese de dado real já calculado, mesma disciplina de explainability de todo o resto deste Blueprint.

## Por que este capítulo vem depois de Market Intelligence no roadmap

SEO em escala sem conteúdo diferenciado é a mesma armadilha que `MOAT_STRATEGY.md` Anti-Pattern 2 já nomeia: "depender exclusivamente de SEO como aquisição" é frágil porque SEO por si só não é um Moat (ver reconciliação no Capítulo 11). Gerar centenas de milhares de páginas antes de ter os dados de Market Intelligence que as tornam unicamente valiosas produziria exatamente o tipo de conteúdo fino que o próprio MOAT_STRATEGY adverte contra. A sequência importa (ver Capítulo 12).

---

# CAPÍTULO 8 — MERCHANT GROWTH

## O princípio já é doutrina, não uma ideia nova

"Jamais vender imediatamente. Primeiro entregar valor. Depois vender" já é exatamente a filosofia que `BUSINESS_MODEL.md` §6 descreve para Planos de Merchant ("o plano gratuito oferece valor real... lojistas convertidos são os que ficam") e que o Release 1.6 (Growth Engine) e a Wave 5 (`PremiumUpgradeService`, lead-capture apenas, ADR-035) já implementaram estruturalmente. Este capítulo não introduz o princípio — completa a implementação que ele já exige.

## O gap que falta fechar

Hoje `merchant_plans` existe com 4 tiers (free/pro/business/enterprise) e preços definidos, mas **nenhuma rota cobra de fato** — `PremiumUpgradeService` só registra interesse (`merchant_upgrade_leads`), e `PremiumActivated`/`PremiumTrialStarted` são apenas taxonomia no Brain (ADR-035, confirmado ainda válido na Wave 5). Este capítulo propõe fechar esse funil: integração de billing real.

## Sequência de conversão proposta (valor antes de venda, operacionalizado)

1. **Onboarding do plano Free entrega valor real e mensurável** — já existe (Growth Center, Catalog Health, Command Center, Release 1.6). Nenhuma mudança aqui, apenas o pré-requisito confirmado.
2. **Gatilhos de upgrade nascem de limite ou de insight bloqueado, nunca de push genérico** — ex.: um lojista que atinge `max_products` do plano Free, ou que vê uma recomendação do Growth Engine marcada "disponível no plano Pro", é o momento certo de oferecer upgrade — porque o valor específico que ele ganharia já foi demonstrado, não prometido.
3. **Billing real** (Tipo 1, decisão de fornecedor — Stripe é o padrão de mercado mais compatível com cobrança em USD, decisão já aprovada pelo CTO; fornecedor final e modelo de assinatura recorrente vs. cobrança única precisam de ADR antes da Wave correspondente, ver Capítulo 12).
4. **`PremiumTrialStarted`/`PremiumActivated` passam de taxonomia para emissão real** — fecha o gap nomeado desde a Wave 5.

## Pré-requisito recomendado: ADR-041 (Trust Signal — Cálculo e Componentes)

`STRATEGIC_ASSETS.md` já registra que `C-2 Merchant Trust Score` não tem, até hoje, um algoritmo de cálculo real — `trust_score` existe como campo, mas ADR-041 (reservado desde o Release 1.5, `RELEASE_1_5_BLUEPRINT.md`) nunca foi escrito. O Merchant Growth deste Release depende de sinais de confiança reais para calibrar quando e como recomendar upgrade — recomenda-se fortemente escrever ADR-041 antes ou durante a Wave de Merchant Growth (Capítulo 12), fechando uma dívida de dois Releases em vez de adicionar mais lógica sobre um score ainda não formalizado.

---

# CAPÍTULO 9 — FRONTEIRA AGORA

## O que é, estruturalmente

Não um novo domínio de dados — um **hub de widgets na Home**, cada um consumindo um dado que ou já existe (horários de loja, já no schema `stores`) ou nasce de outro capítulo deste Blueprint (cotação do dólar → Exchange Engine, Capítulo 3) ou depende de uma integração externa nova (câmeras, clima, status da Ponte da Amizade).

## Componentes, classificados por origem de dado

| Componente | Origem | Complexidade |
|---|---|---|
| Cotação do dólar + conversão automática | Exchange Engine (Capítulo 3) — já será construído | Baixa (reaproveita) |
| Horários de funcionamento das lojas | `stores.opening_hours` — já existe no schema | Baixa (só exposição em UI) |
| Datas comemorativas | Calendário estático/configurável, sem dependência externa | Baixa |
| Clima | Integração externa nova (provedor de clima) | Média |
| Status da Ponte da Amizade | Integração externa nova — **nenhuma fonte de dado oficial confirmada ainda**; requer pesquisa de viabilidade antes de comprometer a Wave | Alta, incerta |
| Câmeras ao vivo | Integração externa nova, **condicional a viabilidade legal** (o próprio mandato do CTO já qualifica isso com "quando legalmente permitido") — requer avaliação jurídica antes de qualquer implementação | Alta, condicional |
| Fluxo da fronteira | Sem fonte de dado pública conhecida hoje — mesmo risco de viabilidade da Ponte da Amizade | Alta, incerta |

## Recomendação estrutural

Este capítulo não deve ser uma Wave única "tudo ou nada" — os três componentes de baixa complexidade (câmbio, horários, datas) entregam a maior parte do valor de "portal da fronteira" imediatamente e sem risco de viabilidade externa. Os quatro componentes de alta incerteza (câmeras, Ponte da Amizade, clima, fluxo) devem ser tratados como sub-waves independentes, cada uma só avançando depois de confirmada a viabilidade de fonte de dado — nunca bloqueando o lançamento do bloco "Fronteira Agora" como um todo (ver Capítulo 12).

---

# CAPÍTULO 10 — NOVOS ASSETS

**Governança aplicável, já permanente**: `STRATEGIC_ASSETS.md` Capítulo 7 — "Core Assets: somente o CTO, com ADR formal que justifique o novo ativo, descreva o schema de dados, o mecanismo de crescimento e o Moat que sustenta." Nada abaixo é auto-aprovado por este Blueprint — cada proposta de Core Asset novo precisa de um ADR dedicado antes de sua Wave correspondente começar.

## Reconciliação com o catálogo oficial existente

| Nome pedido pelo CTO | O que realmente é | Tratamento proposto |
|---|---|---|
| **Exchange Intelligence** | Já é parte da definição de `C-5 Cross-Border Context Model` ("dinâmicas de câmbio e seu impacto nos preços"), hoje classificado "Implícito, não estruturado" | **Não é um ativo novo.** É a maturação de C-5 do Estágio 1 para o Estágio 2 (Instrumentação) via o Exchange Engine (Capítulo 3). Requer apenas uma atualização de status em `STRATEGIC_ASSETS.md`, não um novo ADR de criação — mudança de estágio dentro de um ativo já existente. |
| **Marketplace Intelligence** | Sobreposição com `C-4 Search Intelligence` (já Core) e `F-4 Marketplace Liquidity Model` (já Future, "Não iniciado") | **Não é um ativo novo.** Market Intelligence (Capítulo 5) é a instrumentação que gradua F-4 de "Não iniciado" para "Coleta Inicial" — mesma lógica de maturação do item acima. |
| **Buyer Intelligence** | Já é `C-6 Buyer Behavioral Knowledge` (já Core, "Incipiente") | **Não é um ativo novo.** A Buyer Experience (Capítulo 6) — especialmente contas autenticadas — é o que faz C-6 avançar de "Incipiente" para "Ativo Maduro" (correlação de sessão persistente é literalmente o critério de maturação já escrito na definição de C-6). |
| **Merchant Intelligence** | Sobreposição com `C-2 Merchant Trust Score` (já Core) e `S-1 Merchant Network` (já Supporting) | **Não é um ativo novo.** Merchant Growth (Capítulo 8) aprofunda C-2 (ao depender de ADR-041) e S-1 (ao converter mais lojas descobertas em merchants ativos). |
| **Live Commerce Intelligence** | Não corresponde a nenhum ativo existente — o conhecimento de *velocidade e confiabilidade de atualização* por oferta é qualitativamente diferente do dado histórico em si (C-1) | **Candidato genuíno a Core Asset novo.** Ver proposta formal abaixo — `C-7`. |

## Proposta formal — Asset C-7: Live Commerce Velocity

**Definição**: o conhecimento acumulado de com que frequência e confiabilidade cada oferta é verificada e atualizada — não o preço em si (isso é C-1), mas o comportamento operacional da própria coleta: taxa de sucesso de refresh por tier de demanda, latência entre mudança real de preço no merchant e captura pelo ParaguAI, histórico de degradação por conector/loja.

**Como nasce**: com o primeiro ciclo do Live Pricing Engine (Capítulo 2) registrando `last_checked_at`/sucesso por oferta.

**Como cresce**: automaticamente, a cada ciclo de refresh — sem ação deliberada além da infraestrutura já operando.

**Como fortalece outros ativos**: alimenta o Freshness Engine (Capítulo 4) diretamente; retroalimenta `S-2 Data Quality Layer` (conectores com degradação de confiabilidade são sinalizados antes que corrompam C-1); é insumo direto para o Brain aprender quais lojas/conectores merecem maior confiança de dado em tempo real, não apenas histórico.

**Critérios de ativo estratégico (`STRATEGIC_ASSETS.md` Capítulo 1) satisfeitos**: acumulação (cresce automaticamente com operação), permanência (o histórico de confiabilidade de um conector não perde valor com o tempo — só fica mais preciso), diferenciação (nenhum concorrente que comece hoje tem esse histórico operacional, mesmo que copie a lista de lojas).

**Moat primário sustentado**: proposto como base do Moat 9 — ver Capítulo 11.

**Ação requerida**: ADR formal do CTO antes do início da Wave 2 (Live Pricing Engine), nomeando C-7 oficialmente no catálogo, conforme `STRATEGIC_ASSETS.md` Capítulo 7.

---

# CAPÍTULO 11 — NOVOS MOATS

**Governança aplicável**: `MOAT_STRATEGY.md` já rejeitou formalmente três candidatos por não resistirem à análise crítica (Brand Trust, Automation, AI Learning — Capítulo 2, "Itens descartados"). Este capítulo aplica o mesmo rigor aos seis nomes que o mandato do CTO propôs.

## Reconciliação com o catálogo oficial existente

| Nome pedido pelo CTO | Já existe como | Tratamento proposto |
|---|---|---|
| **Data Flywheel** | Moat 6, já catalogado | Não é um Moat novo. O Release 1.8 o **acelera** (mais lojas, mais dados de preço em tempo real, mais compradores autenticados alimentam o mesmo Flywheel já descrito) — não precisa de nova entrada no catálogo. |
| **Brain** | Moat 7, já catalogado | Não é um Moat novo. Todos os capítulos deste Blueprint alimentam o Brain (mesma relação já descrita em `MOAT_STRATEGY.md` Capítulo 6) — nenhuma mudança estrutural na definição do Moat. |
| **Historical Knowledge** | Moat 1 (Historical Data), já catalogado | Não é um Moat novo — mesmo nome em essência. Market Intelligence (Capítulo 5) o aprofunda com volatilidade/sazonalidade, mas não muda sua natureza. |
| **Network Effect** | Não é um Moat no catálogo — é o mecanismo descrito em `BUSINESS_MODEL.md` §5 que **alimenta** os Moats 2 e 6 | Não é um Moat novo — nomeá-lo como Moat próprio duplicaria o que já sustenta Moat 2/6. Buyer/Merchant accounts novos (Capítulos 6/8) fortalecem os efeitos de rede já descritos, sem precisar de uma nova entrada. |
| **Marketplace Scale** | Mais próximo de `S-1 Merchant Network` — já classificado explicitamente como **Supporting, não Core/Moat** ("o número de merchants é instrumental — não é valioso por si mesmo", `STRATEGIC_ASSETS.md`) | Não é um Moat novo — propor isso contradiria uma classificação já feita com rigor crítico. A Marketplace Expansion (Capítulo 1) fortalece Moat 3 (Merchant OS Switching Cost) e Moat 2 (Trust Network) indiretamente, via S-1 — não cria um moat de escala por si. |
| **SEO Dominance** | `MOAT_STRATEGY.md` Capítulo 11, **Anti-Pattern 2**, já adverte explicitamente: "depender exclusivamente de SEO como aquisição... o Moat do ParaguAI não pode ser um Moat de ranking" | **Proposta rejeitada como Moat independente** — aceitá-la contradiria uma regra permanente já escrita com essa exata linguagem. Reframing correto: a SEO Expansion (Capítulo 7) é uma **amplificadora de distribuição** dos Moats 1 e 6 (o conteúdo indexado só é defensável porque é lastreado em dado histórico/live pricing proprietário — um concorrente pode copiar a estrutura de página, não o dado por trás dela). Isso já é dito em `BUSINESS_MODEL.md` §7 ("SEO não é uma campanha... é uma consequência arquitetural"). |

## Proposta formal — Moat 9: Live Commerce Velocity Moat

O único candidato deste capítulo que resiste à mesma análise crítica que descartou os outros cinco, porque satisfaz os critérios de `MOAT_STRATEGY.md` Capítulo 1 de forma genuína:

**Tipo**: Operacional + Temporal. Cresce com operação sustentada, não pode ser comprado instantaneamente.

**O que é**: a capacidade demonstrada, sustentada ao longo do tempo, de manter preços atualizados em minutos para os produtos mais relevantes do mercado — apoiada no Asset C-7 (Capítulo 10).

**Por que resiste à análise que rejeitou "Marketplace Scale" e "SEO Dominance"**: não é escala por si (um concorrente pode ter mais lojas) nem ranking por si (pode ser copiado). É a combinação de **infraestrutura de refresh + sinal de demanda real (que só existe porque já há compradores usando a plataforma)** — um concorrente que entra hoje não tem os dados de popularidade de produto que tornam o sistema de tiers eficiente desde o primeiro dia; ele precisaria operar por tempo suficiente para acumular esse sinal, exatamente o padrão de defensabilidade que qualifica um Moat em `MOAT_STRATEGY.md` Capítulo 1 ("por que continuaremos melhores em cinco, dez e vinte anos, mesmo que um concorrente comece hoje com recursos iguais ou superiores?").

**Vulnerabilidade explícita (mesma disciplina de honestidade dos outros 8 Moats)**: este é o Moat mais jovem e o mais dependente de execução técnica contínua — se a infraestrutura de refresh degradar silenciosamente, o Moat se esvazia rapidamente, ao contrário de Historical Data (Moat 1), que nunca perde o que já acumulou. Requer monitoramento ativo (Asset Health Framework, `STRATEGIC_ASSETS.md` Capítulo 6) desde o primeiro dia.

**Ação requerida**: ADR formal do CTO, junto com o ADR de criação do Asset C-7 (Capítulo 10) — os dois nascem juntos, um Moat sem o Asset que o sustenta não é uma entrada válida no catálogo (`MOAT_STRATEGY.md` Capítulo 7, "Release → Asset → Moat").

---

# CAPÍTULO 12 — ROADMAP

## Princípio de sequenciamento

Nenhuma Wave deste Release começa sem responder à cadeia obrigatória `MOAT_STRATEGY.md` Capítulo 7 (Release → Asset → Moat) e ao Checklist Final de `NORTH_STAR.md` Capítulo 10. A ordem abaixo reflete dependência técnica real (não apenas prioridade de negócio) — algumas Waves não podem começar antes que a anterior entregue um pré-requisito estrutural.

## As Waves propostas

**Wave 1 — Exchange Engine** (Capítulo 3). Impacto imediato (visível em toda oferta existente, sem esperar novo catálogo), complexidade baixa-média (schema pequeno, um fornecedor externo). Matura C-5. Pré-requisito de Fronteira Agora (Wave 7) e melhora a precisão de toda comparação de preço existente hoje. **ADR necessário antes de começar**: fornecedor de câmbio.

**Wave 2 — Live Pricing + Freshness Engine** (Capítulos 2 e 4, entregues juntos — a Freshness Score não existe sem o Live Pricing rodando). O Release mais tecnicamente arriscado deste Blueprint (arquitetura de refresh tiered sem fila nova) e o que cria o Asset C-7 + Moat 9. **ADR necessário antes de começar**: criação formal de C-7/Moat 9; confirmação da arquitetura de cron tiered vs. investimento em fila real.

**Wave 3 — Marketplace Expansion, primeiro lote** (Capítulo 1). Aplica o critério de priorização do Capítulo 1 às lojas nomeadas pelo CTO, entrega 2–4 lojas usando a infraestrutura já pronta desde o Release 1.7, testando a tese de compounding de conectores com volume real pela primeira vez. Onboarding de lojas continua **em fluxo contínuo** depois desta Wave, não como evento único — cada nova loja usa o playbook já provado aqui.

**Wave 4 — Market Intelligence** (Capítulo 5). Depende de volume de dado das Waves 1–3 para produzir rankings/volatilidade significativos. Matura F-4.

**Wave 5 — SEO Expansion** (Capítulo 7). Depende de Market Intelligence (Wave 4) para gerar conteúdo diferenciado, não thin content. Categoria/marca como páginas reais.

**Wave 6 — Buyer Account System & Experience** (Capítulo 6). A Wave mais sensível deste Release (dados pessoais, autenticação nova, Tipo 1) — recomenda-se dividir internamente em 6a (contas + favoritos + comparações + histórico) e 6b (alertas + notificações + Compra Inteligente, que dependem de Waves 1–2 já estarem maduras). **ADR necessário antes de começar**: modelo de dados pessoais de comprador; fornecedor de notificação.

**Wave 7 — Fronteira Agora** (Capítulo 9). Bloco de baixa incerteza (câmbio, horários, datas) entra primeiro; sub-waves de alta incerteza (câmeras, Ponte da Amizade, clima, fluxo) avançam independentemente, condicionadas à confirmação de viabilidade legal/técnica de cada fonte externa.

**Wave 8 — Merchant Growth & Premium Billing** (Capítulo 8). Deliberadamente por último — "entregar valor antes de vender" só é uma promessa cumprida se todas as Waves anteriores já entregaram valor real antes de qualquer gatilho de upgrade aparecer. **ADR necessário antes de começar**: ADR-041 (Trust Signal, recomendado escrever durante ou antes desta Wave); fornecedor e modelo de billing.

## Por que esta ordem, e não outra

Se Merchant Growth (Wave 8) viesse antes de Live Pricing/Market Intelligence/SEO estarem maduros, a conversão Premium estaria vendendo uma promessa, não um resultado demonstrado — violação direta do princípio "entregar valor antes de vender" que o próprio CTO tornou decisão já aprovada. Se Buyer Accounts (Wave 6) viesse antes de Live Pricing (Wave 2), Alertas de preço (item central da Buyer Experience) seriam construídos sobre dados desatualizados — a mesma armadilha que o Capítulo 2 existe para evitar.

---

# RELATÓRIO EXECUTIVO FINAL

## 1. Visão Estratégica

O ParaguAI conclui o Release 1.7 como uma plataforma tecnicamente completa, auditada e segura — mas ainda um comparador de preços com atualização não diferenciada, cobertura de catálogo limitada e monetização não ativada. O Release 1.8 é a transição definida em `VISION_2035.md` Capítulo 3: de "Comparador de Preços" para "Ecossistema de Comércio" — o primeiro Release inteiramente dedicado a *crescimento do negócio* sobre uma fundação já congelada (`RELEASE_1_7_BLUEPRINT.md`, "até o Release 1.7 construímos a plataforma; a partir do 1.8 construímos o negócio"). Live Pricing, Exchange Engine e Freshness Engine, juntos, são a resposta arquitetural a uma pergunta que nenhuma Wave anterior respondeu: por que um comprador confiaria no ParaguAI mais do que em uma verificação manual na própria loja? A resposta proposta: porque o ParaguAI está mais atualizado do que qualquer verificação manual poderia estar.

## 2. Objetivos

1. Provar a tese de compounding de conectores (`NORTH_STAR.md` §13) com volume real de lojas, não apenas com um conector de referência.
2. Eliminar a defasagem de preço como fonte de decisão pior — nunca mais que minutos de atraso para os produtos que mais importam.
3. Formalizar câmbio como infraestrutura de primeira classe, não um par de colunas paralelas.
4. Ativar o primeiro funil de conta de comprador real do projeto — hoje inexistente.
5. Fechar o funil de monetização Premium que a Wave 5 preparou mas não ativou.
6. Expandir a cobertura de SEO além de produto/loja, com conteúdo genuinamente diferenciado.
7. Tornar a Home a porta de entrada real da fronteira, não apenas do catálogo.

## 3. Problemas que Resolveremos

- Preços desatualizados corroem a confiança que é o ativo mais caro de reconstruir (`BUSINESS_MODEL.md` §17).
- Comparação entre USD/BRL/PYG hoje é implícita e não auditável — um comprador não sabe que taxa foi usada.
- O catálogo tem profundidade insuficiente em categorias-chave para que a comparação seja significativa em todo lugar.
- Não existe hoje nenhuma forma de um comprador ser avisado quando um preço cai — a decisão de "quando comprar" continua manual.
- `merchant_plans` cobra preços definidos que ninguém paga de fato — o modelo de receita central do negócio (`BUSINESS_MODEL.md` §6) está construído, mas inativo.
- A Home não comunica a proposta de valor de "inteligência da fronteira" — hoje é essencialmente uma porta de entrada para busca de catálogo.

## 4. Oportunidades de Mercado

Nenhum concorrente identificado em `MOAT_STRATEGY.md` Capítulo 9 (marketplace local novo, player global, IA generativa, comparador internacional, redes sociais) tem hoje a combinação de: histórico de preço real + atualização em minutos + câmbio auditável específico deste mercado. Isso é exatamente o "que o concorrente não pode fazer" que cada Moat existente já nomeia — o Release 1.8 é a primeira vez que essas vantagens estruturais se tornam **visíveis e sentidas** pelo comprador, não apenas verdadeiras no banco de dados.

## 5. Arquitetura Conceitual

```
                    EXCHANGE ENGINE (Wave 1)
                            │
                            ▼
   MARKETPLACE          LIVE PRICING ENGINE (Wave 2)
   EXPANSION       ┌─────────┴─────────┐
   (Wave 3)         ▼                   ▼
        │      FRESHNESS ENGINE   [Asset C-7 /
        │       (Wave 2)           Moat 9 nascem aqui]
        │            │
        └──────┬─────┘
               ▼
      MARKET INTELLIGENCE (Wave 4)
               │
         ┌─────┴─────┐
         ▼           ▼
   SEO EXPANSION   BUYER ACCOUNTS
   (Wave 5)        & EXPERIENCE (Wave 6)
         │           │
         └─────┬─────┘
               ▼
      FRONTEIRA AGORA (Wave 7, em paralelo desde Wave 1 para o bloco de baixa incerteza)
               │
               ▼
   MERCHANT GROWTH & PREMIUM BILLING (Wave 8 — colhe valor de tudo acima)
```

## 6. Assets

Nenhum Core Asset novo além de **C-7 Live Commerce Velocity** (Capítulo 10). Dois Core Assets existentes maturam de estágio: **C-5 Cross-Border Context Model** (Implícito → Instrumentado, via Exchange Engine) e **F-4 Marketplace Liquidity Model** (Não iniciado → Coleta Inicial, via Market Intelligence). **C-6 Buyer Behavioral Knowledge** matura de Incipiente para Ativo Maduro via contas de comprador autenticadas. Todos requerem ADR formal antes da Wave correspondente, conforme `STRATEGIC_ASSETS.md` Capítulo 7.

## 7. Moats

Nenhum Moat novo além de **Moat 9 — Live Commerce Velocity** (Capítulo 11), nascido junto com C-7. Cinco das seis propostas originais do mandato do CTO (Data Flywheel, Brain, Historical Knowledge, Network Effect, Marketplace Scale) já existem ou são consequência de Moats existentes — tratá-las como novas duplicaria o catálogo. SEO Dominance foi explicitamente rejeitada como Moat independente por contradizer um Anti-Pattern já documentado; reframeada como amplificador de distribuição dos Moats 1 e 6.

## 8. Roadmap Completo

Ver Capítulo 12 — 8 Waves, sequenciadas por dependência técnica real, não apenas por prioridade de negócio.

## 9. Waves Propostas

1. Exchange Engine — 2. Live Pricing + Freshness Engine — 3. Marketplace Expansion (1º lote) — 4. Market Intelligence — 5. SEO Expansion — 6. Buyer Account System & Experience — 7. Fronteira Agora — 8. Merchant Growth & Premium Billing.

## 10. Critérios de Sucesso

Por `NORTH_STAR.md` §9 — nenhuma Wave é declarada concluída sem avançar pelo menos um destes estados:

- Mais decisões corretas: comprador vê preço confiável, com timestamp honesto, na moeda que entende.
- Menos trabalho manual: nenhum lojista precisa avisar manualmente sobre mudança de preço para que o ParaguAI capture.
- Mais inteligência: Market Intelligence produz pelo menos um insight que não existia antes (`STRATEGIC_ASSETS.md` Capítulo 3, critério do Estágio 4).
- Mais confiança: Freshness Score nunca mente sobre a idade de um dado.
- Mais retenção: um comprador com conta e alerta configurado tem razão concreta para voltar.
- Mais receita real: pelo menos um merchant paga de fato por um plano, não apenas demonstra interesse.

## 11. KPIs

| KPI | O que mede | Por que não é vanity metric |
|---|---|---|
| Freshness mediano de ofertas "hot" | Minutos desde o último check, produtos populares | Mede a promessa central do Capítulo 2 diretamente |
| % do catálogo em cada tier de demanda | Cobertura do Live Pricing Engine | Evita otimizar só os produtos fáceis |
| Taxa de sucesso de refresh por conector | Confiabilidade operacional (Asset C-7) | Detecta degradação antes que corrompa C-1 |
| Novas lojas integradas / semana | Marketplace Expansion | Mede o compounding de conectores na prática, não só na teoria |
| Alertas de preço → decisão de compra | Proxy de decisão melhor assistida | Alinhado à North Star Metric diretamente (não é CTR) |
| Contas de comprador ativas com Favoritos/Alertas configurados | Maturação de C-6 | Sinal de retenção real, não visita única |
| Páginas indexadas com conteúdo lastreado em dado único | SEO Expansion | Evita otimizar por volume de página vazia |
| Merchants pagantes / merchants com upgrade-interest registrado | Conversão real do funil Premium | A métrica que fecha o gap nomeado desde a Wave 5 |

## 12. Riscos

- **Dependência de fornecedor de câmbio externo** — custo, disponibilidade, SLA. Mitigação: ADR de fornecedor antes da Wave 1, com plano de fallback documentado.
- **Ausência de infraestrutura de fila real** pode não escalar além de um volume de ofertas "hot" ainda não estimado — nomeado explicitamente no Capítulo 2, não escondido.
- **Câmeras ao vivo e status da Ponte da Amizade têm viabilidade legal/técnica não confirmada** — tratados como sub-waves condicionais, nunca bloqueantes do restante da Wave 7.
- **Conteúdo SEO programático sem lastro de dado real arrisca penalização por conteúdo fino** — mitigado estruturalmente pela ordem do roadmap (SEO depois de Market Intelligence).
- **Buyer Account System é a primeira superfície de dados pessoais de comprador do projeto** — exige o mesmo rigor de auditoria de segurança que a Wave 6 aplicou a merchant/ownership (o achado crítico da Wave 6 é o lembrete direto de por que isso importa).
- **Billing real é a primeira movimentação financeira do projeto** — superfície de conformidade (PCI e equivalentes) nova, exige fornecedor estabelecido (Stripe ou equivalente), não construção própria.
- **Pressão de receita pode antecipar gatilhos de upgrade antes que o valor prometido esteja de fato entregue** — risco cultural, não técnico; a ordem do roadmap (Wave 8 por último) é a mitigação estrutural.
- **Rate limiting continua ausente** (dívida nomeada desde a Wave 6, `TECH_DEBT.md`) — torna-se mais urgente com endpoints públicos novos de alerta/notificação (Wave 6) e billing (Wave 8); recomenda-se resolver antes ou durante a Wave 6, não adiar novamente.

## 13. Ordem Recomendada de Implementação

Exatamente a ordem do Capítulo 12: Wave 1 → 2 → 3 → 4 → 5 → 6 → 7 (bloco de baixa incerteza em paralelo desde o início) → 8. Nenhuma Wave pula sua dependência técnica identificada. ADR-041 (Trust Signal) deve ser escrito antes ou durante a Wave 8, fechando uma dívida de dois Releases.

---

## RESPOSTA À PERGUNTA OBRIGATÓRIA DO CTO

> "O Release 1.8 possui uma estratégia clara para transformar o ParaguAI na principal plataforma inteligente de compras da fronteira, maximizando valor para compradores, lojistas e para o patrimônio estratégico da empresa?"

**Sim, com uma condição estrutural explícita**: a estratégia é clara porque cada capítulo se ancora em infraestrutura que o Release 1.7 já certificou, e porque este documento recusou-se a inflar o catálogo de Assets e Moats com nomes redundantes — o que teria parecido mais impressionante, mas teria violado a própria governança que `STRATEGIC_ASSETS.md`/`MOAT_STRATEGY.md` exigem. Apenas **um Asset novo (C-7)** e **um Moat novo (Moat 9)** são propostos, ambos genuinamente novos e ambos exigindo ADR formal do CTO antes de qualquer código ser escrito — consistente com a regra permanente de que Core Assets não nascem por conveniência retórica.

**Risco estratégico a documentar antes do encerramento, conforme exigido**: este Blueprint depende de três decisões Tipo 1 que **não foram tomadas aqui** e bloqueiam Waves específicas até serem resolvidas — fornecedor de câmbio (Wave 1), modelo de dados pessoais de comprador (Wave 6) e fornecedor de billing (Wave 8). Nenhuma delas é hipotética ou adiável indefinidamente: são decisões que o CTO precisa tomar, com ADR formal, antes que as Waves correspondentes possam começar. Até lá, o Blueprint está completo, mas a execução da Wave 1 não deve iniciar sem essa primeira decisão.

**Aguardando aprovação explícita do CTO para**: (1) o conteúdo geral deste Blueprint como referência oficial das Waves futuras; (2) a criação formal de Asset C-7 e Moat 9; (3) início da Wave 1, condicionado à decisão de fornecedor de câmbio.
