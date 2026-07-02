# ROADMAP_1_8.md
# Release 1.8 Organizado em Programas

**Versão**: 1.0
**Criado**: 2026-07-02 (Sprint Zero — Release 1.8 Project Preparation & Foundation Consolidation)
**Status**: Referência oficial de execução do Release 1.8
**Fonte**: reorganiza as 8 Waves já definidas em `docs/product/releases/RELEASE_1_8_BLUEPRINT.md` Capítulo 12 em Programas — não redefine escopo, técnica ou sequência de dependência já decidida ali.

---

## Por que Programas, e não só Waves

Uma Wave é uma unidade de entrega técnica. Um Programa é uma unidade de **valor de negócio reconhecível** — o CTO pode perguntar "como está o Programa de Marketplace Expansion?" e receber uma resposta de negócio, não uma lista de tarefas técnicas. Waves continuam sendo a unidade real de planejamento/execução (Quality Gate por Wave, `RELEASE_1_8_BLUEPRINT.md`); Programas são o agrupamento que torna o roadmap legível para decisões de priorização e comunicação externa.

**Nota de transparência**: o mandato do CTO deu 5 Programas de exemplo (Marketplace Expansion, Buyer Experience, Merchant Growth, SEO & Organic Growth, Marketplace Intelligence). Este documento usa 6 — os 5 exemplos mais um Programa de infraestrutura (Live Commerce Infrastructure) que não se encaixa honestamente em nenhum dos 5 sem forçar a categorização, e junta Fronteira Agora dentro de Buyer Experience (ambos são superfície voltada ao comprador, e Fronteira Agora sozinho não tem peso de negócio suficiente para um Programa próprio). Desvio justificado, não silencioso.

---

## Ordem oficial dos Programas (por impacto no negócio)

```
1. PROGRAM A — Live Commerce Infrastructure     (Waves 1-2)
2. PROGRAM B — Marketplace Expansion             (Wave 3, contínuo)
3. PROGRAM E — Buyer Experience                  (Waves 6-7)
4. PROGRAM C — Marketplace Intelligence          (Wave 4)
5. PROGRAM D — SEO & Organic Growth              (Wave 5)
6. PROGRAM F — Merchant Growth                   (Wave 8)
```

---

## PROGRAM A — Live Commerce Infrastructure

**Por que primeiro**: sem isso, nenhuma outra promessa de valor do Release 1.8 é estruturalmente verdadeira — comparação de preço desatualizado ou câmbio não confiável mina a credibilidade de tudo que vem depois.

| Wave | Escopo | Status |
|---|---|---|
| Wave 1 | Exchange Engine — USD/BRL/PYG, conversão automática, nunca sobrescreve o original | ADR-043 decidido (fornecedor: ExchangeRate-API.com). Desbloqueada. |
| Wave 2 | Live Pricing Engine + Freshness Engine — tiers de demanda, refresh de minutos para produtos populares | Arquitetura definida (`RELEASE_1_8_BLUEPRINT.md` Capítulo 2/4). Risco nomeado: escala sem fila real (ver `RELEASE_1_8_BLUEPRINT.md` Capítulo 2, e Fase 9 deste Sprint). |

**Assets/Moats fortalecidos**: C-5 (Cross-Border Context, matura de implícito para instrumentado), C-7 (Live Commerce Velocity, novo), Moat 9 (novo).

---

## PROGRAM B — Marketplace Expansion

**Por que segundo**: testa a tese de compounding de conectores (`NORTH_STAR.md` §13) com volume real pela primeira vez desde o Release 1.7, e cada loja nova entra já se beneficiando da infraestrutura do Programa A.

| Wave | Escopo | Status |
|---|---|---|
| Wave 3 | Primeiro lote de lojas nomeadas pelo CTO, priorizadas por critério de score (`RELEASE_1_8_BLUEPRINT.md` Capítulo 1). Onboarding contínuo depois, não um evento único. | Arquitetura definida, aguardando início. |

**Assets/Moats fortalecidos**: S-1 (Merchant Network), C-3 (Normalized Catalog, indiretamente via mais produtos/marcas).

---

## PROGRAM E — Buyer Experience

**Por que terceiro**: a decisão arquitetural mais consequente do Release (ADR-045/046) já está completa — este é o Programa que converte essa decisão em experiência real, e é pré-requisito para qualquer medição real de retenção usada pelos Programas seguintes.

| Wave | Escopo | Status |
|---|---|---|
| Wave 6 | Buyer Account System (contas, favoritos, wishlist, alertas, histórico, notificações, Compra Inteligente) | Buyer Identity Model completo (ADR-045/046). Falta apenas fornecedor de notificação (ADR pendente) e 2 achados de segurança de severidade alta (não corrigidos, nomeados na ADR-046) a resolver antes do lançamento público. |
| Wave 7 | Fronteira Agora — bloco de baixa incerteza (câmbio, horários, datas) primeiro; câmeras/Ponte da Amizade/clima/fluxo como sub-waves condicionais à viabilidade | Arquitetura definida (`RELEASE_1_8_BLUEPRINT.md` Capítulo 9). |

**Assets/Moats fortalecidos**: C-6 (Buyer Behavioral Knowledge, matura para Ativo Maduro), Moat 6 (Data Flywheel, acelera).

---

## PROGRAM C — Marketplace Intelligence

**Por que quarto**: precisa do volume de dado que os Programas A e B produzem para gerar rankings/insights estatisticamente significativos — executar antes produziria análise sobre uma base de dado pequena demais para ser confiável.

| Wave | Escopo | Status |
|---|---|---|
| Wave 4 | Volatilidade, sazonalidade, ranking de lojas/categorias/marcas | Arquitetura definida (`RELEASE_1_8_BLUEPRINT.md` Capítulo 5). Matura F-4 (Marketplace Liquidity Model) de "Não iniciado" para "Coleta Inicial". |

---

## PROGRAM D — SEO & Organic Growth

**Por que quinto**: depende do Programa C para gerar conteúdo diferenciado — SEO em escala sem esse insumo arrisca conteúdo fino/penalizável (`RELEASE_1_8_BLUEPRINT.md` Capítulo 7).

| Wave | Escopo | Status |
|---|---|---|
| Wave 5 | Páginas de categoria/marca, landing pages programáticas, conteúdo automático lastreado em dado real | Arquitetura definida. Fundação de sitemap-index já entregue na Wave 6 do Release 1.7. |

---

## PROGRAM F — Merchant Growth

**Por que último**: "valor antes de cobrança" (`PRODUCT_POLICY.md`) só é uma promessa cumprida se todos os Programas anteriores já entregaram valor real e demonstrável antes de qualquer gatilho de upgrade. Executar este Programa antes venderia uma promessa, não um resultado.

| Wave | Escopo | Status |
|---|---|---|
| Wave 8 | Billing real, gatilhos de upgrade baseados em limite/insight demonstrado, `PremiumActivated` emitido de verdade | Arquitetura definida (`RELEASE_1_8_BLUEPRINT.md` Capítulo 8). Recomendado: escrever ADR-041 (Trust Signal, reservado desde o Release 1.5) antes ou durante este Programa. Fornecedor de billing ainda sem ADR. |

---

## Decisões arquiteturais bloqueadoras — status consolidado

| Decisão | Programa afetado | Status |
|---|---|---|
| Fornecedor de câmbio | A | ✅ ADR-043 |
| Modelo de dados pessoais de comprador | E | ✅ ADR-045 |
| Buyer Identity Model completo | E | ✅ ADR-046 |
| Fornecedor de notificação (push/e-mail) | E | ⬜ Pendente |
| Fornecedor de billing | F | ⬜ Pendente |

Nenhuma Wave começa antes de sua decisão bloqueadora correspondente estar resolvida — Programas A e a maior parte de E já estão desbloqueados; Programas B, C, D não têm decisão bloqueadora própria (podem começar assim que sua dependência técnica de Program anterior estiver pronta); F aguarda o fornecedor de billing.
