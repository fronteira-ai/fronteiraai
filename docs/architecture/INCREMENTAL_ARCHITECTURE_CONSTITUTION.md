# INCREMENTAL_ARCHITECTURE_CONSTITUTION.md
# Program Ξ (Xi) — Mission Ξ-3 — Incremental Marketplace Architecture

**Categoria**: `docs/architecture/`
**Criado**: 2026-07-16
**Status**: Constituição arquitetural de engenharia — regras permanentes para implementação futura do Marketplace Memory/Learning Engine/Event Engine (Program Ξ, Missions Ξ-1/Ξ-2, ainda não implementadas). Fundamentada inteiramente em auditorias já realizadas nesta sequência de Programs (Κ, Ψ, OPS, Π, Ξ) — nenhuma decisão aqui contradiz um documento já aprovado.
**Nota de governança**: este documento vive em `docs/architecture/` (arquitetura de engenharia), não em `docs/foundation/` (9 documentos permanentes, hierarquia máxima do projeto, exige ADR própria para expansão — `CLAUDE.md`). Elevá-lo a `docs/foundation/` é uma decisão do CTO, não tomada aqui.
**Ver também**: todos os documentos de Program Κ, Ψ, OPS-1, Π-1, Ξ-1, Ξ-2 — nenhum é substituído, todos são a base factual desta Constituição.

---

## Artigo 1 — Domain Audit: responsabilidade única e exclusiva por domínio

| Domínio | Estado real hoje | Responsabilidade exclusiva (definitiva) |
|---|---|---|
| **Identity** (`src/domains/product-identity/`) | Real, em produção (Release 1.7, wired Κ-4) | Decidir "é o mesmo produto?" para um par — nunca decide "devo unir?" (isso é Merge Engine) |
| **Knowledge Graph** (proposto, Π-1) | Camada lógica de composição, não implementada | Compor identidade estruturada (marca, `manufacturerCode`, modelo, categoria) a partir de fatos já existentes — nunca calcula um fato novo, nunca decide identidade |
| **Marketplace Memory** (proposto, Ξ-1/Ξ-2) | Não implementada | Persistir a saída de funções determinísticas já existentes (`buildProductSignature`, `extractManufacturerCode`) — nunca decide, nunca infere, só lembra |
| **Learning Engine** (proposto, Ξ-2) | Não implementada | Orquestrar o ciclo de vida do conhecimento (validação→persistência→versionamento→invalidação) sobre a Marketplace Memory — nunca é a Memória em si |
| **Event Engine** (proposto, esta Mission) | Precedente real parcial: `merchant-analytics/services/EventPlatformService.ts`/`EventStreamService.ts` (eventos de comportamento de comprador, escopo restrito) | Transportar fatos entre domínios sem que nenhum conheça o outro diretamente — zero lógica de negócio própria, só publicação/assinatura |
| **Merge Engine** (`canonical-catalog/services/MergeExecutorService.ts`) | Real, em produção (Program Ω) | Executar (ou reverter) uma união de 2 `canonical_products` já aprovada por humano — nunca decide identidade, nunca gera candidato |
| **Opportunity Engine** (`buyer-intelligence/services/OpportunityEngine.ts`) | **Real, mas fisicamente co-localizado dentro de `buyer-intelligence/` hoje** — não é uma pasta de domínio própria | Calcular "isto é uma boa oportunidade?" sobre ofertas já resolvidas — nunca compõe a experiência final do comprador (isso é Buyer Intelligence) |
| **Buyer Intelligence** (`buyer-intelligence/`) | Real, em produção | Compor múltiplos sinais (Opportunity, Trust, Comparação, Timing) na experiência final do comprador — nunca recalcula o que os composers/engines fonte já calcularam |
| **Search** (`services/search.service.ts`) | **Real, mas é um serviço de camada superior (`services/`), não um domínio de `src/domains/`** | Resolver texto de busca em produtos — nunca decide identidade, nunca compõe Opportunity |
| **Advisor** (`ParaguAIAdvisorComposer.ts`, dentro de `buyer-intelligence/`) | Real, mas co-localizado, mesma observação de Opportunity Engine | Recomendação de alto nível para o comprador — consome Buyer Intelligence, nunca a substitui |
| **Exchange** (`src/domains/exchange/`) | Real, em produção | Conversão de moeda — nunca decide preço, nunca decide identidade, é uma função pura de entrada→saída para qualquer domínio que precise exibir valor convertido |
| **Connector Platform** (`src/domains/connectors/`) | Real, em produção (Program A, V2/V3) | Trazer dado bruto de um merchant para `products`/`offers` — nunca decide identidade (a única exceção real hoje, `ProductIdentityShadowStage`, já nomeada como dívida técnica em `PRODUCT_IDENTITY_PIPELINE.md`, Κ-4 — esta Constituição a resolve no Artigo 3) |

**Regra permanente**: nenhum domínio pode assumir a responsabilidade nomeada como exclusiva de outro. Onde o código real hoje viola isso (Opportunity Engine/Advisor dentro de `buyer-intelligence/`), a violação é física (organização de pasta), não lógica (a responsabilidade já é logicamente distinta e testável separadamente) — aceitável até uma Mission de implementação decidir separar fisicamente, nunca aceitável como justificativa para misturar a LÓGICA dos dois.

## Artigo 2 — Dependency Map (Objetivo 2)

```
Connector Platform ─────► products/offers (tabelas brutas)
                              │
                              ▼
                    Canonical (Merge Engine's dono, canonical-catalog/)
                              │
              ┌───────────────┼────────────────┐
              ▼               ▼                ▼
          Identity      Knowledge Graph   Marketplace Memory
      (product-identity/)  (taxonomy/ +    (proposto — persiste
              │            product-intel/)  saída dos 2 ao lado)
              │               │                │
              └───────┬───────┴────────────────┘
                      ▼
                Learning Engine (proposto)
                      │
                      ▼
              ┌───────┴────────┐
              ▼                ▼
        Event Engine ◄─────────┘ (todo domínio acima PUBLICA aqui)
              │
    ┌─────────┼──────────┬───────────┬──────────┐
    ▼         ▼           ▼           ▼          ▼
Opportunity  Buyer     Search      Advisor   (futuros domínios)
 Engine   Intelligence
    │         │
    └────┬────┘
         ▼
    (nenhum consumidor final depende de outro consumidor final)

Exchange: consumido por QUALQUER domínio que exiba preço — nunca depende de nenhum outro domínio de negócio (função pura de conversão)
```

**Quem nunca poderá depender de quem (regra permanente)**:
- Connector Platform nunca depende de Identity/Merge/Memory/Learning — só produz dado bruto.
- Merge Engine nunca depende de Opportunity/Buyer Intelligence/Search/Advisor — a hierarquia é estritamente de baixo para cima.
- Identity nunca depende de Marketplace Memory/Learning Engine — a Memória é uma OTIMIZAÇÃO de leitura sobre o que Identity já calcula, nunca uma fonte de decisão que Identity consulta (evita circularidade: Identity → Memory → Identity).
- Opportunity Engine, Buyer Intelligence, Search, Advisor nunca dependem uns dos outros diretamente — cada um consome o Event Engine ou o estado já resolvido (Comparable Coverage, `canonical_product_id`), nunca chama outro consumidor final.
- Exchange nunca depende de nenhum domínio de negócio — é uma folha pura na árvore de dependências.

**Quem apenas publica eventos**: Connector Platform, Merge Engine, Identity (quando resolve um fato novo).
**Quem apenas consome eventos**: Opportunity Engine, Buyer Intelligence, Search, Advisor.
**Quem publica E consome**: Marketplace Memory/Learning Engine (consome fatos publicados por Identity/Knowledge Graph, publica `KnowledgeLearned` para os consumidores finais).

## Artigo 3 — Incremental Flow (Objetivo 3) — 8 cenários

| Cenário | Domínios que executam | Domínios que NÃO executam | Eventos publicados | Projeções atualizadas |
|---|---|---|---|---|
| Produto novo | Connector → Canonical → Identity → Knowledge Graph → Memory (grava) | Merge Engine (só se Identity encontrar candidato ≥70%) | `ProductCreated`, `SignatureChanged`, `KnowledgeLearned` (se fato novo) | Comparable Coverage (só se candidato existir) |
| Produto alterado | Connector → Canonical (`diffFromProduct`, já existe) → Identity/Knowledge Graph SÓ SE o campo alterado afeta um fato aprendido | Merge Engine (a menos que a alteração invalide um merge já executado — caso raro, fora do escopo) | `ProductUpdated`, `SignatureChanged` (só se afetado) | Mesma regra — só recalcula o que mudou |
| Produto removido | Connector (marca oferta como removida) | Identity/Merge/Memory — o fato de identidade já aprendido permanece válido (o produto pode reaparecer) | `ProductRemoved`, `OfferRemoved` | Comparable Coverage (perde 1 membro do grupo) |
| Preço alterado | Connector → Exchange (se moeda diferente de USD) | Identity/Merge/Knowledge Graph — preço nunca afeta identidade | `PriceChanged` | Opportunity Engine (recalcula "boa oferta?"), nunca Identity |
| Categoria alterada (na fonte) | Connector → Canonical (`diffFromProduct`) → Knowledge Graph (categoria é insumo do gate de Identity) → Identity (reavalia candidatos) | Merge Engine (não decide sozinho, só executa o que já foi aprovado) | `ProductUpdated`, `IdentityChanged` (se o gate mudar de resultado) | Comparable Coverage (categoria é um gate — pode abrir ou fechar candidatos) |
| Merchant novo | Connector Platform (onboarding) → Canonical → Identity, mas **avaliado só contra a Marketplace Memory já existente** (`KNOWLEDGE_PROPAGATION.md`, Ξ-2 — não reprocessa o catálogo inteiro) | Todo o resto do catálogo já existente | `MerchantLearned` (se padrão de chave novo, `MERCHANT_LEARNING.md`) | Merchant Coverage |
| Merchant removido | Connector Platform (desativa) | Identity/Merge/Memory — fatos aprendidos permanecem (podem servir outro merchant amanhã) | `ProductRemoved`/`OfferRemoved` em lote | Comparable Coverage, Merchant Coverage |
| Produto descontinuado | Connector (para de sincronizar) | Todo o resto — nenhuma ação proativa, só ausência de novos eventos | Nenhum evento novo — a AUSÊNCIA de sync é o sinal, não um evento em si | Freshness (Marketplace Health, já existente) degrada naturalmente |

## Artigo 4 — Event Catalog (Objetivo 4)

| Evento | Origem | Consumidores | Impacto | Persistência |
|---|---|---|---|---|
| `ProductCreated` | Connector Platform | Canonical | Cria `canonical_products` | Implícita (a própria linha criada) |
| `ProductUpdated` | Connector Platform | Canonical, Knowledge Graph | Pode invalidar fato aprendido | Implícita |
| `PriceChanged` | Connector Platform | Exchange, Opportunity Engine | Recalcula "boa oferta?" | `price_history` (já existe) |
| `OfferCreated` | Connector Platform | Canonical, Identity | Pode gerar candidato de merge | Implícita |
| `OfferRemoved` | Connector Platform | Comparable Coverage (projeção) | Reduz grupo | Implícita |
| `SignatureChanged` | Knowledge Graph | Marketplace Memory | Fato de identidade precisa reavaliação | **Sim — é o próprio fato aprendido** |
| `IdentityChanged` | Identity | Merge Engine (gera candidato), Marketplace Memory | Novo candidato de merge | `merge_candidates` (já existe) |
| `KnowledgeLearned` | Marketplace Memory | Todo domínio consumidor (Opportunity, Buyer Intelligence, Search, Advisor, futuros Connectors) | Fato novo disponível sem recomputação | **Sim — é o registro permanente** |
| `MerchantLearned` | Marketplace Memory (via Merchant Learning, `MERCHANT_LEARNING.md`) | Connector Platform (próximos syncs do mesmo merchant) | Padrão de chave confirmado | **Sim** |
| `CategoryLearned` | Knowledge Graph | Identity, Search | Novo mapeamento categoria→Universal Taxonomy | **Sim** |
| `RelationshipLearned` | Knowledge Graph (gap real, `PRODUCT_KNOWLEDGE_GRAPH.md`, Π-1) | Search, Advisor | Relação produto-a-produto nova | **Sim** |
| `OpportunityUpdated` | Opportunity Engine | Buyer Intelligence, Advisor | Recalcula recomendação | Não — sempre derivado, nunca fonte de verdade |
| `AdvisorUpdated` | Advisor | Nenhum (é o topo da cadeia de consumo) | — | Não |

## Artigo 5 — Aggregate Boundaries (Objetivo 5) — sem sobreposição

| Aggregate | Pertence | Nunca pertence |
|---|---|---|
| **Product Aggregate** | `canonical_products`, `ProductSignature` (quando persistido), relacionamentos de identidade | Preço (é do Offer Aggregate), decisão de merge (é do Identity Aggregate) |
| **Merchant Aggregate** | `stores`, `merchants`, `connector_configs`, padrões de escrita aprendidos por merchant | Produtos que o merchant vende (isso é Offer Aggregate apontando para Product Aggregate) |
| **Offer Aggregate** | `offers`, preço, estoque, `price_history` | Identidade do produto (só referencia `canonical_product_id`, nunca decide o que é) |
| **Identity Aggregate** | `merge_candidates`, `merge_executions`, o resultado de `ProductIdentityEngine.evaluate()` | O fato de assinatura em si (isso é Knowledge Aggregate) — Identity CONSOME assinatura, não a possui |
| **Knowledge Aggregate** | `ProductSignature` calculado, Universal Taxonomy, `manufacturerCode`/modelo extraídos | Decisão de merge (Identity Aggregate) |
| **Learning Aggregate** | O ciclo de vida do fato (versão, confiança, data de aprendizado, invalidação) — a META-informação sobre o Knowledge Aggregate, não o fato em si | O fato em si (isso é Knowledge Aggregate — Learning só sabe SOBRE o fato, não É o fato) |
| **Opportunity Aggregate** | Cálculo de "boa oferta", `Opportunity` records | Composição final para o comprador (Buyer Aggregate) |
| **Buyer Aggregate** | `buyer_identities`, `buyer_events`, preferências, composição final de Advisor/Buyer Intelligence | Cálculo de Opportunity em si (só consome o resultado) |

## Artigo 6 — Read Models (Objetivo 6)

| Projeção | Recalculável | Persistente | Descartável | Derivada de |
|---|---|---|---|---|
| Comparable Coverage (CPC) | Sim, sempre, a partir de `offers.canonical_product_id` | Não precisa — é barata de recalcular hoje (confirmado, `cpc-report.ts`) | Sim | Offer + Product Aggregate |
| `ProductSignature` persistido (Memory) | Sim, mas caro (624,2x medido, Ξ-2) | **Sim — esta é a própria razão de existir da Memória** | Não | Product Aggregate |
| Marketplace Health Score | Sim, sempre (8 fatores, todos `count`-only) | Sim, 1 snapshot/dia (já existe, `marketplace_health_snapshots`) | Snapshots antigos são história, nunca descartáveis | Múltiplos Aggregates |
| Merge Queue (pendentes) | Não — é o próprio estado, não uma projeção | Sim (`merge_candidates`) | Não | Identity Aggregate |
| Opportunity/Advisor de um produto | Sim, sempre, on-demand | Não precisa | Sim | Offer + Knowledge + Opportunity Aggregate |

## Artigo 7 — Future Scalability (Objetivo 7)

| Componente | 100 mil | 500 mil | 1 milhão | 5 milhões | 10 milhões |
|---|---|---|---|---|---|
| Health Engine/Metrics/Alertas (count-only) | ✅ | ✅ | ✅ | ✅ | ✅ — escala horizontalmente por natureza (`MARKETPLACE_FOUNDATION_SCALE_AUDIT.md`) |
| Agregação categoria/marca em memória | ⚠️ ponto de virada já medido aqui | ❌ precisa `GROUP BY` Postgres | ❌ | ❌ | ❌ |
| Geração de candidato de merge (sem Memory) | ❌ já severo (7,7x desperdício a 50 mil, Ξ-2) | ❌ catastrófico (772x) | ❌ | ❌ | ❌ |
| Geração de candidato de merge (COM Memory, Objetivo desta Constituição) | ✅ O(N), escala horizontalmente | ✅ | ✅ | ✅ | ✅ |
| Merchant Priority Engine | ✅ (gatilho real é 5M **ofertas**, não produtos) | ✅ | ✅ | ⚠️ ponto de virada já medido | ❌ |
| Event Engine (proposto) | ✅ — mesmo padrão de `buyer_events`, append-only, já provado indefinidamente escalável | ✅ | ✅ | ✅ | ✅ |

**Componentes que só precisam escalar horizontalmente (nunca redesenhar)**: qualquer domínio cuja leitura é `count`-only ou por chave (Health Engine, Event Engine, Marketplace Memory por `canonical_product_id`) — todos já seguem esse padrão hoje, confirmado em auditoria de código real, não presumido.

## Artigo 8 — Implementation Order (Objetivo 8) — por dependência técnica, nunca por opinião

1. **Learning Aggregate + Knowledge Aggregate (persistência)** — pré-requisito técnico de tudo abaixo; reversível (é só uma tabela nova aditiva, sem tocar `canonical_products`/`products`).
2. **Event Engine** (generalização do padrão já provado por `EventPlatformService`) — pode ser construído em paralelo ao item 1, sem depender dele.
3. **Marketplace Memory wired em `CanonicalMergeSuggestionService`** (ler-antes-de-calcular) — depende de 1 existir; preserva 100% do comportamento atual como fallback (se a Memória não tem o fato, calcula como hoje — nunca quebra produção).
4. **Merchant Learning** — depende de 1-3; aditivo, não modifica nenhum merchant já sincronizado.
5. **Pattern Learning por recorrência** — depende de 1-4 existirem e terem dado real acumulado.

Cada etapa preserva rollback (nenhuma migration destrutiva, cada camada é aditiva sobre a anterior) e não quebra produção (o comportamento atual é sempre o fallback quando a camada nova não tem o fato ainda).

## Artigo 9 — Cláusula de imutabilidade

Nenhuma implementação futura poderá: (a) fazer um domínio downstream (Opportunity, Buyer Intelligence, Search, Advisor) depender diretamente de outro domínio downstream; (b) fazer Identity ou Merge Engine consultar Marketplace Memory como fonte de decisão (só como otimização de leitura, nunca de verdade); (c) misturar a responsabilidade lógica de dois domínios mesmo que fisicamente co-localizados (Opportunity Engine/Advisor dentro de `buyer-intelligence/` hoje); (d) criar um evento sem um consumidor real nomeado no Artigo 4.
