# docs/product/releases/

Blueprints, planos de execução e relatórios por Release/Wave. Enquanto `docs/product/ROADMAP_1_8.md`/`ROADMAP_1_9.md`/`ROADMAP_2_0.md` respondem "o que está planejado", esta pasta guarda o detalhamento de execução — Epics, critérios de aceite, o que foi de fato entregue — por Release específica.

## Propósito

Dar o histórico de planejamento e execução de cada Release em um único lugar, sequenciado, para que qualquer pessoa (ou IA) entenda como uma Release específica foi concebida e o que efetivamente saiu dela, sem precisar reconstruir a linha do tempo a partir do `CHANGELOG.md`.

## Documentos desta pasta, em ordem cronológica

### Release 1.5

| Documento | Responde |
|---|---|
| `RELEASE_1_5_BLUEPRINT.md` | Planejamento original da Release 1.5 (Trust Experience) |
| `RELEASE_1_5_EXECUTION_PLAN.md` | Plano de execução por Epic |

### Release 1.6

| Documento | Responde |
|---|---|
| `RELEASE_1_6_BLUEPRINT.md` | Planejamento da Release 1.6 (Command Center — Analytics/Decision/Catalog Intelligence/Growth Engine) |

### Release 1.7

| Documento | Responde |
|---|---|
| `RELEASE_1_7_BLUEPRINT.md` | Planejamento da Release 1.7 (Ecosystem Expansion Platform) |
| `RELEASE_1_7_EXECUTION_PLAN.md` | Plano de execução geral |
| `RELEASE_1_7_WAVE_2_EXECUTION_PLAN.md` | Wave 2 — Merchant Connectors + Scheduler + Discovery |
| `RELEASE_1_7_WAVE_3_EXECUTION_PLAN.md` | Wave 3 — Product Identity Engine (Shadow Mode) |
| `RELEASE_1_7_WAVE_4_EXECUTION_PLAN.md` | Wave 4 — Canonical Catalog & Compare Foundation |
| `RELEASE_1_7_WAVE_5_EXECUTION_PLAN.md` | Wave 5 — Merchant Acquisition & Ownership Platform |

Certificação final: `docs/operations/RELEASE_CERTIFICATION_1.7.md`.

### Release 1.8

| Documento | Responde |
|---|---|
| `RELEASE_1_8_BLUEPRINT.md` | Planejamento da Release 1.8 (Marketplace Expansion & Live Commerce) |
| `RELEASE_1_8_BUYER_IDENTITY_MODEL.md` | Modelo de identidade do comprador (ADR-045/046) |
| `RELEASE_1_8_SPRINT_ZERO_REPORT.md` | Auditoria organizacional pré-Release |
| `RELEASE_1_8_SPRINT_01_REPORT.md` | Critical Readiness Fixes |
| `RELEASE_1_8_PROGRAM_0_WAVE_0_REPORT.md` | Brain Analytics Integration |

Roadmap por Program/Wave: `docs/product/ROADMAP_1_8.md`.

### Release 1.9

Sem Blueprint próprio nesta pasta — ver `docs/product/ROADMAP_1_9.md` e `docs/operations/PRODUCTION_BASELINE_1.9.md` (baseline oficial de produção).

### Release 2.0

| Documento | Responde |
|---|---|
| `RELEASE_2_0_PREVIEW.md` | Objetivos e escopo da Release 2.0 — sem Blueprint de execução ainda |

Roadmap por Program/Wave: `docs/product/ROADMAP_2_0.md`. Auditoria estratégica que originou o Program Ω: `docs/product/VISION_ALIGNMENT_AUDIT.md`.

## Quando criar um novo documento aqui

A cada nova Release ou Wave que precisar de um Blueprint, plano de execução ou relatório próprio. Nomeie seguindo o padrão já estabelecido: `RELEASE_<major>_<minor>_<TIPO>.md` (`BLUEPRINT`, `EXECUTION_PLAN`, `WAVE_<N>_EXECUTION_PLAN`, `<NOME>_REPORT`).

## Quando não criar

- Para o roadmap vivo por Program/Wave de uma Release → `docs/product/ROADMAP_<major>_<minor>.md` (pasta pai, não aqui)
- Para a certificação final de uma Release → `docs/operations/RELEASE_CERTIFICATION_<versão>.md`
- Para o estado atual do projeto → `docs/operations/PROJECT_STATUS.md`
