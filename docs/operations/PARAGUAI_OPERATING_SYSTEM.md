# PARAGUAI OPERATING SYSTEM (POS)
# Constituição Operacional — Program E-1, Execution Era, Phase I

**Categoria**: `docs/operations/`
**Criado**: 2026-07-18
**Status**: ATIVO — documento vivo (não é Foundation, não é LOCKED; ver §0)
**ADR**: ADR-059 (`docs/operations/DECISIONS.md`)
**Autor do mandato**: CTO/CEO, ParaguAI Holding

---

## 0. Preâmbulo — o que este documento é e o que não é

A Engenharia v1 do ParaguAI foi formalmente encerrada em 2026-07-17 (Program ΩΩ, `docs/engineering/ENGINEERING_CONSTITUTION.md`, `VERSION.md`). A Arquitetura está congelada. A Estratégia de Marketplace, a Estratégia de Negócio e a Estratégia Corporativa estão definidas nos oito documentos da Foundation (`docs/foundation/`) e nas dezenas de ADRs acumulados em `docs/operations/DECISIONS.md`. Nenhuma delas é reaberta por este documento.

O que faltava não era mais estratégia. Era o Sistema Operacional capaz de executar a estratégia já definida, de forma repetível, por anos, à medida que o ParaguAI cresce de operação unipessoal assistida por IA para organização de dezenas ou centenas de pessoas.

Este documento é esse Sistema Operacional.

**O que o POS é:**
- A tradução de princípios permanentes (Foundation) em rotina executável — cadência, papéis, critérios de priorização, padrões de qualidade, playbooks.
- Subordinado à Foundation em toda a extensão. Nenhuma regra aqui contradiz `AI_CONSTITUTION.md`, `NORTH_STAR.md`, `BUSINESS_MODEL.md`, `VISION_2035.md`, `ENGINEERING_PRINCIPLES.md`, `PRODUCT_PRINCIPLES.md`, `DECISION_FILTER.md` ou `RELEASE_STRATEGY.md`. Onde este documento parece adicionar algo novo, é porque a Foundation define o princípio e o POS define a rotina que o executa — nunca o contrário.
- Um documento **vivo**, não **LOCKED**. Evolui por Release (Quality, tipicamente), não por revisão de Foundation. Mudanças são registradas neste próprio CHANGELOG interno (§15) e em `docs/operations/CHANGELOG.md`.

**O que o POS não é:**
- Não é uma nova Foundation. Não entra em `docs/foundation/` — essa categoria é LOCKED e sua expansão exige ADR própria de CTO (`CLAUDE.md`), não acionada aqui.
- Não substitui `DECISION_FILTER.md` nem `RELEASE_STRATEGY.md` — os invoca e organiza sua aplicação no dia a dia.
- Não cria uma nova hierarquia de decisão paralela. A hierarquia de `NORTH_STAR.md` §5 (Missão → North Star → Usuários → Dados → IA → Produto → Código → Tecnologia) permanece a autoridade final em qualquer conflito.
- Não é burocracia adicionada por si. Todo processo aqui existe porque sua ausência já causou custo real e documentado nesta história de projeto (ver referências a Programs/ADRs ao longo do texto).

**Regra de conflito**: em caso de contradição entre o POS e qualquer documento da Foundation ou qualquer ADR já aceito, a Foundation e o ADR prevalecem. A contradição é sinal de que o POS precisa de correção, não de que a exceção deve ser seguida silenciosamente.

---

## 1. Executive Summary

O ParaguAI opera hoje como uma organização enxuta: um CTO/fundador que acumula os papéis executivos, apoiado por agentes de IA (Claude Code) que executam Programs e Missions sob mandato explícito, seguindo uma Foundation de oito documentos permanentes e um histórico de mais de 55 ADRs. Esse modelo produziu resultado real — Architecture v1.0 certificada, Marketplace Memory validada em produção com zero erros de paridade em 141.434 leituras, Product Identity testado contra 5.642 produtos reais — mas o modelo de execução em si nunca foi documentado como sistema. Cada Program reconstruía, implicitamente, sua própria cadência, seus próprios critérios de priorização e sua própria definição de "pronto".

O POS fecha essa lacuna. Ele define:

1. **13 Princípios Operacionais** (§2) que governam toda decisão de execução, derivados diretamente do padrão já comprovado nesta história — evidência antes de opinião, medição antes de expansão, confiança antes de receita, entre outros.
2. **Um Sistema de Planejamento** de 10 níveis (§3), da Visão ao Aprendizado, com autoridade de alteração explícita por nível.
3. **Um Framework de Priorização único e oficial** (§4) — o North Star Score já definido em `NORTH_STAR.md` §6, formalmente comparado com ICE, RICE, WSJF, MoSCoW e Opportunity Scoring, com critérios de desempate que hoje não existiam.
4. **Um Fluxo de Execução** (§5) do nascimento de uma iniciativa ao arquivamento, reconciliando a nomenclatura observada na prática (Program → Mission) com a nomenclatura da Foundation (Release → Epic → Feature).
5. **Uma Cadência Oficial** (§6) — Daily, Weekly, Monthly, Quarterly, Yearly — desenhada para funcionar com um operador hoje e escalar sem redesenho quando a equipe crescer.
6. **Uma Matriz RACI completa** (§7) para 11 funções organizacionais, incluindo o mapeamento explícito de "quem hoje acumula qual papel".
7. **Um Sistema de Indicadores em 4 camadas** (§8) — Operacional, Tático, Estratégico, Executivo — com owner e frequência definidos, evitando o padrão já identificado nos Programs Λ→Ο de medir tarde demais.
8. **Um Processo de Gestão de Riscos** (§9) permanente, com registro formal — ausente até hoje; riscos foram identificados ad hoc dentro de ADRs individuais (ex.: ADR-054/ARCHITECTURE_STATUS.md), nunca como processo contínuo.
9. **Padrões de Documentação** (§10) que consolidam o que já é prática real (ADRs, PRDs implícitos em briefs de Mission, Runbooks inexistentes até hoje) em convenção explícita.
10. **Um Sistema de Qualidade** (§11) que estende os Quality Gates de `RELEASE_STRATEGY.md` §11 para domínios não cobertos hoje: Comercial, Marketplace, Operações.
11. **Um Sistema de Aprendizado** (§12) que formaliza a pergunta de 4 partes já usada implicitamente em todo fechamento de Program.
12. **Manual do CEO** (§13) e **Manual do Board** (§14) — os dois papéis que, à medida que o ParaguAI contrata, precisarão de definição explícita de que hoje só existe na cabeça do fundador.
13. **A Constituição consolidada** (§15) — o texto de referência único, versionado, que qualquer pessoa nova pode ler para entender como o ParaguAI opera.

**Quality Gate deste documento**: reduz burocracia (consolida processos dispersos em um lugar), aumenta velocidade (elimina redecisão de cadência a cada Program), facilita delegação (define RACI explícito pela primeira vez), preserva Architecture v1.0 e as três estratégias congeladas (não reabre nenhuma), e transforma estratégia em execução repetível (esse é o próprio propósito do documento).

---

## 2. Operating Principles

Treze princípios obrigatórios. Cada um tem definição, justificativa, exemplo prático extraído da história real do projeto, e comportamento esperado. Um princípio sem exemplo real não é princípio — é aspiração; por isso todo exemplo abaixo referencia um Program, ADR ou artefato existente.

### P1 — Evidência antes de opinião

**Definição**: nenhuma decisão de prioridade, arquitetura ou produto é tomada por intuição quando dado real está disponível ou pode ser obtido a baixo custo.

**Justificativa**: a sequência Λ→Μ→Ν→Ο existiu inteiramente porque a hipótese inicial ("o gargalo é o algoritmo de match") era plausível e errada — só a medição real (Λ-1) revelou que o gargalo era composição de catálogo, não engine.

**Exemplo prático**: `docs/architecture/DECISION_LOG.md` Decision #3 — "a composição de catálogo, não o algoritmo, é o gargalo" — só existe porque Λ-1 mediu antes de assumir.

**Comportamento esperado**: toda proposta de iniciativa cita um número, um log, uma simulação ou um replay contra dado real antes de pedir aprovação. "Acho que" nunca é suficiente para uma decisão Tipo 1 ou Tipo 2 conforme `NORTH_STAR.md` §12.

### P2 — North Star antes de vaidade

**Definição**: catálogo maior, mais lojas, mais domínios de código não são objetivos — são meios. O único objetivo é o vetor definido em `NORTH_STAR.md` §2.

**Justificativa**: Fase 2 Sprint 2.2 aumentou o catálogo em 45% e a cobertura canônica de 46% para 94% — e o CPC (Comparable Product Coverage, a métrica que realmente move a missão) ficou em 4, inalterado. Volume sem o dado certo é vaidade.

**Exemplo prático**: `phase2_sprint22_marketplace_expansion` (memória) provou que o gargalo real era revisão de merge, não volume — uma lição só visível porque a métrica-alvo (CPC) foi checada, não o volume do catálogo.

**Comportamento esperado**: toda Release relata seu efeito sobre pelo menos uma métrica do vetor North Star, não apenas sobre contagens brutas (produtos, lojas, linhas de código).

### P3 — Usuário antes de feature

**Definição**: nenhuma funcionalidade entra em desenvolvimento sem um usuário nomeado, em um contexto nomeado, com uma frequência nomeada (`NORTH_STAR.md` §7, `DECISION_FILTER.md` filtro crítico 2).

**Justificativa**: a Constituição já proíbe "alguém vai querer isso" como justificativa. O POS não relaxa essa regra — a reforça no nível de execução diária.

**Exemplo prático**: Program Π (Mission Π-1) — Buyer Intelligence Surface — só avançou depois de mapear que inteligência já existia (Merchant Score, Compare Foundation, Trust Badges) mas nunca fora exposta ao comprador; o problema tinha usuário nomeado antes de qualquer linha de código.

**Comportamento esperado**: todo brief de Mission ou Epic começa com a frase "o usuário X, no contexto Y, hoje faz Z; depois desta entrega, fará W".

### P4 — Simplicidade antes de complexidade

**Definição**: a solução mais simples que resolve o problema real é a correta até o problema crescer de tamanho (`NORTH_STAR.md` §7, `ENGINEERING_PRINCIPLES.md`).

**Justificativa**: Program Κ-5 chegou a apagar `ATTRIBUTE_DICTIONARY.md` por concluir precipitadamente "zero consumidores" — e reverteu ao encontrar o consumidor real em `scripts/`. A lição não é "nunca simplificar" — é "verificar duas vezes antes de remover, simplificar depois de confirmar".

**Exemplo prático**: Program Φ-1 recomendou não abrir nenhuma iniciativa nova de marketplace até o Product Signature (já construído) ser conectado — a opção simples (conectar o que já existe) prevaleceu sobre construir algo novo.

**Comportamento esperado**: antes de propor uma solução nova, checar se uma capacidade já construída e não conectada resolve o problema (padrão Program Κ-4).

### P5 — Execução antes de planejamento (mas planejamento mínimo é obrigatório)

**Definição**: o planejamento existe para pensar o que pode dar errado (`RELEASE_STRATEGY.md` §7) — não para produzir documentos de intenção sem implementação. Um plano que nunca vira código é uma forma cara de procrastinação.

**Justificativa**: o padrão observado nesta história — Program Ξ-3 (Incremental Architecture Constitution) documentou regras para Marketplace Memory antes de qualquer implementação, e a implementação (Program Ω) seguiu essas regras sem desvio — mostra que planejamento mínimo bem-feito acelera a execução, não a atrasa.

**Exemplo prático**: `docs/architecture/INCREMENTAL_ARCHITECTURE_CONSTITUTION.md` — 156 linhas de regras que orientaram 4 Missions de implementação real sem retrabalho arquitetural.

**Comportamento esperado**: todo planejamento cabe no mínimo definido em `RELEASE_STRATEGY.md` §7 (problema, objetivo, escopo, critério de sucesso, dependências, riscos) — nunca mais que isso sem justificativa explícita, nunca menos.

### P6 — Automação antes de operação manual, com controle humano onde o contexto decide

**Definição**: automatizar quando o resultado pode ser determinado por dados e regras verificáveis; preservar decisão humana quando o resultado depende de contexto que só o humano tem (`NORTH_STAR.md` §9).

**Justificativa**: Product Identity nunca automerge — todo merge é sugestão (`merge_candidates`, status `pending`) até aprovação humana explícita (`docs/architecture/ENGINEERING_DECISIONS.md` Decisão 1). Essa é a decisão mais replicada de toda a história do projeto porque protege contra falso positivo em escala.

**Exemplo prático**: Merge Engine — 27 execuções reais, 1 rollback bem-sucedido — só é seguro em produção porque a aprovação é humana, não automática.

**Comportamento esperado**: qualquer proposta de automação que grava dado em produção sem revisão humana exige justificativa explícita de por que o contexto não importa nesse caso específico — o padrão default é revisão humana antes de escrita irreversível.

### P7 — Medição antes de expansão

**Definição**: nenhuma expansão de escopo — mais merchants, mais domínios, mais headcount, mais gasto — é aprovada sem que a expansão anterior tenha sido medida.

**Justificativa**: Sprint 2.6 (Attribute Backfill) trouxe o primeiro ganho real de CPC (4→6) só depois de cinco Sprints (2.2 a 2.5) que expandiram catálogo, taxonomia e especificações sem mover a métrica — cada expansão precedente foi medida antes da próxima ser aprovada, o que permitiu diagnosticar exatamente onde estava o gargalo real (Sprint 2.7, simulação de 11,28M pares).

**Exemplo prático**: Release 1.8 Program D Wave 1 só foi declarada como "primeiros merchants reais desde Shopping China" depois que a Foundation phase foi formalmente fechada pelo CTO — expansão apenas depois de fundação medida e validada.

**Comportamento esperado**: todo pedido de expansão de escopo cita a métrica da expansão anterior comparável antes de ser aprovado.

### P8 — Compounding antes de conclusão pontual

**Definição**: toda iniciativa deve deixar algo reutilizável para a próxima (`RELEASE_STRATEGY.md` §8, `NORTH_STAR.md` §13).

**Justificativa**: o Acquisition Engine não foi construído para a Shopping China — foi construído para que o segundo conector custasse uma fração do primeiro. Esse é o padrão que distingue trabalho fundacional de trabalho descartável em todo o histórico do projeto.

**Exemplo prático**: Connector Platform V2/V3, Delta Engine — cada иteração reduziu o custo marginal do próximo merchant, mensurável em Wave 1 vs Wave 4/5.

**Comportamento esperado**: a "pergunta de compounding" (`NORTH_STAR.md` §13) é respondida explicitamente antes de aprovar o design de qualquer implementação Tipo 1 ou Nível 2/3.

### P9 — Confiança antes de receita

**Definição**: quando confiança e receita entram em conflito, confiança sempre prevalece, sem exceção (`NORTH_STAR.md` §9).

**Justificativa**: rankings pagos, resultados patrocinados substituindo relevância, e manipulação de Merchant Score por interesse comercial são anti-goals permanentes (`NORTH_STAR.md` §11) — porque confiança perdida em escala não tem caminho de recuperação equivalente a receita perdida.

**Exemplo prático**: o modelo de monetização por camadas de inteligência (Release 1.6) nunca alterou o ranking de ofertas por pagamento — monetiza acesso a inteligência adicional para o lojista, não posição no resultado do comprador.

**Comportamento esperado**: qualquer proposta comercial que module ranking, visibilidade de oferta ou resultado de busca por pagamento é rejeitada no Decision Filter, estágio 5, antes de chegar a qualquer outro estágio.

### P10 — Reversibilidade define o rigor, não o prazo

**Definição**: decisões Tipo 1 (irreversíveis ou caras de reverter) recebem análise profunda e ADR obrigatório; decisões Tipo 2 (reversíveis) recebem decisão rápida (`NORTH_STAR.md` §12).

**Justificativa**: a assimetria crítica identificada em `NORTH_STAR.md` §12 — tratar Tipo 2 como Tipo 1 é discussão longa sobre o que cabia em uma hora; tratar Tipo 1 como Tipo 2 é débito irrecuperável.

**Exemplo prático**: mudança de schema sempre segue o Database Migration System V2 com par de verificação e classe de rollback (`RELEASE_STRATEGY.md` §11); mudança de copy em componente nunca passa por esse mesmo processo.

**Comportamento esperado**: classificar Tipo 1/Tipo 2 é o primeiro passo de qualquer Mission, antes de qualquer estimativa de prazo.

### P11 — Documentação é infraestrutura, não burocracia

**Definição**: documentação desatualizada é pior que ausência de documentação — engana o leitor (`FOUNDATION_INDEX.md` §XII).

**Justificativa**: o Knowledge System existe hoje com 11 categorias, mais de 25 documentos vivos e mais de 55 ADRs precisamente porque cada sessão de IA reconstrói contexto lendo documentos — se estiverem errados, a sessão trabalha com premissas erradas.

**Exemplo prático**: Program Κ-5 corrigiu `ATTRIBUTE_DICTIONARY.md` de 10 para 13 entradas ao descobrir divergência real entre doc e código — a correção só foi possível porque o processo de auditoria comparou documento contra código, não documento contra memória.

**Comportamento esperado**: toda Release atualiza os documentos afetados como parte do Definition of Done (`RELEASE_STRATEGY.md` §10) — nunca como tarefa separada, opcional ou posterior.

### P12 — Um dono claro por decisão

**Definição**: toda decisão tem exatamente um Responsible e um Accountable nomeados — nunca "a equipe decide" sem nome (ver RACI, §7).

**Justificativa**: "consenso por exaustão" e "decisão pela ausência de questionamento" são anti-patterns nomeados em `DECISION_FILTER.md` §11 precisamente porque decisões sem dono se perdem — ninguém é responsável pelo resultado.

**Exemplo prático**: toda ADR neste projeto (ADR-001 a ADR-058) tem uma autoria e uma data — nunca é uma decisão anônima do "time".

**Comportamento esperado**: nenhuma Mission ou Epic é aberta sem um Accountable nomeado na RACI de §7.

### P13 — Aprendizado obrigatório encerra todo ciclo

**Definição**: toda iniciativa responde, ao ser encerrada, às quatro perguntas de `RELEASE_STRATEGY.md` §14: o que esperávamos, o que aconteceu, o que aprendemos, o que muda agora (ver Sistema de Aprendizado, §12).

**Justificativa**: sem essa disciplina, a mesma hipótese errada (ex.: "o gargalo é o algoritmo") teria sido testada repetidamente em vez de uma vez, documentada, e nunca mais revisitada sem evidência nova.

**Exemplo prático**: `docs/architecture/DECISION_LOG.md` — 8 decisões formais, cada uma com problema, alternativas descartadas, motivação e evidência — é a materialização direta deste princípio.

**Comportamento esperado**: nenhum Program é declarado "fechado" sem uma entrada equivalente a uma Decision Log, mesmo que o resultado tenha sido "não fazer" (ex.: ADR-056, Program Φ-1).

---

## 3. Planning System

### Hierarquia oficial

```
VISÃO                    VISION_2035.md — 6 estágios evolutivos, 10 anos
  ↓
ESTRATÉGIA               AI_CONSTITUTION + NORTH_STAR + BUSINESS_MODEL — congeladas
  ↓
OBJETIVOS                Fases do MASTER_ROADMAP / ROADMAP.md — trimestrais a anuais
  ↓
OKRs                     Metas mensuráveis por Objetivo, revisados Quarterly (§6)
  ↓
EPICS                    Program (nomenclatura em uso: Κ, Λ, Π, Σ, Φ, Ω, ΩΩ, E...)
  ↓
FEATURES                 Mission — unidade de entrega dentro de um Program
  ↓
SPRINTS                  Execução real de uma Mission (pode ser 1 sessão ou várias)
  ↓
DEPLOY                   Merge + Release conforme RELEASE_STRATEGY.md §2–§11
  ↓
MEDIÇÃO                  KPIs de §8, verificados contra o critério de sucesso da Mission
  ↓
APRENDIZADO              Sistema de Aprendizado §12 — alimenta de volta os OBJETIVOS
```

O ciclo é fechado: Aprendizado nunca é terminal — realimenta Objetivos e, com menos frequência, Estratégia (nunca diretamente — só via revisão formal de Foundation) e Visão (revisão anual, ver §6).

### Nomenclatura: Program/Mission ↔ Epic/Feature

A prática real do projeto usa "Program" (letra grega ou identificador como "E-1") para o que a Foundation chama de Epic, e "Mission" para o que a Foundation chama de Feature/unidade de Release. O POS formaliza essa correspondência em vez de forçar uma renomeação retroativa de mais de 20 Programs já documentados:

| Termo em uso | Termo da Foundation | Escopo |
|---|---|---|
| Program | Epic | Iniciativa coesa que resolve uma classe de problema; pode conter 1–5 Missions |
| Mission | Feature / Release | Unidade de entrega com Definition of Ready/Done própria |
| ADR | ADR | Decisão Tipo 1 dentro de uma Mission — sem mudança |

**Regra de nomenclatura de Program**: identificador único (letra grega não reutilizada, ou combinação letra+número como "E-1") verificado contra `docs/operations/DECISIONS.md` e `docs/architecture/ENGINEERING_TIMELINE.md` antes do início — colisão de nome já ocorreu duas vezes nesta história (Σ-1 e Ξ-2 mal atribuídos) e custou uma Mission inteira de renomeação cada vez. Este é agora um passo obrigatório do Estágio 1 do Fluxo de Execução (§5).

### Autoridade de alteração por nível

| Nível | Quem pode alterar | Processo |
|---|---|---|
| Visão | CEO, com registro em nova versão de `VISION_2035.md` | Revisão anual (§6) ou evento de mercado maior |
| Estratégia | CEO, com ADR de Foundation | Revisão anual; nunca silenciosa (`FOUNDATION_INDEX.md` §IX) |
| Objetivos | CEO/COO, na Quarterly Review | Trimestral; pode ser antecipado por risco crítico (§9) |
| OKRs | VP/Head da função dona do Objetivo, aprovado pelo CEO | Trimestral, revisão intermediária opcional na Monthly |
| Epics (Programs) | CTO/PMO Director autoriza abertura; qualquer VP pode propor | Ver Fluxo de Execução §5 |
| Features (Missions) | Owner do Epic autoriza; Accountable da RACI executa | Ver Fluxo de Execução §5 |
| Sprints | Accountable individual | Auto-gerido dentro do escopo aprovado da Mission |
| Deploy | Accountable + Quality Gate automático (§11) | Nenhum deploy sem Quality Gate verde |
| Medição | Owner do KPI (§8) | Contínua, revisada na cadência correspondente |
| Aprendizado | Accountable da Mission, registrado em Decision Log/CHANGELOG | Ao fechar cada Mission, sem exceção (P13) |

---

## 4. Prioritization Framework

### Comparação técnica

| Framework | Força | Fraqueza no contexto ParaguAI |
|---|---|---|
| **ICE** (Impact, Confidence, Ease) | Rápido, 3 variáveis, bom para triagem inicial | Não distingue valor que compõe (ativo/dado reutilizável) de valor que não compõe — o critério mais importante deste projeto (P8) fica invisível |
| **RICE** (Reach, Impact, Confidence, Effort) | Adiciona alcance — bom para produto de consumo massivo | "Reach" pressupõe base de usuários já grande; o ParaguAI ainda está compondo catálogo e confiança, então Reach de curto prazo penalizaria investimento fundacional (Platform, Data) que é hoje a maior alavanca real, exatamente o erro que Λ-1 corrigiu |
| **WSJF** (Weighted Shortest Job First, SAFe) | Rigoroso sobre custo de atraso — bom para múltiplos times competindo por uma fila única | Pressupõe múltiplos times e uma fila de portfólio compartilhada; o ParaguAI hoje é um operador com fila única e sem contenção real de capacidade entre times — overhead de cálculo sem retorno proporcional na escala atual |
| **MoSCoW** (Must/Should/Could/Won't) | Simples para negociação de escopo dentro de uma Release já aprovada | Não prioriza *entre* iniciativas concorrentes — só categoriza dentro de uma já decidida; útil como ferramenta complementar (ver uso abaixo), não como framework de topo |
| **Opportunity Scoring** (importância × (importância − satisfação)) | Bom para descobrir onde a lacuna entre expectativa e satisfação é maior | Exige pesquisa de satisfação de usuário recorrente e madura — o ParaguAI não tem hoje volume de usuário suficiente para essa pesquisa ser estatisticamente confiável |

### Decisão: o North Star Score é o framework oficial

O ParaguAI já opera, desde `NORTH_STAR.md` v1.1 (2026-06-27), com um framework de pontuação proprietário — o **North Star Score** (`NORTH_STAR.md` §6): 5 dimensões, peso somando 100 pontos (Impacto na North Star 30, Geração de Ativo 25, Efeito de Rede 20, Reutilização 15, Esforço Invertido 10).

**Por que não substituir por um framework de mercado**: o North Star Score já é, estruturalmente, um RICE modificado — troca "Reach" (não aplicável na fase atual, ver tabela acima) por "Geração de Ativo" e "Reutilização" (que capturam compounding, P8, o critério mais validado nesta história de projeto) e mantém "Esforço" como o único termo no denominador implícito. É tecnicamente superior ao RICE genérico *para este projeto especificamente* porque foi desenhado a partir da North Star Metric real (decisões melhores), não de uma métrica genérica de alcance.

**Decisão formal**: o North Star Score permanece o único framework de priorização de topo (Nível 2 e 3, `DECISION_FILTER.md` §6). Nenhum novo framework é introduzido. O POS formaliza dois complementos que faltavam:

1. **MoSCoW como ferramenta de negociação de escopo** *dentro* de uma Mission já aprovada pelo North Star Score — quando o escopo de uma Mission precisa ser cortado por tempo ou dependência, os itens internos são classificados Must/Should/Could/Won't, nunca repontuados pelo North Star Score (que se aplica à Mission como um todo, não a suas partes).
2. **Critérios de desempate**, ausentes em `NORTH_STAR.md` até hoje.

### Critérios de desempate

Quando duas iniciativas empatam em North Star Score (diferença ≤ 5 pontos), aplicar em ordem até haver resposta clara:

1. **Reversibilidade**: a iniciativa Tipo 2 (reversível) vai primeiro — aprende-se mais rápido, o custo de errar é menor (`NORTH_STAR.md` §12).
2. **Dependência**: a iniciativa que desbloqueia a outra vai primeiro (critério "Habilitadora", `DECISION_FILTER.md` §5).
3. **Evidência disponível**: a iniciativa com dado real já coletado (não uma nova coleta necessária) vai primeiro — custo marginal de decisão mais baixo (P1).
4. **Risco de esperar**: a iniciativa cuja janela se fecha mais rápido (ex.: janela comercial com um merchant específico) vai primeiro (`DECISION_FILTER.md` §5, "Risco de esperar").
5. **Decisão do Accountable nomeado**, documentada em uma linha — nunca "consenso", sempre um nome (P12).

---

## 5. Execution Workflow

```
[1] NASCIMENTO
    Qualquer pessoa (humana ou IA) observa um problema com evidência (P1).
    Formula em uma frase: quem, com que frequência, com que custo (RELEASE_STRATEGY.md §7).
    Verifica colisão de nome contra ENGINEERING_TIMELINE.md/DECISIONS.md antes de nomear o Program.
        │
        ▼
[2] APROVAÇÃO
    Passa pelo Decision Filter (DECISION_FILTER.md, 10 estágios).
    North Star Score calculado se concorre por capacidade com outra iniciativa (§4).
    Classificado Tipo 1/Tipo 2 (NORTH_STAR.md §12) e Nível 1/2/3 (DECISION_FILTER.md §6).
    Accountable nomeado (RACI, §7).
        │
        ▼
[3] BACKLOG
    Entra no backlog do Objetivo correspondente (§3).
    Prioridade = North Star Score; desempate = §4.
    Backlog é revisado na Weekly (§6) — nunca cresce sem revisão.
        │
        ▼
[4] VIRA EPIC (Program)
    PMO Director/CTO autoriza abertura formal.
    Definition of Ready (RELEASE_STRATEGY.md §9) cumprida.
    Nome final do Program registrado em ENGINEERING_TIMELINE.md antes do primeiro commit.
        │
        ▼
[5] VIRA SPRINT (Mission)
    Escopo de uma Mission = o mínimo que produz uma "evolução mensurável" isolada
    (RELEASE_STRATEGY.md §3). Uma Mission grande demais é dividida; nunca inflada.
        │
        ▼
[6] É VALIDADA
    Quality Gates de §11 — universais + específicos por domínio.
    Critério de sucesso definido no nascimento (passo 1) é verificado, não assumido.
        │
        ▼
[7] É ENCERRADA
    Definition of Done (RELEASE_STRATEGY.md §10) cumprida integralmente.
    Sistema de Aprendizado (§12) respondido — as 4 perguntas, sem exceção (P13).
    Commit/push/tag só acontecem com autorização explícita do Accountable
    (padrão já em uso desde ADR-057/058 — formalizado aqui, não inventado).
        │
        ▼
[8] É ARQUIVADA
    Documentos de origem movidos/atualizados; nunca apagados (P11, FOUNDATION_INDEX.md §XI).
    Entrada final em CHANGELOG.md e, se Tipo 1, em DECISIONS.md.
    Se o Program gerou débito ou decisão de não fazer, registrado em TECH_DEBT.md ou
    Decision Log — "não fazer" é uma saída válida e documentada (P1, ADR-056 é o precedente).
```

**Regra dura**: nenhum passo é pulado para economizar tempo. O custo histórico de pular o passo 1 (nascimento com evidência) foi a sequência inteira Λ→Ο — meses de trabalho corrigindo uma hipótese que uma medição inicial teria evitado.

---

## 6. Operating Cadence

A cadência abaixo é desenhada para o estado real de hoje — um operador (CTO/CEO) com agentes de IA executando Missions — e não exige redesenho quando a equipe cresce; ela só ganha mais participantes por célula.

### Daily

| | |
|---|---|
| **Objetivo** | Verificar se alguma Mission em execução está bloqueada ou desviou do escopo aprovado |
| **Participantes** | Accountable de cada Mission ativa; hoje, o CTO sozinho revisando o estado de cada Program em andamento |
| **Duração** | 10–15 minutos, ou o tempo de revisar o TaskList/estado de cada Mission ativa |
| **Entregáveis** | Nenhum documento novo — só decisão de continuar, escalar bloqueio, ou pausar |
| **Critério de sucesso** | Nenhuma Mission fica bloqueada por mais de 1 dia sem uma decisão explícita registrada |

### Weekly

| | |
|---|---|
| **Objetivo** | Revisar o backlog (§5, passo 3), reordenar por North Star Score, fechar Missions da semana |
| **Participantes** | Accountables ativos + Owner de cada Objetivo em curso |
| **Duração** | 30–45 minutos |
| **Entregáveis** | Backlog reordenado; NEXT_STEPS.md atualizado se algo mudou de direção |
| **Critério de sucesso** | Todo item do backlog tem prioridade e Accountable — nada "flutuando" sem dono |

### Monthly

| | |
|---|---|
| **Objetivo** | Revisar KPIs Táticos (§8), progresso de OKRs, riscos abertos (§9) |
| **Participantes** | CEO/CTO + VPs relevantes (hoje: os papéis acumulados descritos em §7) |
| **Duração** | 60–90 minutos |
| **Entregáveis** | PROJECT_STATUS.md atualizado; registro de risco revisado (§9); ajuste de OKR se necessário |
| **Critério de sucesso** | Todo OKR trimestral tem uma leitura honesta de "no caminho / em risco / fora do caminho" com evidência, não opinião (P1) |

### Quarterly

| | |
|---|---|
| **Objetivo** | Definir/revisar Objetivos e OKRs do próximo trimestre; revisão profunda de KPIs Estratégicos |
| **Participantes** | CEO, Board (quando existir, ver §14), VPs |
| **Duração** | Meio dia |
| **Entregáveis** | OKRs do próximo trimestre; MASTER_ROADMAP.md/ROADMAP.md atualizado; revisão de capacidade vs. backlog |
| **Critério de sucesso** | Todo Objetivo do trimestre anterior foi fechado com as 4 perguntas do Sistema de Aprendizado (§12) — nenhum Objetivo simplesmente "expira" sem revisão |

### Yearly

| | |
|---|---|
| **Objetivo** | Revisar Visão e Estratégia (`VISION_2035.md`, `BUSINESS_MODEL.md`) — os únicos níveis que podem, em circunstância genuína, ser revisados |
| **Participantes** | CEO, Board, VPs |
| **Duração** | Um dia, precedido de material distribuído com antecedência (ver Manual do Board, §14) |
| **Entregáveis** | Nova versão de Foundation, se justificada (nunca por rotina — `FOUNDATION_INDEX.md` §IX); plano de capacidade/headcount do ano |
| **Critério de sucesso** | A revisão produz uma decisão explícita "Foundation mantida" ou "Foundation revisada com registro de versão" — nunca um silêncio que deixa dúvida sobre qual versão vigora |

---

## 7. Governance Model — Matriz RACI

**Nota de estado real**: hoje, um único operador (CTO/CEO/fundador) acumula a maioria dos papéis executivos abaixo, com Missions executadas por agentes de IA sob mandato explícito. A matriz define o **modelo-alvo** — a distribuição de responsabilidade que passa a valer papel por papel à medida que cada posição é efetivamente contratada, sem exigir redesenho da matriz em si.

R = Responsible (executa) · A = Accountable (dono final, aprova) · C = Consulted (opinião obrigatória antes) · I = Informed (sabe depois)

| Função | CEO | COO | VP Product | VP Marketplace | VP Growth | VP Comercial | VP Finance | VP Legal | VP Data&AI | VP CS/Merchant Success | Ops/PMO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Produto** | I | C | **A/R** | C | C | I | I | I | C | C | I |
| **Marketplace** (catálogo, conectores, merge) | I | C | C | **A/R** | I | C | I | I | C | I | C |
| **Growth** (aquisição, retenção, funil) | C | C | C | I | **A/R** | C | I | I | C | I | I |
| **Marketing** | I | I | C | I | **A/R** | C | I | C | I | I | I |
| **Comercial** (parcerias, merchants pagantes) | C | I | I | C | I | **A/R** | C | C | I | C | I |
| **Financeiro** | **A** | C | I | I | I | C | **R** | C | I | I | I |
| **Jurídico** | C | I | I | I | I | C | C | **A/R** | I | I | I |
| **IA** (Product Identity, Brain, scoring) | I | I | C | C | I | I | I | I | **A/R** | I | C |
| **Dados** (qualidade, pipelines, governança) | I | C | C | C | C | I | I | I | **A/R** | I | C |
| **Operações** (deploy, observabilidade, incidentes) | I | **A** | I | C | I | I | I | I | C | I | **R** |
| **Suporte** (merchant/buyer support) | I | C | I | I | I | C | I | I | I | **A/R** | I |

**Regra de leitura**: cada linha tem exatamente um "A" (P12 — um dono claro por decisão). Onde o "A" e o "R" coincidem hoje na mesma pessoa (o operador único), a coluna correspondente já é a atribuição correta — a matriz não exige uma segunda pessoa artificial.

**Como a matriz evolui**: ao contratar cada posição, o "R" que hoje é executado por agente de IA sob supervisão do "A" passa a ser executado pela pessoa contratada, sob a mesma linha de Accountable — sem redesenho da matriz, só preenchimento.

---

## 8. KPI Framework

Quatro camadas, cada uma com owner e frequência de acompanhamento definidos. A regra que evita o erro repetido em Λ→Ο (medir tarde): todo KPI Operacional é medido continuamente, não descoberto retroativamente.

### Operacionais (acompanhados Daily/Weekly, owner = Accountable da Mission)

| KPI | Definição | Fonte |
|---|---|---|
| Quality Gate pass rate | % de Missions que passam lint/typecheck/testes/build na primeira tentativa | CI local, por Mission |
| Missions bloqueadas > 1 dia | Contagem | Daily (§6) |
| Merge candidates pendentes por status | Alta/Média/Manual, intra vs. cross-merchant | `merge-audit-report.ts` (padrão já certificado) |
| Parity errors (Marketplace Memory) | Contagem de divergências read-through vs. cálculo fresco | Logs de produção |

### Táticos (Monthly, owner = VP da função)

| KPI | Definição | Owner |
|---|---|---|
| Comparable Product Coverage (CPC) | % de produtos canônicos com 2+ lojas comparáveis | VP Marketplace |
| Cobertura de Universal Taxonomy | % de slugs reais mapeados na árvore | VP Data&AI |
| Merchant Score médio, por tier | Distribuição de qualidade de catálogo por loja | VP Marketplace |
| Débito técnico aberto | Itens em `TECH_DEBT.md`, por severidade | VP Product |
| NPS/satisfação de merchant | Pesquisa periódica (quando volume permitir Opportunity Scoring, §4) | VP CS |

### Estratégicos (Quarterly, owner = CEO/COO)

| KPI | Definição |
|---|---|
| North Star vetor (`NORTH_STAR.md` §2) | Buscas com resultado relevante, compras assistidas, alertas com ação, lojistas que ajustaram catálogo por dado |
| Cobertura de merchants Tier 1 | Certificados vs. total mapeado (`docs/marketplace/Tier1_Merchants.md`) |
| Receita por camada de inteligência | Distribuição por camada, tendência trimestral |
| Retenção de merchant | Churn trimestral |

### Executivos (Quarterly/Yearly, owner = CEO/Board)

| KPI | Definição |
|---|---|
| Runway / caixa | Meses de operação restantes ao ritmo de queima atual |
| GMV influenciado | Valor de transação onde o ParaguAI foi parte mensurável da decisão |
| Crescimento de rede (efeito de rede) | Lojas × compradores ativos, tendência de densidade |
| Estado da Foundation | Versão vigente de cada documento LOCKED; data da última revisão anual (§6) |

---

## 9. Risk Management System

Processo permanente, ausente até hoje como processo — riscos foram nomeados dentro de ADRs individuais (ex.: 5 riscos revalidados em `ARCHITECTURE_STATUS.md`), nunca com ciclo de vida próprio. O POS formaliza o ciclo:

```
IDENTIFICAR → CLASSIFICAR → MITIGAR → MONITORAR → ESCALAR → ENCERRAR
```

**Identificar**: qualquer pessoa (humana ou IA) que encontrar um risco durante uma Mission o registra imediatamente — não espera o fechamento da Mission. Um risco identificado e não registrado é dívida oculta.

**Classificar**: matriz Probabilidade × Impacto, 3×3 (Baixa/Média/Alta):

| | Impacto Baixo | Impacto Médio | Impacto Alto |
|---|---|---|---|
| **Prob. Alta** | Monitorar | Mitigar | Escalar imediatamente |
| **Prob. Média** | Aceitar | Monitorar | Mitigar |
| **Prob. Baixa** | Aceitar | Aceitar | Monitorar |

**Mitigar**: todo risco em célula "Mitigar" ou "Escalar" recebe um plano com Accountable nomeado (RACI, §7) e prazo de reavaliação.

**Monitorar**: revisado na Monthly (§6); riscos "Escalar" são revisados na Weekly até serem rebaixados ou fecharem.

**Escalar**: risco de Impacto Alto vai direto ao CEO/Board fora da cadência regular — não espera a próxima Monthly/Quarterly.

**Encerrar**: um risco só é encerrado com evidência de que a condição que o gerou não existe mais (P1) — nunca por decurso de prazo sem verificação.

**Registro**: riscos vivem em uma seção própria de `PROJECT_STATUS.md` (nova subseção "Riscos Ativos", adicionada por este documento) até que o volume justifique um `RISK_REGISTER.md` dedicado em `docs/operations/` — decisão a ser tomada quando houver mais de ~10 riscos simultaneamente ativos (aplicando P4, simplicidade antes de complexidade).

---

## 10. Documentation Standards

O ParaguAI já opera um Knowledge System de 11 categorias (`CLAUDE.md`) e um sistema de ADR numerado sequencial (`docs/operations/DECISIONS.md`, ADR-001 a ADR-058+). O POS não substitui isso — define os tipos de documento que faltavam nomear formalmente.

| Tipo | Quando usar | Onde vive | Convenção |
|---|---|---|---|
| **ADR** | Toda decisão Tipo 1 / Nível 3 | `docs/operations/DECISIONS.md`, entrada numerada | Nunca editado retroativamente; já em uso, sem mudança |
| **RFC** | Proposta de mudança arquitetural aberta a discussão antes de virar ADR | `docs/architecture/`, arquivo próprio, referenciado pela ADR que a resolve | Novo — usar quando a decisão é grande o suficiente para merecer rascunho revisável antes do ADR final (ex.: `INCREMENTAL_ARCHITECTURE_CONSTITUTION.md` já seguiu esse padrão informalmente) |
| **PRD** | Definição de uma Feature/Mission com impacto de usuário | Seção do brief da Mission; se recorrente, `docs/product/` | O "problema real" de `DECISION_FILTER.md` Estágio 1 é o núcleo mínimo de um PRD — não exige um documento novo abaixo desse nível |
| **Runbook** | Procedimento operacional repetível (deploy, rollback, incident response) | `docs/engineering/` | Ausente hoje — primeira lacuna real que o POS nomeia sem preencher; criar sob demanda no primeiro incidente real (P4) |
| **Postmortem** | Após qualquer incidente de produção ou rollback | `docs/operations/`, um arquivo por incidente, nunca editado depois de fechado | Segue o mesmo formato do Sistema de Aprendizado (§12) |
| **Retrospective** | Fechamento de Program/Epic | Decision Log do Program + entrada de CHANGELOG | Já em uso (ex.: `docs/architecture/DECISION_LOG.md`) — formalizado, não recriado |
| **Playbook** | Procedimento repetível não-técnico (onboarding de merchant, resposta a risco) | `docs/business/` ou `docs/operations/`, conforme domínio | Novo tipo — primeiro uso real esperado em CS/Comercial |
| **Policy** | Regra permanente de governança (ex.: este próprio POS, DESIGN_CONSTITUTION) | Categoria correspondente ao domínio | Já em uso informalmente (ex.: `docs/design/DESIGN_CONSTITUTION.md`) |
| **Template** | Estrutura reaproveitável (checklist de ADR, checklist de Decision Filter) | Seção do documento-fonte (`DECISION_FILTER.md` §10 já é um template) | Não duplicar — referenciar o original |

### Naming Convention

- Documentos: `MAIUSCULO_COM_UNDERSCORE.md`, já em uso consistente em todo `docs/`.
- Programs: letra grega não reutilizada, ou identificador alfanumérico único (`E-1`), verificado contra `ENGINEERING_TIMELINE.md` antes de nomear (regra já formalizada em §3).
- ADRs: numeração sequencial única, nunca reaproveitada mesmo se uma ADR for revertida por uma posterior.

### Versionamento

Documentos LOCKED (Foundation): `vMAJOR.MINOR`, mudança só por revisão explícita (`FOUNDATION_INDEX.md` §IX). Documentos vivos (incluindo este POS): sem número de versão formal — o histórico de mudança vive no CHANGELOG correspondente e em `git log`.

---

## 11. Quality System

Estende os Quality Gates de `RELEASE_STRATEGY.md` §11 (Build, Typecheck, Lint, Consistência Arquitetural, Consistência com Foundation, Sem Regressões — já obrigatórios e não alterados aqui) para os domínios que ainda não tinham critério mínimo explícito:

| Domínio | Critério mínimo de "concluído" |
|---|---|
| **Produto** | Usuário nomeado (P3); estado vazio, estado de erro e validação de borda implementados (`NORTH_STAR.md` §7) |
| **Código** | Gates universais de `RELEASE_STRATEGY.md` §11 — build, typecheck, lint, sem regressão |
| **Dados** | Origem documentada, ciclo de vida definido, responsável de qualidade nomeado (`RELEASE_STRATEGY.md` §11, Gate de Data) |
| **IA** | Contrato explícito de entrada/saída/comportamento de borda; qualidade de dado de input verificada antes de qualquer avaliação de modelo (`RELEASE_STRATEGY.md` §11, Gate de AI); nunca automerge sem aprovação humana (P6) |
| **Marketplace** | Merchant Score calculado sobre dado objetivo verificável, nunca sobre pagamento (P9); conector certificado segue `docs/engineering/CONNECTOR_GUIDE.md` |
| **Comercial** | Nenhuma proposta comercial altera ranking de busca por pagamento (P9, Decision Filter Estágio 5); todo acordo com merchant documentado em `docs/business/` |
| **Operações** | Todo comportamento crítico de infraestrutura é observável após a Release (`RELEASE_STRATEGY.md` §11, Gate de Infrastructure); todo incidente gera Postmortem (§10) |

Uma entrega que não atinge o critério mínimo do seu domínio não é "80% pronta" — não é uma entrega (`NORTH_STAR.md` §7, "Entrega incompleta").

---

## 12. Learning System

Toda iniciativa — Mission, Program, Sprint, ou decisão de não fazer — responde quatro perguntas ao ser encerrada, sem exceção (P13). Este é o mesmo formato de `RELEASE_STRATEGY.md` §14, elevado aqui a processo obrigatório de todo tipo de iniciativa, não só Release.

```
O QUE ESPERÁVAMOS?
   O critério de sucesso definido no nascimento (§5, passo 1) — não reescrito
   retroativamente para combinar com o resultado.

O QUE ACONTECEU?
   O resultado medido (§8) contra esse critério, com número real (P1) —
   nunca "correu bem" sem métrica.

O QUE APRENDEMOS?
   Sobre o problema (era o que pensávamos?), sobre a solução (funcionou como
   esperado?), sobre o processo (o Decision Filter/North Star Score capturou
   o que deveria?).

O QUE MUDA AGORA?
   Que Objetivo, OKR ou item de backlog é reordenado por causa deste
   aprendizado (retroalimenta §3 — Aprendizado → Objetivos).
```

**Onde registrar**: Decision Log do Program (padrão de `docs/architecture/DECISION_LOG.md`) para iniciativas Tipo 1; entrada de CHANGELOG para as demais. Uma iniciativa que resultou em "não fazer" é registrada com o mesmo rigor — ADR-056 (Program Φ-1) é o precedente: nenhuma linha de código, mas uma decisão plenamente documentada, com efeito real sobre a priorização seguinte (originou diretamente Program Κ-4).

---

## 13. Manual do CEO

### Dashboards diários

1. Estado de Missions ativas (Daily, §6) — bloqueios, prazo de decisão pendente.
2. KPIs Operacionais (§8) — Quality Gate pass rate, parity errors, merge candidates pendentes.
3. Riscos em célula "Escalar" (§9) — nunca esperar a Monthly para ver um risco crítico.

### Decisões que nunca devem ser delegadas

- Aprovação de qualquer mudança à Foundation (`FOUNDATION_INDEX.md` §IX) — mesmo com Board formado, a proposta de revisão nasce do CEO.
- Qualquer decisão que module ranking, relevância ou visibilidade de oferta por critério comercial (P9) — o ponto de falha de confiança mais caro possível.
- Autorização de push/tag/deploy de qualquer mudança de schema de banco em produção (`RELEASE_STRATEGY.md` §11, Gate de Data) — padrão já em uso desde ADR-057/058, formalizado aqui como não-delegável.
- Aprovação de nova categoria no Knowledge System (`CLAUDE.md`) — exige ADR própria do CTO/CEO.
- Decisão de "confiança versus receita" em qualquer conflito real (P9).

### Decisões que obrigatoriamente devem ser delegadas

- Execução de qualquer Mission já aprovada e classificada Tipo 2/Nível 1 (`DECISION_FILTER.md` §6) — reter essas decisões no CEO é o anti-pattern "tratar Tipo 2 como Tipo 1" (`NORTH_STAR.md` §12).
- Ajuste de copy, layout e UX dentro de componentes não congelados (fora do escopo de `docs/design/DESIGN_CONSTITUTION.md`).
- Triagem inicial de risco Baixo/Médio (§9) — só risco Alto escala ao CEO diretamente.
- Resposta operacional a incidente já coberto por Runbook (§10, quando existir).

### Como revisar OKRs

Na Quarterly (§6): cada OKR lido com evidência de KPI Tático/Estratégico correspondente (§8) — nunca por relato subjetivo do Accountable. Três estados possíveis: "no caminho" (evidência positiva e crescente), "em risco" (evidência estagnada, como o CPC em Λ→Μ), "fora do caminho" (evidência negativa ou ausente). Qualquer OKR "fora do caminho" dois trimestres seguidos é ou redefinido ou descontinuado — nunca mantido por inércia.

### Como revisar riscos

Na Monthly (§6): toda célula "Mitigar" e "Escalar" da matriz (§9) revisada individualmente. Pergunta obrigatória por risco: "a condição que gerou este risco ainda existe?" — se não, encerrar com evidência (P1); se sim, o plano de mitigação está no prazo?

### Como revisar caixa

Runway (§8, KPI Executivo) revisado Monthly no mínimo; Weekly se runway < 12 meses. Toda decisão de gasto novo verificada contra P7 (medição antes de expansão) — nenhum aumento de gasto recorrente sem medição do gasto anterior comparável.

### Como revisar crescimento

North Star vetor (§8) revisado Quarterly como leitura primária — nunca substituído por vaidade (P2: catálogo, headcount ou lojas cadastradas isoladamente). GMV influenciado e crescimento de rede lidos como consequência do vetor North Star, nunca como substituto dele.

---

## 14. Manual do Board

Aplicável a partir do momento em que um Board formal existir; a estrutura abaixo é definida agora para que sua ativação não exija desenho novo, apenas convite.

### Agenda mensal

Board informativo (não deliberativo, salvo urgência): KPIs Estratégicos e Executivos (§8), riscos em "Escalar" (§9), estado de runway. Duração: 30–45 minutos, material enviado 48h antes.

### Agenda trimestral

Board deliberativo: revisão de OKRs do trimestre encerrado com as 4 perguntas do Sistema de Aprendizado (§12) por Objetivo, aprovação de OKRs do próximo trimestre, aprovação de qualquer investimento Tipo 1 (§ abaixo). Duração: meio dia.

### Agenda anual

Revisão de Visão e Estratégia (§6, cadência Yearly) — o único fórum com autoridade de propor revisão de Foundation ao CEO (a decisão final permanece não-delegável do CEO, §13). Revisão de headcount e plano de capacidade do ano. Duração: um dia.

### Materiais obrigatórios (toda reunião deliberativa)

- KPIs das 4 camadas (§8), com tendência trimestral, não só o valor do período.
- Registro de riscos ativos (§9), com histórico de mudança de célula.
- Estado da Foundation (última revisão, versão vigente de cada documento).
- Lista de ADRs Tipo 1 tomadas no período, com resumo de uma linha cada.

### Indicadores mínimos

North Star vetor, CPC (ou seu equivalente vigente na fase do produto), runway, receita por camada, churn de merchant — os cinco KPIs Estratégicos/Executivos de §8 são o piso, nunca substituídos por métricas de vaidade (P2).

### Como aprovar investimentos

Todo investimento é classificado Tipo 1 (irreversível/caro de reverter — ex.: contratação sênior, compromisso comercial multi-ano, mudança de stack) ou Tipo 2 (reversível — ex.: teste de canal de marketing com orçamento limitado e prazo definido). Tipo 1 exige aprovação do Board na Quarterly ou em sessão extraordinária; Tipo 2 é decisão do CEO, informada ao Board na Monthly seguinte (P10 aplicado a decisões financeiras).

### Como cancelar iniciativas

Uma iniciativa é cancelada quando o Sistema de Aprendizado (§12) aplicado a ela mostra "fora do caminho" sem plano de correção viável, ou quando P7 (medição antes de expansão) revela que uma expansão comparável não gerou o retorno esperado. Cancelamento é documentado com o mesmo rigor de uma aprovação (P1) — nunca um silêncio.

### Como revisar estratégia

Só na agenda anual (§6), nunca por pressão de resultado trimestral isolado — um trimestre "fora do caminho" é matéria de OKR (revisão do CEO, trimestral), não de Estratégia (revisão do Board, anual), a menos que o padrão se repita por 3+ trimestres seguidos, o que então é elevado à pauta anual como item extraordinário.

---

## 15. ParaguAI Operating System Constitution — Declaração Final

### O que este documento estabelece, de forma permanente até revisão explícita

1. Treze Princípios Operacionais (§2), todos derivados de evidência real desta história de projeto, não de teoria genérica de gestão.
2. Uma hierarquia de planejamento de 10 níveis (§3) com autoridade de alteração nomeada por nível.
3. O North Star Score como único framework de priorização de topo, formalmente comparado e escolhido sobre ICE/RICE/WSJF/MoSCoW/Opportunity Scoring (§4), com critérios de desempate que antes não existiam.
4. Um Fluxo de Execução de 8 passos (§5) que reconcilia a nomenclatura Program/Mission em uso com Epic/Feature da Foundation.
5. Cinco cerimônias de cadência (§6), desenhadas para funcionar com um operador hoje e escalar sem redesenho.
6. Uma Matriz RACI completa (§7) para 11 funções — o primeiro mapeamento explícito de responsabilidade que o projeto possui.
7. Um Sistema de KPIs em 4 camadas (§8) que evita medir tarde — a causa raiz de meses de trabalho na sequência Λ→Ο.
8. Um processo de Gestão de Riscos com ciclo de vida completo (§9) — inexistente como processo formal até este documento.
9. Padrões de Documentação (§10) que nomeiam os tipos que faltavam (RFC, Runbook, Playbook) sem descartar o que já funciona (ADR, Decision Log).
10. Um Sistema de Qualidade estendido (§11) que cobre Produto, Marketplace, Comercial e Operações além dos Gates técnicos já existentes.
11. Um Sistema de Aprendizado universal (§12) — as 4 perguntas aplicadas a toda iniciativa, não só a Releases.
12. Manuais do CEO (§13) e do Board (§14) — a primeira definição explícita de decisões delegáveis vs. não-delegáveis do projeto.

### Quality Gate — auto-verificação

- ✅ **Reduz burocracia**: consolida em um documento processos que antes eram redescobertos a cada Program (cadência, critério de priorização, definição de "pronto").
- ✅ **Aumenta velocidade**: o Decision Filter e o North Star Score já existiam — o POS remove a necessidade de redecidir *como* decidir a cada iniciativa nova.
- ✅ **Facilita delegação**: a RACI (§7) e os Manuais de CEO/Board (§13, §14) são o primeiro artefato deste projeto que nomeia responsabilidade além do operador único.
- ✅ **Preserva Architecture v1.0**: nenhuma seção deste documento reabre decisão de arquitetura; §0 declara isso explicitamente e nenhuma parte contradiz `ENGINEERING_CONSTITUTION.md`.
- ✅ **Preserva a Marketplace Strategy e a Business Strategy**: nenhuma seção altera `BUSINESS_MODEL.md`, o roadmap de negócio em `ROADMAP.md`, ou qualquer ADR de marketplace/comercial já aceito.
- ✅ **Transforma estratégia em execução repetível**: esse é o propósito declarado do documento em §0 e §1 — cumprido pelas 15 partes.

### Como este documento evolui

Documento vivo (§0) — Release tipo **Quality** ou **Platform** conforme `RELEASE_STRATEGY.md` §5. Mudanças relevantes são registradas em `docs/operations/CHANGELOG.md`, nunca silenciosamente. Se uma seção deste documento entrar em conflito real com uma decisão futura de Foundation, a Foundation prevalece (§0) e esta seção é corrigida na Release seguinte — o conflito em si é sinal de que o POS precisa de atualização, não de que a exceção deve ser seguida.

### Encerramento

O ParaguAI possui, a partir deste documento, um Sistema Operacional completo: princípios de execução, hierarquia de planejamento, framework único de priorização, fluxo de execução ponta a ponta, cadência oficial, governança RACI, indicadores em camadas, gestão de riscos, padrões de documentação, sistema de qualidade estendido, sistema de aprendizado universal, e manuais de CEO e Board — capaz de guiar o ParaguAI de operação unipessoal assistida por IA a organização de grande porte sem perder velocidade, foco, disciplina ou qualidade de execução.

**Aguardando autorização do CTO/CEO para ativação plena da cadência definida em §6.**
