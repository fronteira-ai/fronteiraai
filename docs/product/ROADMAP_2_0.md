# ROADMAP_2_0.md
# Release 2.0 Organizado em Waves

**Versão**: 2.0
**Criado**: 2026-07-08 (PROGRAM Z — RC-10, a partir de `docs/product/releases/RELEASE_2_0_PREVIEW.md`)
**Status**: Roadmap de intenção — nenhuma Wave aberta ainda; abertura formal de cada Wave exige mandato próprio do CTO, seguindo o mesmo processo de auditoria-antes-de-código usado em toda Wave da Release 1.8/1.9

---

## Por que este Release existe

Ver `docs/product/releases/RELEASE_2_0_PREVIEW.md` §"Por que este Release existe" e `docs/operations/PRODUCTION_BASELINE_1.9.md` — a fundação de engenharia está consolidada e verificada; a Release 2.0 converte essa fundação em produto e inteligência.

## Como ler este roadmap

Cada Wave abaixo é uma intenção sequenciada, não um Blueprint de execução — nenhuma tem Epic, arquivo ou schema definido ainda. A ordem reflete dependência real (uma Wave que a Wave seguinte precisa para ter dado real), não prioridade de negócio isolada. Nenhuma Wave começa sem: (1) auditoria de sobreposição com o que já existe, (2) mandato explícito do CTO, (3) Quality Gate completo ao final (ADR-051).

---

## Wave 1 — Marketplace Intelligence

**Objetivo**: elevar a confiabilidade e a escala de Market Intelligence (`src/domains/market-insights/`) e Marketplace Operations (`src/domains/marketplace-operations/`) a um nível que sustente recomendação e decisão automatizada nas Waves seguintes — hoje ambos são compute-on-read, corretos porém com cobertura de Canonical Match ainda baixa e agregações em memória (não `GROUP BY` Postgres) documentadas como ponto de virada em `docs/engineering/MARKETPLACE_FOUNDATION_SCALE_AUDIT.md`.

**Escopo**: aumentar cobertura de Canonical Match (mais Connectors certificados alimentando o mesmo Product Identity Engine), migrar as agregações de categoria/loja/breakdown que hoje rodam em JavaScript para agregação nativa Postgres onde o volume já justificar, fechar os gaps nomeados em `TECH_DEBT.md` para Market Pulse/Volatility (breakdown por amostra limitada) se o volume de dado tiver crescido o suficiente para justificar.

**Dependências**: nenhuma — toda a infraestrutura (Canonical Catalog, Connector Platform V2, Market Intelligence, Marketplace Operations) já está em produção; esta Wave é hardening/escala do que já existe, não um domínio novo.

**Critérios de aceite**: Canonical Match rate mensurável e crescente sobre a linha de base atual (hoje baixa, Product Identity em Shadow Mode); nenhuma regressão nos serviços já consumidos pela Home Premium (`PriceIntelligenceService`, `MarketPulseService`, `MerchantPriorityService`); Quality Gate verde.

**Riscos**: aumentar cobertura de Connectors depende de decisão comercial/técnica fora desta Wave (novos merchants, parcerias `docs/business/`) — a Wave pode ficar limitada por dado disponível, não por capacidade de engenharia; migrar agregação para Postgres é uma mudança de schema/query, não cosmética, e pode exigir sua própria ADR se tocar índices/materialized views.

---

## Wave 2 — Recommendation Engine

**Objetivo**: primeiro motor de recomendação real do ParaguAI — "que produto/loja é relevante para este comprador agora", não apenas "que produto existe".

**Escopo**: motor de recomendação construído sobre Canonical Catalog (identidade de produto), Market Intelligence (preço/economia/volatilidade) e Trust (reputação de loja) já existentes — auditoria prévia obrigatória para confirmar que nenhuma heurística de "produto parecido"/"loja confiável" já existe espalhada em outro domínio antes de escrever qualquer lógica nova (mesma disciplina do Market Intelligence Engine, Release 1.8 Program C, que encontrou sobreposição real com quase todos os objetivos do brief original).

**Dependências**: Wave 1 (cobertura de Canonical Match maior gera recomendações mais relevantes, mas não bloqueia o início — o motor pode nascer com a cobertura atual e melhorar organicamente); Trust Platform (reputação de loja, já em produção).

**Critérios de aceite**: recomendações rastreáveis a um motivo explicável (mesma disciplina de "score explicável" já usada em `MerchantPriorityService`/`VolatilityEngine` — nunca uma caixa-preta); nenhuma duplicação de lógica já presente em `market-insights`/`canonical-catalog`; Quality Gate verde.

**Riscos**: maior risco arquitetural de todo o Release — é o primeiro domínio verdadeiramente novo desde o Market Intelligence Engine (Release 1.8 Program C); precisa de decisão explícita sobre onde vive (`src/domains/` novo vs. extensão de `market-insights`) antes de qualquer código, via auditoria + ADR própria.

---

## Wave 3 — Buyer Platform

**Objetivo**: identidade e experiência do comprador além da Home Premium (hoje anônima/pseudônima por padrão, ver Buyer Identity Model, ADR-046) — favoritos sincronizados entre dispositivos, histórico de navegação com dono, alertas reais entregues (não só computados).

**Escopo**: ativar o consumo real do `BuyerAlertEngine`/`buyer_alert_candidates` (Real-Time Commerce, Release 1.8 Program A Wave 2 — hoje só popula candidatos, nenhum envio existe), migrar `useFavorites` de `localStorage` para conta autenticada quando o comprador optar por se identificar (ciclo de vida de 6 estados já definido no Buyer Identity Model), resolver o fornecedor de notificação (nomeado como pendência desde a Release 1.7 Wave 6/pré-1.8).

**Dependências**: Buyer Identity Model (ADR-046, já aceito); fornecedor de notificação (decisão externa, ainda em aberto); Wave 1/2 fortalecem a relevância dos alertas mas não bloqueiam o início do encanamento de identidade/favoritos.

**Critérios de aceite**: nenhuma regressão de privacidade sobre o Buyer Identity Model já aceito (identidade sempre pseudônima até o comprador optar explicitamente por se identificar); alertas realmente entregues, não apenas persistidos em `pending`; Quality Gate verde.

**Riscos**: escolha de fornecedor de notificação é uma decisão de custo/negócio, não só técnica — pode atrasar a Wave se não resolvida antes do início; migrar favoritos de `localStorage` para conta é uma migração de dado do usuário, exige plano de migração cuidadoso (já nomeado como pendência em `TECH_DEBT.md`).

---

## Wave 4 — Merchant Platform

**Objetivo**: evoluir o Merchant Platform de painel operacional para parceiro de crescimento ativo — usar o que Decision Engine e Growth Engine (Release 1.6, ambos em produção) já calculam para orientar ação real do lojista, não só relatório.

**Escopo**: resolver a duplicação real e já documentada entre `components/merchant/decision-center/widgets/` e `components/merchant/growth-center/widgets/` (5 pares sobrepostos, incluindo um `GrowthTimelineWidget` idêntico em ambas as pastas — `TECH_DEBT.md`, achado Médio do Sprint Zero) antes de adicionar qualquer capacidade nova; ativar o fornecedor de billing (pendência nomeada desde a Release 1.7 Wave 6, Wave 8 do plano original); aumentar volume real de lojas reivindicadas (hoje zero em produção) via os próprios mecanismos de aquisição já existentes.

**Dependências**: Growth Engine/Decision Engine (Release 1.6, em produção); fornecedor de billing (decisão externa, ainda em aberto); nenhuma dependência bloqueante das Waves 1–3.

**Critérios de aceite**: duplicação Decision Center/Growth Center resolvida (unificados ou explicitamente justificados como distintos) antes do fechamento da Wave; pelo menos um mecanismo de conversão claim→cliente medido com volume real (não apenas mecanismo testado); Quality Gate verde.

**Riscos**: "zero lojas reivindicadas em produção" é uma limitação de funil, não de engenharia — esta Wave pode entregar capacidade tecnicamente completa e ainda assim não ter volume real para prová-la, mesma situação já observada em Waves anteriores (Program 0 Wave 0); billing é uma decisão de negócio com implicação de compliance, não deve ser tratada como só mais uma integração técnica.

---

## Wave 5 — ParaguAI Brain

**Objetivo**: dar ao Brain (Trust/`CognitiveBrainService`/`KnowledgeGraphService`, existente desde a Release 1.5) seus primeiros consumidores de produto reais — hoje é instrumentado (eventos gravados) mas consultado quase exclusivamente por testes e por uma única rota (`GET /api/trust/merchant/[merchantId]/graph`, Release 1.8 Program 0 Wave 0).

**Escopo**: fechar o gap de mapeamento nomeado em `TECH_DEBT.md` (21 `TrustEventType` sem entrada em `TRUST_EVENT_BRAIN_IMPACT`); construir o primeiro consumidor de produto real do Knowledge Graph (ex.: reputação de loja informando Recommendation Engine da Wave 2, ou superfície de confiança na Home/Merchant Platform); decidir se cabe `BrainAsset` novo para os domínios que cresceram desde a Release 1.5 (Market Intelligence, Marketplace Operations, Exchange, Real-Time Commerce) — hoje ainda só 6 existem, todo domínio novo desde então optou deliberadamente por não criar um (decisão própria, nunca tomada por omissão).

**Dependências**: Wave 2 (Recommendation Engine) é o consumidor mais natural do Knowledge Graph, mas esta Wave pode começar pelo mapeamento de eventos independentemente; nenhuma dependência bloqueante de infraestrutura — tudo já existe em produção.

**Critérios de aceite**: 21 `TrustEventType` mapeados (não necessariamente todos com peso diferente de zero — mapeamento honesto pode ser "sem impacto no Brain hoje", mas documentado, não ausente); pelo menos um consumidor de produto real do Knowledge Graph fora de teste; decisão explícita e documentada (ADR) sobre `BrainAsset` novo ou não; Quality Gate verde.

**Riscos**: maior risco é escopo run-away — "dar uso ao Brain" pode crescer para tocar todos os domínios ao mesmo tempo; deve ser fatiado com o mesmo rigor de auditoria-antes-de-código usado em toda Wave anterior, começando pelo mapeamento (baixo risco) antes do primeiro consumidor de produto (risco maior, toca UI/API).

---

## Governança

Nenhuma Wave deste roadmap está aberta. Abertura formal segue o processo já estabelecido: mandato do CTO → auditoria de sobreposição → apresentação de achados antes de implementar (quando a auditoria encontrar conflito) → construção → Quality Gate completo → documentação → commit (ADR-051). Mudanças de arquitetura de blast radius maior que uma Wave — novo domínio top-level, nova categoria de `docs/`, mudança de schema que atravesse múltiplos domínios — exigem ADR própria antes do início, conforme ADR-055.
