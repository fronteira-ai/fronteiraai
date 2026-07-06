# docs/marketplace/

Documentação sobre as lojas reais da fronteira que o ParaguAI observa e integra — não sobre o próprio ParaguAI. Enquanto `product/`/`architecture/`/`engineering/` respondem "o que o ParaguAI é/faz", esta pasta responde "o que as lojas reais do mercado são, tecnicamente e comercialmente" — o dossiê que fundamenta toda decisão de onboarding de Connector.

## Propósito

Registrar, por loja, a auditoria técnica (robots.txt, sitemap, estrutura de URL, moeda, mecanismos anti-bot), a estratégia de integração recomendada e o status de certificação do Connector — de forma que qualquer pessoa (ou IA) decidindo "vale a pena construir/manter um Connector para esta loja?" encontre a resposta aqui, sem precisar reconstruir a investigação.

## Documentos desta pasta

| Documento | Responde |
|---|---|
| `Tier1_Merchants.md` | Auditoria técnica + certificação dos 10 merchants Tier 1 nomeados pelo CTO (Release 1.8 — Program A — Wave 3) |

## Quando criar um novo documento aqui

Ao auditar um novo lote de lojas (Tier 2, Tier 3, etc.) ou ao criar um tipo de dossiê genuinamente novo sobre o mercado observado (ex.: `COMPETITOR_LANDSCAPE.md`, se o ParaguAI algum dia formalizar análise de concorrência). Novos documentos aqui não exigem nova ADR de categoria (a categoria já existe, ADR-048) — apenas seguem a convenção abaixo.

## Quando não criar

- Para o padrão de código de um Connector (`connector.ts`/`config.ts`/parsers) → `docs/engineering/CONNECTOR_GUIDE.md`
- Para o estado do Connector Platform como sistema → `docs/architecture/ARCHITECTURE.md` / `docs/operations/PROJECT_STATUS.md`
- Para uma decisão estrutural sobre como o certificado é computado → `docs/operations/DECISIONS.md` (ADR)
- Para o roadmap de expansão de lojas (quantas, quando) → `docs/product/releases/RELEASE_1_8_BLUEPRINT.md` Capítulo 1 / `docs/product/ROADMAP_1_8.md`

## Convenção

Todo documento aqui é sobre uma entidade **externa e real** (uma loja, um conjunto de lojas) — nunca sobre a arquitetura interna do ParaguAI que as processa. Campos de auditoria técnica (robots.txt, sitemap, anti-bot) devem refletir o que foi de fato observado, com data — nunca inferido silenciosamente. `Certification Status` nunca é otimista: reflete o estado real verificado, incluindo bloqueios (`Restricted — Commercial Partnership Recommended`) quando aplicável.
