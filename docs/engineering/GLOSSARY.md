# GLOSSARY.md — Glossário Oficial do ParaguAI

**Versão**: 1.0  
**Data**: 2026-06-28  
**Status**: CERTIFICADO — alinhado com Foundation v1.0

> Este é o documento de referência terminológica do projeto. Qualquer termo utilizado em documentação, código, ADRs, reuniões ou comunicações com IA deve usar a linguagem definida aqui. Nenhum documento pode definir um conceito de forma diferente deste glossário.

---

## I. Filosofia

### Por que um glossário existe

Linguagem imprecisa cria problemas reais. Quando um documento diz "loja" e outro diz "store" e um terceiro diz "vendor", ninguém sabe se estão falando da mesma coisa. Quando "score" pode significar o Merchant Score ou o Offer Ranking Score, o código reflete essa ambiguidade e os bugs aparecem.

O ParaguAI opera numa complexidade crescente — Foundation (8 documentos), plataforma (catálogo, comparação, Merchant OS, Acquisition Engine), equipe (humanos e IA). Esta complexidade exige que a linguagem seja um ativo, não uma fonte de fricção.

### Linguagem como ativo estratégico

A Foundation foi construída para durar décadas. Documentos criados hoje serão lidos em 2030 por pessoas e IAs que não participaram das conversas originais. Para esses leitores futuros, este glossário é o dicionário do projeto — o mapa que converte palavras em significado sem ambiguidade.

Uma IA nova que chega ao projeto lê a Foundation e começa a trabalhar. Se ela não sabe o que "Merchant" significa vs. "Lojista" vs. "Seller", vai fazer perguntas erradas ou assumir respostas erradas. Este glossário elimina esse custo.

### Dependência da IA na terminologia consistente

Cada sessão de trabalho com IA começa do zero. A IA lê os documentos disponíveis e reconstrói o contexto. Se um ADR usa "vendor", outro usa "merchant" e o código usa "store_owner", a IA precisará inferir que são a mesma coisa — e inferências erradas custam tempo e introduzem bugs.

Este glossário é, portanto, uma camada de infraestrutura cognitiva: reduz o custo de onboarding de IA e humanos, e garante que a plataforma fale com uma voz coerente.

---

## II. Estrutura do Glossário

Cada termo segue o formato abaixo:

```
### [Termo Oficial]

**Definição**: O que este conceito significa dentro do ParaguAI — não a definição genérica do dicionário.

**Documento Fonte**: Onde o conceito foi originalmente definido ou é a autoridade.

**Contexto de Uso**: Em qual camada ou contexto este termo aparece (código, documentação, comunicação).

**Termos Relacionados**: Outros termos deste glossário que se conectam a este.

**Sinônimos Aceitos**: Variações de linguagem aceitas (ex: português vs. inglês).

**Termos Não Recomendados**: Palavras que NÃO devem ser usadas no lugar deste termo.

**Status**:
- Stable — conceito definido, implementado e consolidado
- Planned — conceito definido mas não implementado ainda
- Experimental — em uso, mas sujeito a revisão
- Deprecated — não usar; substituído por outro termo
```

---

## III. Conceitos Estratégicos

Conceitos que definem a identidade, estratégia e filosofia permanente do ParaguAI.

---

### ParaguAI

**Definição**: Plataforma de inteligência operacional da Tríplice Fronteira — um marketplace de comparação de preços que evolui progressivamente para se tornar a infraestrutura de inteligência do comércio regional. O nome é o produto, a empresa e a missão: reduzir a assimetria de informação entre compradores e vendedores na região do Paraguai.

**Documento Fonte**: `docs/foundation/AI_CONSTITUTION.md` — Seção I (Identidade)

**Contexto de Uso**: Nome do produto, da plataforma e da marca. Usado em todas as camadas — código, documentação, comunicação, UI.

**Termos Relacionados**: Flywheel, Moat, North Star, Foundation, ParaguAI Brain

**Sinônimos Aceitos**: "fronteiraai-web" (nome do repositório, contexto técnico), "a plataforma" (em contexto claro)

**Termos Não Recomendados**: "o app", "o site", "o comparador" (redutores — não capturam a visão)

**Status**: Stable

---

### Assimetria de Informação

**Definição**: O problema central que o ParaguAI resolve: compradores não sabem onde o produto está mais barato, qual loja é confiável, se o preço mudou recentemente; lojistas não sabem como estão posicionados frente à concorrência. Esta assimetria é a razão de existência da plataforma.

**Documento Fonte**: `docs/foundation/AI_CONSTITUTION.md`, `docs/foundation/BUSINESS_MODEL.md`, `docs/foundation/DECISION_FILTER.md`

**Contexto de Uso**: Pergunta Fundamental do Decision Filter ("Esta iniciativa reduz a assimetria de informação?"). Critério de aceitação de qualquer funcionalidade.

**Termos Relacionados**: North Star, Decision Filter, Mandatory Question

**Status**: Stable

---

### Foundation

**Definição**: Conjunto permanente de 8 documentos que definem a identidade, filosofia e processos do ParaguAI. Cada documento tem responsabilidade única e insubstituível. Qualquer revisão exige nova versão e entrada no histórico — nunca alteração silenciosa.

| # | Documento | Responde |
|---|---|---|
| 0.1 | `AI_CONSTITUTION.md` v1.2 | Quem somos |
| 0.2 | `NORTH_STAR.md` v1.1 | Como decidimos |
| 0.3 | `BUSINESS_MODEL.md` v1.0 | Como criamos valor |
| 0.4 | `VISION_2035.md` v1.0 | Para onde vamos |
| 0.5 | `ENGINEERING_PRINCIPLES.md` v1.0 | Como construímos tecnologia |
| 0.6 | `PRODUCT_PRINCIPLES.md` v1.0 | Como construímos produtos |
| 0.7 | `DECISION_FILTER.md` v1.0 | Como aprovamos decisões |
| 0.8 | `RELEASE_STRATEGY.md` v1.0 | Como evoluímos |

**Documento Fonte**: `docs/foundation/AI_CONSTITUTION.md`, `docs/foundation/RELEASE_STRATEGY.md`

**Contexto de Uso**: Hierarquia de documentos. Lidos antes de qualquer tarefa, na ordem listada.

**Termos Relacionados**: AI Constitution, North Star, Decision Filter, Release Strategy

**Sinônimos Aceitos**: "Foundation Empresarial" (em contexto formal), "os 8 documentos permanentes"

**Termos Não Recomendados**: "documentação", "regras", "guia" (subestimam o papel permanente)

**Status**: Stable

---

### AI Constitution

**Definição**: Primeiro e mais importante documento da Foundation (`docs/foundation/AI_CONSTITUTION.md`). Define quem o ParaguAI é, sua missão, filosofia, ativos, efeito de rede, Moat e as 14 Regras Permanentes. Hierarquicamente superior a todos os outros documentos — em caso de conflito, a Constituição prevalece.

**Documento Fonte**: `docs/foundation/AI_CONSTITUTION.md`

**Contexto de Uso**: Lido antes de qualquer tarefa. Referenciado em todos os outros documentos da Foundation.

**Termos Relacionados**: Foundation, North Star, Regras Permanentes

**Sinônimos Aceitos**: "a Constituição", "AI_CONSTITUTION.md"

**Status**: Stable

---

### North Star

**Definição**: (1) A métrica única que orienta todas as decisões operacionais: "número de decisões melhores que o ParaguAI tornou possíveis". (2) O documento `docs/foundation/NORTH_STAR.md`, bússola operacional do projeto, que contém os 10 Filtros Permanentes, a Pergunta Obrigatória, a Hierarquia de Prioridades e os Tipos de Decisão.

**Documento Fonte**: `docs/foundation/NORTH_STAR.md`

**Contexto de Uso**: Avaliação de qualquer decisão de produto, arquitetura ou negócio. A pergunta "isso melhora o North Star?" é o primeiro filtro prático de qualquer ideia.

**Termos Relacionados**: Foundation, Decision Filter, Mandatory Question, Assimetria de Informação

**Sinônimos Aceitos**: "métrica Norte", "bússola operacional"

**Status**: Stable

---

### Mandatory Question

**Definição**: A pergunta obrigatória que deve ser respondida antes de qualquer implementação: "Esta implementação aproxima ou afasta o ParaguAI da sua missão?" Uma resposta honesta de "afasta" é motivo suficiente para não fazer.

**Documento Fonte**: `docs/foundation/NORTH_STAR.md` — Seção II

**Contexto de Uso**: Critério de aceitação de qualquer PR, funcionalidade, ADR ou Release. Parte do Checklist Final do North Star.

**Termos Relacionados**: North Star, Decision Filter, Assimetria de Informação

**Sinônimos Aceitos**: "Pergunta Obrigatória"

**Status**: Stable

---

### Decision Filter

**Definição**: Pipeline de 10 estágios para aprovação de qualquer decisão significativa — operacionaliza os princípios da Foundation em processo executável. Os 10 estágios: Problema Real → Valor Gerado → Alinhamento com Missão → Filtros North Star → Impacto no Business Model → Coerência com Vision → Engineering Principles → Product Principles → Custo/Reversibilidade → Decisão (aprovado/pausado/rejeitado).

**Documento Fonte**: `docs/foundation/DECISION_FILTER.md`

**Contexto de Uso**: Executado antes de qualquer Release, ADR, funcionalidade significativa ou mudança arquitetural. Obrigatório para decisões Nível 2 (produto) e Nível 3 (estratégico).

**Termos Relacionados**: Foundation, North Star, Tipo 1, Tipo 2, ADR

**Sinônimos Aceitos**: "o Filter", "Decision Pipeline"

**Termos Não Recomendados**: "checklist" (subestima o papel de pipeline sequencial)

**Status**: Stable

---

### Tipo 1 (Decisão)

**Definição**: Decisão irreversível ou cara de reverter — requer análise profunda, Decision Filter completo e ADR obrigatório. Exemplos: mudança de schema, adoção de dependência crítica, alteração de política de RLS em produção.

**Documento Fonte**: `docs/foundation/NORTH_STAR.md` — Seção XII (Tipos de Decisão)

**Contexto de Uso**: Classificação de decisões antes de executá-las. Critério prático: "qual é o custo real de voltar atrás?"

**Termos Relacionados**: Tipo 2, Decision Filter, ADR

**Status**: Stable

---

### Tipo 2 (Decisão)

**Definição**: Decisão facilmente reversível — decide rápido, itera. Exemplos: renomear um componente, alterar um texto de UI, reordenar itens de um menu. Não requer ADR, apenas senso comum e testes.

**Documento Fonte**: `docs/foundation/NORTH_STAR.md` — Seção XII (Tipos de Decisão)

**Contexto de Uso**: Classificação de decisões antes de executá-las. Libera velocidade para mudanças de baixo risco.

**Termos Relacionados**: Tipo 1, Decision Filter

**Status**: Stable

---

### Business Model

**Definição**: O modelo econômico permanente do ParaguAI — como a plataforma cria e captura valor ao reduzir a assimetria de informação na Tríplice Fronteira. Terceiro documento da Foundation. Inclui o Flywheel econômico, os 5 tipos de efeitos de rede, os 7 pilares de monetização, o Moat e os 8 Ativos Estratégicos.

**Documento Fonte**: `docs/foundation/BUSINESS_MODEL.md`

**Contexto de Uso**: Consultado antes de qualquer decisão de produto, precificação, monetização ou crescimento.

**Termos Relacionados**: Foundation, Flywheel, Moat, Ativos Estratégicos, Network Effect

**Status**: Stable

---

### Flywheel

**Definição**: Ciclo de auto-reforço econômico que é o motor central da estratégia de crescimento: **Mais lojas → Mais produtos → Mais compradores → Mais dados → IA mais precisa → Mais valor → Mais lojas**. Cada componente alimenta o próximo. Quebrar o ciclo em qualquer ponto desacelera tudo.

**Documento Fonte**: `docs/foundation/AI_CONSTITUTION.md` — Seção X, `docs/foundation/BUSINESS_MODEL.md` — Seção V

**Contexto de Uso**: Avaliação de estratégias de crescimento, priorização de funcionalidades que fortalecem o ciclo vs. que são lineares.

**Termos Relacionados**: Network Effect, Moat, Business Model, ParaguAI Brain

**Sinônimos Aceitos**: "Flywheel Econômico", "ciclo de auto-reforço"

**Status**: Stable

---

### Network Effect

**Definição**: Efeito pelo qual cada novo participante (loja, comprador, dado) aumenta o valor para todos os outros. No ParaguAI existem 5 tipos: rede de compradores, rede de lojistas, efeito de dados, efeito de aprendizado de IA e efeito de confiança (Merchant Score como sinal público).

**Documento Fonte**: `docs/foundation/BUSINESS_MODEL.md` — Seção VI, `docs/foundation/AI_CONSTITUTION.md` — Seção X

**Contexto de Uso**: Justificativa para decisões de crescimento de base. Por que adicionar mais lojas é prioritário; por que dados históricos não podem ser descartados.

**Termos Relacionados**: Flywheel, Moat, ParaguAI Brain

**Sinônimos Aceitos**: "Efeito de Rede"

**Status**: Stable

---

### Moat

**Definição**: As 5 camadas de vantagem competitiva sustentável do ParaguAI, construídas ao longo do tempo e cada vez mais difíceis de replicar: (1) dados históricos irreplicáveis, (2) efeito de rede de dois lados + dados, (3) inteligência contextual não-genérica, (4) confiança acumulada, (5) custo de troca do lojista.

**Documento Fonte**: `docs/foundation/AI_CONSTITUTION.md` — Seção XIV, `docs/foundation/BUSINESS_MODEL.md` — Seção IX

**Contexto de Uso**: Justificativa para decisões de longo prazo que parecem custosas no curto prazo mas constroem barreiras de entrada. Qualquer decisão que degrade uma dessas camadas exige aprovação explícita.

**Termos Relacionados**: Flywheel, Network Effect, Ativos Estratégicos, Trust

**Status**: Stable

---

### Ativos Estratégicos

**Definição**: Os 8 ativos que o ParaguAI acumula e que constituem o Moat: (1) Catálogo normalizado, (2) Histórico de preços, (3) Merchant Score, (4) Rede de conectores, (5) ParaguAI Brain, (6) SEO footprint, (7) Base de confiança, (8) API. Toda funcionalidade deve produzir dados reutilizáveis — uma feature que não gera conhecimento tem retorno zero de longo prazo.

**Documento Fonte**: `docs/foundation/AI_CONSTITUTION.md` — Seção VII, `docs/foundation/BUSINESS_MODEL.md` — Seção X

**Contexto de Uso**: Critério de avaliação de funcionalidades. Pergunta: "este trabalho fortalece ou enfraquece um ativo estratégico?"

**Termos Relacionados**: Moat, Flywheel, ParaguAI Brain, Compounding Release

**Sinônimos Aceitos**: "ativos estratégicos da plataforma"

**Status**: Stable

---

### ParaguAI Brain

**Definição**: Camada de inteligência central que conecta todos os ativos da plataforma — catálogo, histórico de preços, reputação de loja, comportamento de comprador — gerando inteligência contextual específica para a Tríplice Fronteira, não replicável por IAs genéricas. Em 2035, o Brain é o motor que alimenta recomendações, comparações automáticas, alertas e parceiros via API.

**Documento Fonte**: `docs/foundation/AI_CONSTITUTION.md` — Seção IX, `docs/foundation/VISION_2035.md` — Seção V

**Contexto de Uso**: Referenciado ao justificar por que dados históricos não podem ser descartados, por que cada funcionalidade deve produzir dados, e por que inteligência contextual é diferente de IA genérica.

**Termos Relacionados**: Ativos Estratégicos, Flywheel, Knowledge Graph, Vision 2035

**Sinônimos Aceitos**: "o Brain", "camada de inteligência"

**Termos Não Recomendados**: "IA do ParaguAI" (impreciso — o Brain é mais que um modelo de IA)

**Status**: Planned

---

### Vision 2035

**Definição**: Horizonte estratégico de longo prazo — transformar o ParaguAI de comparador de preços (Estágio 1) em sistema operacional da economia fronteiriça (Estágio 6), passando por 6 estágios evolutivos: (1) Comparador de Preços → (2) Ecossistema de Comércio → (3) Plataforma de Inteligência → (4) Infraestrutura de Turismo → (5) Inteligência Regional → (6) Sistema Operacional da Economia Fronteiriça.

**Documento Fonte**: `docs/foundation/VISION_2035.md`

**Contexto de Uso**: Consultado ao avaliar se uma direção alinha-se ao destino de longo prazo. O presente (Estágio 1–2) deve ser construído de forma que não bloqueie o Estágio 3+.

**Termos Relacionados**: Foundation, ParaguAI Brain, Ativos Estratégicos, Compounding Release

**Status**: Stable

---

### Compounding Release

**Definição**: Release que, além de entregar valor presente, melhora a infraestrutura para releases futuras. Os 5 mecanismos de compounding: (1) motor reutilizável criado, (2) dado acumulável gerado, (3) contrato estabilizado, (4) capacidade de IA alimentada, (5) conhecimento documentado. Pergunta obrigatória antes de qualquer Release: "o que esta Release torna mais fácil na próxima?"

**Documento Fonte**: `docs/foundation/RELEASE_STRATEGY.md` — Seção IX, `docs/foundation/NORTH_STAR.md` — Seção XIII

**Contexto de Uso**: Critério de planejamento e avaliação de Release. Qualquer Release que não tenha pelo menos um componente de compounding merece revisão.

**Termos Relacionados**: Release, Foundation, Ativos Estratégicos

**Sinônimos Aceitos**: "Compounding Decisions" (decisões individuais com efeito composto)

**Status**: Stable

---

### Release

**Definição**: Unidade de evolução mensurável da plataforma — coesa, com critério de sucesso definido, que deixa a plataforma em estado melhor que o anterior. Não é um acúmulo de tarefas. Cinco propriedades obrigatórias: coeso, identificável, testável, documentado, compounding. Existem 10 tipos: Foundation, Architecture, Platform, Feature, Quality, Infrastructure, Security, Performance, Data, AI.

**Documento Fonte**: `docs/foundation/RELEASE_STRATEGY.md`

**Contexto de Uso**: Todo trabalho significativo que afeta múltiplos módulos, introduz novo ativo ou muda comportamento da plataforma deve ser organizado como Release.

**Termos Relacionados**: Compounding Release, ADR, Definition of Ready, Definition of Done

**Status**: Stable

---

### ADR (Architectural Decision Record)

**Definição**: Registro leve de decisão arquitetural. Documenta o que foi decidido, por quê, quais alternativas foram descartadas e as consequências. Vive em `docs/operations/DECISIONS.md`. Exigido para decisões Tipo 1. Nunca editado retroativamente — apenas acrescido.

**Documento Fonte**: `docs/operations/DECISIONS.md`, `docs/foundation/DECISION_FILTER.md`

**Contexto de Uso**: Toda decisão estrutural (schema, dependência crítica, padrão arquitetural, política de segurança) deve ter um ADR correspondente.

**Termos Relacionados**: Tipo 1, Decision Filter, Release

**Sinônimos Aceitos**: "decisão arquitetural", "registro de decisão"

**Status**: Stable

---

### Definition of Ready

**Definição**: 8 condições que uma Release deve atender antes de começar a implementação: (1) missão clara, (2) problema real identificado, (3) Decision Filter executado, (4) ADRs necessários redigidos, (5) critério de sucesso definido, (6) escopo delimitado, (7) dependências resolvidas, (8) riscos avaliados.

**Documento Fonte**: `docs/foundation/RELEASE_STRATEGY.md` — Seção XI

**Contexto de Uso**: Gate de entrada para qualquer Release. Nenhuma implementação começa sem este check.

**Termos Relacionados**: Release, Definition of Done, Decision Filter

**Status**: Stable

---

### Definition of Done

**Definição**: 10 condições que uma Release deve atender antes de ser declarada completa: (1) critério de sucesso validado, (2) Quality Gates universais passando, (3) Quality Gates específicos do tipo passando, (4) sem regressões, (5) ADRs registrados, (6) CHANGELOG atualizado, (7) PROJECT_STATUS atualizado, (8) NEXT_STEPS atualizado, (9) documentação alinhada, (10) compounding identificado.

**Documento Fonte**: `docs/foundation/RELEASE_STRATEGY.md` — Seção XII

**Contexto de Uso**: Gate de saída para qualquer Release. Nenhuma Release é declarada completa sem este check.

**Termos Relacionados**: Release, Definition of Ready, Quality Gates

**Status**: Stable

---

### Quality Gates

**Definição**: Conjunto de verificações obrigatórias antes de qualquer Release. Gates Universais (todos os tipos): Build limpo, TypeScript sem erros, Lint sem erros, Consistência arquitetural, Consistência com Foundation, Sem regressões. Gates adicionais variam por tipo de Release.

**Documento Fonte**: `docs/foundation/RELEASE_STRATEGY.md` — Seção XIII

**Contexto de Uso**: Checklist pré-Release. Falha em qualquer gate bloqueia a Release.

**Termos Relacionados**: Release, Definition of Done

**Status**: Stable

---

### Merchant OS

**Definição**: Sistema Operacional do Lojista — infraestrutura operacional completa que o ParaguAI oferece a lojistas cadastrados. Inclui: dashboard com Merchant Score e análise consultiva, importação de catálogo, analytics de performance, recomendações automáticas, planos e automação. Implementado em `/merchant/*` (Release 1.2+).

**Documento Fonte**: `docs/foundation/AI_CONSTITUTION.md`, `docs/foundation/BUSINESS_MODEL.md`, `docs/architecture/ARCHITECTURE.md`

**Contexto de Uso**: Nome oficial do conjunto de capacidades do portal do lojista. Usado em documentação, roadmap e comunicações externas.

**Termos Relacionados**: Merchant, Merchant Score, Dashboard, Plano

**Sinônimos Aceitos**: "portal do lojista" (em contexto de UI), "Merchant Portal" (somente em código/rotas, nunca em texto user-facing)

**Termos Não Recomendados**: "área do lojista" em código ou docs técnicos; em UI, "Área do Lojista" é aceito como branding

**Status**: Stable

---

### Merchant Score

**Definição**: Pontuação composta de 0 a 100 que representa a qualidade operacional de um lojista. Calculado on-demand (não persistido como coluna estática) a partir de 8 critérios: completude do perfil, importações realizadas, ofertas ativas, verificação, tempo de resposta, qualidade de dados, avaliações e consistência. Alimenta o Merchant Level e o Ranking público de lojas.

**Documento Fonte**: `docs/foundation/AI_CONSTITUTION.md`, `docs/operations/DECISIONS.md` (ADR-034)

**Contexto de Uso**: Exibido no dashboard do Merchant e na página pública `/lojas/[slug]`. Usado como sinal de confiabilidade no Offer Ranking.

**Termos Relacionados**: Merchant Level, Merchant OS, Offer Ranking Score, Trust

**Termos Não Recomendados**: "pontuação" sozinho (ambíguo — pode confundir com Offer Ranking Score)

**Status**: Stable

---

### Merchant Level

**Definição**: Nível de progressão do Merchant dentro do sistema de gamificação, derivado do Merchant Score: Iniciante (0–19) → Bronze (20–39) → Prata (40–59) → Ouro (60–79) → Diamante (80–94) → Elite (95–100). Cada nível representa capacidades reais adicionais, não apenas um badge decorativo.

**Documento Fonte**: `docs/architecture/ARCHITECTURE.md`, `docs/operations/PROJECT_STATUS.md`

**Contexto de Uso**: Exibido no dashboard, nas missões do GoalsPanel e na página pública do lojista.

**Termos Relacionados**: Merchant Score, Gamification, Merchant OS

**Status**: Stable

---

### Trust

**Definição**: Princípio de produto permanente — confiança é construída através de transparência, consistência e neutralidade, nunca declarada. Custo de quebra é assimétrico e irreversível: leva meses para construir e segundos para destruir. Rankings nunca são pagos; publicidade é sempre identificada; algoritmos têm motivo visível.

**Documento Fonte**: `docs/foundation/PRODUCT_PRINCIPLES.md` — Seção IX (Confiança como Produto), `docs/foundation/AI_CONSTITUTION.md`

**Contexto de Uso**: Critério de avaliação de qualquer decisão de produto que envolva o que é exibido ao usuário. A linha de neutralidade é absoluta.

**Termos Relacionados**: Moat, Ranking, Merchant Score

**Sinônimos Aceitos**: "Confiança" (em português)

**Status**: Stable

---

### Regras Permanentes

**Definição**: As 14 regras invioláveis definidas na AI_CONSTITUTION.md que nunca mudam independente de circunstância, pressão de negócio ou conveniência técnica. As mais críticas: "Schema de banco não muda sem aprovação explícita", "Credenciais privilegiadas nunca são expostas ao cliente", "Dados de produção não são alterados sem dry-run anterior", "Preço nunca é propriedade do produto. Preço pertence à oferta."

**Documento Fonte**: `docs/foundation/AI_CONSTITUTION.md` — Seção XIII

**Contexto de Uso**: Referência em qualquer situação onde alguém questiona se uma exceção é possível. A resposta é sempre não.

**Termos Relacionados**: Foundation, AI Constitution, Tipo 1, Invariante de Preço

**Status**: Stable

---

### Invariante de Preço

**Definição**: A regra mais importante do modelo de dados: "Preço nunca é propriedade do produto. Preço pertence à oferta." Um mesmo produto pode ter preços diferentes em lojas diferentes — portanto `price_usd`/`price_brl` vivem em `offers`, nunca em `products`.

**Documento Fonte**: `docs/foundation/AI_CONSTITUTION.md`, `docs/architecture/DOMAIN_MODEL.md`, `docs/operations/DECISIONS.md` (ADR-009)

**Contexto de Uso**: Sempre que alguém propõe adicionar um campo de preço ao `Product`. A resposta é: o preço pertence à Offer.

**Termos Relacionados**: Offer, Product, Price History, Regras Permanentes

**Status**: Stable

---

## IV. Conceitos de Produto

Conceitos que descrevem as entidades, funcionalidades e experiências do produto ParaguAI.

---

### Marketplace

**Definição**: Modelo de negócio onde o ParaguAI conecta compradores a múltiplas lojas sem ser intermediário de transação — a compra acontece na loja, não na plataforma. O valor está na inteligência (comparação, recomendação, histórico), não na transação em si.

**Documento Fonte**: `docs/foundation/BUSINESS_MODEL.md`

**Contexto de Uso**: Descrição do modelo de negócio em documentação, comunicações e decisões de produto.

**Termos Relacionados**: Business Model, Flywheel, Comparison

**Status**: Stable

---

### Merchant

**Definição**: Lojista cadastrado na plataforma que utiliza o Merchant OS para gerenciar sua presença, catálogo e analytics. Possui role `merchant` no sistema de auth. Um Merchant pode ter múltiplas Stores (tabela junction `merchant_stores`).

**Documento Fonte**: `docs/architecture/ARCHITECTURE.md`, `docs/operations/DECISIONS.md` (ADR-031)

**Contexto de Uso**: Nome oficial em código (`types/merchant.ts`, `services/merchant.service.ts`, `lib/merchant-auth.ts`), rotas (`/merchant/*`), tabela de banco (`merchants`), documentação técnica.

**Termos Relacionados**: Store, Merchant OS, Merchant Score, Merchant Level

**Sinônimos Aceitos**: "lojista" (somente em texto user-facing, ex: "Para Lojistas"), "Área do Lojista" (somente em branding de UI)

**Termos Não Recomendados**: Seller, Vendor, vendedor, fornecedor, store_owner — nenhum desses deve aparecer em código ou documentação técnica

**Status**: Stable

---

### Store

**Definição**: Entidade representando uma loja física ou virtual na plataforma. Possui `slug` (identificador URL), informações de contato, horário de funcionamento, `cover_image`, `is_verified`, `rating` e múltiplas Offers de Products. Pode estar associada a zero ou um Merchant.

**Documento Fonte**: `docs/architecture/DOMAIN_MODEL.md`, `types/store.ts`

**Contexto de Uso**: Nome oficial em código (`types/store.ts`, `services/store.service.ts`), rotas (`/store/[slug]`, `/lojas/[slug]`), tabela de banco (`stores`), documentação técnica.

**Termos Relacionados**: Merchant, Offer, Merchant Score

**Sinônimos Aceitos**: "loja" (somente em texto user-facing)

**Termos Não Recomendados**: Shop, vendor, estabelecimento — nenhum deve aparecer em código

**Status**: Stable

---

### Product

**Definição**: Entidade normalizada representando um item de catálogo, independente de qual Store o vende ou a que preço. Um Product tem `slug`, `brand`, `category`, `description`, imagens — mas nunca preço (ver Invariante de Preço). Um Product pode ter múltiplas Offers em múltiplas Stores.

**Documento Fonte**: `docs/architecture/DOMAIN_MODEL.md`, `types/product.ts`

**Contexto de Uso**: Nome oficial em código (`types/product.ts`, `services/product.service.ts`), rotas (`/product/[slug]`), tabela de banco (`products`).

**Termos Relacionados**: Offer, Brand, Category, Invariante de Preço

**Sinônimos Aceitos**: "produto" (em texto user-facing)

**Termos Não Recomendados**: "item", "mercadoria", "SKU" como sinônimo (SKU é um campo do produto)

**Status**: Stable

---

### Offer

**Definição**: Unidade de preço e disponibilidade de um Product em uma Store específica. Campos principais: `price_usd`, `price_brl`, `in_stock`, `product_url`, `condition`, `warranty`. Preço pertence à Offer, nunca ao Product. Uma Offer pode ter histórico de mudanças em `price_history`.

**Documento Fonte**: `docs/architecture/DOMAIN_MODEL.md`, `types/offer.ts`, `docs/foundation/AI_CONSTITUTION.md`

**Contexto de Uso**: Nome oficial em código (`types/offer.ts`, `services/offer.service.ts`), tabela de banco (`offers`), documentação técnica.

**Termos Relacionados**: Product, Store, Price History, Invariante de Preço, Offer Ranking Score

**Sinônimos Aceitos**: "oferta" (em texto user-facing)

**Termos Não Recomendados**: "listing", "preço do produto", "anúncio"

**Status**: Stable

---

### Price History

**Definição**: Registro imutável de mudanças de preço de uma Offer ao longo do tempo. Tabela `price_history` com `offer_id`, `price_usd`, `price_brl`, `old_price_usd`, `source`, `recorded_at`. Apenas INSERT — nunca UPDATE. Alimenta métricas de menor/maior preço histórico e variação percentual.

**Documento Fonte**: `docs/operations/DECISIONS.md` (ADR-013, ADR-017, ADR-018), `types/priceHistory.ts`

**Contexto de Uso**: Insumo do Compare Engine e do futuro sistema de alertas de preço.

**Termos Relacionados**: Offer, Comparison, Ativos Estratégicos

**Sinônimos Aceitos**: "histórico de preços"

**Status**: Stable

---

### Brand

**Definição**: Marca de um produto. Entidade própria com `slug`, `name`, `logo_url`. Um Product pertence a uma Brand. Brands são normalizadas — "Apple" é uma entidade, não uma string livre por produto.

**Documento Fonte**: `docs/architecture/DOMAIN_MODEL.md`, `types/brand.ts`

**Contexto de Uso**: Entidade de banco (`brands`), tipo TypeScript (`Brand`), serviço (`brand.service.ts`), filtros do catálogo.

**Termos Relacionados**: Product, Category

**Sinônimos Aceitos**: "marca" (em texto user-facing)

**Status**: Stable

---

### Category

**Definição**: Categoria de um produto (ex: Celulares, Eletrônicos, Informática). Entidade própria com `slug`, `name`. Um Product pertence a uma Category. Categories são normalizadas — sem tags livres.

**Documento Fonte**: `docs/architecture/DOMAIN_MODEL.md`, `types/category.ts`

**Contexto de Uso**: Entidade de banco (`categories`), tipo TypeScript (`Category`), serviço (`category.service.ts`), filtros do catálogo.

**Termos Relacionados**: Product, Brand

**Sinônimos Aceitos**: "categoria" (em texto user-facing)

**Status**: Stable

---

### Comparison

**Definição**: Funcionalidade central que agrega todas as Offers de um Product através de múltiplas Stores, calcula métricas (mínimo/máximo histórico, variação de preço), aplica o Offer Ranking e exibe a "melhor oferta" primeiro. Implementada em `services/compare.service.ts` com 3 queries batch independentes do número de Offers (ADR-020).

**Documento Fonte**: `docs/operations/DECISIONS.md` (ADR-020), `docs/architecture/ARCHITECTURE.md`

**Contexto de Uso**: Rota `/compare/[slug]`, API `/api/compare`, componentes `Compare*`.

**Termos Relacionados**: Offer, Product, Offer Ranking Score, Price History

**Sinônimos Aceitos**: "comparação de preços", "comparador"

**Status**: Stable

---

### Offer Ranking Score

**Definição**: Pontuação composta (0–100) que determina a ordenação de Offers dentro de uma Comparison: Preço (50 pts, normalizado no conjunto) + Disponibilidade (25 pts, `in_stock=true`) + Confiabilidade da loja (15 pts, `store.rating` normalizado) + Qualidade do cadastro (10 pts, campos preenchidos). Calculado em memória, nunca persistido. Não confundir com Merchant Score.

**Documento Fonte**: `docs/operations/DECISIONS.md` (ADR-014), `services/compare.service.ts`

**Contexto de Uso**: Exclusivamente no Compare Engine e `getOffersByProduct`.

**Termos Relacionados**: Comparison, Ranking, Merchant Score

**Sinônimos Aceitos**: "score de oferta", "ranking de oferta"

**Termos Não Recomendados**: "Merchant Score" (é um conceito diferente e separado)

**Status**: Stable

---

### Search

**Definição**: Busca global que retorna Products, Stores, Brands e Categories relevantes para um termo. Executada via `ilike` com `escapeLikePattern` aplicado (previne injeção de wildcards do PostgreSQL). Máximo 8 resultados por seção. Implementada em `services/search.service.ts`.

**Documento Fonte**: `docs/architecture/ARCHITECTURE.md`, `services/search.service.ts`

**Contexto de Uso**: Rota `/search?q=`, componentes `Search*`, hook `useSearch`.

**Termos Relacionados**: Product, Store, Brand, Category

**Sinônimos Aceitos**: "busca"

**Status**: Stable

---

### Import (Importação)

**Definição**: Processo de ingestão de dados de catálogo de uma loja — via JSON, CSV ou Connector específico — para o banco normalizado. Executado pelo Acquisition Engine via `database/seed/` (dados de exemplo) ou `acquisition/scripts/` (conectores reais). Sempre idempotente e com dry-run por padrão.

**Documento Fonte**: `docs/architecture/ARCHITECTURE.md`, `docs/operations/DECISIONS.md` (ADR-024)

**Contexto de Uso**: Administração e Merchant OS. Executado via CLI (`npm run acquisition:import-*`), nunca via interface direta do app.

**Termos Relacionados**: Connector, Acquisition Engine, Seed

**Sinônimos Aceitos**: "importação de catálogo"

**Status**: Stable

---

### Connector

**Definição**: Módulo do Acquisition Engine que sabe como buscar e parsear dados de uma fonte específica. Implementa a interface `IConnector` e é registrado no `ConnectorRegistry`. Exemplos: `ShoppingChinaConnector` (HTML scraping), `JsonFileConnector` (arquivo JSON), `CsvFileConnector` (arquivo CSV). Adicionar uma nova loja exige apenas implementar um novo Connector.

**Documento Fonte**: `docs/architecture/ARCHITECTURE.md`, `docs/operations/DECISIONS.md` (ADR-024)

**Contexto de Uso**: `acquisition/connectors/`. Cada conector é responsável por uma única fonte de dados.

**Termos Relacionados**: Acquisition Engine, Import, Pipeline

**Sinônimos Aceitos**: "conector"

**Status**: Stable

---

### Acquisition Engine

**Definição**: Pipeline universal de aquisição de dados, standalone em `acquisition/`, desacoplado da app Next.js. Executa via `tsx`. Não importado por nenhuma rota Next.js. Estágios: Validation → Normalization → Deduplication → Canonical → Media → CatalogWriter.

**Documento Fonte**: `docs/architecture/ARCHITECTURE.md`, `docs/operations/DECISIONS.md` (ADR-024)

**Contexto de Uso**: Ingestão de dados de lojas reais. Nunca chamado por Server Components ou Route Handlers — é um processo Node.js separado.

**Termos Relacionados**: Connector, Pipeline, Import, CatalogWriter

**Status**: Stable

---

### Admin

**Definição**: Usuário com role `admin` ou `operator` no sistema (`profiles.role`). Acessa o painel `/admin/*` para gestão de catálogo, lojas, importações e qualidade. Autenticado via `requireAdmin()` em `lib/admin-auth.ts`. Distinguido do Merchant por role e rota.

**Documento Fonte**: `docs/architecture/ARCHITECTURE.md`, `docs/operations/DECISIONS.md` (ADR-030)

**Contexto de Uso**: Controle de acesso ao painel de administração.

**Termos Relacionados**: Merchant, RLS, Service Role

**Status**: Stable

---

### Dashboard

**Definição**: Interface centralizada de visualização de métricas e ações orientadas a decisão. Existe para Admin (`/admin/*`) e para Merchant (`/merchant/dashboard`). Princípio permanente: todo widget deve orientar uma ação, não apenas informar. Dashboard que não muda comportamento é decoração.

**Documento Fonte**: `docs/foundation/PRODUCT_PRINCIPLES.md`, `docs/architecture/ARCHITECTURE.md`

**Contexto de Uso**: Rota `/merchant/dashboard`, componentes `StatsGrid`, `ScoreCard`, `GoalsPanel`, `NextStepCard`, `MerchantProgressCard`.

**Termos Relacionados**: Merchant OS, Merchant Score, Analytics

**Status**: Stable

---

### Analytics

**Definição**: (1) **Plataforma**: GA4 + Microsoft Clarity integrados via `components/analytics/Analytics.tsx` e `utils/analytics.ts`. Eventos tipados: `viewProduct`, `clickOffer`, `compare`, `viewStore`. (2) **Merchant OS**: métricas de performance do lojista por loja em `/merchant/analytics` — arquitetura definida, dashboard ainda não implementado (ADR-039).

**Documento Fonte**: `docs/architecture/ARCHITECTURE.md`, `docs/operations/DECISIONS.md` (ADR-039)

**Contexto de Uso**: Distinção importante: analytics de plataforma (GA4) e analytics de Merchant (por loja) são sistemas diferentes com propósitos diferentes.

**Termos Relacionados**: Dashboard, Merchant OS

**Status**: Stable (plataforma), Planned (Merchant analytics)

---

### Gamification

**Definição**: Sistema de progressão do Merchant — 6 níveis (Iniciante → Elite), missões no GoalsPanel, metas e tracker de completude no MerchantProgressCard. Não é decorativo: cada nível representa capacidade real adicional e orienta a próxima ação do lojista.

**Documento Fonte**: `docs/architecture/ARCHITECTURE.md`, `docs/operations/PROJECT_STATUS.md`

**Contexto de Uso**: Componentes do dashboard do Merchant.

**Termos Relacionados**: Merchant Level, Merchant Score, Dashboard

**Sinônimos Aceitos**: "sistema de progressão", "Merchant Progress"

**Status**: Stable

---

### Onboarding

**Definição**: Fluxo de boas-vindas e configuração inicial de um novo Merchant — wizard em `/merchant/register` usando PKCE flow. Objetivo: atingir completude mínima de perfil antes de acessar o Dashboard completo. Autenticação via email com confirmação.

**Documento Fonte**: `docs/architecture/ARCHITECTURE.md`, `docs/operations/PROJECT_STATUS.md`

**Contexto de Uso**: Rota `/merchant/register`, `lib/merchant-auth.ts`.

**Termos Relacionados**: Merchant, Merchant Score, Dashboard

**Status**: Stable

---

### Plano

**Definição**: Nível de assinatura de um Merchant (Free, Pro, Business, Enterprise), determinando quais capacidades do Merchant OS estão disponíveis. Armazenado na tabela `merchant_plans` via seed. Gateway de pagamento não implementado ainda (ADR-035) — upgrade via contato direto.

**Documento Fonte**: `docs/operations/DECISIONS.md` (ADR-035)

**Contexto de Uso**: Tabela `merchant_plans`, campo `merchants.plan`, página `/para-lojistas` (exibição de planos).

**Termos Relacionados**: Merchant OS, Merchant

**Sinônimos Aceitos**: "plan" (em código)

**Status**: Stable

---

### Ranking

**Definição**: Ordenação de resultados baseada em pontuação composta — preço, disponibilidade, confiabilidade e qualidade de dados. Princípio absoluto: rankings nunca são pagos. A posição de uma oferta ou loja reflete relevância, não receita da plataforma.

**Documento Fonte**: `docs/foundation/PRODUCT_PRINCIPLES.md` (Neutralidade), `docs/operations/DECISIONS.md` (ADR-014)

**Contexto de Uso**: `/lojas` (ranking de lojas por Merchant Score), `/compare/[slug]` (ranking de Offers por Offer Ranking Score).

**Termos Relacionados**: Offer Ranking Score, Merchant Score, Trust

**Status**: Stable

---

### Score

**Definição**: Valor numérico (0–100) que representa qualidade ou relevância. Dois Scores distintos no ParaguAI: (1) **Merchant Score** — qualidade operacional de um lojista; (2) **Offer Ranking Score** — qualidade de uma oferta numa comparação. Sempre especificar qual ao usar o termo.

**Documento Fonte**: `docs/operations/DECISIONS.md` (ADR-014, ADR-034)

**Contexto de Uso**: Diferenciação obrigatória ao mencionar "score" em código ou documentação.

**Termos Relacionados**: Merchant Score, Offer Ranking Score

**Status**: Stable

---

## V. Conceitos Técnicos

Conceitos da camada de implementação — Next.js, React, Supabase, TypeScript.

---

### Server Component

**Definição**: Componente React que executa exclusivamente no servidor — não é enviado ao browser, não pode usar hooks de estado (`useState`, `useEffect`), não pode usar Web APIs. Padrão da plataforma: todo componente é Server Component a menos que precise de interatividade. Sem `"use client"` no topo do arquivo.

**Documento Fonte**: `docs/architecture/ARCHITECTURE.md`, `docs/engineering/CONVENTIONS.md`

**Contexto de Uso**: Default de todos os componentes. Preferido por SEO, performance e segurança (secrets não vão ao browser).

**Termos Relacionados**: Client Component, SSR, Route Handler

**Status**: Stable

---

### Client Component

**Definição**: Componente React marcado com `"use client"` que executa no browser. Usado apenas quando necessário: estado interativo, eventos do browser, Web APIs. Exemplos: `SearchBar` (estado do campo), `Navbar` (scroll listener), `FavoriteButton` (toggle), formulários de auth.

**Documento Fonte**: `docs/architecture/ARCHITECTURE.md`, `docs/engineering/CONVENTIONS.md`

**Contexto de Uso**: Declarado apenas quando Server Component é insuficiente. A presença de `"use client"` deve ter justificativa clara.

**Termos Relacionados**: Server Component, Hook, CSR

**Status**: Stable

---

### Provider

**Definição**: Componente React que disponibiliza Context para subcomponentes via `Context.Provider`. No ParaguAI: `ToastContext.Provider` é o único Provider global — exclusivo para Admin e Merchant. A app pública não tem nenhum Provider global.

**Documento Fonte**: `docs/architecture/ARCHITECTURE.md`

**Contexto de Uso**: `components/merchant/ui/ToastContext.tsx`. Favoritos usam módulo singleton + `useSyncExternalStore`, não Provider.

**Termos Relacionados**: Context, Client Component

**Status**: Stable

---

### Context

**Definição**: Mecanismo React para compartilhar estado entre componentes sem prop drilling (`React.createContext`). No ParaguAI, usado exclusivamente para Toast. Para estado global como favoritos, o padrão é módulo singleton + `useSyncExternalStore` — evita overhead de re-render de Provider.

**Documento Fonte**: `docs/architecture/ARCHITECTURE.md`

**Contexto de Uso**: Raramente usado. Antes de criar um novo Context, verificar se módulo singleton resolve.

**Termos Relacionados**: Provider, Hook

**Status**: Stable

---

### Hook

**Definição**: Função React prefixada com `use` que encapsula lógica de estado e efeitos. Vive em `hooks/use*.ts`. Padrão: um hook por domínio (`useProduct`, `useStore`, `useSearch`, `useProductFilters`, `useCompare`). Sempre client-only. Server Components buscam dados diretamente via services.

**Documento Fonte**: `docs/architecture/ARCHITECTURE.md`, `docs/engineering/CONVENTIONS.md`

**Contexto de Uso**: Camada de estado entre services e Client Components. Não usar em Server Components.

**Termos Relacionados**: Client Component, Service, Context

**Status**: Stable

---

### Service

**Definição**: Módulo que encapsula queries ao Supabase para um domínio específico. Vive em `services/*.service.ts`. Convenção mandatória: nunca lança exceção — retorna `[]` ou `null` em erro e loga via `console.error`. Uma função por responsabilidade.

**Documento Fonte**: `docs/architecture/ARCHITECTURE.md`, `docs/engineering/CONVENTIONS.md`

**Contexto de Uso**: Camada de acesso a dados. Consumido diretamente por Server Components (sem hook) ou via hooks em Client Components.

**Termos Relacionados**: Hook, Supabase, Service Layer

**Status**: Stable

---

### Route Handler

**Definição**: Endpoint de API definido em `app/api/*/route.ts`, exportando funções `GET`, `POST`, `PUT`, `DELETE`. Usado para: autenticação PKCE (`/auth/callback`), API pública de comparação (`/api/compare`), e endpoints autenticados de admin e merchant. Distinto de Server Component — responde JSON, não HTML.

**Documento Fonte**: `docs/architecture/ARCHITECTURE.md`

**Contexto de Uso**: Somente quando a resposta precisa ser JSON ou quando há lógica de auth que não pode ser feita em componente.

**Termos Relacionados**: Server Component, Service

**Status**: Stable

---

### RLS (Row Level Security)

**Definição**: Sistema de permissões em nível de linha do PostgreSQL/Supabase. No ParaguAI: chave anônima lê tabelas públicas do catálogo; escrita requer service role. Armadilha crítica (ADR-016): UPDATE bloqueado por RLS não gera erro — retorna 0 linhas afetadas silenciosamente. Nunca assumir que ausência de erro significa sucesso em operações de escrita.

**Documento Fonte**: `docs/operations/DECISIONS.md` (ADR-016, ADR-019)

**Contexto de Uso**: Entendimento obrigatório antes de qualquer alteração de permissões no banco ou operações de escrita.

**Termos Relacionados**: Supabase, Service Role, Anon Key

**Status**: Stable

---

### Supabase

**Definição**: Backend-as-a-Service baseado em PostgreSQL usado como banco de dados, autenticação e storage. Acessado via quatro clientes distintos no projeto: `lib/supabase.ts` (anon, app pública), `lib/supabase/server.ts` (anon, SSR com sessão), `lib/supabase/client.ts` (anon, browser autenticado), `lib/supabase/service.ts` (service role, server-only). A regra crítica: `lib/supabase/service.ts` nunca deve ser importado por Client Components.

**Documento Fonte**: `docs/architecture/ARCHITECTURE.md`, `docs/operations/DECISIONS.md` (ADR-028)

**Contexto de Uso**: Banco de dados, auth e storage. Escolha do cliente determina nível de acesso.

**Termos Relacionados**: RLS, Service Role, Anon Key, Migration

**Status**: Stable

---

### Anon Key

**Definição**: `NEXT_PUBLIC_SUPABASE_ANON_KEY` — chave pública do Supabase com permissões limitadas por RLS. Usada pela aplicação Next.js em todas as leituras públicas de catálogo. Pode ser exposta ao browser (prefixo `NEXT_PUBLIC_`). Não tem permissão de escrita nas tabelas de catálogo.

**Documento Fonte**: `docs/architecture/ARCHITECTURE.md`, `lib/env.ts`

**Contexto de Uso**: Única chave usada por `lib/supabase.ts` (app pública). Todo componente e hook da app usa esta chave implicitamente.

**Termos Relacionados**: Service Role, RLS, Supabase

**Status**: Stable

---

### Service Role

**Definição**: `SUPABASE_SERVICE_ROLE_KEY` — chave privilegiada do Supabase que bypassa RLS. Usada exclusivamente em contextos de servidor: API routes de admin/merchant, `stores-public.service.ts` e tooling de banco. Não tem prefixo `NEXT_PUBLIC_*` — nunca exposta ao browser. Tratada com o mesmo cuidado de senha de banco.

**Documento Fonte**: `docs/architecture/ARCHITECTURE.md`, `docs/operations/DECISIONS.md` (ADR-016, ADR-030)

**Contexto de Uso**: Writes de admin, leitura de dados privados de merchant em páginas públicas, Seed, Acquisition Engine. Se precisar de service role, o código está em contexto de servidor.

**Termos Relacionados**: Anon Key, RLS, Supabase

**Status**: Stable

---

### Migration

**Definição**: Script SQL que altera o schema do banco. No ParaguAI, migrations vivem em `database/migrations/` com prefixo numérico sequencial. Aplicadas manualmente pelo CTO via SQL Editor do Supabase — não há CI/CD de migrations. Migrations são idempotentes quando possível. Requer aprovação explícita — Regra Permanente.

**Documento Fonte**: `docs/architecture/ARCHITECTURE.md`, `docs/operations/DECISIONS.md` (ADR-017)

**Contexto de Uso**: Qualquer alteração de schema (CREATE TABLE, ALTER TABLE, CREATE POLICY). Não confundir com Seed — Migration é schema, Seed é dados.

**Termos Relacionados**: Seed, RLS, Supabase

**Status**: Stable

---

### Seed

**Definição**: Sistema modular em `database/seed/` que popula dados de exemplo ou referência no banco. Idempotente: resolve entidade por chave natural antes de inserir (`[SKIP]` se já existe). Dry-run por padrão — `--execute` para aplicar. Usa Service Role para bypassar RLS. Escrito em JavaScript puro (CommonJS, ADR-012).

**Documento Fonte**: `docs/operations/DECISIONS.md` (ADR-012)

**Contexto de Uso**: `npm run db:seed` (dry-run), `npm run db:seed:execute` (aplicar).

**Termos Relacionados**: Migration, Acquisition Engine, RLS

**Status**: Stable

---

### Slug

**Definição**: Identificador URL-friendly derivado do nome de uma entidade. Formato: lowercase, sem acentos, hífens no lugar de espaços (ex: "Shopping China" → `shopping-china`). Único por tabela (UNIQUE constraint, migration 0008). Usado em todas as URLs públicas. Gerado por `utils/slug.ts`. Nunca usar UUID em URLs públicas.

**Documento Fonte**: `docs/architecture/DOMAIN_MODEL.md`, `docs/operations/DECISIONS.md` (ADR-023)

**Contexto de Uso**: Chave de lookup em todas as rotas dinâmicas (`/product/[slug]`, `/store/[slug]`, etc.).

**Termos Relacionados**: UUID, Product, Store, Brand, Category

**Status**: Stable

---

### UUID

**Definição**: Identificador único universal (UUID v4) gerado pelo banco para cada linha. Usado como chave primária (`id`) em todas as tabelas. Não exposto em URLs públicas — Slug é usado para URLs. Referenciado internamente em FKs e joins.

**Documento Fonte**: `docs/architecture/DOMAIN_MODEL.md`

**Contexto de Uso**: Chaves primárias e FKs no banco. Nunca em URLs.

**Termos Relacionados**: Slug

**Status**: Stable

---

### Cache (padrão `_cache.ts`)

**Definição**: `React.cache()` usado no padrão `_cache.ts` (ADR-021) para compartilhar fetches entre `layout.tsx` e `page.tsx` na mesma requisição — garante que a entidade (produto ou loja) é buscada uma única vez por render, mesmo sendo usada em dois arquivos. O prefixo `_` no arquivo sinaliza que é módulo interno da rota, não um componente exportável pelo Next.js.

**Documento Fonte**: `docs/architecture/ARCHITECTURE.md`, `docs/operations/DECISIONS.md` (ADR-021)

**Contexto de Uso**: `app/product/[slug]/_cache.ts`, `app/store/[slug]/_cache.ts`, `app/compare/[slug]/page.tsx`.

**Termos Relacionados**: Server Component, SSR, Double-fetch

**Status**: Stable

---

### SSR (Server-Side Rendering)

**Definição**: Renderização de páginas no servidor a cada requisição. Padrão do ParaguAI para páginas dinâmicas. Garante dados frescos sem sacrificar SEO. Marcado com `export const dynamic = "force-dynamic"` quando necessário.

**Documento Fonte**: `docs/architecture/ARCHITECTURE.md`

**Contexto de Uso**: Padrão dominante na plataforma. A maioria das páginas é SSR implicitamente por ser Server Component com dados dinâmicos.

**Termos Relacionados**: Server Component, ISR, CSR

**Status**: Stable

---

### ISR (Incremental Static Regeneration)

**Definição**: Estratégia de Next.js que renderiza no servidor e cacheia por um período configurável (`revalidate`). Não utilizada atualmente no ParaguAI — páginas são `force-dynamic` (SSR puro) ou estáticas. Candidata futura para páginas de produto com dados que mudam raramente.

**Documento Fonte**: `docs/architecture/ARCHITECTURE.md`

**Contexto de Uso**: Não implementado. Referência para decisões futuras de performance.

**Termos Relacionados**: SSR, CSR

**Status**: Experimental

---

### CSR (Client-Side Rendering)

**Definição**: Renderização no browser via JavaScript. No ParaguAI, evitada para páginas principais (impacto em SEO e TTI). Usada apenas em Client Components que precisam de interatividade dentro de páginas SSR. Hooks implementam lógica cliente sem tornar a página inteira CSR.

**Documento Fonte**: `docs/architecture/ARCHITECTURE.md`

**Contexto de Uso**: Componentes interativos dentro de páginas SSR. A página SSR renderiza o shell; Client Components são "ilhas de interatividade".

**Termos Relacionados**: Client Component, SSR, ISR

**Status**: Stable

---

### Double-fetch

**Definição**: Antipadrão onde a mesma entidade é buscada duas vezes na mesma requisição — uma vez no `layout.tsx` (para `generateMetadata`) e outra no `page.tsx` (para renderizar). Resolvido pelo padrão `_cache.ts` (ADR-021) usando `React.cache()`. Encerrado como dívida técnica na Sprint 4.1.

**Documento Fonte**: `docs/operations/DECISIONS.md` (ADR-021)

**Contexto de Uso**: Antipadrão a evitar. Se `layout.tsx` e `page.tsx` precisam da mesma entidade, criar `_cache.ts`.

**Termos Relacionados**: Cache (padrão _cache.ts), Server Component

**Status**: Deprecated (resolvido)

---

## VI. Conceitos Arquiteturais

Conceitos que descrevem a estrutura, padrões e fronteiras da arquitetura técnica.

---

### Service Layer

**Definição**: Camada arquitetural em `services/*.service.ts` que encapsula toda lógica de acesso ao Supabase. Isola componentes e hooks de queries SQL diretas. Cada arquivo de service corresponde a um domínio. Convenção mandatória: serviços nunca lançam exceção.

**Documento Fonte**: `docs/architecture/ARCHITECTURE.md`, `docs/engineering/CONVENTIONS.md`

**Contexto de Uso**: Toda query ao Supabase passa pela Service Layer — nunca diretamente em componentes ou hooks.

**Termos Relacionados**: Service, Hook, Supabase

**Status**: Stable

---

### Domain Model

**Definição**: Representação das entidades do negócio e seus relacionamentos. Documentado em `docs/architecture/DOMAIN_MODEL.md`. Os tipos TypeScript em `types/*.ts` espelham o schema real do banco. Regra: nunca criar tipo TypeScript com campos que não existem no banco (lição aprendida com ADR-008/009).

**Documento Fonte**: `docs/architecture/DOMAIN_MODEL.md`, `docs/operations/DECISIONS.md` (ADR-008, ADR-009)

**Contexto de Uso**: Referência ao definir tipos novos ou modificar existentes.

**Termos Relacionados**: Bounded Context, Contract, Product, Offer, Store

**Status**: Stable

---

### Bounded Context

**Definição**: Limite semântico que define onde um conceito tem significado específico. No ParaguAI: Product, Store, Offer, Merchant, Admin são bounded contexts distintos — cada um com seus serviços, tipos e rotas próprios. Um conceito do contexto do Merchant não deve vazar para o contexto público do catálogo.

**Documento Fonte**: `docs/foundation/ENGINEERING_PRINCIPLES.md`

**Contexto de Uso**: Decisão de onde um novo tipo/service/componente pertence. Princípio de baixo acoplamento.

**Termos Relacionados**: Domain Model, Service Layer

**Status**: Stable

---

### Contract

**Definição**: Interface explícita entre camadas — tipos TypeScript, schemas de banco, respostas de API. Princípio do `ENGINEERING_PRINCIPLES.md`: "contratos sobre implementações". Um contrato muda menos que uma implementação; acoplamento via contrato é mais estável que acoplamento via código concreto.

**Documento Fonte**: `docs/foundation/ENGINEERING_PRINCIPLES.md`, `docs/architecture/API_CONTRACTS.md`

**Contexto de Uso**: `types/*.ts` são contratos do domínio; `docs/architecture/API_CONTRACTS.md` documenta os contratos dos services; schemas de banco são contratos com o Supabase.

**Termos Relacionados**: Domain Model, Service Layer, ADR

**Status**: Stable

---

### Pipeline

**Definição**: Sequência de etapas de processamento onde a saída de uma é entrada da próxima. No ParaguAI, três pipelines: (1) **Decision Filter** (10 estágios); (2) **Release Cycle** (11 estágios); (3) **Acquisition Engine** (Validation → Normalization → Deduplication → Canonical → Media → CatalogWriter).

**Documento Fonte**: `docs/foundation/DECISION_FILTER.md`, `docs/foundation/RELEASE_STRATEGY.md`, `docs/architecture/ARCHITECTURE.md`

**Contexto de Uso**: Estrutura conceitual para processos sequenciais. Cada etapa tem responsabilidade única.

**Termos Relacionados**: Acquisition Engine, Decision Filter, Release

**Status**: Stable

---

### Event

**Definição**: Mudança de estado significativa que deve ser registrada de forma imutável. No ParaguAI: mudança de preço é um Event (INSERT em `price_history`, nunca UPDATE); ação de admin/merchant é um Event (INSERT em `merchant_audit_logs`). Princípio: eventos nunca são sobrescritos — apenas lidos e acumulados.

**Documento Fonte**: `docs/foundation/ENGINEERING_PRINCIPLES.md`, `docs/operations/DECISIONS.md` (ADR-013)

**Contexto de Uso**: Design de sistemas de auditoria, histórico de preços, analytics. Se uma mudança precisa ser rastreada, modela como Event (INSERT-only).

**Termos Relacionados**: Price History, Ativos Estratégicos

**Status**: Stable

---

### Aggregate

**Definição**: Cluster de entidades tratado como unidade consistente. No ParaguAI: um Product com suas Offers é um aggregate — o preço mínimo das Offers determina a apresentação do Product no catálogo. A Comparison é o aggregate mais completo: Product + Offers + Stores + Price History.

**Documento Fonte**: `docs/architecture/DOMAIN_MODEL.md`

**Contexto de Uso**: Design de queries e componentes que precisam de múltiplas entidades relacionadas.

**Termos Relacionados**: Domain Model, Product, Offer

**Status**: Stable

---

### CatalogWriter

**Definição**: Componente do Acquisition Engine responsável por persistir dados normalizados no banco. Usa Service Role para bypassar RLS. Escreve na ordem correta de FKs: Brands → Categories → Products → Offers. Idempotente — resolve entidade por chave natural antes de inserir.

**Documento Fonte**: `acquisition/persistence/`, `docs/operations/DECISIONS.md` (ADR-024)

**Contexto de Uso**: Exclusivamente dentro do Acquisition Engine. Nunca importado por rotas da aplicação.

**Termos Relacionados**: Acquisition Engine, Import, RLS

**Status**: Stable

---

### Knowledge Graph

**Definição**: Representação futura das relações entre entidades do catálogo (produto, marca, categoria, loja, preço, histórico, comportamento) que alimentará o ParaguAI Brain para recomendações contextuais. Não implementado. Candidato ao Release AI quando volume de dados justificar.

**Documento Fonte**: `docs/foundation/VISION_2035.md`, `docs/foundation/AI_CONSTITUTION.md`

**Contexto de Uso**: Referência em planejamento de capacidades de IA. Não confundir com grafo de dependências de imports (`docs/architecture/DEPENDENCY_GRAPH.md`).

**Termos Relacionados**: ParaguAI Brain, Ativos Estratégicos, Vision 2035

**Status**: Planned

---

## VII. Convenções de Terminologia

### Termos Oficiais vs. Não Recomendados

Esta seção consolida as escolhas terminológicas mais importantes.

| Conceito | Termo Oficial | Termos NÃO Recomendados |
|---|---|---|
| Pessoa que gerencia uma loja | **Merchant** (código/docs), "lojista" (UI) | Seller, Vendor, store_owner, fornecedor, usuário lojista |
| Loja na plataforma | **Store** (código/docs), "loja" (UI) | Shop, estabelecimento, vendor_store |
| Item de catálogo | **Product** (código/docs), "produto" (UI) | Item, mercadoria, "SKU" como sinônimo |
| Preço+disponibilidade em uma loja | **Offer** (código/docs), "oferta" (UI) | Listing, anúncio, "preço do produto" |
| Pontuação do lojista | **Merchant Score** | Score do lojista, reputação (impreciso) |
| Pontuação de uma oferta | **Offer Ranking Score** | Score (ambíguo), Merchant Score (errado) |
| Portal do lojista (documentação) | **Merchant OS** | Merchant Portal em UI user-facing |
| Portal do lojista (branding de UI) | **Área do Lojista** | Merchant Portal |
| Sistema de governança permanente | **Foundation** | "documentação", "regras", "guia" |
| Métrica principal do produto | **North Star** | "KPI", "objetivo", "meta principal" |
| Decisão irreversível | **Tipo 1** | decisão permanente, decisão crítica (ambíguo) |
| Decisão reversível | **Tipo 2** | decisão pequena (evita confusão) |
| Chave pública do Supabase | **Anon Key** | API key, public key (ambíguo) |
| Chave privilegiada do Supabase | **Service Role** | admin key, service key, master key |

### Regra de bilinguismo

O projeto opera em dois idiomas:
- **Código e documentação técnica**: inglês (Store, Offer, Merchant, Service, Hook, Pipeline)
- **UI user-facing**: português ("loja", "oferta", "busca", "Área do Lojista")
- **Documentação de produto**: português com termos próprios em inglês sem tradução (Merchant Score, Flywheel, Moat, North Star permanecem em inglês mesmo em textos em português — são nomes próprios, não traduções)

---

## VIII. Relações entre Conceitos

### Diagrama do Domínio Principal

```
Merchant ─────────────────────────────────────────────────────┐
   │                                                           │
   ├─ tem → Store(s) ──────── gera → Offer(s) ─── tem → Price History
   │              │                    │
   │              │                    └─ pertence a → Product ─ tem → Brand
   │              │                                           └─ tem → Category
   │              │
   │              └─ tem → Merchant Score ── alimenta → Ranking Público (/lojas)
   │                           │                           └─ Moat (Trust)
   └─ tem → Merchant Level ───┘

Comparison ────────── agrega → Offer(s) ──── do mesmo → Product
    │                               │
    └── usa → Price History         └── aplica → Offer Ranking Score
    │
    └── resulta em → User Decision (North Star Metric)
         │
         └── alimenta → Analytics → ParaguAI Brain → Flywheel
```

### Hierarquia de Documentos

```
Foundation (8 documentos permanentes — lidos nesta ordem)
│
├─ AI_CONSTITUTION.md   ← quem somos
├─ NORTH_STAR.md        ← como decidimos
├─ BUSINESS_MODEL.md    ← como criamos valor
├─ VISION_2035.md       ← para onde vamos
├─ ENGINEERING_PRINCIPLES.md ← como construímos tecnologia
├─ PRODUCT_PRINCIPLES.md     ← como construímos produtos
├─ DECISION_FILTER.md   ← como aprovamos decisões
└─ RELEASE_STRATEGY.md  ← como evoluímos

Documentos Operacionais (subordinados à Foundation)
│
├─ DECISIONS.md       ← ADRs (histórico de decisões arquiteturais)
├─ ARCHITECTURE.md    ← estado real da arquitetura
├─ PROJECT_STATUS.md  ← estado real do projeto
└─ GLOSSARY.md        ← este documento (terminologia)
```

### Fluxo de Dados da Plataforma

```
Acquisition Engine (standalone Node.js — nunca importado pelo app)
    │
    ├─ Connector.fetch() → RawOffer[]
    ├─ Pipeline (Validation → Normalization → Deduplication → Media)
    └─ CatalogWriter → Supabase (Service Role, bypassa RLS)
                            │
                      brands, categories, products, offers, price_history
                            │
                App Next.js (SSR, Anon Key via RLS)
                            │
                ┌───────────┼──────────────────┐
           /products   /compare/[slug]      /lojas
           /product/[slug]   /store/[slug]  /search
                │
           User Decision ──── North Star Metric ──── Analytics ──── ParaguAI Brain
```

---

## IX. Evolução do Glossário

### Como adicionar um novo termo

1. O conceito deve existir no código, em um ADR ou em um documento da Foundation — nunca inventar termos novos sem base.
2. Criar um ADR se o novo termo representa uma decisão arquitetural ou terminológica significativa (Tipo 1).
3. Adicionar o termo na seção correspondente, seguindo o formato padrão da Seção II.
4. Atualizar os **Termos Relacionados** dos termos que se conectam ao novo.
5. Se o novo termo substitui um anterior, marcar o anterior como **Deprecated**.

### Como deprecar um termo

1. Mudar o Status para **Deprecated**.
2. Adicionar "**Substituído por**: [novo termo]" na Definição.
3. Não remover o termo — mantê-lo para que referências históricas (ADRs, CHANGELOG) ainda façam sentido.

### Quando um ADR é obrigatório

- Qualquer novo conceito que implica mudança de schema ou de API (Tipo 1)
- Qualquer renomeação de entidade existente que afeta código em produção
- Qualquer mudança no significado de um termo já estabelecido

### Princípio de conservadorismo terminológico

Antes de criar um novo termo, verificar se um existente serve. Proliferação de sinônimos é exatamente o problema que este glossário existe para resolver. Em caso de dúvida: menos termos, mais precisão.

---

## Relatório Final

**Termos documentados**: 64

**Distribuição por categoria**:
- Conceitos Estratégicos: 23 termos (ParaguAI, Assimetria de Informação, Foundation, AI Constitution, North Star, Mandatory Question, Decision Filter, Tipo 1, Tipo 2, Business Model, Flywheel, Network Effect, Moat, Ativos Estratégicos, ParaguAI Brain, Vision 2035, Compounding Release, Release, ADR, Definition of Ready, Definition of Done, Quality Gates, Merchant OS, Merchant Score, Merchant Level, Trust, Regras Permanentes, Invariante de Preço)
- Conceitos de Produto: 20 termos (Marketplace, Merchant, Store, Product, Offer, Price History, Brand, Category, Comparison, Offer Ranking Score, Search, Import, Connector, Acquisition Engine, Admin, Dashboard, Analytics, Gamification, Onboarding, Plano, Ranking, Score)
- Conceitos Técnicos: 17 termos (Server Component, Client Component, Provider, Context, Hook, Service, Route Handler, RLS, Supabase, Anon Key, Service Role, Migration, Seed, Slug, UUID, Cache, SSR, ISR, CSR, Double-fetch)
- Conceitos Arquiteturais: 9 termos (Service Layer, Domain Model, Bounded Context, Contract, Pipeline, Event, Aggregate, CatalogWriter, Knowledge Graph)

**Por status**:
- Stable: 58 termos
- Planned: 3 (ParaguAI Brain, Knowledge Graph, Merchant Analytics)
- Experimental: 1 (ISR)
- Deprecated: 1 (Double-fetch — resolvido pelo padrão _cache.ts)

**Termos oficializados neste documento** (definição canônica estabelecida):
- Merchant (não Seller/Vendor/Lojista em código)
- Store (não Shop em código)
- Offer (não Listing/Anúncio)
- Merchant Score vs. Offer Ranking Score (distinção clara entre os dois)
- Invariante de Preço (nome oficial para a regra central do modelo de dados)
- Anon Key vs. Service Role (nomenclatura precisa das duas chaves do Supabase)

**Termos eliminados** (não devem aparecer em código ou documentação):
- Seller, Vendor, store_owner → Merchant
- Shop → Store
- Listing, anúncio → Offer
- "preço do produto" → `offer.price_usd` / `offer.price_brl`
- admin key, master key, service key → Service Role
- "documentação" sozinho para a Foundation → Foundation
