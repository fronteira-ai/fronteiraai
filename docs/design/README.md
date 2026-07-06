# docs/design/

Documentação sobre o **resultado visual congelado** do ParaguAI — o que a interface parece, não como o código por trás dela funciona. Enquanto `architecture/`/`engineering/` respondem "como o código está organizado", esta pasta responde "o que está aprovado como visual definitivo e o que não pode mudar sem aprovação do CTO".

## Propósito

Registrar decisões de congelamento visual — telas ou componentes que passaram de "em evolução" para "referência definitiva" — e o que continua permitido (integração, performance, acessibilidade, SEO, manutenibilidade) versus proibido (redesenho, mudança de espaçamento/tipografia/cor/proporção/sombra/layout) em cada superfície congelada.

## Documentos desta pasta

| Documento | Responde |
|---|---|
| `DESIGN_CONSTITUTION.md` | Congelamento da Premium Home Experience (Home + `/categorias`) — aprovado pelo CTO em 2026-07-06 (Release 1.9, ADR-050) |

## Quando criar um novo documento aqui

Quando o CTO aprova formalmente outra superfície do produto (ex.: uma futura tela de Merchant Dashboard) como visual definitivo, e o congelamento precisa de suas próprias regras de "o que pode/não pode mudar". Não é para propostas de design ainda em avaliação — apenas para decisões já aprovadas.

## Quando não criar

- Para a arquitetura técnica por trás de uma tela → `docs/engineering/` (ex.: `PREMIUM_HOME_EXPERIENCE.md`)
- Para um componente ainda em desenvolvimento, não aprovado como definitivo → nenhum documento ainda — não existe até haver aprovação
- Para filosofia permanente de produto/UX → `docs/foundation/PRODUCT_PRINCIPLES.md`
- Para registrar a decisão de congelamento em si (por que, quando, quem aprovou) → `docs/operations/DECISIONS.md` (ADR)

## Convenção

Todo documento aqui declara uma superfície específica como congelada, lista explicitamente o que é proibido mudar e o que continua permitido, e nomeia o caminho para pedir exceção (sempre aprovação explícita do CTO, nunca decisão unilateral de quem implementa).
