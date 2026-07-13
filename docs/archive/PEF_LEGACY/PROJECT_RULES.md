# PROJECT_RULES.md

> Bloco 1 do ParaguAI Engineering Framework (PEF). Este documento define o **processo**: como o trabalho é organizado em sprints e releases, o que define "feito", quem é responsável por cada documento, e quando uma auditoria é obrigatória. Não define identidade/autonomia (ver `CLAUDE_SYSTEM.md`), arquitetura (ver `ARCHITECTURE_RULES.md`) nem padrões de código (ver `CODING_RULES.md`).

## Propósito

Todo projeto que evolui por muitas sprints sem um processo explícito acumula divergência silenciosa: documentação que descreve um estado passado, decisões que ninguém lembra o porquê, dívida técnica que vira bug de produção sem aviso. O ParaguAI já passou por isso uma vez (ver `docs/operations/DECISIONS.md`, ADR-005 — a documentação original descrevia "Sprint 0, 15%" muito depois do código real ter avançado). Este documento existe para que isso não se repita.

## Organização do Projeto

A estrutura de pastas (real) está documentada e mantida atualizada em `docs/architecture/ARCHITECTURE.md`; a estrutura pretendida originalmente está em `CLAUDE.md` (raiz). Este documento não repete a árvore de pastas — define apenas a regra: **a estrutura de pastas é parte da arquitetura e segue as mesmas regras de aprovação de `ARCHITECTURE_RULES.md`** (não criar domínios novos na raiz sem necessidade, não renomear pastas sem aprovação).

## Princípios de Governança

- **Uma única fonte de verdade por tipo de informação.** Visão de longo prazo vive em `docs/archive/ROADMAP.md`. Estado real do código vive em `docs/operations/PROJECT_STATUS.md` (snapshot) e `docs/operations/CHANGELOG.md` (histórico). Decisões e seus motivos vivem em `docs/operations/DECISIONS.md`. Regras de processo e comportamento vivem no PEF (`.ai/`). Nenhuma informação deve ser mantida em dois lugares — onde isso aconteceu no passado (ex.: `docs/CLAUDE.md` e o PEF descrevendo comportamento), o documento mais antigo é considerado substituído, não mantido em paralelo.
- **Toda decisão arquitetural relevante é registrada**, nunca só implementada. Um ADR em `docs/operations/DECISIONS.md` documenta o contexto, a decisão, as alternativas descartadas e a consequência — não apenas o que foi feito, mas por quê e o que foi rejeitado.
- **Toda sprint termina com a documentação no mesmo estado de confiança que o código.** Código sem documentação correspondente é trabalho incompleto, não trabalho "quase pronto".
- **Achados de dados não são confundidos com bugs de código.** Quando o problema é a ausência de dados reais (ex.: ADR-007 — lojas sem `slug`, produtos zerados), isso é registrado como achado de dados, não corrigido como se fosse um bug de implementação.

## Gestão de Sprints

Uma sprint é a unidade de trabalho real do projeto (distinta de "Release", ver abaixo). Convenções observadas e mantidas:

- **Numeração**: sequencial dentro de um release (`3.2`, `3.3`, `3.4`...); uma sub-sprint de diagnóstico/consolidação sem nova funcionalidade pode usar sufixo (`3.4.1`).
- **Toda sprint tem um objetivo único e um escopo explícito** — o que entra e o que não entra é decidido antes de codificar, não descoberto no meio.
- **Sprints de auditoria/diagnóstico são válidas e às vezes obrigatórias** (ver "Auditorias Obrigatórias" abaixo) — nem toda sprint precisa entregar uma funcionalidade visível.
- **Conflito entre a missão recebida e uma recomendação já registrada em `docs/operations/NEXT_STEPS.md`** é resolvido perguntando ao CTO antes de iniciar a implementação (ver `CLAUDE_SYSTEM.md`, Modo de Tomada de Decisão) — nunca seguindo silenciosamente um dos dois lados.
- **Toda sprint gera uma entrada em `docs/operations/CHANGELOG.md`** e atualiza `docs/operations/NEXT_STEPS.md` com a proposta da sprint seguinte.

## Gestão de Releases

Um Release é um marco versionado maior (`0.2`, `0.3`...), descrito em `docs/archive/ROADMAP.md`, composto por uma ou mais sprints. Regras:

- Um Release só é considerado concluído quando **todos** os critérios de aceitação listados em `docs/archive/ROADMAP.md` para aquela versão estão implementados e validados manualmente — não apenas "a maior parte".
- Um Release pode ser composto por sprints não consecutivas no tempo (ex.: o Release 0.2, Domínio de Produto, só foi efetivamente fechado quando a correção de dados + o catálogo da Sprint 3.5 chegaram, bem depois da implementação original do domínio).
- `docs/archive/ROADMAP.md` é atualizado quando o status real de um Release muda — esse documento descreve visão e não deve divergir silenciosamente do que o código realmente entrega.

## Definition of Done

Uma tarefa (sprint, feature ou correção) só está concluída quando, nesta ordem:

1. O código funciona e cobre o escopo combinado — nem mais, nem menos.
2. Os tipos estão corretos e batem com a realidade (banco de dados real, não só o que o tipo TypeScript assumia — ver `ARCHITECTURE_RULES.md`).
3. A arquitetura definida em `ARCHITECTURE_RULES.md` foi respeitada; nenhuma duplicação nova foi introduzida.
4. `npm run lint`, `npm run typecheck` e `npm run build` passam sem erro novo.
5. Quando a tarefa altera ou adiciona UI: testada manualmente (servidor de desenvolvimento + navegador/`curl`), cobrindo o caminho principal e ao menos um caso de borda (vazio, erro, filtro combinado).
6. Nenhuma regressão foi introduzida nos domínios já existentes — verificado, não assumido.
7. A documentação afetada foi atualizada (ver tabela de responsabilidade abaixo) — uma nova decisão arquitetural ganhou uma entrada em `docs/operations/DECISIONS.md`.
8. Nenhuma ação das Restrições Absolutas (`CLAUDE_SYSTEM.md`) foi tomada sem aprovação explícita.
9. `git status` está limpo (working tree) antes de reportar a tarefa como concluída, salvo instrução contrária.

## Responsabilidades da Documentação

Cada documento tem um dono de conteúdo único. Antes de escrever em qualquer um, confirme que é o dono certo da informação — não duplique em outro.

| Documento | Responsabilidade exclusiva |
|---|---|
| `docs/archive/ROADMAP.md` | Visão de produto e plano de releases de longo prazo (não reescrito por auditorias de sprint) |
| `docs/operations/PROJECT_STATUS.md` | Snapshot do estado real do código, gerado por leitura completa a cada sprint de consolidação |
| `docs/architecture/ARCHITECTURE.md` | Mapa real da arquitetura como implementada (distinto da arquitetura pretendida) |
| `docs/engineering/CONVENTIONS.md` | Convenções de nomenclatura/estilo confirmadas no código real, com exceções marcadas |
| `docs/architecture/DOMAIN_MODEL.md` | Entidades de domínio, com o schema real do banco confrontado com cada tipo TypeScript |
| `docs/architecture/API_CONTRACTS.md` | Contrato de cada função de `services/*.service.ts` |
| `docs/architecture/COMPONENT_INDEX.md` | Inventário de todo componente em `components/`, com tipo e status |
| `docs/architecture/DEPENDENCY_GRAPH.md` | Grafo real de imports entre camadas |
| `docs/operations/DECISIONS.md` | Histórico de decisões arquiteturais (ADR) — nunca editado retroativamente, só acrescentado |
| `docs/engineering/TECH_DEBT.md` | Dívida técnica e bugs confirmados, com status de resolução |
| `docs/product/FEATURES.md` | Inventário funcional por estado real (concluído / em desenvolvimento / planejado) |
| `docs/operations/NEXT_STEPS.md` | Proposta da próxima sprint, com riscos e estimativa |
| `docs/operations/CHANGELOG.md` | Histórico real de mudanças, por sprint, derivado do código e do git log |
| `.ai/*` (este framework) | Regras de processo e comportamento — não descreve o estado do código, descreve como trabalhar nele |
| `CLAUDE.md` (raiz) | Restrições absolutas e instruções mecânicas de ambiente (versão do Next.js, comandos) |
| `docs/CLAUDE.md` | Missão/visão original do projeto — suas seções de processo/comportamento estão substituídas pelo PEF (ver `CLAUDE_SYSTEM.md`) |

## Auditorias Obrigatórias

- **Antes de qualquer sprint que toque um domínio já existente**: ler `docs/operations/PROJECT_STATUS.md`, `docs/engineering/TECH_DEBT.md` e `docs/operations/DECISIONS.md` relativos àquele domínio — não assumir que o tipo/documentação atual reflete a realidade sem confirmar.
- **Antes de construir uma feature nova sobre dados externos (Supabase)**: confirmar o schema real (consulta direta, coluna por coluna se necessário), não só o que `types/*.ts` declara — foi a ausência dessa auditoria que causou o bug confirmado no ADR-008.
- **Após qualquer sprint que corrija um bug de dados confirmado**: uma auditoria de consolidação (sprint de diagnóstico, sem nova feature) deve revisar se o mesmo padrão de erro existe em outro lugar do código antes de considerar o bug "resolvido" no projeto como um todo, não só no arquivo corrigido.
- **Periodicamente** (a critério do CTO, histórico: a cada 2–3 sprints de feature): uma sprint de consolidação revisita toda a documentação de `docs/` por leitura completa do código, sem alterar comportamento — exatamente como a Sprint 3.2 e a Sprint 3.4.1 fizeram.

## Relação com outros documentos

Ver `CLAUDE_SYSTEM.md` para identidade/autonomia, `ARCHITECTURE_RULES.md` para princípios técnicos, `CODING_RULES.md` para padrões de código, `CHECKLIST.md` para a versão operacional e verificável das regras deste documento.
