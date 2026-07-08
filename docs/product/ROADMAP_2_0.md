# ROADMAP_2_0.md
# Release 2.0 Organizado por Ordem de Execução

**Versão**: 2.2
**Criado**: 2026-07-08 (PROGRAM Z — RC-10, a partir de `docs/product/releases/RELEASE_2_0_PREVIEW.md`)
**Atualizado**: 2026-07-08 (PROGRAM Ω — Mission Ω-1) Program Ω adicionado como maior prioridade, aprovado pelo CTO
**Atualizado novamente**: 2026-07-08 (PROGRAM Ω — Mission Ω-3, Resolve Strategic Review Findings) — ownership de cobertura/certificação/ativação consolidado inteiramente em Program Ω; Waves 1/4 reescritas para assumir os outputs de Program Ω em vez de reivindicá-los; Wave 5 dividida em 5a (mapeamento, sem dependência) e 5b (primeiro consumidor real); reordenação de `RELEASE_ALIGNMENT.md` adotada nesta versão — documento agora reflete a ordem de execução real, não mais só a ordem de dependência técnica
**Status**: Roadmap de intenção — nenhum Program/Wave aberto ainda (Program Ω está **aprovado**, não **aberto** — ver §Governança); abertura formal de cada um exige mandato próprio do CTO, seguindo o mesmo processo de auditoria-antes-de-código usado em toda Wave da Release 1.8/1.9

---

## Por que este Release existe

Ver `docs/product/releases/RELEASE_2_0_PREVIEW.md` §"Por que este Release existe" e `docs/operations/PRODUCTION_BASELINE_1.9.md` — a fundação de engenharia está consolidada e verificada; a Release 2.0 converte essa fundação em produto e inteligência.

## Como ler este roadmap

As seções abaixo estão em **ordem de execução real**, não em ordem de dependência técnica — essa é a mudança desta versão (v2.2) em relação à v2.0/2.1. Nenhuma tem Epic, arquivo ou schema definido ainda. Nenhum Program/Wave começa sem: (1) auditoria de sobreposição com o que já existe, (2) mandato explícito do CTO, (3) Quality Gate completo ao final (ADR-051).

**Regra de ownership (Mission Ω-3)**: Program Ω é o **único dono** de crescimento de cobertura de catálogo, certificação de merchants e ativação real de Merchant OS (lojas reivindicadas). Nenhuma Wave abaixo reivindica esse trabalho — cada uma que dependia dele agora **assume o output de Program Ω como precondição implícita**, referenciado explicitamente em sua seção de Dependências.

**Resolução do estado de reordenação (Mission Ω-3, item 4)**: a reordenação completa proposta em `RELEASE_ALIGNMENT.md` (mover o mapeamento de eventos do Brain e a limpeza do Merchant Platform para antes do Recommendation Engine/Buyer Platform) está **adotada nesta versão**, não mais pendente. Decisão Tipo 2 (`NORTH_STAR.md` §12 — reordenação de documentação, sem custo de reversão, nenhuma Wave é aberta por esta mudança) — deixá-la pendente indefinidamente era em si a inconsistência que a Mission Ω-2 apontou. Se o CTO discordar da ordem abaixo, é uma mudança de markdown, não um retrabalho de engenharia.

---

## 1 — Program Ω — Marketplace Density & Merchant Activation

**Status**: Aprovado pelo CTO em 2026-07-08 como maior prioridade do Release 2.0. Não aberto (nenhuma execução iniciada) — aprovação é do Program em si, execução exige seu próprio kickoff.

**Ownership exclusivo** (Mission Ω-3): Program Ω é o único ponto do roadmap responsável por crescer cobertura de Connector/catálogo e por converter o funil claim→cliente em lojas reivindicadas reais. Qualquer trabalho futuro que toque esses dois resultados pertence a este Program, mesmo que executado em uma sessão nomeada de outra forma.

**Origem**: identificado como Program ausente pela Mission Ω-1 (Vision Alignment Audit) — nenhuma das 5 Waves originalmente planejadas para a Release 2.0 corrige o achado central da auditoria: Vision Alignment Score de 25/100 contra um Foundation Readiness de ~55/100, distância causada por substrato real fino (cobertura de catálogo, lojas reivindicadas), não por falta de capacidade técnica.

**Objetivo**: fechar a distância entre o que a plataforma já sabe fazer tecnicamente e o que está de fato em uso por participantes reais — não com mais engenharia, com mais uso real.

**Escopo — dois fluxos paralelos, nenhum é código de plataforma novo**:

1. **Cobertura real de Commerce**: crescer o número de merchants certificados usando exatamente o Connector Platform V2 já pronto (SDK, Certification, Delta Import) — sem nenhuma mudança de arquitetura, o mesmo padrão que Mega Eletrônicos/Roma Shopping/Atacado Connect já provaram (Release 1.8 Program D). Esforço de identificação de merchants viáveis + certificação, não construção. Candidatos já auditados e priorizados em `docs/marketplace/Tier1_Merchants.md`; os 4 merchants comercialmente bloqueados seguem o pipeline já formal de `docs/business/TIER1_PARTNERS.md` — Program Ω não recria essa priorização, executa sobre ela.
2. **Ativação real de Merchant OS**: converter o funil claim→cliente que já existe tecnicamente (Merchant Ownership, onboarding, dashboard) em lojas reivindicadas reais — esforço comercial/produto (divulgação, onboarding assistido, possível incentivo para os primeiros N lojistas), não uma nova feature de engenharia.

**Dependências**: nenhuma técnica — tudo que este Program precisa já está construído e testado (Connector Platform V2, Merchant Ownership, onboarding, dashboard, listas de candidatos em `docs/marketplace/`/`docs/business/`). A dependência é de decisão/execução do CTO (quem contatar, que incentivo oferecer, prioridade de tempo).

### Critérios de conclusão (reescritos, Mission Ω-3 — outcome-based, não mais contagem)

`NORTH_STAR.md` §2 é explícito: número de lojas cadastradas não é a métrica North Star — "lojas sem compradores melhor informados são presença sem impacto." Os critérios abaixo corrigem a versão anterior deste documento, que usava contagem como critério de conclusão.

**Indicadores líderes** (necessários, monitorados continuamente, **nunca suficientes sozinhos** para declarar o Program concluído):
- Número de merchants certificados cresce acima da linha de base atual (5).
- `merchant_stores` reais (hoje zero) deixa de ser zero.
- Número de conectores ativos cresce.

**Critério de conclusão real (obrigatório, baseado em impacto de ecossistema — `NORTH_STAR.md` §2)**: Program Ω só é declarado concluído quando houver **evidência citável, não hipotética**, de pelo menos **dois** dos itens do vetor North Star:
1. Uma busca real que antes retornava vazio (produto/categoria sem cobertura) agora retorna um resultado relevante e verificável, atribuível diretamente ao aumento de cobertura deste Program.
2. Um lojista real ajustou catálogo, preço ou estoque citando um dado ou recomendação do Merchant OS (Decision Engine/Growth Engine) como motivo — não uma suposição de que ele o faria.
3. Um comprador real completou uma comparação de preço entre duas lojas que não existiam simultaneamente no catálogo antes deste Program, com resultado citável (ex.: economia real registrada por `PriceIntelligenceService`, não estimada).

Um Program que só produz os indicadores líderes (mais merchants, `merchant_stores` > 0) sem nenhum dos três critérios acima **não está concluído** — está em andamento. Isso impede exatamente o risco nomeado na Mission Ω-2 (B3): declarar sucesso com uma única loja inativa reivindicada.

**Riscos**: o Program mais dependente de fatores fora do controle de engenharia (merchants reais decidem se aderem; nenhuma automação força isso) — e, por essa mesma razão, o único que nenhuma Sprint técnica adicional consegue substituir. Risco adicional nomeado na Mission Ω-2: ativação "oca" (lojista reivindica a loja mas nunca a usa de fato) — mitigado pelos critérios de conclusão acima, que exigem uso real, não apenas presença.

---

## 2 — Wave 1 — Marketplace Intelligence (Hardening, não Cobertura)

**Escopo reduzido nesta versão (Mission Ω-3)**: esta Wave **não é mais dona** de crescer cobertura de Canonical Match — isso pertence exclusivamente a Program Ω (§1). Wave 1 assume a cobertura que Program Ω entregar como dado de entrada e foca exclusivamente em hardening de engine.

**Objetivo**: elevar a confiabilidade e a escala de Market Intelligence (`src/domains/market-insights/`) e Marketplace Operations (`src/domains/marketplace-operations/`) a um nível que sustente recomendação e decisão automatizada nas Waves seguintes — hoje ambos são compute-on-read, corretos, com agregações em memória (não `GROUP BY` Postgres) documentadas como ponto de virada em `docs/engineering/MARKETPLACE_FOUNDATION_SCALE_AUDIT.md`.

**Escopo**: migrar as agregações de categoria/loja/breakdown que hoje rodam em JavaScript para agregação nativa Postgres onde o volume (após Program Ω) já justificar; fechar os gaps nomeados em `TECH_DEBT.md` para Market Pulse/Volatility (breakdown por amostra limitada) na mesma condição.

**Dependências**: **Program Ω (§1)** — o valor desta Wave escala diretamente com a cobertura que Program Ω produzir; iniciar esta Wave antes de Program Ω gerar cobertura real não é bloqueado tecnicamente, mas produz retorno baixo (mesmo aviso que o próprio Market Intelligence Engine já fez sobre si mesmo em `TECH_DEBT.md`). Nenhuma outra dependência — toda a infraestrutura já está em produção.

**Critérios de aceite**: nenhuma regressão nos serviços já consumidos pela Home Premium (`PriceIntelligenceService`, `MarketPulseService`, `MerchantPriorityService`); agregações Postgres comprovadamente mais rápidas que o baseline em memória sob o volume real pós-Program Ω; Quality Gate verde.

**Riscos**: migrar agregação para Postgres é uma mudança de schema/query, não cosmética, e pode exigir sua própria ADR se tocar índices/materialized views.

---

## 3 — Wave 5a — ParaguAI Brain: Mapeamento de Eventos

**Adiantada nesta versão** (era parte da Wave 5, ao final do roadmap) — trabalho de menor risco/esforço, sem dependência de Program Ω ou de qualquer outra Wave, correto executar em paralelo desde já.

**Objetivo**: fechar o gap de mapeamento nomeado em `TECH_DEBT.md` — 21 `TrustEventType` (Release 1.6/1.8) sem entrada em `TRUST_EVENT_BRAIN_IMPACT`.

**Escopo**: mapear os 21 tipos (mapeamento honesto pode ser "sem impacto no Brain hoje", mas documentado, não ausente); decidir se cabe `BrainAsset` novo para os domínios que cresceram desde a Release 1.5 (Market Intelligence, Marketplace Operations, Exchange, Real-Time Commerce) — hoje só 6 existem.

**Dependências**: nenhuma — nem de Program Ω, nem de outra Wave. Dívida de documentação/taxonomia pura, não feature nova.

**Critérios de aceite**: 21 `TrustEventType` mapeados; decisão explícita e documentada (ADR) sobre `BrainAsset` novo ou não; Quality Gate verde.

**Riscos**: baixo — escopo já é estreito por definição (mapeamento, não construção de consumidor).

---

## 4 — Wave 4 — Merchant Platform (Hardening, não Ativação)

**Escopo reduzido nesta versão (Mission Ω-3)**: esta Wave **não é mais dona** de aumentar volume de lojas reivindicadas — isso pertence exclusivamente a Program Ω (§1). Wave 4 assume a ativação que Program Ω entregar e foca exclusivamente em limpeza de plataforma e billing.

**Objetivo**: evoluir o Merchant Platform de painel operacional para parceiro de crescimento ativo — usar o que Decision Engine e Growth Engine (Release 1.6, ambos em produção) já calculam para orientar ação real do lojista, não só relatório.

**Escopo**: resolver a duplicação real e já documentada entre `components/merchant/decision-center/widgets/` e `components/merchant/growth-center/widgets/` (5 pares sobrepostos, incluindo um `GrowthTimelineWidget` idêntico em ambas as pastas — `TECH_DEBT.md`, achado Médio do Sprint Zero); ativar o fornecedor de billing (pendência nomeada desde a Release 1.7 Wave 6, Wave 8 do plano original).

**Adiantada nesta versão** (era a 4ª posição técnica, mantém a 4ª posição de execução) — corrigir a duplicação de widgets antes de Program Ω trazer lojistas reais é mais barato do que corrigir depois de escalar.

**Dependências**: **Program Ω (§1)** — lojas reivindicadas reais são o que valida se a unificação de Decision Center/Growth Center resolve o problema certo; Growth Engine/Decision Engine (Release 1.6, em produção); fornecedor de billing (decisão externa, ainda em aberto).

**Critérios de aceite**: duplicação Decision Center/Growth Center resolvida (unificados ou explicitamente justificados como distintos) antes do fechamento da Wave; Quality Gate verde.

**Riscos**: billing é uma decisão de negócio com implicação de compliance, não deve ser tratada como só mais uma integração técnica.

---

## 5 — Wave 2 — Recommendation Engine

**Adiada nesta versão** (era a 2ª posição técnica) — só produz valor real depois que Program Ω aumentar a cobertura; construí-la antes repete o padrão que a Mission Ω-1 identificou no Domínio "Regional Intelligence": matematicamente correto, estrategicamente prematuro.

**Objetivo**: primeiro motor de recomendação real do ParaguAI — "que produto/loja é relevante para este comprador agora", não apenas "que produto existe".

**Escopo**: motor de recomendação construído sobre Canonical Catalog (identidade de produto), Market Intelligence (preço/economia/volatilidade) e Trust (reputação de loja) já existentes — auditoria prévia obrigatória para confirmar que nenhuma heurística de "produto parecido"/"loja confiável" já existe espalhada em outro domínio antes de escrever qualquer lógica nova.

**Dependências**: **Program Ω (§1)** — cobertura real é o que torna a recomendação relevante, não apenas correta; Wave 1 (§2, hardening de engine); Trust Platform (reputação de loja, já em produção).

**Critérios de aceite**: recomendações rastreáveis a um motivo explicável (mesma disciplina de "score explicável" já usada em `MerchantPriorityService`/`VolatilityEngine` — nunca uma caixa-preta); nenhuma duplicação de lógica já presente em `market-insights`/`canonical-catalog`; Quality Gate verde.

**Riscos**: maior risco arquitetural de todo o Release — é o primeiro domínio verdadeiramente novo desde o Market Intelligence Engine (Release 1.8 Program C); precisa de decisão explícita sobre onde vive (`src/domains/` novo vs. extensão de `market-insights`) antes de qualquer código, via auditoria + ADR própria.

---

## 6 — Wave 3 — Buyer Platform

**Adiada nesta versão** (era a 3ª posição técnica) — alertas reais e favoritos sincronizados têm mais valor quando há mais produtos/lojas reais para alertar/favoritar, mesma lógica da Wave 2.

**Objetivo**: identidade e experiência do comprador além da Home Premium (hoje anônima/pseudônima por padrão, ver Buyer Identity Model, ADR-046) — favoritos sincronizados entre dispositivos, histórico de navegação com dono, alertas reais entregues (não só computados).

**Escopo**: ativar o consumo real do `BuyerAlertEngine`/`buyer_alert_candidates` (Real-Time Commerce, Release 1.8 Program A Wave 2 — hoje só popula candidatos, nenhum envio existe), migrar `useFavorites` de `localStorage` para conta autenticada quando o comprador optar por se identificar (ciclo de vida de 6 estados já definido no Buyer Identity Model), resolver o fornecedor de notificação (nomeado como pendência desde a Release 1.7 Wave 6/pré-1.8).

**Dependências**: **Program Ω (§1)** — alertas e favoritos sobre um catálogo maior têm mais valor percebido; Buyer Identity Model (ADR-046, já aceito); fornecedor de notificação (decisão externa, ainda em aberto); Wave 2 (§5) fortalece a relevância dos alertas mas não bloqueia o início do encanamento de identidade/favoritos.

**Critérios de aceite**: nenhuma regressão de privacidade sobre o Buyer Identity Model já aceito (identidade sempre pseudônima até o comprador optar explicitamente por se identificar); alertas realmente entregues, não apenas persistidos em `pending`; Quality Gate verde.

**Riscos**: escolha de fornecedor de notificação é uma decisão de custo/negócio, não só técnica — pode atrasar a Wave se não resolvida antes do início; migrar favoritos de `localStorage` para conta é uma migração de dado do usuário, exige plano de migração cuidadoso (já nomeado como pendência em `TECH_DEBT.md`).

---

## 7 — Wave 5b — ParaguAI Brain: Primeiro Consumidor de Produto Real

**Permanece ao final** (mesma posição relativa da Wave 5 original) — a parte de maior risco do domínio Brain precisa do Recommendation Engine (§5) e de volume de dado real (via Program Ω, §1) para ter um primeiro caso de uso que valha a pena expor.

**Objetivo**: dar ao Brain (Trust/`CognitiveBrainService`/`KnowledgeGraphService`, existente desde a Release 1.5) seu primeiro consumidor de produto real — hoje é instrumentado (eventos gravados) mas consultado quase exclusivamente por testes e por uma única rota (`GET /api/trust/merchant/[merchantId]/graph`, Release 1.8 Program 0 Wave 0).

**Escopo**: construir o primeiro consumidor de produto real do Knowledge Graph (ex.: reputação de loja informando o Recommendation Engine da Wave 2/§5, ou superfície de confiança na Home/Merchant Platform).

**Dependências**: Wave 5a (§3, mapeamento já concluído); Wave 2/§5 (Recommendation Engine, consumidor mais natural do Knowledge Graph); **Program Ω (§1)** — mais eventos reais de mercado tornam qualquer consumidor do Brain mais demonstrável.

**Critérios de aceite**: pelo menos um consumidor de produto real do Knowledge Graph fora de teste; Quality Gate verde.

**Riscos**: maior risco é escopo run-away — "dar uso ao Brain" pode crescer para tocar todos os domínios ao mesmo tempo; deve ser fatiado com o mesmo rigor de auditoria-antes-de-código usado em toda Wave anterior.

---

## Governança

Program Ω está **aprovado** (prioridade, não execução) pelo CTO em 2026-07-08. Nenhum Program/Wave deste roadmap — incluindo o Ω — está **aberto** (em execução). Abertura formal segue o processo já estabelecido: mandato do CTO → auditoria de sobreposição → apresentação de achados antes de implementar (quando a auditoria encontrar conflito) → construção → Quality Gate completo → documentação → commit (ADR-051). Mudanças de arquitetura de blast radius maior que uma Wave — novo domínio top-level, nova categoria de `docs/`, mudança de schema que atravesse múltiplos domínios — exigem ADR própria antes do início, conforme ADR-055.

A reordenação de execução desta versão (v2.2) é puramente documental — nenhuma Wave foi aberta, cancelada ou teve seu conteúdo técnico alterado além da remoção de ownership duplicado (§2, §4) e da divisão da Wave 5 (§3, §7). Ver `RELEASE_ALIGNMENT.md` para o histórico completo da análise que motivou esta reordenação.
