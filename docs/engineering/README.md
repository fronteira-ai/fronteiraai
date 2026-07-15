# docs/engineering/

Documentação de como desenvolvemos no ParaguAI. Esta pasta contém convenções de código, terminologia oficial, guias técnicos e registro de dívida técnica — o manual prático do engenheiro que trabalha neste projeto.

## Propósito

Garantir consistência de linguagem, padrões e qualidade entre todos os contribuidores (humanos e IAs). Documentos aqui respondem "como fazer?" e "como se chama?" — não "por que?" (isso é `foundation/`) nem "o que existe?" (isso é `architecture/`).

## Documentos desta pasta

### Convenções e terminologia (leitura obrigatória, qualquer tarefa)

| Documento | Responde |
|---|---|
| `CONVENTIONS.md` | Como nomear, estruturar e escrever código neste projeto |
| `GLOSSARY.md` | Terminologia oficial — o único dicionário do projeto |
| `AGENTS.md` | Avisos críticos para agentes IA sobre Next.js neste projeto |
| `TECH_DEBT.md` | Dívida técnica identificada e seu status de resolução |

### Connector Platform

| Documento | Responde |
|---|---|
| `ACQUISITION.md` | Como funciona o Acquisition Engine (pipeline de dados) |
| `CONNECTOR_GUIDE.md` | Como criar um novo Conector |
| `CONNECTOR_PLATFORM_ARCHITECTURE_REVIEW.md` | Fotografia real da Connector Platform (Release 1.8 — Wave 4) |
| `CONNECTOR_PLATFORM_V2.md` | Industrialização — SDK, Certification, Observability (Release 1.8 — Wave 5-6) |
| `SOURCE_DISCOVERY_POLICY.md` | Política permanente de escolha de fonte de dado |

### Domínios de inteligência e infraestrutura

| Documento | Responde |
|---|---|
| `DATABASE_ENGINEERING.md` | Database Migration System V2 — padrão, runbook, governança |
| `CRON_INFRASTRUCTURE.md` | Infraestrutura de agendamento — decoupled da Vercel (RC-3) |
| `EXCHANGE_FOUNDATION_FOR_LIVE_PRICING.md` | Fundação de câmbio para preços ao vivo (Release 1.8 — Program A Wave 1) |
| `MARKET_INTELLIGENCE_ENGINE.md` | Núcleo de inteligência de preços (Release 1.8 — Program C) |
| `MARKETPLACE_FOUNDATION_SCALE_AUDIT.md` | Auditoria de escala da fundação de marketplace |
| `PREMIUM_HOME_EXPERIENCE.md` | Arquitetura da Home Premium + `/categorias` (Release 1.9 — Program F) |
| `MERGE_EXECUTION_ENGINE.md` | Executor real de `MergeCandidate` — arquitetura (Program Ω — Mission Ω-1) |
| `MERGE_OPERATIONS.md` | Runbook operacional do Merge Execution Engine |
| `MERGE_ROLLBACK.md` | Garantias de reversibilidade de um merge executado |

## Quando criar um novo documento aqui

Quando surgir um guia técnico suficientemente extenso para não caber em `CONVENTIONS.md`. Exemplos válidos: `TESTING_GUIDE.md` (quando testes forem implementados), `PERFORMANCE_GUIDE.md` (quando otimizações específicas forem necessárias), `AUTH_GUIDE.md` (quando autenticação for implementada). Criar novos documentos requer ADR.

## Quando não criar

- Para decisões arquiteturais → `operations/DECISIONS.md` (ADR)
- Para estado do projeto → `operations/PROJECT_STATUS.md`
- Para funcionalidades → `product/FEATURES.md`
- Para filosofia de engenharia → `foundation/ENGINEERING_PRINCIPLES.md`

## Glossário como autoridade

`GLOSSARY.md` é o único documento que define terminologia oficial. Se um documento desta pasta usa um termo de forma diferente do GLOSSARY, o documento está errado. Toda divergência deve ser resolvida atualizando o documento — nunca o GLOSSARY de forma silenciosa.
