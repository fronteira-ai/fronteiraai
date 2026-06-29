# RELEASE_1_5_BLUEPRINT.md
# Blueprint Estratégico — Trust & Reputation

**Versão**: 1.0  
**Criado**: 2026-06-29  
**Status**: Aguardando aprovação do CTO antes de qualquer implementação  
**Tipo de Release**: Feature + Data + Platform (compounding)  
**Fase**: 2 — Product Evolution  
**Número de Release**: 1.5  

---

## Preâmbulo

Este documento é a especificação estratégica completa do Release 1.5 do ParaguAI.

Nenhuma linha de código deve ser escrita antes que este Blueprint seja lido, revisado e aprovado pelo CTO.

Todo desenvolvimento do Release 1.5 — arquitetura, dados, produto, UX e APIs — deve ser derivado e referenciado a este documento.

O Blueprint foi elaborado após leitura integral dos oito documentos permanentes da Foundation Empresarial, do ARCHITECTURE.md, do DOMAIN_MODEL.md, do COMPONENT_INDEX.md, do API_CONTRACTS.md, do CONVENTIONS.md, do GLOSSARY.md e do MASTER_ROADMAP.md.

---

## 1. Visão

### Por que este Release existe?

A Release 1.4 entregou a Merchant Growth Platform — páginas públicas de lojas, ranking, Merchant Score e Progress Engine. O ParaguAI agora tem uma plataforma funcional de comparação de preços com portal de lojistas e visibilidade pública de merchants.

Mas existe um problema estrutural não resolvido: **o comprador não tem como saber em quem confiar.**

Quando um comprador encontra dois produtos com preços similares em lojas diferentes, ele não tem elementos verificáveis para distinguir uma loja confiável de uma desconhecida. O Merchant Score existe no sistema, mas é opaco para o comprador. O campo `is_verified` existe no banco, mas não está conectado a um critério público e verificável. O campo `rating` da loja é manual e sem origem verificável.

O resultado: compradores tomam decisões baseadas em intuição quando poderiam tomar decisões baseadas em evidência. Essa assimetria de informação é exatamente o problema que o ParaguAI existe para resolver — e ainda não está resolvendo na dimensão de confiança.

### Qual problema estratégico resolve?

O Release 1.5 resolve o problema de **assimetria de confiança entre compradores e lojas**.

Hoje, lojas boas e ruins aparecem de forma idêntica no catálogo. Não existe no produto nenhum mecanismo que permita ao comprador distinguir uma loja com histórico de comportamento consistente de uma loja recém-cadastrada sem histórico.

Esse problema impede que o ParaguAI avance no flywheel: compradores que não conseguem identificar lojas confiáveis tomam menos decisões, geram menos dados, e reduzem o valor da plataforma para lojistas que investem em qualidade.

### Como fortalece o ParaguAI?

O Release 1.5 inaugura a **camada de Trust & Reputation** — um sistema que cresce continuamente e se torna mais valioso com o tempo.

Cada interação registrada aumenta a qualidade dos sinais de confiança. Cada avaliação de comprador verificada adiciona evidência ao sistema. Cada período de consistência de dados do lojista aumenta seu Trust Signal.

Ao contrário de funcionalidades que resolvem problemas pontuais, o Trust System é um ativo que **compõe ao longo do tempo** — a posição de um concorrente que entrar na Tríplice Fronteira depois de nós não terá o histórico de comportamento que construímos. Esse é o moat que o Release 1.5 começa a construir.

---

## 2. Objetivos

O Release 1.5 tem quatro objetivos estratégicos, não uma lista de funcionalidades:

**Objetivo 1: Tornar a confiança verificável para o comprador**  
O comprador que visita uma página de produto ou compara lojas deve ter acesso a sinais de confiança verificáveis — não afirmações declarativas. "Loja verificada com 18 meses de histórico e 94% de dados atualizados nos últimos 30 dias" é verificável. "Loja confiável" não é.

**Objetivo 2: Iniciar a coleta estruturada de sinais de reputação**  
Os primeiros dados de reputação de compradores — reviews verificados — devem começar a ser coletados com integridade de dados que permita crescimento contínuo. Um sistema de reviews mal modelado hoje cria débito irrecuperável amanhã.

**Objetivo 3: Fazer o histórico de preços visível para o comprador**  
A tabela `price_history` já existe e acumula dados. Ela é um ativo estratégico invisível para o comprador. Torná-la visível na página de produto é tanto um ganho imediato de utilidade quanto a inauguração de um ativo diferenciador de longo prazo.

**Objetivo 4: Criar o contexto do Comprador no domínio**  
O Release 1.5 é o momento de criar a entidade `User` (comprador autenticado) com estrutura que suporte reviews, favoritos persistidos e alertas futuros. Uma entidade de comprador mal modelada agora bloqueará toda a Fase 3 (Intelligence Layer).

---

## 3. Ativos Estratégicos

O Release 1.5 fortalece e cria os seguintes ativos:

### Trust Signal (criado neste Release)

Um conjunto de indicadores verificáveis de confiança de uma loja, derivados de comportamento observável ao longo do tempo:

- Tempo de cadastro na plataforma
- Percentual de produtos com preços atualizados nos últimos 30 dias
- Percentual de produtos com imagem real
- Consistência de dados históricos
- Nível de verificação (`verified_level`)
- Avaliações verificadas de compradores (quando existentes)

O Trust Signal não é um número inventado — é calculado a partir de dados objetivos que já existem ou começarão a existir neste Release.

### Merchant Reputation (expandido neste Release)

O Merchant Score atual mede qualidade do catálogo e completude de dados. O Release 1.5 começa a incorporar **dimensão temporal** ao score — comportamento consistente ao longo do tempo passa a valer mais do que boa qualidade em um único momento.

A reputação de um merchant não é o que ele tem hoje — é o que ele tem historicamente.

### Historical Knowledge (criado neste Release — visível)

O histórico de preços já existe no banco. Este Release o torna visível para o comprador. Um comprador que vê que um produto custava USD 450 há 60 dias e está custando USD 380 hoje está tomando uma decisão qualitativamente melhor do que um comprador que vê apenas o preço atual.

### User Confidence (criado neste Release)

A confiança do comprador na plataforma cresce quando ele verifica que o que o sistema afirma é verdadeiro. Gráficos de preço verificáveis, badges com critérios públicos e reviews de compradores reais — verificados — constroem confiança de forma acumulativa.

### Merchant Intelligence (expandido neste Release)

O dashboard analítico do merchant passa a exibir dados reais de comportamento de compradores — visualizações de página, comparações de produtos, origem de tráfego. O merchant passa a operar com dados, não apenas com métricas de qualidade de catálogo.

### ParaguAI Brain (alimentado neste Release)

O Release 1.5 adiciona dois novos tipos de dado ao Brain:

- `search_logs` — registros estruturados de buscas: o que foi buscado, o que foi encontrado, o que não foi encontrado.
- `reviews` — avaliações verificadas com texto, nota e metadados de comportamento de compra.

Esses dados, acumulados ao longo do tempo, serão insumo direto para os modelos de recomendação e detecção de anomalia da Fase 3.

---

## 4. Problemas Atuais

### 4.1 O comprador não sabe em quem confiar

Duas lojas aparecem com o mesmo status visual no catálogo — independentemente de uma ter 24 meses de histórico de dados atualizados e outra ter 2 semanas. A plataforma não diferencia comportamento histórico de presença instantânea.

### 4.2 Lojas boas e ruins aparecem iguais

O Merchant Score existe, mas não está visível para o comprador de forma significativa. O campo `is_verified` existe no banco, mas o critério de verificação não é público, não é mensurável e não é explicável para o comprador.

### 4.3 Histórico de preços existe mas é invisível

A tabela `price_history` acumula dados desde o primeiro dia do Acquisition Engine. Ela é um ativo de alto valor que nenhum comprador consegue acessar hoje. Esse é o exemplo mais direto de ativo desperdiçado no produto atual.

### 4.4 Não existe contexto de Comprador no domínio

`types/user.ts` e `types/review.ts` são placeholders vazios. A tabela `favorites` existe mas não é usada. O comprador não tem identidade no sistema — o que bloqueia reviews verificados, favoritos persistidos, alertas de preço e personalização.

### 4.5 Não existe reputação construída por dados

O campo `rating` na tabela `stores` é manual, sem origem verificável, sem histórico e sem critério público. Compradores não têm como saber se uma nota de 4,5 é resultado de 3 avaliações internas ou de 300 interações reais.

### 4.6 Analytics do Merchant é estático

A tabela `merchant_analytics_events` existe mas os dados não geram insights acionáveis para o lojista. O dashboard mostra métricas de qualidade de catálogo — não métricas de como compradores interagem com a loja.

### 4.7 Não existe inteligência de busca acumulada

Buscas não são registradas. O ParaguAI não sabe quais produtos estão sendo buscados e não sendo encontrados — que é a métrica mais valiosa de gap de catálogo e o primeiro sinal para o Brain.

---

## 5. Visão do Trust System

### Filosofia

O Trust System do ParaguAI não é um sistema de estrelas.

Sistemas de estrelas são gamificáveis, manipuláveis e não resistem ao tempo. Um lojista que convence amigos a avaliarem com 5 estrelas no primeiro dia tem a mesma nota de um lojista com dois anos de histórico limpo.

O Trust System do ParaguAI é diferente em sua natureza: **a confiança não é declarada — ela é acumulada através de comportamento observável ao longo do tempo.**

### Os cinco pilares do Trust System

**1. Consistência histórica**  
Um lojista que mantém seus preços atualizados por 12 meses consecutivos tem comportamento mais confiável do que um lojista com catálogo perfeito há 2 semanas. O sistema mede consistência — não apenas estado atual.

**2. Qualidade verificável**  
Cada elemento do Trust Signal é derivado de dado mensurável: percentual de produtos com preço atualizado nos últimos 30 dias, percentual com imagem real, percentual com descrição completa. Não são afirmações — são medições.

**3. Verificação humana**  
O nível `verified_level` evolui com base em verificação humana do Admin para o nível mais alto. O sistema automatiza sinais — mas a verificação premium envolve curadoria.

**4. Reviews verificados**  
Avaliações de compradores só têm valor se verificadas. O sistema só aceita review de usuário autenticado que tenha interagido (favorito, alerta ou comportamento verificável) com a loja avaliada. Reviews não verificados não aumentam a reputação.

**5. Tempo como ativo**  
O Trust System não pode ser comprado — só pode ser construído. Um novo lojista começa com Trust Signal 0 e sobe conforme acumula histórico. Isso cria uma barreira natural de entrada para novos entrantes no mercado que não podem ser replicadas por nenhum concorrente com recursos financeiros.

### O que o Trust System NÃO é

- Não é um sistema de gamificação com recompensas artificiais
- Não é uma nota dada pelo ParaguAI sem critério público
- Não é uma funcionalidade de marketing — é infraestrutura de dados
- Não é apenas reviews — é comportamento histórico estruturado
- Não é estático — cresce e decai conforme o comportamento real do lojista

---

## 6. Escopo do Release

### IN — O que entra neste Release

**Trust Signal — Comprador**
- Merchant Badge público com critérios verificáveis e explicados
- Merchant Profile expandido com dados de confiança visíveis
- Exibição de `verified_level` com critério público nas páginas de loja e comparação
- Histórico de preços visível na página `/product/[slug]` (gráfico ou timeline)

**Contexto do Comprador — Fundação**
- Tabela `users` para compradores autenticados (schema completo)
- Fluxo básico de autenticação para compradores (sign up / sign in)
- Favoritos persistidos em banco (migração do localStorage atual)
- `types/user.ts` implementado (saindo de placeholder)

**Reviews — v1**
- Tabela `reviews` com schema completo (ADR-038)
- Fluxo de criação de review autenticado (somente compradores com conta)
- Validação de review verificado (regra de elegibilidade básica)
- Exibição de reviews na página de loja (`/store/[slug]` e `/lojas/[slug]`)
- Moderação básica no Admin

**Merchant Analytics — Dados Reais**
- Dashboard com métricas de comportamento de compradores reais
- Exibição de: visualizações de produto, comparações, cliques em oferta
- Dados derivados de `merchant_analytics_events` (tabela já existente)

**Search Logs — Início de Coleta**
- Tabela `search_logs` com schema mínimo
- Registro automático de buscas: query, resultados encontrados, total por tipo
- Coleta silenciosa — sem UI ainda, mas dado começa a acumular

**Price History — Visível**
- Gráfico ou timeline de histórico de preço na página `/product/[slug]`
- Exibição de mínimo histórico e variação desde o primeiro registro
- `getOfferPriceMetrics()` já implementado — usar resultado existente

### OUT — O que não entra neste Release

- Alertas de preço (requer Users + Price Engine + notificações — Release 1.6)
- Recomendações personalizadas (requer Brain — Release 2.0)
- Search com autocomplete avançado (Release 1.6)
- API pública para parceiros (Release 2.0)
- App mobile (Fase 4)
- Pagamentos ou marketplace transacional (Fase 4)
- Busca semântica / embeddings (Release 2.0)
- Score composto de múltiplos compradores com peso temporal (Release 1.6)
- Suporte a múltiplos idiomas
- Integração com meios de pagamento

### Future — O que este Release prepara mas não entrega

- Alertas de preço (a tabela `users` + `price_history` estão prontas)
- Recomendações personalizadas (reviews + search_logs alimentam o Brain)
- Trust Score composto com peso crescente de reviews ao longo do tempo
- Verificação premium de merchant com inspeção física
- Turismo inteligente (users autenticados + favoritos são a fundação)

---

## 7. Funcionalidades

### 7.1 Merchant Badge

Um badge visual exibido na página de loja e nos cards de comparação que comunica nível de confiança verificável.

Características:
- Visual limpo e sem gamificação infantil (sem estrelas animadas, sem confetes)
- Três níveis: `Loja` (padrão), `Verificada`, `Verificada Premium`
- Ao passar o mouse (hover) ou tocar: exibe os critérios exatos que definem o nível
- Exemplo de exibição: "Loja verificada · 14 meses de histórico · 96% de dados atualizados"
- Derivado de `verified_level` + métricas calculadas do Merchant Score

### 7.2 Merchant Profile Expandido

A página `/lojas/[slug]` passa a exibir um painel de confiança com:

- Tempo de presença verificada na plataforma
- Percentual de produtos com preço atualizado nos últimos 30 dias
- Número de reviews verificados (quando existirem)
- Nível de verificação com critério explicado
- Histórico de Merchant Score (tendência — subindo, estável, caindo)

Sem poluir a interface. Dados apresentados de forma limpa, com contexto quando necessário.

### 7.3 Autenticação do Comprador

Fluxo básico de criação de conta e login para compradores.

- Sign up com e-mail e senha (Supabase Auth, igual ao merchant)
- Role `user` no `profiles` (distinção clara de `merchant`, `admin`, `operator`)
- Perfil mínimo: nome, e-mail
- Sem OAuth neste Release (complexidade desnecessária agora)
- `requireUser()` paralelo ao `requireMerchant()` existente

### 7.4 Favoritos Persistidos

Os favoritos hoje vivem em `localStorage`. Este Release:

- Migra a persistência para a tabela `favorites` no Supabase
- Mantém compatibilidade: usuário não autenticado continua usando localStorage
- Usuário autenticado: favoritos sincronizados entre dispositivos
- `useFavorites` hook atualizado para detectar estado de auth e escolher persistência

### 7.5 Reviews v1

Sistema de avaliações verificadas de compradores sobre lojas.

Características:
- Avaliação de 1 a 5 (escala simples, sem meio-ponto)
- Campo de texto opcional (máximo 500 caracteres)
- Elegibilidade: comprador autenticado que adicionou a loja aos favoritos OU que clicou para visitar a oferta da loja (tracked via `merchant_analytics_events`)
- Sem limite de reviews por loja — mas com rate limiting por usuário (1 review por loja por 30 dias)
- Moderação: status `pending` → `approved` / `rejected` pelo Admin
- Reviews pendentes não afetam o rating público
- Exibição: seção "O que compradores dizem" na página da loja — somente reviews aprovados

### 7.6 Histórico de Preço Visível

Na página `/product/[slug]`, abaixo das ofertas da loja:

- Timeline ou gráfico simples de histórico de preço por oferta
- Exibição de: preço atual, preço mínimo histórico, variação percentual desde o primeiro registro
- Indicador contextual: "Preço abaixo da média histórica" ou "Preço acima do mínimo histórico"
- Dados de `getOfferPriceMetrics()` — função já implementada, apenas exposta no produto
- Somente exibido quando há mais de uma entrada em `price_history` para a oferta

### 7.7 Search Logs — Início de Coleta

Coleta silenciosa de dados de busca para alimentar o Brain futuro.

- Tabela `search_logs` com: query, timestamp, resultados por tipo (produtos/lojas/marcas/categorias), total
- Coleta automática em `searchEverything()` — sem impacto perceptível de performance
- Sem UI neste Release — dado começa a acumular para Release 2.0
- Dados completamente anônimos neste Release (sem vincular a usuário)

### 7.8 Merchant Analytics — Dados Reais

O dashboard do merchant passa a mostrar dados reais derivados de `merchant_analytics_events`:

- Visualizações de produto (com qual produto foi mais visto)
- Comparações que incluíram a loja (quantas vezes a loja apareceu em /compare)
- Cliques em "visitar loja" (CTR da oferta)
- Período: últimos 7, 30 e 90 dias (selector)
- Dados apresentados de forma simples — sem sobrecarga de métricas

---

## 8. Fluxos

### 8.1 Fluxo do Comprador — Descoberta e Confiança

```
Comprador busca produto
      │
      ▼
Página /product/[slug]
  → Ofertas ranqueadas (preço + disponibilidade + confiança da loja)
  → Badge de verificação em cada oferta
  → Histórico de preço da oferta selecionada
  → "Ver perfil da loja" → /lojas/[slug]
      │
      ▼
Página /lojas/[slug]
  → Merchant Badge com critérios explicados
  → Painel de Trust Signal (tempo, percentuais, reviews)
  → Reviews verificados de compradores reais
  → Botão "Adicionar aos favoritos" (requer autenticação)
      │
      ▼
Comprador decide visitar a loja
  → Clique registrado em merchant_analytics_events
  → CTR da loja capturado para analytics do merchant
```

### 8.2 Fluxo do Comprador — Review

```
Comprador autenticado visita /lojas/[slug]
      │
      ▼
Verificação de elegibilidade:
  - Tem favorito desta loja? OU
  - Clicou em oferta desta loja nos últimos 90 dias?
      │
   SE ELEGÍVEL ─────────────────────────────────────────────────┐
      │                                                          │
      ▼                                                          │
Form de review aparece                                          │
  → Nota de 1 a 5                                              │
  → Texto opcional (max 500 chars)                             │
  → Envio                                                       │
      │                                                          │
      ▼                                                         │
Status: "pending"                                              │
  → Admin é notificado                                         │
  → Review não aparece publicamente ainda                      │
      │                                                          │
      ▼                                                         │
Moderação no Admin                                             │
  → approved: Review aparece na página da loja                 │
  → rejected: Review descartado, usuário pode tentar novamente │
  ─────────────────────────────────────────────────────────────┘
   SE NÃO ELEGÍVEL
      │
      ▼
Mensagem: "Adicione esta loja aos favoritos ou visite uma oferta para avaliar"
```

### 8.3 Fluxo do Merchant — Analytics

```
Merchant acessa /merchant/dashboard
      │
      ▼
Seção "Desempenho" (nova)
  → Seletor de período: 7 / 30 / 90 dias
  → Visualizações de produtos
  → Aparições em comparações
  → Cliques em "visitar loja"
      │
      ▼
Merchant acessa /merchant/analytics (nova rota)
  → Detalhamento por produto
  → Quais produtos geram mais interesse
  → Em quais comparações a loja aparece
      │
      ▼
Merchant recebe recomendação (RecommendationsPanel existente):
  → "Produto X tem alta visualização mas preço acima do mercado"
  → "Produto Y aparece em comparações mas sem imagem real"
```

### 8.4 Fluxo do Admin — Moderação

```
Admin acessa /admin/reviews
      │
      ▼
Lista de reviews pendentes
  → Filtro por loja / por data / por nota
      │
      ▼
Admin revisa cada review:
  → Conteúdo do texto
  → Nota
  → Elegibilidade do comprador (confirmada pelo sistema)
      │
      ▼
Decisão:
  → Aprovar: review aparece publicamente, rating da loja atualizado
  → Rejeitar: review descartado com motivo (selecionado em lista)
  → Reportar: review sinalizado para análise de fraude
```

### 8.5 Fluxo da IA — Coleta Silenciosa

```
Comprador busca "iphone 17 pro"
      │
      ▼
searchEverything("iphone 17 pro") executa
      │
      ├── retorna resultados ao comprador (fluxo normal)
      │
      └── registra em search_logs:
            query: "iphone 17 pro"
            timestamp: now()
            products_found: 3
            stores_found: 0
            brands_found: 1
            categories_found: 0
            total_results: 4

Busca sem resultado:
  query: "playstation 6"
  products_found: 0 → gap de catálogo detectado
```

---

## 9. Impacto Arquitetural

### 9.1 Módulos Alterados

**Catálogo / Marketplace (leitura)**
- Nenhuma alteração estrutural
- `store.service.ts`: adicionar função `getStoreTrustSignal(storeId)`
- `product.service.ts`: expor `getOfferPriceMetrics()` na resposta da página de produto

**Merchant OS**
- `merchant.service.ts`: expandir `computeMerchantScore()` para incluir componente temporal
- Nova rota `/merchant/analytics` com dados reais de `merchant_analytics_events`
- Dashboard existente: adicionar seção de métricas comportamentais

**Admin**
- Nova seção `/admin/reviews` para moderação de reviews
- `admin/stats`: adicionar métricas de reviews pendentes/aprovados/rejeitados

**Search**
- `searchEverything()`: adicionar registro em `search_logs` sem impacto no resultado
- Sem mudança na interface de busca neste Release

**Identidade / Acesso (novo)**
- Novo role `user` no sistema de `profiles`
- `requireUser()`: guard paralelo ao `requireMerchant()`
- Fluxo de auth de comprador: `/auth/buyer/` rotas

**Comprador (novo contexto)**
- Tabela `users` (compradores autenticados) — schema completo
- `types/user.ts`: implementado (saindo de placeholder)
- `useFavorites` hook: lógica de persistência dual (localStorage vs banco)
- `favorites` tabela: começar a ser usada pelo código

**Reviews (novo módulo)**
- Tabela `reviews`: schema completo (ADR-038)
- `review.service.ts`: funções de criação, leitura e moderação
- `types/review.ts`: implementado (saindo de placeholder)
- Componentes: `ReviewCard`, `ReviewForm`, `ReviewsList`

**Price History (nova visibilidade)**
- Componente `PriceHistoryChart` ou `PriceHistoryTimeline`
- Integrado em `/product/[slug]` page — dados já disponíveis via `getOfferPriceMetrics()`

### 9.2 Módulos Não Alterados

- Acquisition Engine: sem mudanças neste Release
- Compare Engine: sem mudanças estruturais (apenas badge visual nas ofertas)
- SEO / Sitemap: ajustes menores para novas rotas de auth
- Admin CRUD (products, offers, brands, categories): sem mudanças

---

## 10. Dados

### 10.1 Novas Entidades

**Tabela `users` (compradores autenticados)**

Propósito: representar o comprador com conta na plataforma. Distinta de `profiles` (que é para operadores do sistema).

Atributos candidatos:
- `id` (uuid, PK, FK → auth.users.id)
- `display_name` (text, nullable — nome público)
- `created_at` (timestamptz)
- `last_active_at` (timestamptz)
- Sem dados sensíveis além do e-mail que já está em `auth.users`

**Tabela `reviews`**

Propósito: avaliações verificadas de compradores sobre lojas.

Atributos candidatos:
- `id` (uuid, PK)
- `user_id` (uuid, FK → users.id, NOT NULL)
- `store_id` (uuid, FK → stores.id, NOT NULL)
- `rating` (integer, 1–5, NOT NULL)
- `body` (text, nullable — texto opcional, max 500 chars)
- `status` (`pending` | `approved` | `rejected`)
- `rejection_reason` (text, nullable)
- `created_at` (timestamptz)
- `moderated_at` (timestamptz, nullable)
- `moderated_by` (uuid, FK → profiles.id, nullable)
- UNIQUE `(user_id, store_id)` — um review por comprador por loja (substituível, não acumulável)

**Tabela `search_logs`**

Propósito: registrar buscas para análise de gap de catálogo e alimentação do Brain.

Atributos candidatos:
- `id` (uuid, PK)
- `query` (text, NOT NULL)
- `products_found` (integer)
- `stores_found` (integer)
- `brands_found` (integer)
- `categories_found` (integer)
- `total_results` (integer)
- `created_at` (timestamptz)
- Sem FK de usuário neste Release — coleta anônima

### 10.2 Entidades Alteradas

**`stores`**
- `rating` passa a ser derivado de `reviews` (calculado), não mais manual
- Campo `review_count` (integer, default 0) para cache de contagem
- Estratégia: recalcular `rating` a cada aprovação de review (trigger ou função chamada pelo service)

**`merchants`**
- Campo `trust_score` já existe — este Release define seu cálculo com base nos novos sinais de confiança
- Componente temporal do `merchant_score` formalmente documentado em ADR

**`favorites`**
- Campo `user_id` (FK → `users.id`) — tabela já existe, passa a ser usada
- Migração: favoritos em `localStorage` não têm usuário vinculado — sem migração retroativa; novos favoritos de usuário autenticado vão para o banco

### 10.3 Eventos

Novos eventos adicionados a `merchant_analytics_events`:
- `buyer_view_store`: comprador visualizou a página da loja
- `buyer_click_offer`: comprador clicou para visitar a oferta da loja
- `buyer_add_favorite`: comprador adicionou a loja aos favoritos
- `buyer_submit_review`: comprador enviou um review (independente do status de moderação)

---

## 11. UX

### Princípios de UX para o Trust System

**Confiança é mostrada, não declarada.**  
O sistema não afirma "esta loja é confiável". Mostra dados verificáveis que permitem ao comprador chegar a essa conclusão.

**Sem gamificação infantil.**  
Sem estrelas animadas. Sem confetes ao ganhar um badge. Sem barras de progresso com "faltam X pontos para o próximo nível". A linguagem de confiança é adulta, precisa e factual.

**Complexidade do sistema, não complexidade da interface.**  
O Trust Signal pode ser calculado a partir de dezenas de métricas. O comprador vê: um badge, um nível, e dois ou três dados contextuais ao passar o mouse. Toda a complexidade está no backend.

**Estado vazio honesto.**  
Uma loja sem reviews não exibe "Seja o primeiro a avaliar!" de forma destacada — isso cria pressão social desnecessária. Exibe: "Ainda sem avaliações verificadas". A honestidade sobre ausência de dado é parte do Trust System.

**Transparência, não marketing.**  
A descrição do Merchant Badge não usa adjetivos — usa dados. "Verificada · 16 meses · 94% preços atualizados" em vez de "Loja de confiança Premium Elite".

### Posicionamento de elementos de confiança

**Na comparação (`/compare/[slug]`):**  
Badge de verificação pequeno e claro abaixo do nome da loja em cada `CompareOfferCard`. Hover revela resumo do Trust Signal.

**Na página de produto (`/product/[slug]`):**  
Abaixo de cada oferta, um indicador mínimo de confiança da loja. Histórico de preço logo abaixo da seção de ofertas, visível sem precisar rolar (para produtos com histórico suficiente).

**Na página da loja (`/lojas/[slug]`):**  
Painel de Trust Signal no topo, antes do catálogo de produtos. Reviews ao final da página, com paginação se necessário.

**Na busca (`/search`):**  
Badge minimalista nos cards de resultado de loja — apenas nível de verificação, sem dados adicionais no card.

---

## 12. Métricas

### Como medir sucesso do Release 1.5

**Métricas de confiança**

- Taxa de conversão de visualização de loja → clique em oferta: medir antes/depois do Trust Signal
- Tempo médio na página `/product/[slug]` para produtos com histórico de preço visível vs. sem
- Número de reviews verificados publicados nos primeiros 30 dias após o Release
- Taxa de submissão de review vs. taxa de rejeição (indicador de qualidade de moderação)

**Métricas de adoção de comprador**

- Número de contas de compradores criadas por semana
- Número de favoritos persistidos em banco (vs. localStorage anterior)
- Taxa de retorno de compradores autenticados vs. anônimos

**Métricas de intelligence**

- Buscas sem resultado como percentual do total de buscas (gap de catálogo)
- Top queries sem resultado (insumo direto para expansão de catálogo)
- Crescimento de `search_logs` ao longo do tempo

**Métricas de lojista**

- Percentual de merchants acessando a seção de analytics no dashboard nos primeiros 14 dias
- CTR médio das ofertas (antes vs. depois — dado de baseline começa a existir)

**Métricas de plataforma**

- Merchant Score médio antes/depois (o Trust Signal pode elevar o score de merchants que já tinham boa consistência)
- Número de lojas com `is_verified = true` vs. sem verificação (incentivo de adoção)

---

## 13. Riscos

### 13.1 Fraude e Manipulação de Reviews

**Risco**: lojistas criando contas falsas de compradores para avaliar suas próprias lojas positivamente.

**Mitigação**:
- Elegibilidade mínima: reviewer deve ter adicionado a loja aos favoritos OU clicado em oferta da loja (comportamento verificável, não apenas conta criada)
- Rate limiting: 1 review por comprador por loja por 30 dias
- Moderação humana: todos os reviews passam por aprovação antes de serem públicos
- Detecção de padrão: múltiplas contas criadas no mesmo IP ou device fingerprint com reviews para mesma loja — sinalizadas para revisão

### 13.2 Review Negativo Abusivo

**Risco**: compradores deixando avaliações negativas injustas ou sem base (concorrentes, trolls).

**Mitigação**:
- Elegibilidade verificada reduz o volume de reviews abusivos
- Moderação permite rejeição com motivo documentado
- Campo de texto opcional — sem exigir justificativa que possa identificar o avaliador

### 13.3 Spam de Contas de Compradores

**Risco**: criação massiva de contas de compradores por bots.

**Mitigação**:
- Email verification obrigatória no sign up
- Rate limiting no endpoint de criação de conta
- Honeypot básico no formulário
- CAPTCHA como contingência se o volume de abuso for detectado

### 13.4 Trust Signal Mal Calibrado

**Risco**: o cálculo do Trust Signal penalizar lojistas legítimos novos ou recompensar lojistas antigos com dados de qualidade baixa.

**Mitigação**:
- Trust Signal claramente distingue "tempo de existência" de "qualidade ao longo do tempo"
- Um lojista antigo com dados ruins não tem Trust Signal alto — os percentuais de atualização penalizam comportamento atual
- Calibração do peso dos componentes documentada em ADR antes de implementação

### 13.5 Exposição de Dados do Comprador

**Risco**: dados pessoais de compradores (e-mail, comportamento) expostos indevidamente.

**Mitigação**:
- Reviews exibem apenas nome de exibição (não e-mail, não identificador técnico)
- RLS na tabela `users`: comprador só acessa seus próprios dados
- `requireUser()` na mesma linha de segurança de `requireMerchant()`
- `search_logs` completamente anônimos neste Release

### 13.6 Performance com Price History

**Risco**: carregar histórico de preço para cada oferta em `/product/[slug]` adicionar latência perceptível.

**Mitigação**:
- `getOfferPriceMetrics()` já retorna dados agregados (não linhas brutas de history)
- Componente de histórico carregado via Suspense — não bloqueia render principal
- Exibir apenas para produtos com mais de 2 entradas no histórico (evita ruído e reduz queries)

---

## 14. ADRs Necessários

Os seguintes ADRs deverão ser criados antes do início da implementação correspondente:

**ADR-038: Sistema de Reviews** *(já identificado no DECISIONS.md e DOMAIN_MODEL.md)*
- Schema da tabela `reviews`
- Regras de elegibilidade
- Estratégia de moderação
- Impacto no `stores.rating`

**ADR-039: Analytics de Merchant com Dados Reais** *(já identificado no DOMAIN_MODEL.md)*
- Como `merchant_analytics_events` são consumidos
- Período e granularidade dos dados no dashboard
- Impacto de performance da query de analytics

**ADR-040: Contexto do Comprador (tabela `users`)**
- Schema completo da tabela `users`
- Distinção entre `profiles` (operadores) e `users` (compradores)
- Estratégia de autenticação para compradores
- Impacto na RLS existente

**ADR-041: Trust Signal — Cálculo e Componentes**
- Definição formal dos componentes do Trust Signal
- Fórmula e pesos
- Frequência de recálculo
- Exposição pública vs. dados privados do merchant

**ADR-042: Search Logs — Política de Coleta e Retenção**
- Schema da tabela `search_logs`
- Política de anonimização e retenção
- Uso futuro como insumo para Brain

---

## 15. Critérios de Sucesso

### Definition of Ready

A implementação de qualquer componente do Release 1.5 só começa quando:

- [ ] Este Blueprint foi revisado e aprovado pelo CTO
- [ ] Os ADRs correspondentes foram criados e aprovados (antes de implementação do componente)
- [ ] O schema de banco para o componente foi definido e revisado
- [ ] O critério de sucesso específico do componente foi definido e é verificável
- [ ] Dependências identificadas (ex: `users` antes de `reviews`)
- [ ] O Decision Filter foi executado para cada componente significativo

### Definition of Done

O Release 1.5 está completo quando:

**Técnico:**
- [ ] Build sem erros (`npm run build`)
- [ ] TypeScript sem erros (`npm run lint`)
- [ ] Todas as tabelas novas têm RLS configurada e testada com credenciais corretas
- [ ] `requireUser()` funciona e é testado com usuário real
- [ ] Favoritos persistidos em banco para usuário autenticado (verificado com conta real)
- [ ] Review pode ser submetido, moderado e publicado (fluxo completo verificado)
- [ ] Histórico de preço visível na página de produto (verificado com produto com dados reais)
- [ ] Search logs sendo registrados a cada busca (verificado via query no banco)
- [ ] Merchant analytics exibindo dados reais (não mock ou placeholder)

**Produto:**
- [ ] Merchant Badge visível e correto em `/compare`, `/product`, `/lojas`, `/store`
- [ ] Painel de Trust Signal visível em `/lojas/[slug]` com dados reais
- [ ] Reviews aprovados visíveis publicamente em `/lojas/[slug]` e `/store/[slug]`
- [ ] Nenhum estado vazio sem tratamento — todos os estados sem dados comunicam claramente

**Documentação:**
- [ ] ADRs 038–042 criados e preenchidos
- [ ] `DOMAIN_MODEL.md` atualizado com novas entidades (`users`, `reviews`, `search_logs`)
- [ ] `ARCHITECTURE.md` atualizado com novo contexto do Comprador
- [ ] `COMPONENT_INDEX.md` atualizado com novos componentes
- [ ] `API_CONTRACTS.md` atualizado com novos endpoints
- [ ] `CHANGELOG.md` e `PROJECT_STATUS.md` atualizados

### Quality Gates

**Universais (todo Release):**
- Build sem erro
- TypeScript sem erro
- Lint sem violações configuradas como erro
- Nenhuma regressão em funcionalidades existentes (busca, compare, produto, loja, merchant OS, admin)

**Específicos do Release 1.5:**
- RLS testada com credenciais anon, user e merchant para todas as novas tabelas
- Nenhuma credencial de service role exposta em componentes client
- Reviews não são visíveis publicamente antes de aprovação (verificado com conta de comprador real)
- Trust Signal calculado com dados reais de pelo menos 3 merchants (verificado em staging)

---

## 16. Compounding

### Como este Release aumenta o valor da plataforma de forma permanente

O Release 1.5 deixa quatro ativos que crescem continuamente:

**1. Search Logs — base de conhecimento de demanda**  
Cada busca registrada aumenta o conjunto de dados que permite identificar gaps de catálogo, padrões de intenção de compra e tendências sazonais. Em 6 meses, 180 dias de dados. Em 12 meses, um ano de inteligência de demanda. Esse dado é irreplicável para quem chegar depois — um concorrente que entrar no mercado em 2028 não terá os dados de busca de 2026 e 2027.

**2. Reviews Verificados — reputação temporal**  
Cada review aprovado aumenta a qualidade do sinal de reputação de cada loja. Em 12 meses, lojas com histórico de reviews terão um diferencial que não pode ser criado do zero por nenhum novo entrante. Reputação construída ao longo do tempo é o ativo de mais difícil replicação no modelo de plataforma.

**3. User Base — compradores com conta**  
Cada comprador que cria uma conta inicia uma relação persistente com a plataforma. Favoritos persistidos, histórico de comportamento, elegibilidade para alertas futuros — cada ação do usuário autenticado aumenta o valor que o sistema pode entregar. Um usuário que cria conta hoje e usa a plataforma por 2 anos tem um perfil de comportamento que nenhum sistema novo conseguirá reproduzir.

**4. Trust Signal — moat de confiança**  
O Trust Signal de um merchant com 24 meses de histórico é radicalmente diferente de um merchant com 2 meses. Não pelo que o merchant é hoje — pelo que demonstrou ser ao longo do tempo. Esse ativo de tempo não pode ser comprado nem acelerado. É o moat mais defensável que o ParaguAI pode construir neste estágio.

### Por que será difícil para um concorrente copiar estes ativos em 5 anos?

Um concorrente que entrar no mercado em 2031 terá:

- Zero buscas históricas — enquanto o ParaguAI terá 5 anos de logs de intenção de compra
- Zero reviews históricos verificados — enquanto o ParaguAI terá reviews com data, contexto e histórico de confiabilidade
- Merchants sem histórico temporal de Trust Signal — enquanto merchants do ParaguAI terão 5 anos de comportamento documentado
- Compradores sem histórico — enquanto o ParaguAI terá uma base de usuários com histórico real de favoritos, buscas e comparações

O concorrente pode copiar a interface, replicar o stack e contratar os mesmos desenvolvedores. Não pode comprar nem recriar o tempo que já passou. O Trust System é, fundamentalmente, uma aposta no tempo como ativo.

---

## 17. Roadmap

### Como o Release 1.5 prepara os próximos Releases

**Release 1.6 — Alertas e Busca Avançada**

O Release 1.5 cria:
- `users` (compradores autenticados) — pré-requisito de alertas
- `favorites` persistidos — pré-requisito de alertas por produto favorito
- `price_history` visível — base de contextualização dos alertas
- `search_logs` — base para autocomplete inteligente

O 1.6 consome todos esses ativos sem precisar reconstruí-los.

**Release 1.7 — Trust Score Avançado**

O Release 1.5 cria:
- `reviews` com dados verificados — insumo para ponderação temporal
- `search_logs` — padrões de comportamento de compradores por loja
- `merchant_analytics_events` com novos tipos de evento — comportamento real do comprador

O 1.7 pode introduzir Trust Score composto com peso crescente para reviews ao longo do tempo, sem recriar a estrutura de dados.

**Release 2.0 — Intelligence Layer / ParaguAI Brain v1**

O Release 1.5 cria:
- `search_logs` — insumo direto para busca semântica e recomendações
- `reviews` com texto — insumo para análise de sentimento e extração de insights
- `users` com histórico — base para personalização real
- `merchant_analytics_events` ricos — comportamento de comprador por produto e loja

O Brain 2.0 não precisará reconstruir a camada de dados — os dados já estarão acumulados.

**Síntese:**

```
Release 1.5 (Trust & Reputation)
        │
        ├── users + favorites + search_logs + reviews
        │
        ▼
Release 1.6 (Alertas + Busca Avançada)
        │
        ├── alerts (usa users + favorites + price_history)
        ├── autocomplete (usa search_logs)
        │
        ▼
Release 1.7 (Trust Score Avançado)
        │
        ├── Trust Score temporal (usa reviews + analytics + search_logs)
        │
        ▼
Release 2.0 (Brain v1 — Intelligence Layer)
        │
        └── Busca semântica, recomendações, predição
            (usa tudo acumulado nos Releases 1.5–1.7)
```

---

## Relatório Final

### Resumo Executivo

O Release 1.5 inaugura a Fase 2 do ParaguAI com um conjunto coeso de capacidades voltadas para a construção da camada de Trust & Reputation da plataforma.

O problema estratégico que resolve é preciso: compradores não têm hoje nenhum mecanismo verificável para distinguir lojas confiáveis de lojas sem histórico. Isso cria assimetria de informação na dimensão de confiança — exatamente o problema que o ParaguAI existe para resolver.

O Release 1.5 não entrega um sistema de avaliações. Entrega a fundação de um ativo competitivo que cresce com o tempo e que nenhum concorrente pode replicar retroativamente.

### Objetivos Estratégicos

1. Tornar a confiança verificável para o comprador com Trust Signal baseado em dados objetivos
2. Iniciar a coleta estruturada de sinais de reputação (reviews verificados)
3. Tornar o histórico de preços visível — transformar ativo invisível em valor percebido
4. Criar o Contexto do Comprador no domínio com arquitetura que suporte os próximos 3 Releases

### Ativos Fortalecidos

| Ativo | Antes | Depois |
|---|---|---|
| Trust Signal | Não existe | Inaugurado — dados de confiança verificáveis |
| Merchant Reputation | Score interno, invisível | Score + Trust Signal visíveis com critérios públicos |
| Historical Knowledge | Acumulado, invisível | Visível no produto — ativo percebido pelo comprador |
| User Confidence | Não existe contexto de comprador | Comprador com conta, favoritos persistidos, base para alertas |
| ParaguAI Brain | Zero search logs, zero reviews | Alimentado com dois novos tipos de dado estruturado |
| Merchant Intelligence | Métricas de catálogo apenas | Dados reais de comportamento de compradores |

### Escopo

**IN**: Trust Signal, Merchant Badge, Autenticação de Comprador, Favoritos persistidos, Reviews v1, Histórico de Preço visível, Search Logs (coleta), Merchant Analytics real

**OUT**: Alertas de preço, Recomendações, Autocomplete, API pública, App mobile, Pagamentos, Busca semântica

**Future**: Alertas (1.6), Trust Score temporal (1.7), Brain v1 (2.0)

### Riscos Principais

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Fraude de reviews | Média | Elegibilidade verificada + moderação humana |
| Trust Signal mal calibrado | Baixa | ADR-041 define fórmula antes de implementação |
| Performance com price history | Baixa | Suspense + dados agregados (não linhas brutas) |
| Spam de contas | Baixa | Email verification + rate limiting |

### Dependências

| Componente | Depende de |
|---|---|
| Reviews | Contexto do Comprador (`users`) |
| Favoritos persistidos | Contexto do Comprador (`users`) |
| Trust Signal visível | Merchant Badge (componente visual) + dados já existentes |
| Merchant Analytics | `merchant_analytics_events` (tabela já existente) |
| Search Logs | Nenhuma — pode ser implementado de forma independente |
| Price History visível | `getOfferPriceMetrics()` já implementado |

### ADRs Sugeridos

- ADR-038: Sistema de Reviews (já identificado, agora formalizar)
- ADR-039: Analytics de Merchant com Dados Reais (já identificado, agora formalizar)
- ADR-040: Contexto do Comprador — tabela `users`
- ADR-041: Trust Signal — Componentes e Cálculo
- ADR-042: Search Logs — Política de Coleta e Retenção

### Quality Gate Final

✔ Foundation aplicada em todas as decisões — cada escolha deste Blueprint foi derivada dos oito documentos permanentes da Foundation  
✔ Escopo claro — IN, OUT e Future definidos com critério  
✔ Objetivos claros — quatro objetivos estratégicos, não lista de features  
✔ Ativos estratégicos identificados — seis ativos fortalecidos, com antes/depois documentado  
✔ Critérios de sucesso mensuráveis — DoR, DoD e Quality Gates definidos  
✔ Release Strategy respeitada — compounding explicitado, ativos de cada componente identificados  
✔ Apto a servir como documento oficial do Release 1.5

---

**Aguardando aprovação do CTO antes da primeira linha de código do Release 1.5.**

---

*Este documento foi elaborado a partir de leitura integral da Foundation Empresarial, da arquitetura real do sistema e do estado atual do projeto. Representa a especificação estratégica oficial do Release 1.5 e deve ser o ponto de referência para toda decisão de desenvolvimento, arquitetura e produto deste Release.*
