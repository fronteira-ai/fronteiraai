# CHECKLIST.md

> Bloco 1 do ParaguAI Engineering Framework (PEF). Este documento é a **sequência operacional verificável** das regras definidas em `CLAUDE_SYSTEM.md`, `PROJECT_RULES.md`, `ARCHITECTURE_RULES.md` e `CODING_RULES.md`. Ele não define nenhuma regra nova — cada item aqui aponta para onde a regra correspondente está explicada. Use-o como lista de conferência literal, não como leitura de contexto.

## Checklist — Iniciar uma Sprint

- [ ] Li `docs/operations/PROJECT_STATUS.md` e `docs/operations/NEXT_STEPS.md` — entendo o estado real do código e a proposta de próxima sprint já registrada.
- [ ] Li `docs/engineering/TECH_DEBT.md` e `docs/operations/DECISIONS.md` na área que vou tocar — não vou repetir uma decisão já tomada nem reabrir um problema já descartado sem motivo novo.
- [ ] Comparei a missão recebida com `docs/operations/NEXT_STEPS.md`. Se há conflito de ordem/escopo, **parei e perguntei** antes de iniciar (`CLAUDE_SYSTEM.md`, "Quando Interromper o Fluxo") — não decidi por nenhum dos dois lados sozinho.
- [ ] Verifiquei `docs/architecture/COMPONENT_INDEX.md` e `docs/architecture/API_CONTRACTS.md` por componentes/services/hooks já existentes que o escopo desta sprint poderia reaproveitar.
- [ ] Defini explicitamente o que entra e o que não entra no escopo desta sprint, antes de escrever a primeira linha de código.
- [ ] Se encontrei algum estado inesperado no repositório (arquivos não rastreados desconhecidos, branch divergente, mudanças não commitadas de outra sessão) — investiguei a origem antes de sobrescrever ou ignorar.

## Checklist — Finalizar uma Sprint

**Código** (ver `CODING_RULES.md` e `ARCHITECTURE_RULES.md`):
- [ ] Nenhum tipo novo foi escrito sem confirmar contra o schema real (quando aplicável).
- [ ] Nenhuma duplicação de componente/service/hook foi introduzida — verifiquei reuso antes de criar.
- [ ] Nenhum `console.log` de depuração ficou no código.
- [ ] Comentários só onde o "porquê" não é óbvio — nada explicando o que o código já diz por si.

**Qualidade** (ver `PROJECT_RULES.md`, Definition of Done):
- [ ] `npm run lint` sem erro novo.
- [ ] `npm run typecheck` sem erro novo.
- [ ] `npm run build` concluído com sucesso.
- [ ] Se a sprint alterou ou criou UI: testei manualmente (servidor de desenvolvimento + navegador ou `curl`) o caminho principal e ao menos um caso de borda (vazio/erro/filtro combinado).
- [ ] Confirmei que nenhum domínio já existente regrediu (testei, não assumi).

**Governança** (ver `CLAUDE_SYSTEM.md`, Restrições Absolutas):
- [ ] Nenhum arquivo foi deletado sem aprovação explícita registrada na conversa.
- [ ] Nenhuma alteração de schema de banco foi aplicada — qualquer necessidade de schema novo foi registrada como migration proposta (`database/migrations/`), não aplicada.
- [ ] Nenhuma dependência nova foi instalada sem aprovação.
- [ ] Nenhuma variável de ambiente foi modificada.

**Documentação** (ver `PROJECT_RULES.md`, tabela de Responsabilidades da Documentação):
- [ ] Atualizei `docs/operations/PROJECT_STATUS.md`, `docs/architecture/ARCHITECTURE.md`, `docs/product/FEATURES.md`, `docs/operations/CHANGELOG.md`, `docs/operations/NEXT_STEPS.md` conforme o que mudou.
- [ ] Atualizei `docs/architecture/COMPONENT_INDEX.md`/`docs/architecture/API_CONTRACTS.md`/`docs/architecture/DOMAIN_MODEL.md` se algum componente, contrato de service ou tipo de domínio mudou.
- [ ] Se tomei uma decisão arquitetural real (não uma implementação direta de algo já decidido): registrei uma nova entrada em `docs/operations/DECISIONS.md`, sem editar entradas antigas.
- [ ] Atualizei `docs/engineering/TECH_DEBT.md` — itens resolvidos marcados como tal, novos itens identificados durante a sprint registrados.

**Encerramento**:
- [ ] `git status` está limpo (working tree), considerando apenas os arquivos relevantes ao escopo desta sprint.
- [ ] Reportei o que foi feito, o que foi decidido (e por quê) e o que ficou de dívida — não reportei sucesso sem ter validado os itens acima.

## Checklist — Realizar um Release

- [ ] Todas as sprints planejadas para este Release (`docs/archive/ROADMAP.md`) estão concluídas e documentadas (cada uma passou pelo checklist de "Finalizar uma Sprint" acima).
- [ ] Os critérios de aceitação do Release, listados em `docs/archive/ROADMAP.md` para essa versão, foram verificados manualmente um a um — não assumidos a partir do código escrito.
- [ ] `docs/archive/ROADMAP.md` reflete o status real do Release (atualizado de "Planned" para o status correto).
- [ ] `docs/operations/CHANGELOG.md` tem uma entrada consolidada cobrindo o Release, não apenas entradas dispersas por sprint.
- [ ] Nenhuma dívida técnica crítica do Release ficou sem registro em `docs/engineering/TECH_DEBT.md` — se há algo sabidamente incompleto, está escrito, não escondido.
- [ ] `docs/operations/NEXT_STEPS.md` propõe o próximo Release ou a próxima sprint, com riscos e estimativa.
- [ ] Aprovação explícita do CTO obtida antes de qualquer `git push`, deploy ou alteração de dados/schema de produção (`CLAUDE_SYSTEM.md`, Restrições Absolutas) — uma aprovação anterior não vale para uma ação nova do mesmo tipo.

## Relação com outros documentos

Cada item acima é a aplicação literal de uma regra definida em `CLAUDE_SYSTEM.md`, `PROJECT_RULES.md`, `ARCHITECTURE_RULES.md` ou `CODING_RULES.md`. Se um item aqui parecer ambíguo, a resposta está em um desses quatro documentos, não neste — este documento nunca introduz uma regra nova, apenas sequencia as existentes.
