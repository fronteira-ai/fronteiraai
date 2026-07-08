# docs/product/

Documentação do produto ParaguAI — o que existe hoje e para onde o produto vai. Esta pasta contém o inventário de funcionalidades implementadas e o roadmap estratégico de evolução.

## Propósito

Dar visibilidade ao estado funcional do produto (o que está pronto, em desenvolvimento ou planejado) e à direção estratégica de longo prazo. Documentos aqui respondem "o que o produto faz?" e "para onde vai?"

## Documentos desta pasta

Agrupados por propósito, não por data de criação. Ordem de leitura recomendada dentro de cada grupo: de cima para baixo.

### Estado e roadmap

| Documento | Responde |
|---|---|
| `FEATURES.md` | Inventário de todas as funcionalidades por estado real — concluído, em desenvolvimento, planejado |
| `MASTER_ROADMAP.md` | Roadmap estratégico de 4 Fases (visão de longo prazo) — Discovery Platform, Trust & Reputation, Intelligence Layer, Scale & Expansion. **Não confundir com os roadmaps por Release abaixo** — este é o horizonte estratégico, aqueles são execução Release a Release |
| `ROADMAP_1_8.md` | Roadmap operacional da Release 1.8, organizado por Program/Wave |
| `ROADMAP_1_9.md` | Roadmap operacional da Release 1.9, organizado por Program |
| `ROADMAP_2_0.md` | Roadmap operacional da Release 2.0, organizado por Program/Wave em ordem de execução — **Program Ω primeiro** (ver `RELEASE_ALIGNMENT.md`) |
| `KPIS.md` | Indicadores-chave de produto |

### Estratégia e visão

| Documento | Responde |
|---|---|
| `STRATEGIC_ASSETS.md` | Catálogo oficial de Ativos Estratégicos (Core/Supporting/Future) |
| `MOAT_STRATEGY.md` | Os 8 Moats permanentes do ParaguAI |
| `MARKETPLACE_STRATEGY.md` | Estratégia de expansão e cobertura do marketplace |
| `MARKETPLACE_VISION.md` | Visão de longo prazo do marketplace |
| `PARAGUAI_BRAIN.md` | A camada de inteligência — visão e arquitetura conceitual |
| `PRODUCT_POLICY.md` | Políticas permanentes de produto |

### Auditoria de alinhamento estratégico (PROGRAM Ω, 2026-07-08)

| Documento | Responde |
|---|---|
| `VISION_ALIGNMENT_AUDIT.md` | Auditoria estratégica (não técnica) de 8 domínios contra `foundation/VISION_2035.md` — origem do Program Ω |
| `STRATEGIC_GAP_MAP.md` | Mapa de maturidade atual vs. esperada por domínio |
| `VISION_SCORECARD.md` | Vision Alignment Score (0–100) e metodologia |
| `RELEASE_ALIGNMENT.md` | Justificativa da reordenação do `ROADMAP_2_0.md` por impacto estratégico — companion do Program Ω |

### Processo

| Documento | Responde |
|---|---|
| `RELEASE_PLAYBOOK.md` | Como uma Release é planejada e executada |
| `releases/` | Blueprints, planos de execução e relatórios por Release/Wave específica — ver `releases/README.md` |

## Quando criar um novo documento aqui

Quando surgir um documento de produto suficientemente amplo. Exemplos válidos: `USER_RESEARCH.md` (quando pesquisa de usuário for formalizada), `PRICING_STRATEGY.md` (quando modelo de preço for definido). Criar novos documentos requer ADR.

## Quando não criar

- Para especificação técnica de uma feature → `architecture/` ou `engineering/`
- Para próximos passos imediatos → `operations/NEXT_STEPS.md`
- Para decisões de produto pontuais → `operations/DECISIONS.md` (ADR)
- Para princípios de produto → `foundation/PRODUCT_PRINCIPLES.md`
- Para estado operacional → `operations/PROJECT_STATUS.md`

## Convenção

`FEATURES.md` descreve o que existe no código real — nunca descrever intenções como implementadas. `MASTER_ROADMAP.md` pode conter visão futura explicitamente marcada como tal.
