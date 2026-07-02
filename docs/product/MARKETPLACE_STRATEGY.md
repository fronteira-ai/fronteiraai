# MARKETPLACE_STRATEGY.md
# Como o ParaguAI se Torna o Maior Marketplace Inteligente da Fronteira

**Versão**: 1.0
**Criado**: 2026-07-02 (Sprint Zero — Release 1.8 Project Preparation & Foundation Consolidation)
**Status**: Orienta a execução tática do Release 1.8
**Hierarquia**: Operacionaliza `MARKETPLACE_VISION.md`. Subordinado a `BUSINESS_MODEL.md` (a lógica econômica permanente) e `MOAT_STRATEGY.md` (os mecanismos de defensabilidade permanentes) — este documento não redefine nenhum dos dois, aplica-os taticamente ao Release 1.8.

---

## Preâmbulo

`BUSINESS_MODEL.md` já responde por que o ParaguAI cria valor. `MOAT_STRATEGY.md` já responde por que essa vantagem é defensável. Este documento responde a uma pergunta mais estreita e mais tática: **taticamente, nesta janela de tempo (Release 1.8), o que efetivamente move os números que fazem o marketplace crescer?** Não é uma redefinição de estratégia — é a aplicação da estratégia já permanente ao momento específico em que o ParaguAI passa de "plataforma construída" para "negócio em crescimento".

---

## 1. Aquisição de Compradores

O comprador não paga com dinheiro — paga com atenção e dado (`BUSINESS_MODEL.md` §6). A aquisição, portanto, não pode depender de gasto de aquisição pago recorrente (isso inverteria o próprio modelo econômico). Os canais táticos deste Release, em ordem de peso esperado:

**SEO** (peso mais alto, ver Seção 3) — o canal de custo marginal decrescente por definição, e o único compatível com o modelo de "comprador não paga".

**Lojista como canal de aquisição** (`BUSINESS_MODEL.md` §7) — cada lojista que divulga sua presença no ParaguAI traz seus próprios clientes. Isso significa que Merchant Growth (Seção 2) e Aquisição de Compradores não são estratégias paralelas — a segunda acelera com a primeira.

**Retenção via Buyer Identity Model** (ADR-046) — pela primeira vez, o ParaguAI pode medir e agir sobre recorrência real (não apenas tráfego), o que faz "aquisição" deixar de ser a única alavanca — reter um comprador já adquirido é mais barato que adquirir um novo, e agora é mensurável.

**Fronteira Agora** (`RELEASE_1_8_BLUEPRINT.md` Capítulo 9) — transforma a Home num destino recorrente por si (cotação do dólar, horários de loja) independente de intenção de compra imediata, ampliando a frequência de visita sem depender de uma nova busca de produto a cada vez.

---

## 2. Aquisição de Lojistas

A tese central: **descoberta automática + claim verificado, não cadastro manual empurrado**. O Release 1.7 já construiu essa infraestrutura completa (Wave 2 Discovery, Wave 5 Smart Claim Flow) — o Release 1.8 é a primeira vez que ela roda em volume real (`RELEASE_1_8_BLUEPRINT.md` Capítulo 1, Marketplace Expansion).

**Ordem tática**: 1) Discovery identifica lojas automaticamente → 2) importação (trilha Discovery-first ou Connector-first, conforme viabilidade técnica de cada loja) → 3) a loja aparece no catálogo, "não reivindicada" → 4) o próprio dono, ao ser procurado por um comprador ou ao descobrir a própria presença, reivindica via Smart Claim Flow. Este funil não depende de esforço comercial ativo constante — depende de infraestrutura já construída rodando em escala.

**Complemento comercial, não substituto**: para lojas de maior porte/reconhecimento (Cellshop, Nissei, etc. — `RELEASE_1_8_BLUEPRINT.md` Capítulo 1), uma abordagem comercial direta pode acelerar o que a descoberta automática levaria mais tempo para alcançar — mas a infraestrutura de descoberta continua sendo o motor de cauda longa que nenhuma equipe comercial sozinha escalaria.

---

## 3. SEO

Já estabelecido como consequência arquitetural, não campanha (`BUSINESS_MODEL.md` §7). Taticamente, o Release 1.8 expande cobertura de tipo de página (`RELEASE_1_8_BLUEPRINT.md` Capítulo 7): categoria, marca, comparação, landing pages programáticas — todas lastreadas em Market Intelligence real (Capítulo 5), nunca em conteúdo template vazio (risco de penalização por conteúdo fino, já nomeado no Blueprint).

**A ordem importa taticamente**: SEO Expansion (Wave 5 do Blueprint) só entra depois de Market Intelligence (Wave 4) ter dado sobre o que gerar rankings/insights reais — gerar páginas antes disso produziria exatamente o tipo de conteúdo raso que compromete autoridade de domínio a longo prazo.

---

## 4. Marketplace

O ParaguAI permanece, por decisão permanente (`AI_CONSTITUTION.md` I), a camada de descoberta/decisão — não a camada de transação. "Marketplace" neste documento significa a experiência completa de descoberta → comparação → decisão → contato com a loja, não uma transação intermediada pelo ParaguAI. A evolução para marketplace transacional real é explicitamente "longo prazo" (`BUSINESS_MODEL.md` §6) e não faz parte do escopo tático deste Release.

---

## 5. Monetização

Herda `BUSINESS_MODEL.md` §6 e `PRODUCT_POLICY.md` (valor antes de cobrança) — a novidade tática do Release 1.8 é fechar o funil que a Wave 5 do Release 1.7 deixou parcialmente aberto: `merchant_plans` com preços definidos, mas sem billing real ativo. `RELEASE_1_8_BLUEPRINT.md` Capítulo 8 (Merchant Growth) é a operacionalização — gatilhos de upgrade nascem de limite/insight demonstrado, billing real fecha o ciclo, `PremiumActivated` deixa de ser taxonomia e passa a ser evento real emitido.

---

## 6. Network Effects

Os 6 efeitos de rede já catalogados em `BUSINESS_MODEL.md` §5 continuam válidos sem alteração. Taticamente, o Release 1.8 é o primeiro a fortalecer o **Efeito de Rede Direto (comprador-comprador)** de forma mensurável — antes do Buyer Identity Model, não havia como correlacionar comportamento de compradores retornando, então esse efeito existia apenas em teoria.

---

## 7. Flywheel

O Data Flywheel (`BUSINESS_MODEL.md` §4, `MOAT_STRATEGY.md` Capítulo 5) gira mais rápido no Release 1.8 por três motivos táticos específicos, não um mecanismo novo: (1) mais lojas via Marketplace Expansion geram mais dado de catálogo; (2) Live Pricing/Freshness geram sinal de qualidade que antes não existia; (3) Buyer Identity Model faz o comportamento de compradores acumular por pessoa, não só por sessão efêmera — cada volta do ciclo agora carrega mais contexto do que a volta anterior.

---

## 8. Assets

Ver `STRATEGIC_ASSETS.md` (catálogo permanente) e `RELEASE_1_8_BLUEPRINT.md` Capítulo 10 (reconciliação já feita — apenas C-7 Live Commerce Velocity é genuinamente novo). Taticamente, este Release matura mais ativos existentes do que cria novos — C-5 (Cross-Border Context), F-4 (Marketplace Liquidity Model) e C-6 (Buyer Behavioral Knowledge) avançam de estágio, o que por si é mais valioso a curto prazo do que criar um ativo novo do zero.

---

## 9. Moats

Ver `MOAT_STRATEGY.md` (catálogo permanente) e `RELEASE_1_8_BLUEPRINT.md` Capítulo 11 (reconciliação — apenas Moat 9 Live Commerce Velocity é novo; "SEO Dominance" foi explicitamente rejeitada como Moat independente, reframeada como amplificador de Moats 1/6 já existentes). Taticamente, o Moat que mais acelera neste Release é o Moat 6 (Data Flywheel) — não por um mecanismo novo, mas porque múltiplos insumos do Flywheel (Seção 7) melhoram simultaneamente pela primeira vez.

---

## Síntese tática — o que de fato move os números neste Release

Se apenas três coisas deste Release tivessem que ser priorizadas acima de tudo o resto, nesta ordem: **(1)** Exchange Engine + Live Pricing + Freshness — porque é o que torna a proposta de valor ao comprador estruturalmente superior a qualquer alternativa, não apenas marginalmente melhor; **(2)** Buyer Identity Model — porque é o pré-requisito técnico de tudo que envolve retenção, personalização e conversão de comprador recorrente; **(3)** Merchant Growth com billing real — porque é o que converte todo o resto em receita sustentável, fechando o ciclo que justifica o investimento nos dois primeiros.
