# MARKETPLACE_LEARNING_ENGINE.md
# Program Ξ (Xi) — Mission Ξ-2 — Marketplace Learning Engine

**Categoria**: `docs/architecture/`
**Criado**: 2026-07-16
**Status**: Proposta arquitetural pura. Zero código, zero migration, zero algoritmo alterado. Aprofunda `docs/architecture/MARKETPLACE_MEMORY.md` (Mission Ξ-1) de esboço conceitual para arquitetura de domínio completa.
**Ver também**: `LEARNING_LIFECYCLE.md`, `KNOWLEDGE_PROPAGATION.md`, `MERCHANT_LEARNING.md`, `PATTERN_LEARNING.md`, `docs/product/LEARNING_ROADMAP.md`.

---

## 1. O que este domínio NÃO é (framing explícito do brief)

**Não é cache**: cache é otimização de performance, descartável a qualquer momento sem perda de correção — se o cache de hoje desaparecer, o sistema recalcula e chega ao mesmo resultado. **Não é banco de dados**: não é só uma tabela nova guardando valores. É **patrimônio institucional versionado** — o mesmo princípio que já rege `merge_executions` (Program Ω): append-only, nunca apagado, auditável, e que sobrevive a uma mudança de algoritmo (uma versão nova do extrator não invalida silenciosamente o que a versão antiga já aprendeu — ver `LEARNING_LIFECYCLE.md` §Versionamento).

## 2. Knowledge Audit (Objetivo 1) — item por item, verificado por leitura de código

| Fato | Recalculado a cada sincronização? | Onde, no código real |
|---|---|---|
| manufacturerCode | **Sim** — `buildProductSignature()`, função pura, zero cache (Κ-3) | `product-intelligence/extraction/ProductSignatureExtractor.ts` |
| modelo | **Sim** — mesma função | idem |
| categoria (Universal Taxonomy) | **Sim** — `findNodeByRealCategorySlug()` a cada `suggestMergesFor` | `product-identity/services/CanonicalMergeSuggestionService.ts` (Κ-4) |
| marca | **Não** — `brand_id` já é FK persistida; só a normalização de nome (`normalizeBrandName`) seria recalculada, e não está wired (decisão Κ-5) | `taxonomy/data/brand-normalization.ts` |
| linha / família | **N/A** — nunca calculado, gap de conceito, não de cache (Π-1) | — |
| capacidade, cor, voltagem | **Sim** — mesmos campos de `ProductSignature` | Κ-3 |
| tokens (nome) | **Sim, e pior que os demais** — `tokenize()` roda a cada par avaliado dentro de `ProductIdentityEngine.evaluate()`, não uma vez por produto por sync — recalculado **uma vez por candidato comparado**, não uma vez por produto | `product-identity/domain/ProductIdentityEngine.ts` |
| aliases (`ATTRIBUTE_KEY_ALIASES`) | **Não recalculado** — constante estática hardcoded, mas também **nunca cresce** — não é memória, é regra fixa | `product-intelligence/extraction/attribute-key-aliases.ts` |
| specifications (bruto) | **Não** — já persistido em `canonical_products.specifications` | — |
| patterns (por merchant) | **N/A** — nunca existiu como conceito (achado real desta Mission, `MERCHANT_LEARNING.md`) | — |
| merchant mappings | **N/A** — mesmo gap | — |
| category mappings (`realCategorySlugs`) | **Não recalculado, mas também estático** — mesmo padrão de `aliases` | `taxonomy/data/universal-tree.ts` |
| relationships | **N/A** — gap já nomeado por Π-1 | — |

**Medição real do custo** (Objetivo 7, aprofundado aqui): agrupando os 17.983 `canonical_products` ativos por `brand_id` (850 marcas distintas), o padrão de acesso real de `suggestMergesFor` (busca o coorte de marca inteiro via `findByBrandId`, recalcula `buildProductSignature` para cada candidato, a cada chamada) produz **11.224.835 computações de assinatura** ao longo de uma passada completa, quando **17.983** bastariam com memoização por produto — um **fator de redundância real de 624,2x**. Um único agrupamento de marca (`"Outros"`, N=3.054) responde por 9.326.916 dessas — 83% de todo o desperdício medido.

## 3. Learning Engine Architecture (Objetivo 2)

| Componente | Papel | Composição com o que já existe |
|---|---|---|
| **Learning Repository** | Interface de acesso a fatos aprendidos — mesmo padrão de `ICanonicalCatalogRepository` (Program Ω): uma interface, uma implementação Supabase, zero acoplamento direto | Nova interface, no espírito de `IMergeCandidateRepository` |
| **Learning Store** | Onde o fato vive fisicamente — conceito de armazenamento, não uma tabela desenhada aqui (schema é decisão de Mission futura, com migration) | Análogo a `merge_executions`: append-only, nunca sobrescrito |
| **Learning Service** | Orquestra ler-antes-de-calcular: recebe um pedido de `ProductSignature` para um produto, consulta o Learning Repository primeiro, só invoca `buildProductSignature()` (inalterado) em caso de ausência ou invalidação | Wrapper fino sobre a função pura já existente — nunca a substitui |
| **Learning Composer** | Junta fatos de múltiplas fontes de aprendizado (por produto + por marca+código + por merchant) na mesma resposta — mesmo padrão de composição já usado por `CompareFoundationService`/`OpportunityEngine` | Reaproveita o padrão, não a lógica |
| **Learning Events** | Registro de quando um fato foi aprendido, confirmado, ou invalidado — mesmo espírito de `merchant_analytics_events`/`TrustEventType` (Release 1.5+), já maduro no ParaguAI | Reaproveitar a infraestrutura de eventos já existente, não recriar |
| **Learning Cache** | A única camada verdadeiramente efêmera do domínio — memória de processo (Node), para evitar releitura do Learning Store dentro de uma única execução (ex.: um bootstrap inteiro). Nunca a fonte de verdade — só otimização sobre a fonte de verdade real (o Store) | Novo, mas trivial — mesmo padrão já usado por `ExchangeRateCache` (TTL curto, por processo) |
| **Learning Persistence** | A escrita real do fato aprendido — sempre determinística, nunca probabilística (reafirma a restrição "não criar IA") | Nova camada de escrita, sobre uma tabela a ser desenhada em Mission futura |
| **Learning Versioning** | Cada fato carrega a versão do extrator que o produziu (`PRODUCT_IDENTITY_ALGORITHM_VERSION` já existe, `product-identity/types/enums.ts` — o precedente exato para este conceito) | Reaproveita um padrão de versionamento que já existe no sistema, só estende de "resultado de match" para "fato de extração" |
| **Learning Invalidator** | Decide quando um fato aprendido deixa de ser confiável — gatilho já existe: `CanonicalProductService.diffFromProduct()` (Κ-4) já detecta quando `specifications`/`name` de origem mudou | Reaproveita a detecção de drift já construída, não cria uma nova |
| **Learning Propagation** | Garante que um fato aprendido uma vez fica disponível para todo consumidor sem recomputação — ver `KNOWLEDGE_PROPAGATION.md` | Composição lógica, mesmo padrão já provado pela simulação de agrupamento de Mission Π-1 |

## 4. Por que isto nunca aumenta trabalho humano (Quality Gate)

Nenhum componente acima decide um merge, aprova uma extração de baixa confiança, ou substitui revisão humana — cada um só evita recalcular o que um humano (ou o próprio Engine, de forma determinística) já validou antes. Ver `CONFIDENCE_ENGINE.md` (Mission Ξ-1) para a árvore de decisão que continua intocada.
