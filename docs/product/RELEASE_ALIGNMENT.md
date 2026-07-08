# RELEASE_ALIGNMENT.md
# PROGRAM Ω — Mission Ω-1 — Roadmap Revisado por Impacto Estratégico

**Categoria**: `docs/product/`
**Data**: 2026-07-08
**Atualizado**: 2026-07-08 (Mission Ω-3, Resolve Strategic Review Findings) — a análise abaixo está **implementada** em `ROADMAP_2_0.md` v2.2: Program Ω é dono exclusivo de cobertura/certificação/ativação, a reordenação de execução foi adotada (não mais pendente), e os critérios de conclusão de Program Ω foram reescritos para outcome-based. Este documento permanece como o registro da análise que motivou essas mudanças — `ROADMAP_2_0.md` é a fonte de verdade operacional; onde os dois divergirem em detalhe, `ROADMAP_2_0.md` prevalece.
**Companion**: `VISION_ALIGNMENT_AUDIT.md`, `STRATEGIC_GAP_MAP.md`, `VISION_SCORECARD.md`
**Relação com `ROADMAP_2_0.md`**: este documento não substitui o roadmap existente — reordena e adiciona um Program ausente, com justificativa. `ROADMAP_2_0.md` permanece o documento operacional; nenhuma Wave nele está aberta, e nenhuma abre com este documento (missão é auditoria, não implementação).

---

## O que mudou desde `ROADMAP_2_0.md`

`ROADMAP_2_0.md` (criado na RC-10, horas atrás) organiza 5 Waves por dependência técnica: Marketplace Intelligence → Recommendation Engine → Buyer Platform → Merchant Platform → ParaguAI Brain. Essa ordem é internamente consistente — cada Wave usa o que a anterior produz.

Mas dependência técnica não é a mesma coisa que impacto estratégico. `VISION_SCORECARD.md` mostra que o gargalo real não é nenhum dos 5 domínios listados — é o substrato (cobertura de Commerce, ativação de Merchant OS) sobre o qual todos os 5 seriam construídos. Recommendation Engine (Wave 2 atual) sobre um catálogo com Canonical Match "honesto e baixo" produz recomendações honestas e pouco relevantes — o mesmo aviso que o próprio Market Intelligence Engine já fez sobre si mesmo. Investir nas 5 Waves atuais, na ordem atual, sem primeiro corrigir o substrato, é repetir o padrão que gerou o Vision Alignment Score de 25/100: mais capacidade técnica sobre uma base que ainda não a sustenta.

---

## Program Ω — Marketplace Density & Merchant Activation (APROVADO, dono exclusivo de cobertura/certificação/ativação — ver `ROADMAP_2_0.md` §1)

**Por que este Program não estava no roadmap original**: `ROADMAP_2_0.md` foi escrito horas antes desta auditoria, a partir do brief de `RELEASE_2_0_PREVIEW.md`, que por sua vez herdou o enquadramento do brief original ("Marketplace Intelligence, Recommendation Engine, Buyer Platform, Merchant Platform, ParaguAI Brain") sem uma auditoria estratégica prévia contra `VISION_2035.md`. Esta é exatamente essa auditoria, e ela encontra um Program ausente.

**Objetivo**: fechar a distância de 30 pontos entre Foundation Readiness (~55) e Vision Realization (~25) — não com mais engenharia, com mais uso real.

**Escopo — dois fluxos paralelos, nenhum é código de plataforma novo**: idêntico ao registrado em `ROADMAP_2_0.md` §1 (cobertura real de Commerce; ativação real de Merchant OS). Não duplicado aqui para evitar a mesma classe de drift que a Mission Ω-2 encontrou entre este documento e o roadmap.

**Critérios de conclusão**: ver `ROADMAP_2_0.md` §1 — reescritos na Mission Ω-3 para outcome-based (evidência citável de decisão real melhorada, `NORTH_STAR.md` §2), não mais contagem de merchants/lojas. Contagens permanecem como indicadores líderes, nunca como critério de conclusão.

**Riscos**: este é o Program mais dependente de fatores fora do controle de engenharia (merchants reais decidem se aderem; nenhuma automação força isso). É também, por essa mesma razão, o Program que nenhuma quantidade de Sprint técnica adicional consegue substituir — adiá-lo não o torna mais fácil, só adia o momento em que o Vision Alignment Score sobe.

**Prioridade**: **mais alta de toda a Release 2.0**, aprovado pelo CTO em 2026-07-08. Precede a Wave 1 (Marketplace Intelligence) em `ROADMAP_2_0.md` §2.

---

## ROADMAP_2_0.md — reordenação (ADOTADA em v2.2, Mission Ω-3 — não mais recomendação pendente)

| Ordem de execução | Wave/Program | Ordem técnica original | Justificativa da mudança |
|---|---|---|---|
| **1** | **Program Ω — Marketplace Density & Merchant Activation** | Não existia | Substrato do qual tudo abaixo depende para gerar valor real, não só valor técnico |
| 2 | Wave 1 — Marketplace Intelligence (hardening, cobertura removida — ver `ROADMAP_2_0.md` §2) | 1 (mesma posição) | Mantido — mas seu valor real só cresce depois que o Program Ω aumentar a cobertura que alimenta essas agregações |
| 3 | Wave 5a — ParaguAI Brain: mapeamento de eventos | 5 (adiantado, dividida) | A parte de menor risco/esforço da Wave 5 (fechar os 21 `TrustEventType` sem mapeamento) não depende de nada e pode rodar em paralelo desde já — é dívida de documentação, não feature nova |
| 4 | Wave 4 — Merchant Platform (hardening, ativação removida — ver `ROADMAP_2_0.md` §4) | 4 (adiantado) | Resolver a duplicação real Decision Center/Growth Center (`TECH_DEBT.md`) é limpeza que reduz custo de manutenção antes de mais lojistas reais chegarem via Program Ω — mais barato corrigir agora do que depois de escalar |
| 5 | Wave 2 — Recommendation Engine | 2 (adiado) | Só produz valor real depois que o Program Ω aumentar a cobertura — construí-lo antes é repetir o padrão do Domínio 4 (Regional Intelligence): matematicamente correto, estrategicamente prematuro |
| 6 | Wave 3 — Buyer Platform | 3 (adiado) | Alertas reais (`BuyerAlertEngine`) e favoritos sincronizados têm mais valor quando há mais produtos/lojas reais para alertar/favoritar — mesma lógica |
| 7 | Wave 5b — ParaguAI Brain: primeiro consumidor de produto real | 5 (mesma posição, dividida) | A parte de maior risco da Wave 5 continua no fim — precisa do Recommendation Engine (5) e de mais volume de dado real para ter um primeiro caso de uso que valha a pena expor |

**Resolução do estado (Mission Ω-3, item 4)**: decisão Tipo 2 (`NORTH_STAR.md` §12) — reordenação de documentação, sem custo de reversão, nenhuma Wave é aberta por esta mudança. Adotada em `ROADMAP_2_0.md` v2.2 em vez de deixada pendente indefinidamente, que era em si a inconsistência apontada pela Mission Ω-2 (achado B6).

---

## O que não muda

- Nenhuma Wave do `ROADMAP_2_0.md` é cancelada — todas continuam válidas em objetivo. Wave 1 e Wave 4 tiveram escopo **reduzido** (Mission Ω-3: cobertura/ativação removidas, agora exclusivas de Program Ω), não cancelado — o restante do conteúdo de ambas permanece.
- A disciplina de abertura de Wave (auditoria → mandato → construção → Quality Gate → documentação → commit, ADR-051) continua se aplicando a todo Program/Wave, incluindo o Ω.
- Home Premium permanece congelada (ADR-053/054) — nada neste documento reabre ou questiona esse congelamento.
- Nenhum Program/Wave está aberto por este documento nem por `ROADMAP_2_0.md` v2.2. A aprovação de Program Ω (Mission Ω-1) e a adoção da reordenação (Mission Ω-3) são decisões de sequenciamento e prioridade — não são autorização de execução. Abertura de qualquer Program/Wave, incluindo o Ω, ainda exige mandato explícito e separado do CTO.
