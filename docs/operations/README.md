# docs/operations/

Documentação operacional do ParaguAI — o estado real do projeto, o histórico de todas as mudanças e as decisões arquiteturais que moldaram a plataforma. Esta pasta é o registro vivo da evolução do projeto.

## Propósito

Garantir rastreabilidade completa: qualquer pessoa pode reconstruir o contexto de qualquer decisão, entender o estado atual do projeto e saber o que vem a seguir — sem depender da memória de nenhum indivíduo ou sessão.

## Documentos desta pasta

### Estado vivo

| Documento | Responde | Atualiza quando |
|---|---|---|
| `PROJECT_STATUS.md` | Fotografia do presente — o que está implementado, qual a Release atual, qual o build state | Ao final de cada Release |
| `CHANGELOG.md` | História completa de cada Release — o que mudou e por quê | Ao final de cada Release |
| `NEXT_STEPS.md` | Próximos passos imediatos — o que fazer depois desta Release | Ao final de cada Release |
| `DECISIONS.md` | Registro de todas as decisões arquiteturais (ADR-001 a ADR-055+) | A cada decisão Tipo 1 tomada |

### Baseline e certificação (registro permanente, não append-only)

| Documento | Responde |
|---|---|
| `PRODUCTION_BASELINE_1.9.md` | Baseline oficial de produção ao final da Release 1.9 — referência permanente para Releases futuras |
| `RELEASE_CERTIFICATION_1.7.md` | Certificação formal da Release 1.7 |
| `RELEASE_CERTIFICATION_1.5.md` | Certificação formal da Release 1.5 |

## Quando criar um novo documento aqui

Quando surgir uma necessidade operacional nova não coberta pelos 4 documentos existentes. Exemplos válidos: `INCIDENT_LOG.md` (quando incidentes em produção começarem a ocorrer), `DEPENDENCY_UPDATES.md` (quando gestão de dependências se tornar um processo formal).

## Quando não criar

- Para registrar apenas uma decisão → adicionar entrada em `DECISIONS.md` (ADR)
- Para descrever uma funcionalidade → `product/FEATURES.md`
- Para documentar arquitetura → `architecture/`
- Para guias técnicos → `engineering/`

## Regra append-only

`DECISIONS.md` e `CHANGELOG.md` são **append-only**: nunca editar entradas existentes. Apenas acrescentar. Se uma decisão anterior foi equivocada, registrar uma nova decisão que corrige a anterior — nunca reescrever o ADR original (ver ADR-008 corrigido pelo ADR-009, sem apagar o ADR-008).

## ADRs e a pasta adr/

Os ADRs atualmente estão consolidados em `DECISIONS.md`. Futuramente, cada ADR migrará para um arquivo individual em `docs/adr/ADR-XXX.md`. Esta migração será feita como parte de um Release específico, com o ADR correspondente registrado.
