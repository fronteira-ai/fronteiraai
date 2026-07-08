# Tier1_Merchants.md
# Programa de Certificação de Connectors Tier 1

**Versão**: 1.0
**Criado**: 2026-07-03 (Release 1.8 — Program A — Wave 3, mandato do CTO: "Certificação dos Connectors Tier 1")
**Status**: Referência oficial de auditoria e certificação de merchants Tier 1
**Categoria**: `docs/marketplace/` (ADR-048)

---

## 0. Princípio desta Wave

O objetivo desta Wave não foi importar produtos — foi garantir que cada loja Tier 1 tenha (ou tenha um caminho claro para) um Connector resiliente, observável e sustentável por anos. **Nenhum Engine, domínio ou sistema paralelo foi criado.** Toda pontuação e todo critério de certificação abaixo reaproveita exclusivamente infraestrutura já existente: Connector Platform, Discovery, Canonical Catalog, Marketplace Operations, Exchange Intelligence, Real-Time Commerce e Brain. Onde uma métrica pedida no mandato já existe sob outro nome, este documento aponta para a fonte real em vez de recriá-la — ver §1.

**Achado de conformidade que precede tudo o resto**: 4 das 10 lojas auditadas bloqueiam explicitamente crawlers de IA (incluindo `ClaudeBot` nomeado) em seu `robots.txt`. Nenhum scraping foi tentado contra essas lojas, nenhuma técnica de contorno foi usada. Elas permanecem Tier 1 e prioritárias no roadmap — apenas com `Integration Strategy: Data Partnership` em vez de `Public Connector`. Ver §5.

---

## 1. Reaproveitamento — mapa completo (nenhuma duplicação)

| Campo pedido no mandato | Fonte real reaproveitada | Observação |
|---|---|---|
| Coverage Score | Contagem de `offers` por `store_id` vs. estimativa de catálogo real (auditoria externa, §5) | Única métrica genuinamente nova — é uma comparação, não um Engine |
| Catalog Quality | `src/domains/catalog-intelligence/services/ProductHealthService.ts` (Release 1.6) | Score 0-100 por produto já existente (image/category/brand/desc/price), agregado por loja |
| Freshness | `src/domains/realtime-commerce/freshness/FreshnessService.ts` (Wave 2 desta Release) | Já produz Freshness Score por oferta; `StoreUpdateIntelligenceService.avgFreshnessScore` já agrega por loja |
| Sync Success Rate | `src/domains/connectors/services/ConnectorHealthService.ts` (Program 0 Wave 1) | Componente "uptime" da fórmula de Health já existente |
| Health Score | `ConnectorHealthService.buildConnectorHealthSummary` | Mesmo Health Score do Ecosystem Monitor e do Marketplace Operations — não recalculado |
| Change Detection Rate | `src/domains/realtime-commerce` — `market_changes` por loja (via `MarketChangeDetectionStage`, já integrado ao pipeline nesta mesma Release) | Razão entre ofertas sincronizadas e mudanças de fato detectadas |
| Canonical Match Rate | Lógica já inline em `MerchantPriorityService.ts` (`linkedOffers / storeOffers`, via `offers.canonical_product_id`) | Mesma lógica, sem query nova |
| Estimated Maintenance Risk | Julgamento técnico documentado por loja (este documento, §5) — não um score computado ao vivo | Depende de fatores que nenhum serviço rastreia hoje (renderização JS, presença de anti-bot, estabilidade de stack) — ver §2 |
| Marketplace Priority (Tier/Business Priority/Marketplace Value/Traffic/Catalog Size/Buyer Demand/Sync Frequency) | **Duplicava `MerchantPriorityService`** (Program 0 Wave 1, 7 fatores, tiers Diamond/Gold/Silver/Bronze) para lojas já onboarded — mas `MerchantPriorityService.listAll()` só itera `stores` existentes, não pode pontuar um prospect. Resolução: reaproveitar a fórmula de pré-onboarding já definida em `RELEASE_1_8_BLUEPRINT.md` Capítulo 1 (Complementaridade de categoria 30 + Viabilidade técnica 25 + Reconhecimento de marca 20 + Qualidade de dado esperada 15 + Disponibilidade para claim/parceria 10) como **Prospect Score**, que se converte nos inputs do `MerchantPriorityService` assim que a loja for onboarded — nunca um segundo sistema de tiers | Ver §3 |

**Nenhum código novo foi escrito nesta Wave** para os itens acima além do já entregue na Wave 2 (Real-Time Commerce Engine) — esta Wave é auditoria e especificação. A implementação de um agregador read-only (`src/domains/connectors/certification/` — thin, sem estado próprio, só chama os serviços acima) fica registrada como próximo passo técnico em `docs/engineering/TECH_DEBT.md`, não construída aqui, por decisão deliberada ("o sucesso desta Wave não é medido pela quantidade de código").

---

## 2. Processo de certificação

Um Connector só é considerado **Certified** quando os 15 critérios abaixo passam. Cada critério aponta para a fonte real que já o computa — nenhum é um serviço novo.

| # | Critério | Como é verificado | Fonte |
|---|---|---|---|
| 1 | Produtos | `ValidationStage`/`NormalizationStage` aceitam o item sem erro; ≥1 produto persistido | Connector Platform |
| 2 | Ofertas | Idem, para `offers` | Connector Platform |
| 3 | Categorias | Cobertura de categoria da loja ≥ limiar (sem categoria nula em massa) | `MarketplaceCoverageService` |
| 4 | Marcas | Cobertura de marca da loja ≥ limiar | `MarketplaceCoverageService` |
| 5 | Imagens | Fator "image" do Catalog Quality ≥ limiar | `ProductHealthService` |
| 6 | Preço | `priceUSD` válido (não nulo, não zero) para as ofertas da loja | Connector Platform (`ValidationStage`) |
| 7 | Moeda | `offers.currency` corresponde à moeda real observada na auditoria (§5) | Auditoria manual + Connector Platform |
| 8 | Estoque | `inStock`/`stockQuantity` populados de forma significativa (não 100% `true` fixo) | `ProductHealthService` |
| 9 | Canonical Match | Canonical Match Rate ≥ limiar | `MerchantPriorityService` (lógica de coverage) |
| 10 | Change Detection | `market_changes` registra mudanças reais nos ciclos de sync da loja (não zero) | `realtime-commerce` (`MarketChangeDetectionStage`) |
| 11 | Freshness | Freshness Score médio da loja ≥ limiar | `FreshnessService` / `StoreUpdateIntelligenceService` |
| 12 | Health Score | Health Score do conector ≥ limiar | `ConnectorHealthService` |
| 13 | Marketplace Operations | Loja aparece corretamente em `MarketplaceCoverageService`/`MarketplaceMetricsService`, sem alerta crítico aberto (`MarketplaceAlertService`) | `marketplace-operations` |
| 14 | Exchange | Quando `offers.currency != "USD"`, `AutomaticCurrencyService.convert()` resolve sem erro | `exchange` |
| 15 | Real-Time Commerce | `StoreUpdateIntelligenceService` consegue computar um perfil não-vazio para a loja (atividade real detectada) | `realtime-commerce` |

**Limiares numéricos não são fixados neste documento** — definir um número (ex.: "Canonical Match ≥ 60%") sem dado real de produção seria uma decisão fabricada, não uma decisão informada. Ficam como ação da primeira Wave que efetivamente rodar um Connector Tier 1 contra dado de produção real e puder calibrar os limiares a partir de distribuição observada, não de intuição.

---

## 3. Connector Score

Composto pelos 8 sub-scores do mandato, todos reaproveitados (ver §1) exceto o Maintenance Risk (documentado, não computado). **Overall Certification Score = média simples dos 8**, uma vez que os 15 critérios de certificação (§2) já são o gate binário (certificado ou não) — o score é para ranking/priorização entre conectores já certificados, não para decidir "pode ir ao ar".

Como o Prospect Score (pré-onboarding) e o Connector Score (pós-onboarding) coexistem sem duplicar: **Prospect Score decide a ordem de implementação** (§6); **Connector Score decide a saúde operacional contínua** depois que o Connector já existe. Uma loja nunca tem os dois simultaneamente com o mesmo significado — o Prospect Score desaparece (não é substituído por um "Prospect Score = 100") assim que a loja tem `stores` row real e passa a ser regida por `MerchantPriorityService` + Connector Score.

---

## 4. Marketplace Priority — reaproveitamento explícito, não duplicação

A "Marketplace Priority" pedida no mandato (Tier, Business Priority, Marketplace Value, Traffic Importance, Catalog Size, Expected Buyer Demand, Sync Frequency) **não é um sistema novo**:

- **Lojas já onboarded** (nenhuma das 10 desta lista tem `stores` row hoje, exceto indiretamente via Shopping China — ver §5): `MerchantPriorityService` já produz Tier (Diamond/Gold/Silver/Bronze) + os 7 fatores reais, compute-on-read, zero tabela nova.
- **Lojas ainda não onboarded** (as 10 desta Wave): usam o **Prospect Score** de `RELEASE_1_8_BLUEPRINT.md` Capítulo 1 (já definido antes desta Wave, não inventado aqui) — Complementaridade de categoria 30pts + Viabilidade técnica 25pts + Reconhecimento de marca 20pts + Qualidade de dado esperada 15pts + Disponibilidade para claim/parceria 10pts.

**Limitação real, documentada, não escondida**: pontuar "Complementaridade de categoria" com precisão exigiria comparar o catálogo de cada loja candidata contra o catálogo já existente no ParaguAI (quais categorias já têm cobertura vs. quais ficariam mais fortes) — análise de overlap que esta Wave não realizou (exigiria acesso a dado de produção real, fora do escopo de auditoria técnica de site público). §6 usa uma classificação qualitativa (Alta/Média/Baixa) com raciocínio explícito em vez de um número fabricado para essa dimensão.

---

## 5. Auditoria técnica por loja

Auditoria realizada via `robots.txt`/`sitemap.xml` públicos e navegação de páginas públicas — nunca contornando bloqueio declarado. Data da auditoria: 2026-07-03.

### 5.1 Shopping China

| Campo | Valor |
|---|---|
| Site | `shoppingchina.com.py` |
| Categorias | ~20+ (Bebidas, Calzados, Cosméticos, Electrónicos, Informática, etc.) |
| Moeda | Guaraní (Gs.) primário; preço "tax-free" em US$ ocasional |
| Método de importação | Sitemap-driven crawl |
| Sitemap | Sim — `urlset` plano, ~800–1.000+ URLs, categoria (`/[categoria]/[subcategoria]`) + produto (`/producto/[id]`) |
| Robots | Permissivo — só `Disallow: /br`; Googlebot/Googlebot-image explicitamente liberados |
| Canonical Coverage | Não medido (loja já tem connector, mas certificação formal — §2 — ainda não rodada) |
| Estimated Products | ~1.000–1.500 (extrapolado do sitemap) |
| Estimated Offers | = produtos (1 oferta/produto, loja única) |
| Estimated Sync Time | Baixo (catálogo pequeno-médio, HTML estático) |
| Sync Frequency | Diária |
| Connector Complexity | Baixa |
| Known Risks | Conector existente (`src/domains/connectors/crawler/shoppingchina/`) **não usa o sitemap** — 3 categorias hardcoded, corte fixo de `maxProductsPerCategory`, sem paginação real, sem retry/backoff no `HttpFetchStrategy`. Bug pré-existente já nomeado em `TECH_DEBT.md`: preço em Gs. gravado como `price_usd` em um fallback do `detail-parser.ts`. |
| Certification Status | **In Progress** — connector existe, não certificado contra os 15 critérios do §2 |
| Integration Strategy | Public Connector |
| Observações | Melhor candidato a "certificação de referência" — reescrever para sitemap-driven resolveria a maior dívida técnica conhecida deste connector. |

### 5.2 Cellshop

| Campo | Valor |
|---|---|
| Site | `cellshop.com.py` → redireciona (301) para `cellshop.com` |
| Categorias | Inferido via cache de busca: Tecnologia (Celulares, Informática, Eletrônicos, Eletrodomésticos) |
| Moeda | Guaraní (Gs.), inferido via snippets indexados |
| Método de importação | **Nenhum — bloqueado** |
| Sitemap | Não declarado em robots.txt |
| Robots | `Disallow: /` nomeado explicitamente para `ClaudeBot`, além de Amazonbot/Applebot-Extended/Bytespider/CCBot/CloudflareBrowserRenderingCrawler/Google-Extended/GPTBot/meta-externalagent; `Content-Signal: ai-train=no` |
| Canonical Coverage | N/A |
| Estimated Products | Não verificável (conteúdo bloqueado) |
| Estimated Offers | Não verificável |
| Estimated Sync Time | N/A |
| Sync Frequency | N/A |
| Connector Complexity | N/A (bloqueio de política, não dificuldade técnica) |
| Known Risks | Cloudflare retorna 403 em qualquer fetch de conteúdo, mesmo com user-agent genérico — não é apenas o robots.txt, há enforcement ativo |
| Certification Status | **Restricted — Commercial Partnership Recommended** |
| Integration Strategy | Data Partnership |
| Observações | Um dos 2 merchants mais citados no roadmap (`PROJECT_STATUS.md`, `ROADMAP_1_8.md`) — permanece Tier 1 e prioritário; caminho técnico é uma conversa comercial direta, nunca scraping. |

### 5.3 Nissei

| Campo | Valor |
|---|---|
| Site | `nissei.com/py` |
| Categorias | Inferido via cache: Informática, Eletrodomésticos/Móveis, com subcategorias (ex. placas gráficas, refrigeração) |
| Moeda | Guaraní (Gs.), inferido via snippets |
| Método de importação | **Nenhum — bloqueado** |
| Sitemap | Não verificável — `/sitemap.xml` retornou 403 |
| Robots | Mesmo template Cloudflare de Cellshop — `Disallow: /` nomeado para `ClaudeBot` e a mesma lista de bots de IA |
| Canonical Coverage | N/A |
| Estimated Products | Não verificável |
| Estimated Offers | Não verificável |
| Estimated Sync Time | N/A |
| Sync Frequency | N/A |
| Connector Complexity | N/A (bloqueio de política) |
| Known Risks | 403 ativo em todas as páginas de conteúdo testadas, mesmo user-agent genérico |
| Certification Status | **Restricted — Commercial Partnership Recommended** |
| Integration Strategy | Data Partnership |
| Observações | O outro dos 2 merchants mais citados no roadmap — mesma recomendação de Cellshop. Distribuidor oficial Apple/Sony/Canon/Nikon no Paraguai — uma parceria de dado aqui teria alto valor de catálogo se viabilizada comercialmente. |

### 5.4 Mega Eletrônicos

| Campo | Valor |
|---|---|
| Site | `megaeletronicos.com` |
| Categorias | ~14 top-level |
| Moeda | **USD + BRL** (sem Gs. primário — atípico entre os 10) |
| Método de importação | Sitemap-driven crawl |
| Sitemap | Sim — plano, ~1.000–1.500 URLs, `lastmod` = hoje (regeneração diária) |
| Robots | Permissivo — bloqueia apenas `/cart`, `/user*`, `/profile`, `/ecommerce*`, `/order*`; libera explicitamente Googlebot/Bingbot/Yandex/Baidu |
| Canonical Coverage | Não medido (loja não onboarded) |
| Estimated Products | ~1.000–1.500 |
| Estimated Offers | = produtos |
| Estimated Sync Time | Baixo-médio |
| Sync Frequency | Diária (casa com cadência de regeneração do sitemap) |
| Connector Complexity | Baixa-Média |
| Known Risks | Normalização de moeda (USD/BRL, sem Gs.) precisa de regra própria; URLs de categoria e produto misturados no mesmo sitemap exigem desambiguação por padrão de path; verificar política de hotlink do CDN de imagens antes de fetch em massa |
| Certification Status | **Certified** (2026-07-04, Release 1.8 — Program D — Wave 1) — 197 ofertas reais persistidas, health score 100, quality score 69 |
| Integration Strategy | Public Connector |
| Observações | Maior loja de eletrônicos de CDE (fundada 1990). Preço exibido em formato americano (vírgula-milhar, ponto-decimal) — achado só confirmado na implementação real, não na auditoria original (`parseAmountUSFormat`, SDK). |

### 5.5 Casa Americana

| Campo | Valor |
|---|---|
| Site | `www.casaamericana.com.py` |
| Categorias | Não verificável (auditoria interrompida por política) |
| Moeda | Não verificável |
| Método de importação | **Nenhum — bloqueado** |
| Sitemap | Não declarado |
| Robots | `Disallow: /` nomeado para `ClaudeBot`/Amazonbot/Applebot-Extended/Bytespider/CCBot/CloudflareBrowserRenderingCrawler/Google-Extended/GPTBot/meta-externalagent/SemrushBot; `User-agent: *` recebe `Allow: /` mas com `Crawl-delay: 20` e `Disallow: /catalogo` |
| Canonical Coverage | N/A |
| Estimated Products | Não verificável |
| Estimated Offers | Não verificável |
| Estimated Sync Time | N/A |
| Sync Frequency | N/A |
| Connector Complexity | N/A (bloqueio de política) |
| Known Risks | 403 em fetch direto da homepage, independente do robots.txt |
| Certification Status | **Restricted — Commercial Partnership Recommended** |
| Integration Strategy | Data Partnership |
| Observações | Loja tradicional de CDE (fundada 1972) — `Disallow: /catalogo` sugere que o próprio operador já pensa em proteção de catálogo contra concorrência, reforçando que uma conversa comercial (não técnica) é o caminho certo. |

### 5.6 Roma Shopping

| Campo | Valor |
|---|---|
| Site | `www.romapy.com` (Rigstar S.A., WordPress + WooCommerce) |
| Categorias | 7 departamentos (Cozinha, Eletrônicos, Informática, Brinquedos, Roupa e Calçados, Beleza e Perfumaria, Bebidas) + Ofertas/Novidades |
| Moeda | USD, Gs., BRL, ARS — banner de câmbio ao vivo |
| Método de importação | Sitemap-driven crawl (`sitemap_index.xml`) |
| Sitemap | Índice com 132 sub-sitemaps — 127 de produto, ~50.000 URLs estimadas (extrapolação, não contagem exaustiva) |
| Robots | Permissivo — só padrões internos de WP/WooCommerce (`/wp-admin/`, add-to-cart, etc.) |
| Canonical Coverage | Não medido |
| Estimated Products | ~50.000 (estimativa, não confirmada) |
| Estimated Offers | = produtos |
| Estimated Sync Time | Alto (maior catálogo dos 10 auditados) |
| Sync Frequency | Diária para full crawl; horária-diária para deltas de preço/estoque (atividade de `lastmod` observada em múltiplos horários) |
| Connector Complexity | Baixa-Média (estrutura limpa, mas volume exige crawling paginado/throttled) |
| Known Risks | Volume alto sem `Crawl-delay` declarado — throttling próprio necessário por cortesia; parsing de 4 moedas exige decisão de moeda canônica (provavelmente Gs.); marcação de "fora de estoque" não confirmada em exemplo real |
| Certification Status | **Certified** (2026-07-04, Release 1.8 — Program D — Wave 1) — 205 ofertas reais persistidas, health score 80 (1 falha transitória na 1ª tentativa real por `stores` row ausente, corrigida — sync seguinte 100% limpo), quality score 65 |
| Integration Strategy | Public Connector |
| Observações | Maior catálogo potencial de todos os 10 — confirmado ~24.370 URLs de produto reais no sitemap (auditoria original estimava ~50k, extrapolação). Melhor sinal estruturado dos 3 novos (Open Graph `product:price:amount`/`product:availability`) — nenhuma moeda ambígua a resolver. |

### 5.7 Mobile Zone

| Campo | Valor |
|---|---|
| Site | `mobilezone.com.py` (+ `blog.mobilezone.com.py`) |
| Categorias | Não verificável em HTML estático |
| Moeda | Não verificável |
| Método de importação | API REST pública descoberta legitimamente (Wave Ξ-1, 2026-07-08) |
| Sitemap | Não declarado; `/sitemap.xml` retorna 404 (achado original confirmado) |
| Robots | Permissivo (`Allow: /`), só bloqueia `/checkout/`, `/cambiodeldia/`, uma referência externa — sem nenhum bloqueio nomeado a crawler de IA |
| Canonical Coverage | 100% (200/200 ofertas sincronizadas) |
| Estimated Products | 6.956 confirmados via API (`count` do endpoint `/products`) — muito acima da estimativa original "não verificável" |
| Estimated Offers | 200 sincronizadas nesta Wave (cap `maxProducts`), catálogo real maior |
| Estimated Sync Time | ~104s para 200 produtos (confirmado, execução real) |
| Sync Frequency | Diária (`config.syncFrequencyHours: 24`) |
| Connector Complexity | **Baixa** (revisado — não Média-Alta como suposto antes do spike) |
| Known Risks | Confirmado: homepage é 100% CSR (`<div id="root"></div>`, bundle React/Vite) — mas o próprio bundle JS público (`/assets/index-*.js`), lido como texto estático (sem execução, sem headless browser), revelou a URL base de uma API REST pública, sem autenticação, `Access-Control-Allow-Origin: *`, com endpoint `/health` — a mesma API que o frontend do site consome. Preço não verificado contra uma segunda fonte (ver `product-mapper.ts`, tratado como USD por convenção com os demais conectores) |
| Certification Status | **Certified** (2026-07-08, PROGRAM Ξ — Wave Ξ-1) — 200 ofertas reais persistidas, 0 falhas, pipeline completo (`src/domains/connectors/crawler/mobilezone/`) |
| Integration Strategy | Public Connector |
| Observações | A hipótese do spike original ("SPA sem sitemap pode ter API JSON explorável") se confirmou exatamente como prevista — a diferença entre precisar de headless browser e ter API explorável realmente definiu a complexidade (Baixa, não Média-Alta). Nenhum headless browser foi usado — a API foi encontrada lendo o bundle JS público como texto, technique legítima e sem bypass de proteção alguma. |

### 5.8 New Zone

| Campo | Valor |
|---|---|
| Site | `newzone.com.py` (não-www é canônico — `www.` retorna 404) |
| Categorias | Não verificável (auditoria interrompida por política) |
| Moeda | Não verificável |
| Método de importação | **Nenhum — bloqueado** |
| Sitemap | Não declarado |
| Robots | `Content-Signal: search=yes, ai-train=no, use=reference` + bloco `Disallow: /` nomeado para Amazonbot/Applebot-Extended/Bytespider/CCBot/**ClaudeBot**/CloudflareBrowserRenderingCrawler/Google-Extended/GPTBot/meta-externalagent |
| Canonical Coverage | N/A |
| Estimated Products | Não verificável |
| Estimated Offers | Não verificável |
| Estimated Sync Time | N/A |
| Sync Frequency | N/A |
| Connector Complexity | N/A (bloqueio de política) |
| Known Risks | Nenhuma página além do robots.txt foi buscada, por decisão de conformidade |
| Certification Status | **Restricted — Commercial Partnership Recommended** |
| Integration Strategy | Data Partnership |
| Observações | Distribuidora/importadora de grande porte ("plataforma online de atacado" segundo material próprio) — se uma parceria B2B for viabilizada, o valor de catálogo é alto. |

### 5.9 Atacado Connect

| Campo | Valor |
|---|---|
| Site | `atacadoconnect.com` (antigo "Atacado Games" — já nomeado em `RELEASE_1_8_BLUEPRINT.md` Capítulo 1 sob o nome anterior) |
| Categorias | Multi-nível (`/categoria/informatica/hardware/placas-mae`, etc.) |
| Moeda | USD primário; coluna BRL presente mas exibindo "0,00" (conversão desativada/quebrada — não confiar no valor exibido) |
| Método de importação | Sitemap + crawl de categoria paginada (sitemap parece incompleto) |
| Sitemap | Sim — ~900 URLs, mas uma única categoria (`/categoria/informatica`) já lista 8.424 produtos — sitemap não cobre o catálogo inteiro, paginação de categoria é necessária como complemento |
| Robots | Permissivo — bloqueia só `/api/`, `/cec/` (provável admin), `/_next/` |
| Canonical Coverage | Não medido |
| Estimated Products | 8.000+ (extrapolado de uma única categoria) |
| Estimated Offers | = produtos |
| Estimated Sync Time | Médio-Alto (catálogo grande) |
| Sync Frequency | Diária, considerar 2x/dia se arbitragem de preço USD/BRL for prioridade |
| Connector Complexity | Baixa-Média |
| Known Risks | Sitemap não é fonte confiável isolada (incompleto) — precisa combinar com paginação de categoria; BRL exibido não deve ser usado como fonte de preço (calcular via Exchange Intelligence a partir do USD) |
| Certification Status | **Certified** (2026-07-04, Release 1.8 — Program D — Wave 1) — 206 ofertas reais persistidas, health score 100, quality score 72 |
| Integration Strategy | Public Connector |
| Observações | App Next.js/Vercel. **Achado que corrige a auditoria original**: sitemap hoje contém ~18.000 URLs de produto reais diretamente — o achado anterior ("sitemap incompleto, precisa de paginação de categoria") não se confirmou na implementação real (o site parece ter regenerado o sitemap desde 2026-07-03). JSON-LD schema.org por produto — o sinal mais limpo dos 3 novos conectores, zero regex sobre HTML. `offers.currency` = USD confirmado via JSON-LD (a coluna BRL exibida no site é de fato quebrada, como já suspeitado). Loja seedada sob o nome antigo "Atacado Games" — corrigido para "Atacado Connect" nesta Wave. |

### 5.10 Visão VIP

| Campo | Valor |
|---|---|
| Site | `visaovip.com` (Shopping Lai Lai Center, CDE) |
| Categorias | Informática/eletrônicos (não é ótica, apesar do nome — confirmado) |
| Moeda | Não confirmada em HTML estático (ver risco abaixo) |
| Método de importação | **Nenhum — bloqueado** (correção, ver abaixo) |
| Sitemap | Sim, mas contém apenas 24 URLs utilitárias/estáticas (contato, frete, wishlist) — **nenhuma URL de produto/categoria** (achado original confirmado) |
| Robots | **Correção de auditoria (Wave Ξ-1, 2026-07-08)**: a leitura original ("Permissivo, `Allow: /`") capturou só o bloco genérico final — o `robots.txt` completo tem uma seção "Cloudflare Managed content" anterior com `Disallow: /` nomeado explicitamente para **ClaudeBot**, além de Amazonbot/Applebot-Extended/Bytespider/CCBot/CloudflareBrowserRenderingCrawler/Google-Extended/GPTBot/meta-externalagent, e `Content-Signal: ai-train=no, use=reference` |
| Canonical Coverage | N/A |
| Estimated Products | Não verificável (bloqueio de política, nenhum fetch adicional tentado) |
| Estimated Offers | Não verificável |
| Estimated Sync Time | N/A |
| Sync Frequency | N/A |
| Connector Complexity | N/A (bloqueio de política, não técnico) |
| Known Risks | Nenhuma página além de robots.txt/homepage foi buscada após a descoberta do bloqueio nomeado, por decisão de conformidade — mesma disciplina já aplicada a Cellshop/Nissei/Casa Americana/New Zone |
| Certification Status | **Restricted — Commercial Partnership Recommended** (revisado de "Needs Technical Spike" — o site é tecnicamente CSR/Next.js como suposto, mas isso deixou de ser a questão relevante diante do bloqueio de política explícito) |
| Integration Strategy | Data Partnership |
| Observações | **Classificação original (2026-07-03) estava incompleta, não incorreta** — a suspeita de renderização client-side (App Next.js) se confirmou, mas a auditoria original não capturou o bloco `Disallow: /` nomeado para ClaudeBot, presente no mesmo `robots.txt` já público naquela data. Nenhum dado foi coletado deste site em nenhuma Wave. |

---

## 6. Prospect Score (pré-onboarding) — classificação qualitativa

Como nomeado em §4, o Prospect Score numérico completo (100pts, Capítulo 1 do Blueprint) exige análise de overlap de catálogo não realizada nesta Wave. A tabela abaixo usa **Business Priority** qualitativa (Alta/Média/Baixa) com o raciocínio explícito por trás, preservando honestidade sobre o que é medido vs. estimado.

| Loja | Business Priority | Viabilidade Técnica | Raciocínio |
|---|---|---|---|
| Shopping China | Alta | Alta (já tem connector) | Recertificar > construir do zero; menor esforço para o maior ganho imediato (corrige dívida técnica conhecida) |
| Cellshop | Alta | Bloqueada (parceria) | Marca mais citada no roadmap; valor de negócio não muda com o bloqueio técnico |
| Nissei | Alta | Bloqueada (parceria) | Idem — distribuidor oficial de marcas de peso (Apple/Sony/Canon/Nikon) |
| Mega Eletrônicos | Alta | Alta | Maior loja de eletrônicos de CDE, sitemap limpo, zero fricção técnica |
| Roma Shopping | Alta | Alta | Maior catálogo potencial (~50k), stack limpa, 4 moedas já indicam operação sofisticada |
| Atacado Connect | Média-Alta | Alta | Catálogo grande (8k+), stack moderna, já nomeada no Blueprint sob nome anterior |
| Casa Americana | Média | Bloqueada (parceria) | Tradicional e relevante, mas sem dado técnico de catálogo disponível para confirmar tamanho/relevância real |
| New Zone | Média-Alta | Bloqueada (parceria) | Auto-descrita como "plataforma de atacado" — alto valor potencial de catálogo se parceria avançar |
| Mobile Zone | Média | Média-Baixa (spike necessário) | Negócio real e relevante (12+ anos), mas viabilidade técnica ainda não confirmada |
| Visão VIP | Média | Média-Baixa (spike necessário) | Loja de porte menor que as demais eletrônicas, mesma incerteza técnica de Mobile Zone |

---

## 7. Componentes reutilizáveis entre Connectors

Nenhuma das 10 lojas usa exatamente a mesma tecnologia, mas os seguintes componentes internos já existem e devem ser reaproveitados sem quebrar a independência de cada Connector (`ISyncStage`/`IFetchStrategy` continuam por-conector):

- **`SitemapParser`/`RobotsParser`** (`src/domains/connectors/discovery/parsers/`) — já genéricos, sem dependência de um site específico; devem ser reaproveitados por qualquer novo connector sitemap-driven (Shopping China, Mega Eletrônicos, Roma Shopping, Atacado Connect) em vez de escrever um novo parser de sitemap por loja.
- **`HttpFetchStrategy`** — reaproveitável, mas precisa ganhar retry/backoff (hoje só `ExchangeRateApiHttpClient` tem isso) antes de ser considerado "resiliente" — ver `TECH_DEBT.md`.
- **Pipeline fixo** (`ValidationStage → NormalizationStage → DeduplicationStage → ProductIdentityShadowStage → MediaStage → CatalogWriteStage → MarketChangeDetectionStage`) — todo novo connector entra neste mesmo pipeline, nenhum stage novo é necessário para os 4 candidatos "Ready for Connector Build".
- **Normalização de multi-moeda** — Mega Eletrônicos (USD/BRL), Roma Shopping (4 moedas), Atacado Connect (USD/BRL quebrado) todos precisam da mesma decisão: `offers.currency` = moeda real informada pela loja, `AutomaticCurrencyService` (Exchange Intelligence, já existente) resolve a conversão sob demanda — nenhuma lógica de conversão nova por connector.
- **Headless-browser layer** (spike necessário, não existe hoje) — se Mobile Zone e/ou Visão VIP confirmarem renderização client-side, ambos podem compartilhar a mesma nova `IFetchStrategy` baseada em Playwright, em vez de duas implementações paralelas.

---

## 8. Limitações desta auditoria (documentadas, não escondidas)

- **Estimativas de "Estimated Products"/"Estimated Offers" são extrapolações de amostra**, não contagens exaustivas — nenhum crawl completo foi executado (seria scraping em volume, fora do escopo de uma auditoria de due diligence).
- **Cellshop/Nissei/Casa Americana/New Zone**: nenhum dado de categoria/moeda/estoque foi confirmado por fetch direto — apenas o que já era publicamente indexado por motores de busca foi usado como inferência, nunca declarado como fato verificado.
- **Mobile Zone/Visão VIP**: a hipótese de renderização client-side não foi confirmada com uma ferramenta de navegador real (Playwright) — o fetch estático usado nesta auditoria pode estar truncando, não necessariamente provando CSR. Spike técnico recomendado antes de comprometer arquitetura ou estimar esforço com confiança.
- **Prospect Score numérico completo não computado** — falta a análise de overlap de categoria com o catálogo real do ParaguAI (ver §4/§6).
- **Limiares de certificação (§2) não fixados** — nenhum dado de produção real ainda existe para calibrá-los com confiança.
