# BUYER_JOURNEY.md
# PROGRAM Λ (LAMBDA) — MISSION Λ-1: Buyer Intelligence Blueprint — Objetivo 1

**Categoria**: `docs/product/`
**Data**: 2026-07-13
**Natureza**: estratégia apenas. Nenhum código, schema, migração ou frontend foi alterado para produzir este documento.
**Base**: `docs/foundation/BUSINESS_MODEL.md` (o comprador brasileiro já é nomeado como a persona central — "não sabe qual loja tem o produto, a que preço, com que garantia... não sabe se pode esperar"), `docs/product/releases/RELEASE_1_8_BLUEPRINT.md` Capítulo 6 (Buyer Experience — já aprovado, aguardando decisão Tipo 1 de identidade de comprador) e leitura direta do código real de todo domínio consumível por comprador hoje.

---

## 0. A pergunta que este documento existe para responder

"Por que alguém abriria o ParaguAI antes do Google?" — a resposta estrutural é: **porque o Google devolve páginas; o ParaguAI já tem a resposta computada.** Um comprador que busca "iPhone 15 Ciudad del Este" no Google recebe links de lojas, anúncios e reviews desatualizados — ele ainda precisa fazer o trabalho de comparar, verificar e decidir. Este documento mapeia exatamente onde esse trabalho acontece hoje na cabeça do comprador, para identificar onde o ParaguAI pode fazer esse trabalho por ele — usando dado que, em grande parte, **já existe e já está computado**, apenas não está de frente para o comprador (ver `BUYER_VALUE_MATRIX.md`).

## 1. As duas personas nomeadas pelo negócio (não uma invenção deste documento)

`BUSINESS_MODEL.md` já distingue duas personas de comprador com jornadas estruturalmente diferentes:

- **O comprador-turista** (linha 313: "pesquisa com antecedência, compara mais, tem orçamento definido, planeja roteiro, maior intenção de compra") — cruza a fronteira fisicamente, tem uma janela de decisão de dias/semanas antes da viagem e horas durante ela.
- **O comprador online/recorrente** — já mora na região ou compra à distância, decisão mais frequente e de menor fricção por vez, mas repetida.

A jornada abaixo é desenhada para servir as duas, nomeando onde elas divergem.

## 2. A jornada — "Quero comprar" → "Compra concluída"

### Etapa 1 — Gatilho ("Eu preciso/quero de X")

**O que acontece**: necessidade surge (produto quebrou, chegou uma promoção, viagem à fronteira está planejada, alguém recomendou).
**Dores**: não sabe se vale a pena ir à fronteira para este produto especificamente, nem quando ir.
**Dúvidas**: "Isso é mais barato no Paraguai mesmo, depois do câmbio e do trabalho de ir lá?"
**Decisões**: iniciar pesquisa agora vs. depois; pesquisar por produto específico vs. por categoria.
**Riscos**: decidir não pesquisar e comprar localmente por preço cheio, por falta de sinal de que valeria a pena — a pior forma de perda para o ParaguAI, porque é invisível (nunca vira uma sessão).
**Oportunidade real, com dado já existente**: `PriceStatistics`/`SavingsOpportunity` (`market-insights`) já respondem "qual a economia real esperada nesta categoria hoje" — isso pode virar o próprio gancho de entrada (SEO/anúncio: "quanto dá pra economizar em [categoria] na fronteira essa semana"), não apenas uma tela que o comprador só vê depois de já estar no site.

### Etapa 2 — Descoberta ("Onde eu procuro?")

**O que acontece**: busca no Google, pergunta em grupo de WhatsApp, ou — se já conhece — abre o ParaguAI diretamente.
**Dores**: informação fragmentada entre grupos, sites de loja individuais e boca-a-boca; nenhuma fonte agrega.
**Dúvidas**: "Esse resultado que achei é atual? Essa loja existe mesmo? Alguém já comprou aqui?"
**Decisões**: qual fonte confiar o suficiente para continuar.
**Riscos**: abandonar a pesquisa por excesso de fricção e comprar de memória/intuição (`BUSINESS_MODEL.md` linha 37 — "tentativa e erro na própria fronteira").
**Dado já existente relevante**: catálogo indexado (SEO — `ARCHITECTURE.md`/JSON-LD já implementado), Search (`services/search.service.ts`) — mas hoje busca não mostra preço (`FEATURES.md` — limitação registrada), o que é uma perda de conversão na própria etapa mais crítica da jornada.

### Etapa 3 — Pesquisa e comparação ("Qual é a melhor opção?")

**O que acontece**: o comprador olha várias lojas para o mesmo produto (ou produtos equivalentes), compara preço, tenta entender se o preço visto é bom.
**Dores**: cada loja mostra preço isolado, sem contexto — não há como saber se R$/US$ X é caro ou barato sem abrir 5 abas.
**Dúvidas**: "Esse preço é bom ou é ruim? Essa loja é confiável? Tem outra loja com o mesmo produto mais barato? Vale esperar uma semana?"
**Decisões**: qual produto exato comprar (marca/modelo/variante), qual loja, comprar agora ou esperar.
**Riscos**: decisão por informação incompleta — comprar na primeira loja encontrada sem saber que uma segunda loja, com o mesmo produto canônico, tinha preço menor (o problema estrutural que `canonical-catalog`/`CompareFoundationService` já resolve tecnicamente, mas que nenhuma página consome ainda — ver `BUYER_VALUE_MATRIX.md`).
**Dado já existente relevante**: `CompareFoundationService` (ranking + agregação de preço por produto canônico), `OfferRankingService` (fatores explicáveis: preço, disponibilidade, recência, confiança da loja, qualidade do anúncio), `CanonicalVolatilityProfile` ("vale esperar?"), `PriceStatistics`/`SavingsOpportunity` (mediana/dispersão/economia máxima).

### Etapa 4 — Verificação de confiança ("Essa loja é séria?")

**O que acontece**: antes de decidir, o comprador quer um sinal de que a loja é real e confiável — especialmente crítico para quem nunca comprou na fronteira.
**Dores**: não há como verificar uma loja paraguaia da mesma forma que verificaria um vendedor em um marketplace grande (sem reviews agregadas, sem selo).
**Dúvidas**: "Essa loja existe de verdade? Vou receber o produto? O preço vai mudar quando eu chegar lá?"
**Decisões**: confiar o suficiente para ir/comprar, ou procurar mais confirmação (grupo de WhatsApp, pergunta direta).
**Riscos**: essa é a etapa onde a falta de confiança mais frequentemente mata a conversão — e é também onde o ParaguAI já tem o ativo mais forte e menos exposto: o domínio `trust/` (badges explícitos — `TrustBadge`/`TrustSignalType`: empresa verificada, identidade validada, localização confirmada, parceiro oficial — todos fatos verificáveis, nunca um score opaco, por decisão permanente de arquitetura — "Zero Reputation Score").
**Dado já existente relevante**: badges de verificação, sinais de confiança por categoria (identidade/negócio/operacional/compliance), `OfferRankingService` já usa `isVerifiedStore` como fator (mas isso é invisível ao comprador hoje — puramente ranking interno).

### Etapa 5 — Decisão final ("Compro agora ou espero?")

**O que acontece**: o comprador decide o produto, a loja e o momento.
**Dores**: sem contexto histórico, qualquer preço parece "normal" — o comprador não tem como saber se está vendo uma baixa real ou um preço inflado disfarçado de promoção.
**Dúvidas**: "Isso é uma promoção real? Vai cair mais se eu esperar?"
**Decisões**: comprar hoje vs. esperar; qual loja.
**Riscos**: comprar caro por falta de contexto (perda de valor percebido, mesmo que a transação em si aconteça — o comprador se sente enganado depois, o que mata recorrência).
**Dado já existente relevante**: `CanonicalPriceHistoryService` (histórico agregado por produto canônico), `VolatilityEngine`/`CanonicalVolatilityProfile` (classificação de estabilidade — exatamente o insumo que o Capítulo 6 do Release 1.8 Blueprint já nomeia como "Compra Inteligente": regra explicável, não previsão opaca), `MarketChange`/`ChangeType.PromotionDetected` (já distingue queda de preço real de flutuação).

### Etapa 6 — Ida à loja / finalização (offline ou online)

**O que acontece**: para o comprador-turista, a travessia física até a loja; para o comprador online, o checkout (hoje inexistente na plataforma — ParaguAI não processa transação, ver `BUSINESS_MODEL.md` linha 189, "evolução natural", não core hoje).
**Dores**: chegar lá e o preço/estoque ter mudado desde a consulta; não saber o horário de funcionamento; câmbio do dia mudar a conta mental que o comprador já tinha feito.
**Dúvidas**: "Isso ainda está disponível? Essa cotação que vi ainda vale?"
**Decisões**: nenhuma nova decisão de produto — só logística (ir agora, ligar antes, etc.).
**Riscos**: frustração por dado desatualizado — o `FreshnessEngine`/`FreshnessScore` já existe exatamente para isso (classificar quão recente é um dado de oferta), mas hoje só alimenta ranking interno, nunca aparece como "atualizado há X horas" para o comprador.
**Dado já existente relevante**: `stores.opening_hours` (schema já existe, exposição em UI já parcialmente feita em `/lojas/[slug]`), `FreshnessScore`, `AutomaticCurrencyService`/`ExchangeRateService` (câmbio em tempo real).

### Etapa 7 — Pós-compra e retorno ("Eu voltaria a usar isso?")

**O que acontece**: comprador avalia se a informação que recebeu bateu com a realidade.
**Dores**: nenhum canal para registrar a experiência (reviews existem só como schema — `reviewer_id` nunca foi alimentado por um comprador real, achado confirmado em `RELEASE_1_8_BUYER_IDENTITY_MODEL.md` §2.3); nenhuma forma de ser avisado da próxima promoção sem procurar de novo do zero.
**Dúvidas**: "Vale a pena voltar aqui da próxima vez, ou era sorte?"
**Decisões**: voltar ao ParaguAI na próxima necessidade, ou voltar ao "grupo de WhatsApp e tentativa e erro" de antes.
**Riscos — o maior de todos, estrutural**: `BUSINESS_MODEL.md` linha 383 já nomeia isso como o próprio motor do negócio: "um comprador que foi mal informado não volta — e leva embora todo o potencial de dados futuros que geraria." Hoje, **não existe absolutamente nenhum mecanismo de retorno proativo** (sem conta de comprador, sem alerta entregue, sem histórico persistente) — o comprador que teve uma boa experiência não tem como ser lembrado de voltar, exceto por hábito espontâneo.
**Dado já existente relevante, mas sem canal de entrega**: `BuyerAlertEngine` já classifica eventos alertáveis (queda de preço, produto voltou ao estoque, nova promoção, novo produto) com prioridade — mas **nunca envia nada** (confirmado no código: "NEVER sends anything"), porque não existe Buyer Identity (`RELEASE_1_8_BUYER_IDENTITY_MODEL.md`, proposto, aguardando aprovação do CTO) nem canal de notificação (Tipo 1, não decidido).

## 3. Leitura consolidada — onde a dor é maior e o dado já existe

| Etapa | Dor dominante | Dado já computado, hoje sem exposição ao comprador |
|---|---|---|
| 3 — Pesquisa/comparação | "Não sei se é bom preço nem se tem loja mais barata" | `CompareFoundationService`, `OfferRankingService`, `PriceStatistics`, `SavingsOpportunity` |
| 4 — Confiança | "Não sei se a loja é séria" | Badges/sinais do domínio `trust/` |
| 5 — Decisão | "Não sei se devo esperar" | `CanonicalVolatilityProfile`, `CanonicalPriceHistoryService`, `MarketChange` |
| 6 — Finalização | "O dado pode estar desatualizado" | `FreshnessScore`, `AutomaticCurrencyService` |
| 7 — Retorno | "Não tenho como ser avisado / não tenho como voltar fácil" | `BuyerAlertEngine` (sem canal de entrega), `Buyer Identity Model` (proposto, não aprovado) |

Nenhuma dessas etapas exige um conector novo, uma nova coleta de dado ou uma mudança em Product Identity/Connector Platform/Canonical Catalog — o gargalo identificado por esta Mission é de **exposição**, não de **coleta**. Ver `BUYER_VALUE_MATRIX.md` para o inventário completo e `AI_EXPERIENCE_BLUEPRINT.md` para o desenho das experiências que fecham essas lacunas.
