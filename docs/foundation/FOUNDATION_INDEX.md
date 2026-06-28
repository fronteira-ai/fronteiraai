# FOUNDATION_INDEX.md — Índice Oficial do Conhecimento do ParaguAI

**Versão**: 1.0  
**Data**: 2026-06-28  
**Status**: CERTIFICADO — porta de entrada oficial do projeto

> Este documento não cria conceitos novos. Ele organiza todo o conhecimento existente em um mapa navegável. Não substitui nenhum documento — aponta para eles. Leia este índice antes de qualquer tarefa. Após a leitura, saberá exatamente quais documentos abrir e quais ignorar.

---

## I. Introdução

### O que é este documento

O FOUNDATION_INDEX.md é a porta de entrada oficial do ParaguAI para humanos e IAs. Responde imediatamente:

- O que devo ler primeiro?
- Qual documento responde qual pergunta?
- Qual documento consultar para cada tipo de decisão?
- Quais documentos posso ignorar nesta tarefa?
- Qual a hierarquia entre todos os documentos?

### O que este documento NÃO é

- Não é um resumo da Foundation — leia os documentos originais
- Não é substituto do GLOSSARY.md — termos oficiais estão lá
- Não é o ARCHITECTURE.md — a arquitetura real está lá
- Não é um documento de planejamento — o MASTER_ROADMAP.md e NEXT_STEPS.md fazem isso

### Por que existe

À medida que o projeto cresce, o número de documentos cresce. Sem um índice, qualquer pessoa nova — humana ou IA — perde tempo buscando qual documento abrir, lendo o documento errado ou, pior, trabalhando sem leitura alguma.

Este índice reduz o custo de onboarding de horas para minutos.

---

## II. Filosofia

### Conhecimento é um ativo

Todo conhecimento sobre o ParaguAI que existe apenas na memória de uma pessoa ou sessão é frágil. Conhecimento documentado é permanente, transferível e consultável por qualquer agente futuro — humano ou IA.

A Foundation, os ADRs, o CHANGELOG e os documentos técnicos são ativos estratégicos tão reais quanto o código. Uma plataforma com código sem documentação é uma caixa preta. Uma plataforma com documentação sem código é um plano. O ParaguAI tem os dois.

### Documentação é infraestrutura

Documentação não é overhead — é infraestrutura cognitiva. Assim como o schema do banco é infraestrutura de dados, e os types TypeScript são infraestrutura de contrato, os documentos do projeto são infraestrutura de raciocínio.

Quando uma IA nova começa uma sessão, ela reconstrói o contexto lendo os documentos. Se os documentos estiverem desatualizados ou faltando, a IA trabalha com premissas erradas. Atualizar documentação após cada Release não é burocracia — é manutenção de infraestrutura.

### A Foundation é permanente; os documentos operacionais evoluem

Os 8 documentos da Foundation (AI_CONSTITUTION → RELEASE_STRATEGY) são **LOCKED** — nunca editados silenciosamente, apenas versionados. Eles definem quem o ParaguAI é, e isso não muda.

Os documentos operacionais (ARCHITECTURE, PROJECT_STATUS, CHANGELOG, DECISIONS, etc.) são **vivos** — atualizam a cada Release, sprint ou decisão. Eles descrevem o que o projeto é *agora*, não permanentemente.

Confundir os dois tipos é um anti-pattern. Editar a AI_CONSTITUTION para resolver um problema pontual é errado. Deixar o ARCHITECTURE.md desatualizado é igualmente errado.

---

## III. Hierarquia do Conhecimento

A hierarquia responde: "em caso de conflito entre dois documentos, qual prevalece?"

```
┌─────────────────────────────────────────────────────────────────┐
│  FOUNDATION (8 documentos permanentes)                          │
│  AI_CONSTITUTION > NORTH_STAR > BUSINESS_MODEL > VISION_2035    │
│  > ENGINEERING_PRINCIPLES > PRODUCT_PRINCIPLES                  │
│  > DECISION_FILTER > RELEASE_STRATEGY                           │
│  [LOCKED — nunca sobrescritos, apenas versionados]              │
└────────────────────────────┬────────────────────────────────────┘
                             │ define filosofia e princípios
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  GOVERNANÇA                                                     │
│  DECISIONS.md (ADRs) — decisões arquiteturais permanentes       │
│  CLAUDE.md (raiz) — instruções operacionais de desenvolvimento  │
│  [Semi-permanentes — ADRs não são editados retroativamente]     │
└────────────────────────────┬────────────────────────────────────┘
                             │ materializa em
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  ARQUITETURA                                                    │
│  ARCHITECTURE.md — estrutura técnica atual                      │
│  DOMAIN_MODEL.md — entidades e relacionamentos do banco         │
│  DEPENDENCY_GRAPH.md — grafo de imports entre camadas           │
│  [Vivos — atualizam a cada Release]                             │
└────────────────────────────┬────────────────────────────────────┘
                             │ implementado via
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  CONTRATOS E CONVENÇÕES                                         │
│  API_CONTRACTS.md — contratos dos services                      │
│  CONVENTIONS.md — regras de estilo e nomenclatura              │
│  GLOSSARY.md — terminologia oficial                             │
│  [Vivos — evoluem com ADRs e novos padrões]                     │
└────────────────────────────┬────────────────────────────────────┘
                             │ documentado em
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  REFERÊNCIA DE IMPLEMENTAÇÃO                                    │
│  COMPONENT_INDEX.md — tabela de todos os componentes           │
│  FEATURES.md — inventário de funcionalidades                   │
│  ACQUISITION.md — documentação do Acquisition Engine           │
│  CONNECTOR_GUIDE.md — como criar novos conectores              │
│  [Vivos — atualizam conforme componentes e features evoluem]    │
└────────────────────────────┬────────────────────────────────────┘
                             │ rastreado em
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  OPERAÇÃO E ESTADO                                              │
│  PROJECT_STATUS.md — fotografia do presente                     │
│  CHANGELOG.md — histórico de todas as Releases                 │
│  TECH_DEBT.md — dívida técnica aberta                          │
│  NEXT_STEPS.md — próximos passos imediatos                     │
│  MASTER_ROADMAP.md — roadmap estratégico de longo prazo        │
│  [Vivos — atualizam a cada Release ou sprint]                   │
└─────────────────────────────────────────────────────────────────┘
```

**Regra de conflito**: em caso de contradição entre dois documentos, o documento de nível superior prevalece. A AI_CONSTITUTION prevalece sobre a ARCHITECTURE.md. Um ADR prevalece sobre um comentário no código. Um documento vivo desatualizado não prevalece sobre nada — deve ser corrigido.

---

## IV. Ordem Oficial de Leitura

### Para primeiro contato com o projeto

Sequência mínima para qualquer pessoa nova entender o projeto antes de tocar em código:

```
1. FOUNDATION_INDEX.md (este documento) — 10 min
   ↓ entender o mapa
2. AI_CONSTITUTION.md — 30 min
   ↓ entender quem somos e as regras permanentes
3. NORTH_STAR.md — 20 min
   ↓ entender como decidimos
4. ARCHITECTURE.md — 20 min
   ↓ entender como o projeto está organizado hoje
5. DOMAIN_MODEL.md — 15 min
   ↓ entender as entidades e o banco
6. CONVENTIONS.md — 15 min
   ↓ entender como escrevemos código
7. GLOSSARY.md — 10 min
   ↓ entender os termos oficiais
8. PROJECT_STATUS.md — 10 min
   ↓ entender o estado atual
```

**Tempo total estimado**: ~2 horas. Após essa leitura, qualquer desenvolvedor tem contexto suficiente para fazer perguntas certas e contribuir sem causar regressões.

### Por que essa ordem

1. **FOUNDATION_INDEX primeiro**: evita que o leitor se perca nos documentos sem um mapa.
2. **AI_CONSTITUTION segundo**: define quem somos — tudo o mais é derivado disso. Ler arquitetura antes de entender a missão é construir sem fundação.
3. **NORTH_STAR terceiro**: define como decidir. Sem isso, o desenvolvedor pode fazer perguntas corretas mas tomar decisões erradas.
4. **ARCHITECTURE quarto**: descreve como o projeto está organizado agora. Lido após a Foundation porque a arquitetura serve à missão, não o contrário.
5. **DOMAIN_MODEL quinto**: antes de escrever qualquer Service ou Type, o desenvolvedor precisa entender as entidades e invariantes do banco (especialmente a Invariante de Preço).
6. **CONVENTIONS sexto**: antes de abrir qualquer arquivo, saber como nomear, onde colocar, e o que nunca fazer.
7. **GLOSSARY sétimo**: após entender o projeto, consolidar o vocabulário oficial.
8. **PROJECT_STATUS por último**: com contexto suficiente, o leitor consegue interpretar corretamente o estado atual.

### Para leitura completa (Foundation toda)

Para decisões estratégicas, novas Releases ou revisão de direção — leia a Foundation completa na ordem de hierarquia:

```
AI_CONSTITUTION → NORTH_STAR → BUSINESS_MODEL → VISION_2035
→ ENGINEERING_PRINCIPLES → PRODUCT_PRINCIPLES
→ DECISION_FILTER → RELEASE_STRATEGY
```

### Para tarefas específicas

Ver Seção V (Quando consultar cada documento).

---

## V. Quando Consultar Cada Documento

### Por pergunta

| Pergunta | Documento |
|---|---|
| Quem somos? Qual nossa missão? | `AI_CONSTITUTION.md` |
| Como tomamos decisões? | `NORTH_STAR.md` |
| Como ganhamos dinheiro? | `BUSINESS_MODEL.md` |
| Para onde vamos em 10 anos? | `VISION_2035.md` |
| Como construímos tecnologia? | `ENGINEERING_PRINCIPLES.md` |
| Como construímos produtos? | `PRODUCT_PRINCIPLES.md` |
| Como aprovar esta decisão? | `DECISION_FILTER.md` |
| Como estruturar esta Release? | `RELEASE_STRATEGY.md` |
| Como funciona a arquitetura atual? | `ARCHITECTURE.md` |
| Como funciona o banco? Quais entidades existem? | `DOMAIN_MODEL.md` |
| Qual componente devo usar/criar? | `COMPONENT_INDEX.md` |
| Qual o contrato deste service? | `API_CONTRACTS.md` |
| Como nomear este arquivo/função/variável? | `CONVENTIONS.md` |
| Qual é o termo oficial para este conceito? | `GLOSSARY.md` |
| O que mudou na última Release? | `CHANGELOG.md` |
| Qual decisão originou este padrão? | `DECISIONS.md` |
| O que está implementado hoje? | `FEATURES.md` |
| Qual o estado atual do projeto? | `PROJECT_STATUS.md` |
| O que fazer depois? | `NEXT_STEPS.md` |
| Qual a dívida técnica existente? | `TECH_DEBT.md` |
| Qual o roadmap estratégico? | `MASTER_ROADMAP.md` |
| Como funciona o Acquisition Engine? | `ACQUISITION.md` |
| Como criar um novo Connector? | `CONNECTOR_GUIDE.md` |
| Como os imports se conectam? | `DEPENDENCY_GRAPH.md` |

### Por tipo de tarefa

| Tipo de Tarefa | Documentos Obrigatórios | Documentos Opcionais |
|---|---|---|
| Nova funcionalidade | Foundation (todos) → ARCHITECTURE → DOMAIN_MODEL → CONVENTIONS | COMPONENT_INDEX, API_CONTRACTS |
| Nova Release | AI_CONSTITUTION, NORTH_STAR, DECISION_FILTER, RELEASE_STRATEGY | MASTER_ROADMAP, PROJECT_STATUS |
| ADR novo | DECISIONS.md (para numeração), DECISION_FILTER.md | Depende do domínio |
| Bug fix | ARCHITECTURE, CONVENTIONS, DECISIONS | TECH_DEBT |
| Novo componente | COMPONENT_INDEX, CONVENTIONS, ARCHITECTURE | DOMAIN_MODEL |
| Novo service | DOMAIN_MODEL, API_CONTRACTS, CONVENTIONS | DECISIONS |
| Schema de banco | DOMAIN_MODEL, DECISIONS | AI_CONSTITUTION (Regras Permanentes) |
| Novo Connector | CONNECTOR_GUIDE, ACQUISITION | ARCHITECTURE |
| Decisão de produto | NORTH_STAR, PRODUCT_PRINCIPLES, DECISION_FILTER | BUSINESS_MODEL, VISION_2035 |
| Decisão arquitetural | ENGINEERING_PRINCIPLES, DECISION_FILTER | AI_CONSTITUTION |
| Onboarding (humano) | Ver Seção IV (Ordem de Leitura) | — |
| Onboarding (IA) | Ver Seção VII (Fluxo para IA) | — |

---

## VI. Fluxo de Trabalho do Desenvolvedor

```
┌─────────────────────────────────────────────────────────────┐
│  RECEBE TAREFA                                              │
│  (PR, missão, bug, funcionalidade, Release)                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  CONSULTA FOUNDATION                                        │
│  → AI_CONSTITUTION: a tarefa viola alguma Regra Permanente? │
│  → NORTH_STAR: a tarefa aproxima ou afasta da missão?       │
│  → DECISION_FILTER: é uma decisão Tipo 1 ou Tipo 2?        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  CONSULTA ARQUITETURA E DOMÍNIO                             │
│  → ARCHITECTURE.md: onde este código se encaixa?           │
│  → DOMAIN_MODEL.md: quais entidades estou tocando?         │
│  → API_CONTRACTS.md: qual o contrato do service?           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  CONSULTA CONVENÇÕES                                        │
│  → CONVENTIONS.md: como nomear, onde colocar, o que evitar  │
│  → GLOSSARY.md: qual o termo oficial?                       │
│  → COMPONENT_INDEX.md: já existe um componente para isso?  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  IMPLEMENTA                                                 │
│  Seguindo os contratos e convenções identificados.          │
│  Sem introduzir padrões novos sem ADR.                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  ATUALIZA DOCUMENTAÇÃO                                      │
│  → CHANGELOG.md: o que mudou e por quê                     │
│  → PROJECT_STATUS.md: estado atual atualizado              │
│  → COMPONENT_INDEX.md: componente novo registrado          │
│  → API_CONTRACTS.md: service novo ou alterado              │
│  → FEATURES.md: funcionalidade nova documentada            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  ADR (se necessário)                                        │
│  → Toda decisão Tipo 1 exige ADR em DECISIONS.md           │
│  → Numeração sequencial, nunca editado retroativamente     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  QUALITY GATES                                              │
│  → Build limpo, tsc 0, lint 0                              │
│  → Sem regressões                                          │
│  → Consistência com Foundation                             │
│  → Documentação atualizada                                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  RELEASE                                                    │
│  → Seguir o ciclo de 11 estágios do RELEASE_STRATEGY.md    │
│  → Definition of Done validado                             │
│  → NEXT_STEPS.md atualizado                                │
└─────────────────────────────────────────────────────────────┘
```

---

## VII. Fluxo para IA

Sequência específica para qualquer agente de IA que inicie uma nova sessão neste projeto.

```
┌─────────────────────────────────────────────────────────────┐
│  RECEBE PROMPT                                              │
│  (missão, tarefa, pergunta, sessão nova)                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  LÊ FOUNDATION_INDEX.md (este documento)                   │
│  → Identifica o tipo da tarefa                             │
│  → Identifica quais documentos abrir                       │
│  → Identifica quais documentos ignorar                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  CLASSIFICA A TAREFA                                        │
│  → Funcionalidade nova? → Foundation obrigatória           │
│  → Bug fix? → ARCHITECTURE + CONVENTIONS                   │
│  → Decisão arquitetural? → DECISION_FILTER + ADR           │
│  → Componente? → COMPONENT_INDEX + CONVENTIONS             │
│  → Documentação? → documento específico + GLOSSARY         │
│  → Release? → RELEASE_STRATEGY obrigatória                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  ABRE DOCUMENTOS NECESSÁRIOS                                │
│  Lê apenas o que a tarefa exige. Não lê todos os           │
│  documentos para toda tarefa — isso desperdiça contexto.   │
│  Exceção: primeiro contato → leitura completa da Seção IV. │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  VERIFICA RESTRIÇÕES                                        │
│  → Regras Permanentes (AI_CONSTITUTION Seção XIII)         │
│  → Invariante de Preço (Offer, nunca Product)              │
│  → Service Role nunca em Client Component                  │
│  → Schema não muda sem aprovação explícita                 │
│  → Produção não altera sem dry-run                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  IMPLEMENTA                                                 │
│  Usando terminologia do GLOSSARY.md.                       │
│  Seguindo convenções do CONVENTIONS.md.                    │
│  Respeitando contratos do API_CONTRACTS.md.                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  ATUALIZA DOCUMENTAÇÃO                                      │
│  → Todo documento afetado pela tarefa deve ser atualizado  │
│  → Documentação desatualizada é pior que ausente           │
│  → CHANGELOG e PROJECT_STATUS sempre                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  VALIDA RELEASE STRATEGY                                    │
│  → A tarefa cumpre Definition of Done?                     │
│  → Quality Gates passam?                                   │
│  → O que esta tarefa torna mais fácil na próxima?          │
│  (Pergunta de Compounding obrigatória)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## VIII. Tipos de Documento

### Foundation (8 documentos — LOCKED)

Documentos permanentes que definem quem o ParaguAI é. Revisados apenas por versionamento explícito. Nunca editados para resolver problemas pontuais. Qualquer conflito com estes documentos sinaliza que a decisão é errada, não o documento.

**Responsabilidade**: filosofia, princípios, missão, estratégia, processos permanentes.

**Quando consultar**: antes de qualquer decisão significativa. Qualquer iniciativa nova começa aqui.

### Governança (2 documentos — Semi-permanentes)

`DECISIONS.md` registra ADRs (decisões arquiteturais) que nunca são editadas retroativamente — apenas acrescidas. `CLAUDE.md` (raiz) contém as instruções operacionais para Claude Code.

**Responsabilidade**: rastrear por que cada padrão existe. Registrar decisões para que o raciocínio nunca se perca.

**Quando consultar**: antes de tomar qualquer decisão que afete padrões estabelecidos; ao entender por que algo foi feito de determinada forma.

### Arquitetura (3 documentos — Vivos)

`ARCHITECTURE.md`, `DOMAIN_MODEL.md`, `DEPENDENCY_GRAPH.md` descrevem como o projeto está organizado *agora*. Atualizam a cada Release que muda a estrutura.

**Responsabilidade**: mapa técnico real. Deve sempre refletir o código atual.

**Quando consultar**: antes de adicionar qualquer arquivo, pasta, service ou componente.

### Contratos e Convenções (3 documentos — Vivos)

`API_CONTRACTS.md`, `CONVENTIONS.md`, `GLOSSARY.md` definem as regras e linguagem do projeto. Evoluem com novos padrões e termos.

**Responsabilidade**: garantir consistência de código e linguagem entre todos os contribuidores (humanos e IAs).

**Quando consultar**: ao nomear qualquer coisa, criar qualquer service, ou usar qualquer termo.

### Referência de Implementação (4 documentos — Vivos)

`COMPONENT_INDEX.md`, `FEATURES.md`, `ACQUISITION.md`, `CONNECTOR_GUIDE.md` são documentos de referência específicos para implementação.

**Responsabilidade**: evitar duplicação; orientar criação de novos itens.

**Quando consultar**: ao criar componentes, features, conectores ou entender o Acquisition Engine.

### Operação e Estado (5 documentos — Vivos)

`PROJECT_STATUS.md`, `CHANGELOG.md`, `TECH_DEBT.md`, `NEXT_STEPS.md`, `MASTER_ROADMAP.md` descrevem onde o projeto está e para onde vai.

**Responsabilidade**: fotografia do presente e direção futura. Sempre atualizados após cada Release.

**Quando consultar**: para entender o que está feito, o que está planejado, o que está quebrado ou o que vem a seguir.

---

## IX. Documentos Permanentes (LOCKED)

Os seguintes documentos são **LOCKED** — nunca editados silenciosamente. Qualquer mudança exige nova versão com registro no histórico:

| Documento | Versão | Responde |
|---|---|---|
| `docs/foundation/AI_CONSTITUTION.md` | **v1.2** | Quem somos, missão, regras permanentes |
| `docs/foundation/NORTH_STAR.md` | **v1.1** | Como decidimos, 10 filtros, Pergunta Obrigatória |
| `docs/foundation/BUSINESS_MODEL.md` | **v1.0** | Como criamos e capturamos valor |
| `docs/foundation/VISION_2035.md` | **v1.0** | Para onde vamos, 6 estágios evolutivos |
| `docs/foundation/ENGINEERING_PRINCIPLES.md` | **v1.0** | Como construímos tecnologia |
| `docs/foundation/PRODUCT_PRINCIPLES.md` | **v1.0** | Como construímos produtos |
| `docs/foundation/DECISION_FILTER.md` | **v1.0** | Como aprovamos qualquer decisão |
| `docs/foundation/RELEASE_STRATEGY.md` | **v1.0** | Como o ParaguAI evolui |

**Regra**: se alguém propuser editar um desses documentos para "agilizar" ou "adaptar", a resposta é não. Circunstâncias não sobrescrevem princípios — exceções são documentadas em ADRs, não na Foundation.

**Como versionar**: quando uma revisão for genuinamente necessária (expansão de princípio, correção de inconsistência real), incrementar a versão (v1.2 → v1.3), registrar a mudança no CHANGELOG.md, e atualizar a referência de versão no FOUNDATION_INDEX.md.

---

## X. Documentos Vivos

Os seguintes documentos mudam continuamente — atualizam a cada Release, sprint ou decisão:

| Documento | Atualiza Quando | Responsável |
|---|---|---|
| `docs/architecture/ARCHITECTURE.md` | Nova rota, serviço, padrão ou estrutura de pasta adicionada | Autor da Release |
| `docs/architecture/DOMAIN_MODEL.md` | Mudança de schema, tipo novo ou relação nova no banco | Autor da Release |
| `docs/architecture/COMPONENT_INDEX.md` | Componente criado, removido ou renomeado | Autor da Release |
| `docs/architecture/API_CONTRACTS.md` | Service novo, função nova ou contrato alterado | Autor da Release |
| `docs/engineering/CONVENTIONS.md` | Novo padrão de engenharia adotado ou anti-pattern identificado | CTO/Autor |
| `docs/engineering/GLOSSARY.md` | Novo termo oficial ou termo depreciado | CTO/Autor |
| `docs/architecture/DEPENDENCY_GRAPH.md` | Novo import entre camadas ou dependência nova | Autor da Release |
| `docs/engineering/ACQUISITION.md` | Novo engine, parser ou capacidade do pipeline | Autor da Release |
| `docs/engineering/CONNECTOR_GUIDE.md` | Novo tipo de conector ou padrão de implementação | Autor da Release |
| `docs/operations/PROJECT_STATUS.md` | Sempre ao final de cada Release | Autor da Release |
| `docs/operations/CHANGELOG.md` | Sempre ao final de cada Release | Autor da Release |
| `docs/engineering/TECH_DEBT.md` | Ao identificar nova dívida ou encerrar dívida existente | Autor da Release |
| `docs/operations/NEXT_STEPS.md` | Sempre ao final de cada Release | Autor da Release |
| `docs/product/MASTER_ROADMAP.md` | Ao completar uma Fase ou redefinir prioridades estratégicas | CTO |
| `docs/operations/DECISIONS.md` | Sempre que uma decisão Tipo 1 for tomada | Autor do ADR |

---

## XI. Processo de Atualização

### Quem atualiza

Todo desenvolvedor (humano ou IA) que faz uma mudança é responsável por atualizar os documentos afetados por essa mudança. Documentação não é responsabilidade de um "time de documentação" — é parte do Definition of Done de cada Release.

### Quando atualizar

A ordem correta é:

1. **Durante a implementação**: `DECISIONS.md` quando uma decisão Tipo 1 é tomada (o ADR orienta a implementação, não a documenta após).
2. **Ao final da implementação**: `ARCHITECTURE.md`, `DOMAIN_MODEL.md`, `COMPONENT_INDEX.md`, `API_CONTRACTS.md` — refletem o estado resultante do código.
3. **Ao declarar a Release**: `CHANGELOG.md` (o que mudou e por quê), `PROJECT_STATUS.md` (fotografia do presente), `NEXT_STEPS.md` (próximo passo emergente), `FEATURES.md` (inventário atualizado).
4. **Ao identificar dívida**: `TECH_DEBT.md` — ao encontrar, não ao corrigir.
5. **Ao encerrar dívida**: marcar o item como resolvido em `TECH_DEBT.md` com referência à Release que o corrigiu.

### Como atualizar corretamente

- **Não resumir a Foundation** em documentos operacionais. Se algo da Foundation é relevante, referenciar o documento, não copiar o conteúdo.
- **Não descrever intenções** como fatos em PROJECT_STATUS ou ARCHITECTURE. Apenas o que está no código conta.
- **Não apagar histórico**. CHANGELOG e DECISIONS.md são apenas acumulativos — nunca removem entradas.
- **Manter o GLOSSARY como autoridade**. Se um documento usa um termo de forma diferente do GLOSSARY, o documento está errado.

---

## XII. Anti-Patterns

### Ler documentos fora de ordem

Ler ARCHITECTURE.md antes da AI_CONSTITUTION.md cria a ilusão de entender o projeto sem entender a missão. A arquitetura serve à missão — sem a missão, a arquitetura é apenas código.

### Duplicar conhecimento entre documentos

Se a mesma informação aparece em dois documentos, qual é a autoridade? Quando um muda e o outro não, qual está certo? Duplicação cria conflito onde deveria haver clareza. A regra: cada conceito tem um documento-fonte, os outros referenciam.

### Criar documento novo sem necessidade clara

Cada novo documento aumenta o custo de onboarding. Antes de criar, perguntar: "este conteúdo poderia estar em um documento existente?" Em geral, sim. A criação de um documento novo é justificada apenas quando representa uma responsabilidade permanente que nenhum documento existente cobre.

### Contradizer a Foundation

Um ADR, uma CONVENTION ou uma linha de código que contradiz a AI_CONSTITUTION não é uma exceção legítima — é um erro. A Foundation não é um guideline que cede a pressão. Em caso de conflito genuíno, a Foundation é revisada formalmente (nova versão), não contornada silenciosamente.

### Editar documento LOCKED sem versionamento

Alterar um documento da Foundation sem incrementar a versão e registrar no CHANGELOG é o equivalente a alterar um schema de banco sem migration — o estado fica inconsistente e o histórico se perde.

### Ignorar ADR existente

Um ADR documenta por que uma decisão foi tomada, quais alternativas foram descartadas e quais são as consequências. Ignorar um ADR ao implementar algo relacionado é repetir os erros que o ADR foi escrito para evitar.

### Deixar documento vivo desatualizado

Documentação que descreve um estado que não existe mais é pior que ausência de documentação — engana o leitor. Um `ARCHITECTURE.md` desatualizado faz a próxima IA trabalhar com premissas erradas. A regra: se você mudou o código, você atualizou os documentos afetados.

### Usar terminologia não-oficial

Usar "Seller" em vez de "Merchant", "Shop" em vez de "Store", ou "listing" em vez de "Offer" em código ou documentação fragmenta a linguagem do projeto. O GLOSSARY.md define os termos; qualquer desvio é um bug de linguagem.

---

## XIII. Checklist de Onboarding

### Novo desenvolvedor (humano)

- [ ] Leu `FOUNDATION_INDEX.md` (este documento)
- [ ] Leu `AI_CONSTITUTION.md` na íntegra
- [ ] Leu `NORTH_STAR.md` na íntegra
- [ ] Leu `ARCHITECTURE.md` na íntegra
- [ ] Leu `DOMAIN_MODEL.md` na íntegra
- [ ] Leu `CONVENTIONS.md` na íntegra
- [ ] Leu `GLOSSARY.md` na íntegra
- [ ] Leu `PROJECT_STATUS.md` (estado atual)
- [ ] Leu `NEXT_STEPS.md` (próximos passos)
- [ ] Configurou `.env.local` com as variáveis do `.env.example`
- [ ] Executou `npm run dev` e confirmou que o projeto roda
- [ ] Executou `npm run build`, `npm run lint`, `npx tsc --noEmit` sem erros
- [ ] Entendeu a Invariante de Preço (`Offer`, nunca `Product`)
- [ ] Entendeu que `SUPABASE_SERVICE_ROLE_KEY` nunca vai para Client Components
- [ ] Entendeu que schema de banco não muda sem aprovação explícita

### Nova IA (novo agente ou nova sessão)

- [ ] Leu `FOUNDATION_INDEX.md` (este documento)
- [ ] Identificou o tipo de tarefa (ver Seção V)
- [ ] Abriu os documentos obrigatórios para o tipo de tarefa
- [ ] Verificou as Regras Permanentes antes de qualquer implementação
- [ ] Verificou o GLOSSARY.md para terminologia oficial
- [ ] Verificou CONVENTIONS.md para padrões de código
- [ ] Não assumiu que conhecimento de sessões anteriores está correto sem verificar o estado atual
- [ ] Confirmou que toda mudança de schema requer aprovação explícita
- [ ] Confirmou que toda escrita em produção requer dry-run anterior
- [ ] Planejou atualizar os documentos afetados após a implementação

### Novo colaborador (não-técnico — produto, negócio)

- [ ] Leu `AI_CONSTITUTION.md` (Identidade, Missão, Regras Permanentes)
- [ ] Leu `NORTH_STAR.md` (como decisões são tomadas)
- [ ] Leu `BUSINESS_MODEL.md` (como o ParaguAI cria valor)
- [ ] Leu `VISION_2035.md` (para onde vamos)
- [ ] Leu `PRODUCT_PRINCIPLES.md` (como o produto é construído)
- [ ] Leu `GLOSSARY.md` (terminologia — especialmente Merchant vs. Lojista, Store vs. Loja)
- [ ] Entendeu que rankings nunca são pagos (Trust — Princípio Absoluto)
- [ ] Entendeu que dados históricos nunca são descartados (Ativos Estratégicos)

### Novo CTO / arquiteto

Tudo do checklist de desenvolvedor, mais:

- [ ] Leu todos os 8 documentos da Foundation na íntegra
- [ ] Leu todos os ADRs em `DECISIONS.md` (ADR-001 a ADR-039+)
- [ ] Leu `MASTER_ROADMAP.md` (Fases 1–4)
- [ ] Leu `TECH_DEBT.md` na íntegra
- [ ] Entendeu o DECISION_FILTER.md (pipeline de 10 estágios)
- [ ] Entendeu o RELEASE_STRATEGY.md (11 estágios, DoR, DoD, Quality Gates)
- [ ] Entendeu a diferença entre documentos LOCKED e vivos
- [ ] Entendeu que o versionamento da Foundation requer nova versão + CHANGELOG

---

## XIV. Knowledge Map

Mapa completo do conhecimento do ParaguAI — todos os documentos, suas relações e fluxo de informação:

```
╔══════════════════════════════════════════════════════════════════╗
║  FOUNDATION — PRINCÍPIOS PERMANENTES                            ║
║                                                                  ║
║  AI_CONSTITUTION.md ──────────────────────────────────────────  ║
║  "Quem somos"                                                    ║
║     │                                                            ║
║     ├──► NORTH_STAR.md ─────────────────────────────────────    ║
║     │    "Como decidimos"                                        ║
║     │         │                                                  ║
║     │         ├──► BUSINESS_MODEL.md ─────────────────────      ║
║     │         │    "Como criamos valor"                          ║
║     │         │                                                  ║
║     │         ├──► VISION_2035.md ──────────────────────        ║
║     │         │    "Para onde vamos"                             ║
║     │         │                                                  ║
║     │         ├──► ENGINEERING_PRINCIPLES.md ──────────         ║
║     │         │    "Como construímos tecnologia"                 ║
║     │         │                                                  ║
║     │         ├──► PRODUCT_PRINCIPLES.md ─────────────          ║
║     │         │    "Como construímos produtos"                   ║
║     │         │                                                  ║
║     │         ├──► DECISION_FILTER.md ────────────────          ║
║     │         │    "Como aprovamos decisões"                     ║
║     │         │                                                  ║
║     │         └──► RELEASE_STRATEGY.md ───────────────          ║
║     │              "Como evoluímos"                              ║
╚═════╪════════════════════════════════════════════════════════════╝
      │ operacionaliza em
      ▼
╔══════════════════════════════════════════════════════════════════╗
║  GOVERNANÇA — DECISÕES PERMANENTES                              ║
║                                                                  ║
║  DECISIONS.md (ADR-001 a ADR-039+)                              ║
║  "Por que cada padrão existe"                                    ║
║     │                                                            ║
║     └──► cada ADR referencia um documento da Foundation         ║
╚═════╪════════════════════════════════════════════════════════════╝
      │ materializa em
      ▼
╔══════════════════════════════════════════════════════════════════╗
║  ARQUITETURA — ESTRUTURA TÉCNICA ATUAL                          ║
║                                                                  ║
║  ARCHITECTURE.md ──── como o projeto está organizado            ║
║       │                                                          ║
║       ├──► DOMAIN_MODEL.md ── entidades e banco                 ║
║       │         │                                                ║
║       │         └──► types/*.ts + database/migrations/           ║
║       │                                                          ║
║       ├──► DEPENDENCY_GRAPH.md ── grafo de imports              ║
║       │                                                          ║
║       └──► ACQUISITION.md ── pipeline standalone                ║
║                 │                                                ║
║                 └──► CONNECTOR_GUIDE.md ── como criar conectores ║
╚═════╪════════════════════════════════════════════════════════════╝
      │ guiado por
      ▼
╔══════════════════════════════════════════════════════════════════╗
║  CONTRATOS E CONVENÇÕES — LINGUAGEM COMPARTILHADA               ║
║                                                                  ║
║  API_CONTRACTS.md ── contratos dos services                     ║
║  CONVENTIONS.md ──── como escrever código                       ║
║  GLOSSARY.md ──────── termos oficiais                           ║
║  AGENTS.md ────────── regras para agentes IA (Next.js)          ║
╚═════╪════════════════════════════════════════════════════════════╝
      │ implementado em
      ▼
╔══════════════════════════════════════════════════════════════════╗
║  REFERÊNCIA — O QUE EXISTE                                      ║
║                                                                  ║
║  COMPONENT_INDEX.md ── todos os componentes                     ║
║  FEATURES.md ──────── todas as funcionalidades                  ║
╚═════╪════════════════════════════════════════════════════════════╝
      │ rastreado em
      ▼
╔══════════════════════════════════════════════════════════════════╗
║  ESTADO E DIREÇÃO — O QUE ACONTECEU E PARA ONDE VAMOS          ║
║                                                                  ║
║  PROJECT_STATUS.md ── estado atual                              ║
║  CHANGELOG.md ──────── história de cada Release                 ║
║  TECH_DEBT.md ─────── dívida técnica aberta                     ║
║  NEXT_STEPS.md ────── próximos passos imediatos                 ║
║  MASTER_ROADMAP.md ── roadmap de 4 Fases                        ║
║                                                                  ║
║  FOUNDATION_INDEX.md ── ESTE DOCUMENTO (porta de entrada)       ║
╚══════════════════════════════════════════════════════════════════╝
```

### Ciclo do Conhecimento

```
Missão (AI_CONSTITUTION)
    │
    ├──► Decisão (NORTH_STAR + DECISION_FILTER)
    │         │
    │         └──► ADR (DECISIONS.md)
    │                   │
    │                   └──► Implementação → código
    │                               │
    │                               └──► Documentação atualizada
    │                                         │
    │                                         └──► CHANGELOG + PROJECT_STATUS
    │                                                       │
    └────────────────────────────────────────────────────── Próxima missão
```

---

## XV. Evolução

### Quando criar um novo documento

Um novo documento é justificado apenas quando:

1. Representa uma responsabilidade permanente que nenhum documento existente cobre
2. Seu conteúdo não cabe em uma seção de um documento existente sem desequilibrá-lo
3. Será consultado de forma independente, não apenas em conjunto com outro documento

Antes de criar, perguntar: "posso adicionar uma seção no documento existente mais próximo?" Em geral, sim.

### Quando não criar

- Para registrar uma decisão pontual → usar DECISIONS.md (ADR)
- Para documentar o estado atual → usar PROJECT_STATUS.md
- Para listar dívida técnica → usar TECH_DEBT.md
- Para documentar próximos passos → usar NEXT_STEPS.md
- Para documentar uma funcionalidade → usar FEATURES.md

### Como registrar um novo documento neste índice

1. Adicionar na tabela da Seção V (Quando consultar)
2. Classificar na Seção VIII (Tipos de documento)
3. Adicionar na lista da Seção X (Documentos vivos) ou Seção IX (Documentos permanentes)
4. Incluir no Knowledge Map da Seção XIV
5. Se for documento de referência especializado, adicionar no checklist de onboarding relevante

### Sobre a proliferação de documentos

Cada documento adicionado aumenta o custo de manutenção e onboarding. Um projeto com 50 documentos é mais difícil de manter do que um com 25 documentos bem estruturados. A regra é: documentação que não é lida não serve a ninguém — serve apenas para criar a ilusão de organização.

---

## Relatório Final

### Resumo Executivo

`FOUNDATION_INDEX.md` criado como a porta de entrada oficial do ParaguAI. Organiza 25 documentos em uma hierarquia clara, fornece fluxos de trabalho para humanos e IAs, e elimina o problema de "por onde começo?" para qualquer pessoa nova no projeto.

### Mapa do Conhecimento

25 documentos organizados em 7 camadas:
- Foundation: 8 documentos LOCKED
- Governança: 2 documentos semi-permanentes
- Arquitetura: 3 documentos vivos
- Contratos e Convenções: 4 documentos vivos
- Referência: 2 documentos vivos
- Estado e Direção: 5 documentos vivos
- Este índice: 1 documento vivo

### Hierarquia

AI_CONSTITUTION → NORTH_STAR → BUSINESS_MODEL → VISION_2035 → ENGINEERING_PRINCIPLES → PRODUCT_PRINCIPLES → DECISION_FILTER → RELEASE_STRATEGY → DECISIONS → ARCHITECTURE → DOMAIN_MODEL → API_CONTRACTS → CONVENTIONS → GLOSSARY → COMPONENT_INDEX → FEATURES → PROJECT_STATUS → CHANGELOG → TECH_DEBT → NEXT_STEPS → MASTER_ROADMAP

### Fluxo de leitura

Foundation Index → AI_CONSTITUTION → NORTH_STAR → ARCHITECTURE → DOMAIN_MODEL → CONVENTIONS → GLOSSARY → PROJECT_STATUS (leitura completa de onboarding: ~2 horas)

### Categorias

Foundation (LOCKED, 8), Governança (2), Arquitetura (3), Contratos (4), Referência (2), Operação (5), Índice (1)

### Documentos permanentes

8 documentos da Foundation — AI_CONSTITUTION v1.2, NORTH_STAR v1.1, BUSINESS_MODEL v1.0, VISION_2035 v1.0, ENGINEERING_PRINCIPLES v1.0, PRODUCT_PRINCIPLES v1.0, DECISION_FILTER v1.0, RELEASE_STRATEGY v1.0.

### Documentos vivos

17 documentos operacionais — ARCHITECTURE, DOMAIN_MODEL, DEPENDENCY_GRAPH, ACQUISITION, CONNECTOR_GUIDE, API_CONTRACTS, CONVENTIONS, GLOSSARY, AGENTS, COMPONENT_INDEX, FEATURES, PROJECT_STATUS, CHANGELOG, TECH_DEBT, NEXT_STEPS, MASTER_ROADMAP, DECISIONS.

### Fluxo para IA

Foundation Index → classificar tarefa → abrir documentos necessários → verificar Regras Permanentes → implementar → atualizar documentação → validar Quality Gates

### Checklist de onboarding

5 perfis documentados: desenvolvedor, IA, colaborador não-técnico, CTO/arquiteto — cada um com itens verificáveis.

### Quality Gate

- ✅ Qualquer pessoa encontra qualquer informação rapidamente via Seção V
- ✅ Sem duplicação de conceitos — cada conceito tem um documento-fonte
- ✅ Hierarquia clara em diagrama textual (Seção III)
- ✅ Serve igualmente para humanos (Seção VI) e IA (Seção VII)
- ✅ Reduz significativamente o onboarding — sequência de ~2 horas na Seção IV

---

## Declaração de Encerramento

**A fase Foundation + Platform Alignment está oficialmente encerrada.**

Entregues nesta fase:

| Documento | Status |
|---|---|
| `docs/foundation/AI_CONSTITUTION.md` v1.2 | LOCKED ✅ |
| `docs/foundation/NORTH_STAR.md` v1.1 | LOCKED ✅ |
| `docs/foundation/BUSINESS_MODEL.md` v1.0 | LOCKED ✅ |
| `docs/foundation/VISION_2035.md` v1.0 | LOCKED ✅ |
| `docs/foundation/ENGINEERING_PRINCIPLES.md` v1.0 | LOCKED ✅ |
| `docs/foundation/PRODUCT_PRINCIPLES.md` v1.0 | LOCKED ✅ |
| `docs/foundation/DECISION_FILTER.md` v1.0 | LOCKED ✅ |
| `docs/foundation/RELEASE_STRATEGY.md` v1.0 | LOCKED ✅ |
| `docs/architecture/ARCHITECTURE.md` | Alinhado ✅ |
| `docs/architecture/DOMAIN_MODEL.md` | Alinhado ✅ |
| `docs/architecture/COMPONENT_INDEX.md` | Alinhado ✅ |
| `docs/architecture/API_CONTRACTS.md` | Alinhado ✅ |
| `docs/engineering/CONVENTIONS.md` | Alinhado ✅ |
| `docs/engineering/GLOSSARY.md` v1.0 | Alinhado ✅ |
| `docs/foundation/FOUNDATION_INDEX.md` v1.0 | Criado ✅ |

O ParaguAI possui agora um Knowledge System completo: Foundation permanente, arquitetura documentada, convenções oficiais, terminologia padronizada e porta de entrada clara para qualquer pessoa ou agente que chegue ao projeto.

**Aguardando autorização para iniciar o Release 1.5 — Trust & Reputation.**
