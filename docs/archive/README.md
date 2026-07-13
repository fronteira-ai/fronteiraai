# docs/archive/

Documentos preservados por razões históricas. Arquivos aqui foram substituídos por documentos mais completos ou tornaram-se obsoletos — mas nunca excluídos, porque o histórico tem valor.

## Propósito

Preservar o histórico do projeto. Um documento arquivado pode ser consultado para entender o estado do projeto em um determinado momento, rastrear a evolução de uma decisão ou recuperar contexto que não foi registrado no CHANGELOG.

## Documentos desta pasta (arquivados em 2026-06-28)

| Documento | Substituído por | Motivo |
|---|---|---|
| `ROADMAP.md` | `docs/product/MASTER_ROADMAP.md` | Versão antiga, substituída por roadmap estruturado em 4 Fases |
| `CLAUDE.md` | `CLAUDE.md` (raiz) + Foundation | Instruções antigas, absorvidas pela Foundation e CLAUDE.md atual |
| `PRODUCT.md` | `docs/product/FEATURES.md` | Placeholder vazio, substituído por inventário real |
| `PROJECT_ROADMAP.md` | `docs/product/MASTER_ROADMAP.md` | Duplicado, substituído |
| `API.md` | `docs/architecture/API_CONTRACTS.md` | Placeholder vazio, substituído por contratos reais |
| `RELEASES.md` | `docs/operations/CHANGELOG.md` | Placeholder vazio, substituído por CHANGELOG completo |
| `RULES.md` | `foundation/AI_CONSTITUTION.md` + `engineering/CONVENTIONS.md` | Placeholder vazio, conteúdo absorvido pela Foundation |
| `CODING_STANDARDS.md` | `docs/engineering/CONVENTIONS.md` | Placeholder vazio, substituído por CONVENTIONS completo |
| `UI_GUIDELINES.md` | `docs/engineering/CONVENTIONS.md` | Placeholder vazio, regras de UI em CONVENTIONS |
| `SPRINT_HISTORY.md` | `docs/operations/CHANGELOG.md` | Placeholder vazio, histórico de sprints em CHANGELOG |

## Documentos desta pasta (arquivados em 2026-07-13 — Release 2.0 Foundation Closure)

Três scaffolds de raiz do repositório, todos criados em 2026-06-28/29 (mesma janela da criação da Foundation v1.0) e nunca atualizados desde então, apesar de dezenas de Releases/Sprints/Programs subsequentes — achado da auditoria de encerramento do Release 2.0 Foundation & Discovery (`docs/product/RELEASE_2_FOUNDATION_COMPLETE.md`).

| Documento/pasta | Substituído por | Motivo |
|---|---|---|
| `.ai/` (PEF — ParaguAI Engineering Framework, 13 arquivos) | `CLAUDE.md` (raiz) + `docs/foundation/*` | Framework de regras paralelo, criado no mesmo commit que "completou" a Foundation v1.0 e nunca mais tocado; a maioria dos arquivos (`GIT_RULES.md`, `SEO_RULES.md`, `SUPABASE_RULES.md`, `UI_RULES.md`, `PERFORMANCE_RULES.md`, `REVIEW_RULES.md`, `DOCUMENTATION_RULES.md`, todos os `TEMPLATES/`) estava vazia desde a criação. O próprio `CLAUDE_SYSTEM.md` já apontava `CLAUDE.md` (raiz) como fonte normativa das Restrições — preservado íntegro em `PEF_LEGACY/` |
| `CONTEXT_CURRENT_OBJECTIVE.md`, `CONTEXT_CURRENT_RELEASE.md`, `CONTEXT_CURRENT_SPRINT.md`, `CONTEXT_LAST_DECISION.md` (de `context/`) | `docs/operations/PROJECT_STATUS.md` + `docs/operations/NEXT_STEPS.md` | Scaffold de rastreamento de estado "atual", todos os 4 arquivos vazios (0 linhas) desde a criação — nunca chegaram a ser preenchidos |
| `MEMORY_FUTURE_FEATURES.md`, `MEMORY_IDEAS.md`, `MEMORY_KNOWN_ISSUES.md`, `MEMORY_TECHNICAL_DEBT.md` (de `memory/`, raiz do repositório) | `docs/engineering/TECH_DEBT.md` + `docs/product/MASTER_ROADMAP.md` | Mesmo padrão — 4 arquivos vazios (0 linhas) desde a criação, nome colidindo conceitualmente com o sistema de memória do assistente (que vive fora deste repositório) |

## Quando mover um documento para cá

Quando um documento for completamente substituído por outro mais completo e não precisar mais ser consultado rotineiramente. O movimento para archive é permanente — não se "desarquiva" um documento, se cria um novo se o conteúdo ainda for relevante.

## Quando não criar arquivos aqui

Nunca criar documentos novos diretamente em archive. Esta pasta apenas recebe documentos que foram ativos em outro lugar.

## Nunca excluir

Arquivos em archive não são excluídos. Se um arquivo for absolutamente inútil, adicionar nota no topo explicando por que foi preservado, mas mantê-lo. O custo de armazenar é zero; o custo de perder contexto histórico pode ser alto.
