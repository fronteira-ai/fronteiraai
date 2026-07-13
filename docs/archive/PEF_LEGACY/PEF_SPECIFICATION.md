# PEF_SPECIFICATION.md

> **Constituição do ParaguAI Engineering Framework (PEF).** Este documento governa a existência, a organização e a evolução de todos os demais documentos do PEF (`.ai/`), de `docs/` e de `CLAUDE.md` (raiz). Nenhuma regra de comportamento, arquitetura ou código é definida aqui — isso continua em `CLAUDE_SYSTEM.md`, `PROJECT_RULES.md`, `ARCHITECTURE_RULES.md` e `CODING_RULES.md`. Este documento define **as regras sobre as regras**: como elas se organizam, quem manda em quê, e como o próprio framework pode crescer sem se repetir.
>
> Nenhum novo bloco do PEF deve ser criado sem que esta especificação esteja concluída e sem conflitos conhecidos.

---

## 1. Objetivo do PEF

### Por que ele existe

O ParaguAI é implementado por IA, sob supervisão de um CTO humano, ao longo de muitas sprints e — potencialmente — de mais de uma ferramenta de IA ao longo do tempo. Esse modelo de trabalho tem três falhas estruturais que já aconteceram neste projeto antes de o PEF existir:

1. **Perda de contexto entre sessões.** Cada sessão de IA começa sem memória da anterior. Sem um framework permanente, comportamento e regras tinham que ser re-explicados em cada prompt de missão — o que gerou os "grandes prompts" que o PEF substitui.
2. **Divergência silenciosa entre documentação e realidade.** `docs/operations/PROJECT_STATUS.md`/`ARCHITECTURE.md` já chegaram a descrever um estado ("Sprint 0, 15%") muito anterior ao código real (ver `docs/operations/DECISIONS.md`, ADR-005). Tipos TypeScript divergiram do schema real do Supabase por múltiplas sprints sem que nenhum lint/build pegasse isso (ADR-008/ADR-009). Sem um processo de auditoria obrigatório, qualquer documento vira ficção com o tempo.
3. **Decisões arquiteturais não registradas.** Sem um lugar único para "por que isso foi feito assim", a mesma pergunta é respondida de formas diferentes em sprints diferentes, ou peças já descartadas são reconstruídas do zero.

### O que ele resolve

- Dá a qualquer IA ou desenvolvedor humano que assuma a implementação um comportamento e um processo já definidos, sem precisar de um prompt de missão para reexplicá-los.
- Garante que cada tema de engenharia (arquitetura, código, processo, comportamento) tenha **um único dono documental**, eliminando a necessidade de decidir qual de duas fontes conflitantes seguir.
- Torna auditoria e atualização de documentação parte do fluxo de trabalho normal (ver Seção 5), não uma tarefa especial e esquecível.
- Transforma decisões arquiteturais em registros permanentes e consultáveis (`docs/operations/DECISIONS.md`), em vez de conhecimento perdido na primeira reescrita de contexto.

---

## 2. Arquitetura do PEF

O PEF é composto por três camadas, cada uma com uma natureza diferente:

```
CLAUDE.md (raiz)          ←  bootstrap mínimo, lido automaticamente
        │                    pelo agente de IA antes de qualquer ação
        ▼
   .ai/  (PEF)             ←  regras permanentes de engenharia
        │                    (atemporais — não descrevem o código,
        │                     descrevem como trabalhar nele)
        ▼
   docs/                    ←  documentação do produto
                               (factual e perecível — descreve o
                                código e o produto como realmente
                                são hoje, reescrita por auditoria)
```

- **`CLAUDE.md` (raiz)** é o único arquivo lido automaticamente pela ferramenta de IA no início de cada sessão (mecanismo da própria ferramenta, fora do controle deste framework). Por isso seu papel é estritamente de **bootstrap**: o mínimo necessário para não cometer um erro mecânico grave (ex.: usar uma API do Next.js descontinuada) e os ponteiros para onde estão as regras reais. Ele não contém prosa de arquitetura, filosofia ou convenção — isso é responsabilidade do `.ai/`.
- **`.ai/`** é o PEF propriamente dito: as regras de como projetar, codificar, decidir e processar o trabalho. Um arquivo aqui só muda quando uma **regra** muda — nunca para registrar um fato sobre o código (isso é `docs/`).
- **`docs/`** é a documentação do produto: o que existe, como está organizado hoje, o que já foi decidido e por quê, o que falta. Muda a cada sprint, como reflexo direto do código.

Esta hierarquia de **naturezas** (mecânico → permanente → factual) é o que permite que nenhuma regra precise existir em dois lugares: uma pergunta sobre "como devo me comportar/decidir" sempre tem resposta em `.ai/`; uma pergunta sobre "o que já existe" sempre tem resposta em `docs/`; uma pergunta sobre "o que não posso esquecer antes de começar" tem resposta em `CLAUDE.md` (raiz).

---

## 3. Responsabilidade de cada arquivo

### 3.1 Arquivos do `.ai/` (PEF — regras permanentes)

#### `.ai/PEF_SPECIFICATION.md` (este arquivo)
- **Objetivo**: ser a constituição do PEF — define a si mesmo e a todos os outros documentos do framework.
- **Responsabilidade**: organização, hierarquia, governança e critérios de evolução do PEF como um todo. Não define regra de comportamento, arquitetura ou código.
- **Quem pode alterá-lo**: qualquer implementador (IA ou humano), mas só com aprovação explícita do CTO — é o documento de maior impacto do framework; uma mudança aqui afeta a interpretação de todos os outros.
- **Quando deve ser atualizado**: quando a organização do PEF muda (novo bloco, novo arquivo, mudança de hierarquia ou de critério de evolução) — nunca para registrar uma regra nova de comportamento/arquitetura/código (isso pertence aos arquivos da Seção 3.1 abaixo).
- **Quem pode referenciá-lo**: todos os documentos do PEF e de `docs/` podem citá-lo como a fonte da organização geral; ele não referencia regras específicas de volta, só a existência dos outros arquivos.

#### `.ai/CLAUDE_SYSTEM.md`
- **Objetivo**: definir identidade, autonomia e modo de tomada de decisão de quem implementa.
- **Responsabilidade**: o "quem" e o "como decide" — quando agir sozinho, quando perguntar, filosofia de engenharia.
- **Quem pode alterá-lo**: implementador, com aprovação do CTO quando a mudança afeta autonomia (o que pode ou não ser decidido sem perguntar).
- **Quando deve ser atualizado**: quando a fronteira de autonomia muda, quando uma nova restrição absoluta é definida, ou quando uma inconsistência de referência é encontrada (ex.: apontar para o arquivo errado).
- **Quem pode referenciá-lo**: `PROJECT_RULES.md` e `CHECKLIST.md` (para os pontos de governança e validação que dependem de autonomia), `docs/operations/DECISIONS.md` (quando uma decisão envolveu julgar autonomia).

#### `.ai/PROJECT_RULES.md`
- **Objetivo**: definir o processo de sprint, release, Definition of Done e a tabela de responsabilidade de cada documento de `docs/`.
- **Responsabilidade**: governança de processo — não arquitetura de código, não comportamento da IA.
- **Quem pode alterá-lo**: implementador; mudanças na Definition of Done ou na tabela de responsabilidade de documentação exigem aprovação do CTO.
- **Quando deve ser atualizado**: quando o processo de sprint/release muda, quando um documento novo de `docs/` é criado (precisa entrar na tabela), quando uma auditoria obrigatória nova é definida.
- **Quem pode referenciá-lo**: `CHECKLIST.md` (sequencia o processo aqui definido), `CLAUDE_SYSTEM.md` (Modo de Tomada de Decisão cita o processo de sprint).

#### `.ai/ARCHITECTURE_RULES.md`
- **Objetivo**: definir princípios atemporais de arquitetura — camadas, domínios, fluxo de dados, reuso, escalabilidade.
- **Responsabilidade**: a regra de arquitetura — não o estado real (isso é `docs/architecture/ARCHITECTURE.md`).
- **Quem pode alterá-lo**: implementador; uma mudança de princípio arquitetural (não uma correção de erro de referência) exige aprovação do CTO e, em geral, uma entrada em `docs/operations/DECISIONS.md` explicando por quê.
- **Quando deve ser atualizado**: quando um novo padrão arquitetural é validado e deve se tornar a referência para domínios futuros (ex.: o padrão server-first de `/products` virando a recomendação padrão), ou quando uma duplicação de regra com outro documento é encontrada.
- **Quem pode referenciá-lo**: `CODING_RULES.md` (para a fronteira Server/Client antes de detalhar a sintaxe), `docs/architecture/ARCHITECTURE.md`/`DOMAIN_MODEL.md`/`API_CONTRACTS.md`/`COMPONENT_INDEX.md`/`DEPENDENCY_GRAPH.md` (como o princípio que o estado real deveria respeitar).

#### `.ai/CODING_RULES.md`
- **Objetivo**: definir como o código é escrito — TypeScript, React, Next.js, nomenclatura, comentários, erros, componentização, acessibilidade.
- **Responsabilidade**: sintaxe e padrão de implementação — não onde o código mora (isso é `ARCHITECTURE_RULES.md`).
- **Quem pode alterá-lo**: implementador, livremente para correções/clarificações; aprovação do CTO para mudança de padrão já estabelecido e usado em código existente.
- **Quando deve ser atualizado**: quando um padrão novo de código é adotado, quando uma lacuna é encontrada (ex.: a ausência de regras de Segurança e de Code Style genérico, identificada em auditoria), ou quando `docs/engineering/CONVENTIONS.md` revela uma divergência entre a regra e o código real.
- **Quem pode referenciá-lo**: `CHECKLIST.md` (Finalizar Sprint), `docs/engineering/CONVENTIONS.md` (audita se a regra está sendo seguida).

#### `.ai/CHECKLIST.md`
- **Objetivo**: ser a sequência operacional e verificável das regras dos quatro documentos acima.
- **Responsabilidade**: nenhuma regra nova — apenas ordem de verificação. Se um item aqui parecer ambíguo, a resposta está em outro arquivo do `.ai/`, nunca neste.
- **Quem pode alterá-lo**: implementador, livremente — é o documento de menor risco do framework, porque não define regra.
- **Quando deve ser atualizado**: sempre que um dos quatro documentos acima ganha ou perde uma regra que afeta o que precisa ser verificado.
- **Quem pode referenciá-lo**: qualquer documento; é tipicamente o último consultado antes de reportar uma sprint como concluída.

### 3.2 Documentos do `docs/` (produto)

Regra geral, válida para todos os documentos desta seção salvo exceção indicada: **quem altera** é quem está executando a sprint que afeta aquele domínio; **quem pode referenciá-lo** é qualquer outro documento do PEF, citando o caminho completo.

| Documento | Objetivo | Quando atualizar |
|---|---|---|
| `docs/archive/ROADMAP.md` | Visão de produto e plano de releases de longo prazo | Quando a visão ou o plano de releases muda — não a cada sprint |
| `docs/operations/PROJECT_STATUS.md` | Snapshot do estado real do código | A cada sprint de consolidação, por leitura completa do código |
| `docs/architecture/ARCHITECTURE.md` | Mapa real da arquitetura implementada | Sempre que uma sprint altera fluxo, camada ou componente |
| `docs/engineering/CONVENTIONS.md` | Convenções confirmadas no código real, com exceções marcadas | Quando uma convenção nova surge ou uma exceção é encontrada |
| `docs/architecture/DOMAIN_MODEL.md` | Entidades de domínio vs. schema real do banco | Quando um tipo ou tabela muda |
| `docs/architecture/API_CONTRACTS.md` | Contrato de cada função de `services/*.service.ts` | Quando um service é criado ou alterado |
| `docs/architecture/COMPONENT_INDEX.md` | Inventário de todo componente, com tipo e status | Quando um componente é criado, removido ou unificado |
| `docs/architecture/DEPENDENCY_GRAPH.md` | Grafo real de imports entre camadas | Quando uma nova dependência entre camadas é introduzida |
| `docs/operations/DECISIONS.md` | Histórico de decisões arquiteturais (ADR) | A cada decisão arquitetural real — **nunca editado retroativamente, só acrescentado** (única excepção à regra geral "quem altera": qualquer um pode acrescentar, nenhum pode reescrever uma entrada antiga) |
| `docs/engineering/TECH_DEBT.md` | Dívida técnica e bugs confirmados, com status | Quando uma dívida é identificada ou resolvida |
| `docs/product/FEATURES.md` | Inventário funcional por estado real | Quando uma funcionalidade muda de estado (planejada → em desenvolvimento → concluída) |
| `docs/operations/NEXT_STEPS.md` | Proposta da próxima sprint, com riscos e estimativa | Ao final de cada sprint |
| `docs/operations/CHANGELOG.md` | Histórico real de mudanças por sprint | Ao final de cada sprint |

### 3.3 `CLAUDE.md` (raiz)

- **Objetivo**: bootstrap mínimo para qualquer agente de IA — o que não pode ser esquecido antes da primeira linha de código.
- **Responsabilidade**: avisos mecânicos de alto risco (ex.: breaking changes do Next.js 16) e ponteiros para `.ai/` e `docs/architecture/ARCHITECTURE.md`. Não contém regra de comportamento, arquitetura detalhada ou convenção — isso seria duplicação com o `.ai/`.
- **Quem pode alterá-lo**: aprovação explícita do CTO sempre — é lido automaticamente em toda sessão, então qualquer erro aqui se propaga imediatamente.
- **Quando deve ser atualizado**: quando a versão do Next.js/React muda, quando um comando de projeto muda, ou quando um ponteiro fica desatualizado (aponta para um documento que mudou de responsabilidade).
- **Quem pode referenciá-lo**: `CODING_RULES.md` (aviso de versão), `CLAUDE_SYSTEM.md` (Restrições Absolutas, ver Seção 4 sobre a pendência desse ponteiro).

### 3.4 `docs/CLAUDE.md` (legado, pendente de arquivamento)

- **Objetivo histórico**: documento de visão e processo escrito antes da maior parte do código real existir.
- **Responsabilidade hoje**: a maior parte de seu conteúdo (Architecture Rules, Naming Convention, Code Style, Claude Responsibilities/Restrictions, Quality Checklist, Definition of Done, Communication, Final Rule) está **substituída** pelo PEF (`.ai/`). Duas exceções ainda não migradas e sem outro dono confirmado: a seção "Security" e parte do "Code Style" genérico (early return, nomes descritivos) — ver Seção 4.
- **Quem pode alterá-lo**: não deve receber novo conteúdo. Só pode ser editado para adicionar um banner de status (legado) ou para ser arquivado, com aprovação do CTO.
- **Quando deve ser atualizado**: apenas no momento do arquivamento formal (fora do escopo desta especificação).
- **Quem pode referenciá-lo**: nenhum documento novo deve passar a referenciá-lo como fonte de regra — apenas `docs/operations/DECISIONS.md`/este documento, como contexto histórico.

---

## 4. Regras de Governança

### Fonte única da verdade

Princípio: **um tema, um dono, sempre**. Antes de escrever uma regra ou um fato em qualquer documento, confirme primeiro se ele já tem dono (Seção 3). Resumo por tema:

| Tema | Fonte única |
|---|---|
| Arquitetura (princípio) | `.ai/ARCHITECTURE_RULES.md` |
| Arquitetura (estado real) | `docs/architecture/ARCHITECTURE.md` + companheiros (`DOMAIN_MODEL`, `API_CONTRACTS`, `COMPONENT_INDEX`, `DEPENDENCY_GRAPH`) |
| Regras de código | `.ai/CODING_RULES.md` (regra) + `docs/engineering/CONVENTIONS.md` (auditoria) |
| Comportamento/autonomia da IA | `.ai/CLAUDE_SYSTEM.md` |
| Processo (sprint/release/DoD/dono de documento) | `.ai/PROJECT_RULES.md` |
| Decisões e seus motivos | `docs/operations/DECISIONS.md` |
| Visão de produto | `docs/archive/ROADMAP.md` |
| **Segurança** | **Pendente** — hoje só em `docs/CLAUDE.md` (legado); precisa de um dono definitivo dentro de `.ai/` antes do arquivamento daquele documento |

### Como evitar duplicações

1. Antes de criar uma regra nova, consultar a tabela acima e a Seção 3 — se o tema já tem dono, a regra entra lá, nunca em um documento novo ou em outro já existente.
2. Se a mesma informação precisa aparecer em dois lugares por motivos de leitura (ex.: um princípio em `ARCHITECTURE_RULES.md` e sua aplicação prática em `CODING_RULES.md`), o segundo lugar **referencia**, nunca **repete o texto da regra**.
3. Toda sprint de consolidação/auditoria deve verificar se uma regra escrita durante a sprint não duplicou algo que já existia — esse é o tipo de inconsistência que uma auditoria do PEF (como a que originou este documento) deve continuar pegando.
4. Quando uma duplicação é encontrada, a correção é sempre: manter a versão no dono correto, e trocar a outra por uma referência — nunca manter as duas, nem apagar a única cópia sem garantir que o dono correto a tem.

### Como registrar decisões

- Toda decisão arquitetural real (uma escolha entre alternativas, com consequência para o código ou para o framework) ganha uma entrada em `docs/operations/DECISIONS.md`, no formato ADR já em uso: contexto, decisão, alternativas descartadas, consequência.
- `docs/operations/DECISIONS.md` é **append-only**: uma entrada antiga nunca é reescrita, mesmo que sua premissa seja corrigida depois (ver o próprio histórico do projeto: ADR-006 foi corrigido pelo ADR-008, sem reescrever o ADR-006).
- Uma decisão sobre a organização do próprio PEF (criar/remover/migrar um documento do framework) segue a mesma regra — registrada em `docs/operations/DECISIONS.md`, não só implementada.
- Não toda mudança precisa de uma entrada: uma correção de referência incorreta, uma clarificação de redação, ou a aplicação de uma regra já decidida a um caso novo não geram ADR — só decisões que outra pessoa precisaria entender o "porquê" no futuro.

### Como evoluir o framework

- O PEF evolui em **blocos** — um conjunto coerente de documentos novos ou de mudanças relacionadas. Um bloco novo só é iniciado depois que o bloco anterior está concluído e sem conflito conhecido (regra já aplicada na construção deste framework: o Bloco 1 foi auditado antes desta especificação ser escrita, e esta especificação é, ela mesma, um pré-requisito para qualquer bloco futuro).
- Qualquer mudança de regra (não de fato sobre o código) exige, no mínimo, identificar o dono correto (Seção 3) antes de escrever — nunca criar um documento novo para uma regra que já tem dono.
- Lacunas encontradas (como Segurança e Code Style genérico, ainda sem dono confirmado no `.ai/`) são registradas como pendência explícita (ver Seção 7) até serem resolvidas — não ignoradas, não resolvidas às pressas dentro de um documento que não é o dono natural do tema.

---

## 5. Fluxo de Trabalho

Ciclo completo de uma sprint, e qual documento governa cada etapa:

```
Nova Sprint
   │
   ▼
Leitura do PEF              → .ai/CLAUDE_SYSTEM.md (identidade/autonomia),
                               .ai/PROJECT_RULES.md (processo desta sprint)
   │
   ▼
Leitura da documentação      → docs/operations/PROJECT_STATUS.md (estado real),
                               docs/operations/NEXT_STEPS.md (proposta já registrada),
                               docs/engineering/TECH_DEBT.md + docs/operations/DECISIONS.md
                               (não repetir nem reabrir o que já foi decidido)
   │
   ▼
Auditoria                    → confirmar que a missão recebida não diverge de
                               docs/operations/NEXT_STEPS.md sem que essa divergência
                               tenha sido explicitamente decidida; confirmar
                               tipos/schema reais quando a sprint toca dados
                               externos (.ai/PROJECT_RULES.md, "Auditorias
                               Obrigatórias")
   │
   ▼
Planejamento                 → definir escopo explícito (o que entra/não
                               entra); checar reuso em docs/architecture/COMPONENT_INDEX.md
                               e docs/architecture/API_CONTRACTS.md antes de criar algo novo
                               (.ai/ARCHITECTURE_RULES.md, "Reutilização")
   │
   ▼
Implementação                → .ai/ARCHITECTURE_RULES.md (onde o código
                               pertence) + .ai/CODING_RULES.md (como é escrito)
   │
   ▼
Validação                    → lint/typecheck/build limpos; teste manual
                               quando há UI nova; nenhuma regressão
                               (.ai/PROJECT_RULES.md, Definition of Done)
   │
   ▼
Documentação                 → atualizar os documentos afetados (tabela da
                               Seção 3.2); nova entrada em docs/operations/DECISIONS.md
                               se houve decisão arquitetural real
   │
   ▼
Commit                       → seguindo as Restrições Absolutas
                               (.ai/CLAUDE_SYSTEM.md) — nunca sem que o
                               working tree esteja limpo e os itens de
                               .ai/CHECKLIST.md (Finalizar Sprint) conferidos
   │
   ▼
Push                          → só com aprovação explícita do CTO para a
                               ação específica (uma aprovação anterior não
                               vale para um push novo)
   │
   ▼
Próxima Sprint                → docs/operations/NEXT_STEPS.md já deixa a proposta
                               registrada, fechando o ciclo
```

Este é exatamente o ciclo seguido na Sprint 3.5 (Catálogo Premium de Produtos): a missão recebida divergia da ordem proposta em `docs/operations/NEXT_STEPS.md`, a divergência foi levantada antes de implementar, a decisão foi registrada (ADR-009), e a sprint só foi considerada concluída depois de lint/typecheck/build limpos, teste manual e todos os documentos afetados atualizados.

---

## 6. Hierarquia

Quando dois documentos parecem dizer coisas diferentes sobre a mesma pergunta, a ordem de consulta é:

```
CLAUDE.md (raiz)
   │   pré-condição mecânica — lido antes de tudo; se ele alertar
   │   sobre um risco (ex.: API descontinuada), isso vence qualquer
   │   prática sugerida em outro documento, sem excepção
   ▼
PEF (.ai/)
   │   vence qualquer pergunta de "como devo decidir/agir" e
   │   "como o código deveria estar organizado"
   ▼
docs/operations/PROJECT_STATUS.md
   │   vence qualquer pergunta de "o que já existe hoje" —
   │   nunca assumir, confirmar aqui
   ▼
docs/operations/DECISIONS.md
   │   vence qualquer pergunta de "por que isso é assim" — explica
   │   excepções já aceitas conscientemente a uma regra do PEF
   ▼
docs/architecture/ARCHITECTURE.md (+ DOMAIN_MODEL, API_CONTRACTS,
                       COMPONENT_INDEX, DEPENDENCY_GRAPH)
   │   vence qualquer pergunta de "onde isso fica" / "que contrato
   │   isso já tem"
   ▼
Demais documentos (TECH_DEBT, FEATURES, NEXT_STEPS,
                    CHANGELOG, ROADMAP)
       contexto complementar — informam, não decidem um conflito
```

Por que esta ordem: `CLAUDE.md` (raiz) não é uma "fonte de verdade" no mesmo sentido dos demais — é um alerta mecânico de segurança, por isso vem antes de tudo, sem excepção. O PEF vence sobre fatos do código porque ele é quem define **como interpretar** qualquer fato encontrado. `PROJECT_STATUS.md` vence sobre `ARCHITECTURE.md`/`COMPONENT_INDEX.md` etc. porque é o snapshot mais recente e mais geral — se ele e um documento mais granular divergem, isso é, em si, um sinal de que uma auditoria está atrasada, não uma ambiguidade a resolver na hora. `DECISIONS.md` vem antes de `ARCHITECTURE.md` porque uma decisão já tomada explica por que a arquitetura real foge do princípio — sem consultar `DECISIONS.md` primeiro, alguém tentaria "corrigir" uma excepção que já foi aceita conscientemente (exatamente o erro que esta hierarquia existe para evitar).

---

## 7. Critérios de Evolução

### Quando um novo documento pode ser criado

Um documento novo (em `.ai/` ou `docs/`) só é justificado quando **todas** as condições abaixo são verdadeiras:

1. O tema não tem dono hoje (verificado contra a Seção 3 e a tabela da Seção 4) — se tem dono, a regra/fato entra lá.
2. O tema não cabe razoavelmente como uma seção de um documento existente — i.e., é grande/distinto o suficiente para merecer navegação própria (ex.: se Segurança crescer além de uma seção dentro de `CODING_RULES.md`, um `.ai/SECURITY_RULES.md` próprio se justifica; enquanto for pequeno, vive como seção).
3. A criação é registrada (este documento, Seção 3, ganha uma entrada; e `docs/operations/DECISIONS.md` ganha um ADR explicando por quê).

### Quando um documento deve ser removido

Um documento é candidato a remoção quando sua responsabilidade foi **totalmente** absorvida por outro (nenhuma fração órfã) — ex.: `docs/RULES.md`, `docs/CODING_STANDARDS.md`, `docs/UI_GUIDELINES.md`, hoje vazios e com responsabilidade já coberta por `.ai/PROJECT_RULES.md`, `.ai/CODING_RULES.md` e `docs/engineering/CONVENTIONS.md` respectivamente. Remoção de arquivo **sempre** exige aprovação explícita do CTO, mesmo quando o arquivo está vazio — restrição absoluta definida em `.ai/CLAUDE_SYSTEM.md`, sem excepção para este caso.

### Quando uma regra deve migrar para outro arquivo

Uma regra migra quando uma auditoria encontra que ela está no lugar errado — sintomas: a mesma regra aparece em dois documentos com pequenas diferenças (risco de divergirem mais ainda no futuro); um documento referencia outro que não é mais a fonte certa (ex.: a referência incorreta a "Claude Restrictions" em `CLAUDE.md` raiz, identificada na auditoria que precedeu este documento — a seção real está em `docs/CLAUDE.md`, hoje legado, então a regra precisa de um lar definitivo dentro do `.ai/`, não de uma referência corrigida para um documento que será arquivado); ou um documento cresceu para cobrir um tema que já tem dono em outro lugar. A migração sempre: (1) confirma o dono correto, (2) move o conteúdo completo para lá, (3) substitui o local antigo por uma referência ou remove a seção, (4) registra a mudança quando ela é arquitetural o suficiente para merecer um ADR.

### Pendências reconhecidas nesta especificação (não resolvidas aqui)

Esta especificação não altera nenhuma regra existente — apenas organiza. As seguintes lacunas, identificadas durante a auditoria que originou este documento, continuam **abertas** até uma sprint dedicada a resolvê-las:

- Regras de **Segurança** não têm hoje nenhum dono confirmado dentro do `.ai/` (só existem em `docs/CLAUDE.md`, legado).
- Regras genéricas de **Code Style** (early return, nomes descritivos, evitar abreviação) também só existem em `docs/CLAUDE.md`.
- A referência a "Claude Restrictions" em `.ai/CLAUDE_SYSTEM.md` aponta para `CLAUDE.md` (raiz), mas a seção real está em `docs/CLAUDE.md` — precisa ser corrigida internalizando a lista dentro do próprio `.ai/CLAUDE_SYSTEM.md`.
- `docs/CLAUDE.md` continua sem o banner de status "legado" e sem data de arquivamento definida.
- `docs/engineering/AGENTS.md`, `docs/RULES.md`, `docs/CODING_STANDARDS.md` e `docs/UI_GUIDELINES.md` continuam sem decisão final (migrar, esvaziar formalmente ou remover).

Nenhuma dessas pendências foi resolvida nesta tarefa, por instrução explícita de não alterar regras existentes nesta etapa.
