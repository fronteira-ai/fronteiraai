# docs/engineering/

Documentação de como desenvolvemos no ParaguAI. Esta pasta contém convenções de código, terminologia oficial, guias técnicos e registro de dívida técnica — o manual prático do engenheiro que trabalha neste projeto.

## Propósito

Garantir consistência de linguagem, padrões e qualidade entre todos os contribuidores (humanos e IAs). Documentos aqui respondem "como fazer?" e "como se chama?" — não "por que?" (isso é `foundation/`) nem "o que existe?" (isso é `architecture/`).

## Documentos desta pasta

| Documento | Responde |
|---|---|
| `CONVENTIONS.md` | Como nomear, estruturar e escrever código neste projeto |
| `GLOSSARY.md` | Terminologia oficial — o único dicionário do projeto |
| `TECH_DEBT.md` | Dívida técnica identificada e seu status de resolução |
| `ACQUISITION.md` | Como funciona o Acquisition Engine (pipeline de dados) |
| `CONNECTOR_GUIDE.md` | Como criar um novo Conector para o Acquisition Engine |
| `AGENTS.md` | Avisos críticos para agentes IA sobre Next.js neste projeto |

## Quando criar um novo documento aqui

Quando surgir um guia técnico suficientemente extenso para não caber em `CONVENTIONS.md`. Exemplos válidos: `TESTING_GUIDE.md` (quando testes forem implementados), `PERFORMANCE_GUIDE.md` (quando otimizações específicas forem necessárias), `AUTH_GUIDE.md` (quando autenticação for implementada). Criar novos documentos requer ADR.

## Quando não criar

- Para decisões arquiteturais → `operations/DECISIONS.md` (ADR)
- Para estado do projeto → `operations/PROJECT_STATUS.md`
- Para funcionalidades → `product/FEATURES.md`
- Para filosofia de engenharia → `foundation/ENGINEERING_PRINCIPLES.md`

## Glossário como autoridade

`GLOSSARY.md` é o único documento que define terminologia oficial. Se um documento desta pasta usa um termo de forma diferente do GLOSSARY, o documento está errado. Toda divergência deve ser resolvida atualizando o documento — nunca o GLOSSARY de forma silenciosa.
