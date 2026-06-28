# docs/product/

Documentação do produto ParaguAI — o que existe hoje e para onde o produto vai. Esta pasta contém o inventário de funcionalidades implementadas e o roadmap estratégico de evolução.

## Propósito

Dar visibilidade ao estado funcional do produto (o que está pronto, em desenvolvimento ou planejado) e à direção estratégica de longo prazo. Documentos aqui respondem "o que o produto faz?" e "para onde vai?"

## Documentos desta pasta

| Documento | Responde |
|---|---|
| `FEATURES.md` | Inventário de todas as funcionalidades por estado real — concluído, em desenvolvimento, planejado |
| `MASTER_ROADMAP.md` | Roadmap estratégico de 4 Fases — Discovery Platform, Trust & Reputation, Intelligence Layer, Scale & Expansion |

## Quando criar um novo documento aqui

Quando surgir um documento de produto suficientemente amplo. Exemplos válidos: `USER_RESEARCH.md` (quando pesquisa de usuário for formalizada), `PRICING_STRATEGY.md` (quando modelo de preço for definido). Criar novos documentos requer ADR.

## Quando não criar

- Para especificação técnica de uma feature → `architecture/` ou `engineering/`
- Para próximos passos imediatos → `operations/NEXT_STEPS.md`
- Para decisões de produto pontuais → `operations/DECISIONS.md` (ADR)
- Para princípios de produto → `foundation/PRODUCT_PRINCIPLES.md`
- Para estado operacional → `operations/PROJECT_STATUS.md`

## Convenção

`FEATURES.md` descreve o que existe no código real — nunca descrever intenções como implementadas. `MASTER_ROADMAP.md` pode conter visão futura explicitamente marcada como tal.
