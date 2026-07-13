# START.md

> Bootloader do ParaguAI Engineering Framework (PEF). Este arquivo não contém nenhuma regra — só a ordem de leitura e o fluxo de uma sessão. Toda regra de comportamento, processo, arquitetura, código ou Git está nos documentos listados abaixo, nunca aqui.

## 1. Objetivo

Este documento inicia qualquer sessão de trabalho no ParaguAI. Ele existe para que uma sessão nova reconstrua o contexto completo do projeto seguindo uma única sequência de leitura, sem precisar de um prompt de missão que reexplique identidade, regras ou processo — isso já está no PEF.

## 2. Ordem obrigatória de leitura

**PEF (`.ai/`) — nesta ordem:**

1. `PEF_SPECIFICATION.md`
2. `CLAUDE_SYSTEM.md`
3. `PROJECT_RULES.md`
4. `ARCHITECTURE_RULES.md`
5. `CODING_RULES.md`
6. `CHECKLIST.md`

**Documentação (`docs/`) — nesta ordem:**

7. `PROJECT_STATUS.md`
8. `ARCHITECTURE.md`
9. `DECISIONS.md`
10. `NEXT_STEPS.md`
11. `CHANGELOG.md`
12. `FEATURES.md`
13. `DOMAIN_MODEL.md`
14. `API_CONTRACTS.md`
15. `COMPONENT_INDEX.md`
16. `DEPENDENCY_GRAPH.md`

A ordem importa: o PEF define como interpretar a documentação (ver `PEF_SPECIFICATION.md`, Seção 6 — Hierarquia); ler a documentação antes do PEF inverteria essa precedência.

## 3. Inicialização

Após concluir a leitura, executar:

```
git status
git branch
git log -5
```

Verificar, a partir do resultado e da leitura já feita:

- a branch atual é a esperada;
- o working tree está limpo (se não estiver, investigar a origem antes de qualquer ação — ver `CLAUDE_SYSTEM.md`);
- qual é a Sprint atual (`docs/operations/PROJECT_STATUS.md`/`docs/operations/NEXT_STEPS.md`);
- qual é o Release atual (`docs/archive/ROADMAP.md`/`docs/operations/PROJECT_STATUS.md`).

## 4. Modo de Operação

Com o contexto reconstruído, não perguntar o que já pode ser decidido com base nas regras lidas no PEF. Interromper o fluxo apenas nos casos definidos em `CLAUDE_SYSTEM.md` ("Quando Interromper o Fluxo" e "Restrições Absolutas") — qualquer outra decisão segue a autonomia já definida lá.

## 5. Fluxo Padrão

```
Nova Sessão
   ↓
Leitura do PEF
   ↓
Leitura da documentação
   ↓
Reconstrução do contexto
   ↓
Auditoria
   ↓
Planejamento
   ↓
Implementação
   ↓
Validação
   ↓
Documentação
   ↓
Commit
   ↓
Push
   ↓
Fim da Sprint
```

Detalhe de cada etapa: `PEF_SPECIFICATION.md`, Seção 5 (Fluxo de Trabalho).

## 6. Restrições

Este documento não contém — e não deve passar a conter — regras de arquitetura, regras de código, regras de Git, Definition of Done, ou qualquer conteúdo já definido em outro documento do PEF. Sua única função é apontar, em ordem, para onde cada coisa está.
