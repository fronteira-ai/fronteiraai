# MERCHANT_PARTNERSHIP_PROGRAM.md
# Programa Oficial de Parcerias com Merchants

**Versão**: 1.0
**Criado**: 2026-07-03 (Release 1.8 — Program C — Wave 0, mandato do CTO: "Merchant Partnership Program")
**Status**: Referência oficial do programa de parcerias comerciais
**Categoria**: `docs/business/` (ADR-049)

---

## 0. Por que este programa existe

A certificação de Connectors Tier 1 (`docs/marketplace/Tier1_Merchants.md`, Program A — Wave 3) encontrou que 4 dos 10 maiores varejistas da fronteira — **Cellshop, Nissei, Casa Americana, New Zone** — bloqueiam explicitamente crawlers de IA (incluindo `ClaudeBot` nomeado) em seu `robots.txt`, com enforcement ativo via Cloudflare em pelo menos 2 deles. A decisão arquitetural já tomada é permanente: **o ParaguAI não contorna `robots.txt`, não desenvolve mecanismos para burlar Cloudflare, não faz scraping que viole política pública de nenhum site**. Essas 4 lojas continuam Tier 1 e prioritárias — o caminho para os dados delas deixa de ser técnico e passa a ser comercial.

Este programa não é exclusivo dessas 4 lojas: qualquer merchant Tier 1 — inclusive os já tecnicamente integráveis (Shopping China, Mega Eletrônicos, Roma Shopping, Atacado Connect) — pode se tornar um parceiro oficial, com benefícios que vão além do que um Connector de scraping oferece (dashboard, selo, atualização prioritária). Scraping público e parceria oficial não são mutuamente exclusivos; parceria é sempre a relação mais forte e mais sustentável a longo prazo.

---

## 1. Visão do programa

Ser a plataforma que os grandes varejistas da fronteira **escolhem** integrar oficialmente — não porque foram raspados, mas porque enxergam valor real em estar presentes: mais clientes, inteligência de mercado que a operação sozinha não produziria, e uma relação de dado transparente e auditável dos dois lados.

O programa formaliza o que `MARKETPLACE_VISION.md` já declara como proposta de valor ao lojista (`docs/product/MARKETPLACE_VISION.md` §5) em um processo comercial concreto, executável por qualquer pessoa do time (ou pelo CTO), não apenas uma intenção declarada.

---

## 2. Tiers de parceria

| Tier | Significado | Critério de entrada |
|---|---|---|
| **Integration Partner** | Fornece dado (feed/API) mas ainda em avaliação técnica ou piloto — relação formal, ainda não certificada | Contrato/NDA assinado, integração técnica em andamento ou em sandbox |
| **Certified Merchant** | Integração técnica validada — passou pelos 15 critérios de certificação (`docs/marketplace/Tier1_Merchants.md` §2), agora via feed oficial em vez de scraping | Certificação aprovada com dado vindo do feed/API do parceiro |
| **Official Merchant Partner** | Certified Merchant + contrato comercial ativo de longo prazo — a relação madura e estável | Certified Merchant + acordo comercial formalizado (ainda que sem contrapartida financeira nesta fase — ver §7 Limitações) |
| **Founding Partner** | Um dos primeiros N parceiros oficiais do programa (marco histórico, não um nível técnico) — reconhecimento permanente, nunca revogado mesmo que o parceiro saia depois | Estar entre os primeiros parceiros a completar o fluxo de onboarding completo (§4) |

**Distinção importante, para não duplicar conceito já existente**: estes 4 tiers são sobre a relação **B2B de dado** entre o ParaguAI e uma empresa de varejo (negociada topo-a-topo, com contrato/NDA). Isso é diferente de `OwnershipLevel` (`src/domains/merchant-ownership/types/enums.ts`, Release 1.7 — Wave 5) — `StoreDiscovered → ClaimRequested → IdentityVerified → OwnershipVerified → MerchantVerified → PremiumMerchant` é a jornada de **auto-serviço** de um lojista (de qualquer porte) reivindicando e verificando sua própria loja no painel `/merchant`. As duas jornadas são independentes e podem coexistir: um Official Merchant Partner também pode (e deveria) ter sua loja `MerchantVerified`/`PremiumMerchant` no fluxo de auto-serviço — nenhum tier deste programa substitui ou pula o outro.

---

## 3. Requisitos (Partner Integration Requirements)

Campos que o ParaguAI espera receber de qualquer feed/API de parceiro. Mapeados diretamente aos tipos já existentes do Connector Platform — **nenhum schema novo**, o parceiro alimenta exatamente o mesmo pipeline que qualquer Connector de scraping já alimenta.

| Campo pedido no mandato | Já modelado em | Observação |
|---|---|---|
| Produto (nome) | `RawProduct.name` | Obrigatório |
| Marca | `RawProduct.brand` | Opcional na struct, mas certificação exige cobertura mínima (§2 de `Tier1_Merchants.md`) |
| Categoria | `RawProduct.category` | Idem |
| Descrição | `RawProduct.description` | Opcional |
| Imagem | `RawProduct.imageUrl` | Opcional na struct, mas certificação exige cobertura mínima |
| Preço | `RawOffer.priceUSD` (+ `priceBRL`/`oldPriceUSD` opcionais) | Obrigatório |
| Moeda | `RawOffer.currency` | Obrigatório — alimenta `AutomaticCurrencyService` (Exchange Intelligence) automaticamente |
| Estoque | `RawOffer.inStock` / `stockQuantity` | Opcional na struct, mas certificação exige que não seja `true` fixo |
| URL do produto | `RawOffer.productUrl` | Opcional |
| Última atualização | `ConnectorBatch.fetchedAt` (nível de lote, não por item) | Ver limitação abaixo |
| SKU / EAN / GTIN | **Não modelado explicitamente hoje** — cabe em `RawProduct.specifications` (bag genérico `Record<string,string>`) | Ver limitação abaixo |

**Limitações documentadas, não escondidas**:
- `RawOffer`/`RawProduct` não têm um campo de "última atualização por item" — apenas `ConnectorBatch.fetchedAt` no nível do lote inteiro. Se um parceiro fornecer timestamp por produto, hoje ele cairia em `specifications` sem uso especial. Promover isso a um campo de primeira classe é aditivo e de baixo risco, mas não foi feito nesta Wave (nenhuma implementação foi pedida).
- SKU/EAN/GTIN não são campos de primeira classe em `RawProduct` — hoje qualquer parceiro que os forneça os colocaria em `specifications`. Se esses códigos se tornarem centrais para Canonical Match (Canonical Catalog, Release 1.7 Wave 4), promovê-los a campos explícitos é a evolução natural — nomeado aqui, não implementado.

---

## 4. Fluxo oficial de parceria

```
1. Contato inicial          — e-mail institucional (PARTNERSHIP_EMAIL_TEMPLATE.md)
       ↓
2. Reunião                  — apresentação do programa e da proposta (PARTNERSHIP_PROPOSAL.md)
       ↓
3. NDA (quando necessário)  — antes de detalhar volume de tráfego/dado interno do ParaguAI
       ↓
4. Documentação técnica     — Partner Integration Requirements (§3) + formato de integração (§5)
       ↓
5. API ou Feed              — parceiro disponibiliza o acesso real (credenciais, endpoint, arquivo)
       ↓
6. Sandbox                  — integração testada com dado real, sem afetar o catálogo público
       ↓
7. Validação                — os 15 critérios de certificação (`Tier1_Merchants.md` §2) rodam contra o feed do parceiro
       ↓
8. Certificação             — feed aprovado, tier "Certified Merchant" concedido
       ↓
9. Partner Oficial          — contrato/relação formalizada, tier "Official Merchant Partner" (e "Founding Partner" se aplicável)
```

Cada estágio corresponde a um valor de `Current Stage`/`Partner Status` em `docs/business/TIER1_PARTNERS.md` — a tabela de pipeline é a fonte de verdade de "em que passo estamos com o Merchant X", este fluxo é a definição de o que cada passo significa.

---

## 5. Modelo de integração — formatos suportados

O Connector Platform já modela a maioria dos formatos pedidos no mandato via `ConnectorType` (`src/domains/connectors/types/enums.ts`) — **nenhuma interface nova foi criada nesta Wave**, por decisão deliberada ("nenhuma implementação específica"). Qualquer parceiro que integre por um desses formatos já tem um caminho estrutural pronto: implementar `IConnector` (`fetch(): Promise<ConnectorBatch>`) e entrar no mesmo pipeline (`ValidationStage → NormalizationStage → DeduplicationStage → ProductIdentityShadowStage → MediaStage → CatalogWriteStage → MarketChangeDetectionStage`) que qualquer Connector de scraping já usa hoje — **zero refatoração de arquitetura**, exatamente como o mandato exigiu.

| Formato pedido no mandato | Já coberto por `ConnectorType` | Observação |
|---|---|---|
| JSON Feed | `JsonFile` | `JsonFileConnector` (`crawler/reference/`) já é a referência viva deste formato |
| CSV | `CsvFile` | `CsvFileConnector` (`crawler/reference/`) já é a referência viva |
| REST API | `ApiRest` | Já modelado, sem implementação de referência ainda |
| XML | `XmlFile` | Já modelado, sem implementação de referência ainda |
| Upload Manual | `ManualUpload` | Já modelado |
| ERP (extra, não pedido no mandato, já existente) | `Erp` | Cobre parceiros com integração direta de sistema de gestão |
| GraphQL | **Não modelado** | Aditivo — um novo valor de `ConnectorType` quando o primeiro parceiro real pedir |
| FTP | **Não modelado** | Idem |
| SFTP | **Não modelado** | Idem |
| Webhook | **Não modelado** | Idem — diferente dos demais por ser push, não pull; `IConnector.fetch()` pode precisar de uma variante ou de um adaptador que acumula eventos de webhook em um `ConnectorBatch` |
| Google Sheets | **Não modelado** | Aditivo — tecnicamente um caso especial de "API REST" (Google Sheets API) ou de "CSV" (export público) |

**Nenhum destes 5 formatos ausentes foi implementado nesta Wave** — são aditivos ao enum `ConnectorType` existente quando o primeiro parceiro real exigir um deles, nunca uma reformulação do Connector Platform. Registrado em `TECH_DEBT.md`.

---

## 6. Benefícios do parceiro (Partner Benefits)

| Benefício | O que significa | Fonte já existente |
|---|---|---|
| Página oficial da loja | Perfil de loja com selo de verificação já visível hoje via `stores.is_verified` | `lojas/[slug]` |
| Selo Partner | Badge visual distinto de "Verified" comum — indicando integração oficial de dado, não apenas identidade confirmada | Novo badge visual, reaproveitando o padrão de `TrustBadge` (não um novo Engine — apenas um novo valor de exibição) |
| Dashboard Premium | Acesso ao Command Center + Analytics Platform completos | `merchant-intelligence`, `merchant-analytics` (já existentes) |
| Analytics exclusivos | Funil de conversão, tráfego, produtos mais vistos | `merchant-analytics` (já existente) |
| Insights de mercado | Recomendações do Growth Engine + Decision Engine | `growth-engine`, `merchant-decision` (já existentes) |
| Market Pulse | Visão do que está mudando no mercado em tempo quase real | `realtime-commerce` (Program A Wave 2, já existente) |
| Atualização prioritária | Ciclo de sync mais frequente que o padrão (quando o volume justificar) | Configuração de `syncFrequencyHours` já existente por conector |
| Suporte dedicado | Canal direto com o time ParaguAI, fora do fluxo de suporte padrão | Processo comercial, não código |
| Participação no lançamento | Co-marketing em campanhas de lançamento de features/Home Premium | Processo comercial, não código |

Todo benefício técnico listado acima **já existe hoje** para qualquer merchant verificado — o programa de parceria não cria uma segunda plataforma de benefícios, apenas empacota o que já existe em uma proposta de valor clara para negociação.

---

## 7. Responsabilidades

**ParaguAI se compromete a**:
- Nunca alterar o preço original informado pelo parceiro (mandato permanente, já estrutural — `AutomaticCurrencyService` nunca sobrescreve `offers.currency`/preço original).
- Nunca sub-licenciar ou revender o dado do parceiro a terceiros.
- Manter o feed/API do parceiro com o mesmo rigor de observabilidade de qualquer Connector (Health Score, Freshness, Change Detection — `ConnectorHealthService`/`realtime-commerce`, ver §8).
- Fornecer visibilidade contínua (dashboard) sobre como o dado do parceiro está sendo usado e performando no marketplace.

**Parceiro se compromete a**:
- Fornecer dado de preço/estoque real e atualizado — o programa não certifica um feed que não reflita a realidade da loja.
- Notificar mudanças estruturais no formato do feed com antecedência razoável (evita quebra silenciosa de integração).
- Manter um contato técnico e um contato comercial designados (campos de `TIER1_PARTNERS.md`).

**Modelo comercial**: esta Wave não define termos financeiros (revenue share, taxa de integração, etc.) — decisão de negócio que fica para uma ADR/decisão própria do CTO no momento de cada negociação real, não fabricada aqui sem contexto de negociação real (ver §9, Limitações).

---

## 8. Merchant Integration Score

Mede a qualidade operacional de um feed/API de parceiro já ativo — distinto do Connector Score (`Tier1_Merchants.md` §3, que mede conectores de scraping). Mesma disciplina de reaproveitamento: nenhum Engine novo.

| Sub-score pedido no mandato | Fonte reaproveitada |
|---|---|
| Qualidade do Feed | `ValidationStage` (taxa de itens aceitos vs. rejeitados no pipeline) |
| Atualização | `FreshnessService` (`realtime-commerce`, Wave 2) — o feed do parceiro passa pelo mesmo `MarketChangeDetectionStage` que qualquer Connector |
| Disponibilidade | Componente de uptime de `ConnectorHealthService` |
| Cobertura | `MarketplaceCoverageService` (`marketplace-operations`, Program 0 Wave 1) |
| Latência | **Não computável hoje** — exigiria o parceiro reportar seu próprio timestamp de "última atualização real" por item (ver gap de `ConnectorBatch.fetchedAt` só a nível de lote, §3); sem isso, "latência" seria apenas o intervalo de sync, já coberto por Freshness |
| Completude | `ProductHealthService` (`catalog-intelligence`, Release 1.6) — cobertura de imagem/categoria/marca/descrição |
| Confiabilidade | `ConnectorHealthService` (mesmo Health Score do Connector Score) |

**Toda a infraestrutura de scoring já existe** porque um feed de parceiro, uma vez implementado como `IConnector`, entra exatamente no mesmo pipeline que qualquer Connector de scraping — o Real-Time Commerce Engine, o Catalog Intelligence e o Connector Health Service já se aplicam automaticamente, sem nenhuma modificação. Esta é a prova de que o Connector Platform (Release 1.7) foi desenhado corretamente desde o início: a origem do dado (HTML raspado, CSV de parceiro, API de parceiro) é irrelevante para tudo que vem depois do `fetch()`.

---

## 9. Limitações desta Wave (documentadas, não escondidas)

- **Nenhum termo financeiro foi definido** — revenue share, taxas, exclusividade. Decisão de negócio real, específica a cada negociação, não uma fórmula genérica fabricada sem contexto.
- **Selo "Partner" é um conceito visual novo, não implementado** — nenhum componente/badge foi codificado nesta Wave (documentação apenas).
- **5 formatos de integração (GraphQL, FTP, SFTP, Webhook, Google Sheets) não estão modelados em `ConnectorType`** — aditivos quando o primeiro parceiro real exigir um deles.
- **Latência (Merchant Integration Score) não é computável hoje** — depende de um campo de timestamp por item que `RawOffer`/`ConnectorBatch` não têm.
- **SKU/EAN/GTIN não são campos de primeira classe** — cabem em `specifications` hoje, sem tratamento especial.
- **Nenhum contato real foi feito ainda** com nenhum dos 10 merchants — este documento e `TIER1_PARTNERS.md` preparam o processo; a execução (enviar e-mails, agendar reuniões) é uma ação humana fora do escopo desta Wave de engenharia/documentação.
