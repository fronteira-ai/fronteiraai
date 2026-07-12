# ATTRIBUTE_PRIORITY_MATRIX.md
# FASE 2 — SPRINT 2.4 — Data Quality Discovery — Objetivo 4

**Categoria**: `docs/product/`
**Data**: 2026-07-11
**Companion**: `ATTRIBUTE_COVERAGE_MATRIX.md` (disponibilidade), `CATEGORY_NORMALIZATION_REPORT.md`, `MERGECANDIDATE_FLOW_REPORT.md` da Sprint 2.3 (base numérica para os impactos em Product Identity/CPC)

---

## 1. Método

Impacto classificado **apenas onde há um mecanismo já observado e evidenciado nesta Sprint ou na Sprint 2.3** que liga o atributo ao KPI — não por analogia genérica. **Offer Density é uma métrica de volume de oferta (ofertas/produtos) — nenhum atributo de qualidade de dado a move, por definição**; classificado honestamente como "Nenhum" em todas as linhas, não estimado por otimismo.

## 2. Matriz de impacto

| Atributo | Comparable Product Coverage | Offer Density | Qualidade do sinal de Product Identity | Search Quality | AI Readiness | Disponível hoje sem nova extração |
|---|---|---|---|---|---|---|
| **Normalização de categoria (taxonomia)** | **Muito Alto** — remove o gate binário que hoje força `confidence ≤ 40` mesmo para pares idênticos (`MERGECANDIDATE_FLOW_REPORT.md` §4, caso AirPods Pro 3) | Nenhum | **Muito Alto** — corrige um falso-negativo estrutural, não um ajuste de peso | **Alto** — navegação por categoria hoje fragmentada em duplicatas | Médio | Sim — dado já em `category_id`, só precisa de mapeamento |
| **Capacidade/Armazenamento (specs)** | **Muito Alto** — é o atributo que mais frequentemente distingue as variantes reais dos produtos estratégicos da amostra (Sprint 2.3: iPhone/Galaxy/MacBook diferem majoritariamente por storage) | Nenhum | **Muito Alto** — preenche a fatia de 30 pontos de `specifications` no engine | Alto — filtro por capacidade | Alto | Roma Shopping (`pa_capacidade`), Mobile Zone (85% em celulares) |
| **Cor estruturada** | Alto | Nenhum | Alto — segunda chave mais comum de `specifications` | Alto — filtro por cor | Alto | Mega Eletrônicos, Roma Shopping, Mobile Zone (38,7-46%) |
| **Modelo estruturado** | Alto | Nenhum | Alto — reforça `model-number` e reduz dependência de extrair dígitos do nome livre | Médio | Alto | Mega Eletrônicos, Roma Shopping, Mobile Zone (90% em celulares) |
| **Especificações técnicas gerais (processador, câmera, conectividade, SO)** | Médio — menos decisivo que capacidade/cor para diferenciar pares, mas soma pontos de `specifications` | Nenhum | Médio-Alto | Médio | Alto — enriquece ficha de produto | Mobile Zone majoritariamente (92% processador em celulares) |
| **GTIN/EAN** | Baixo **hoje** (confirmado em só 1 dos 5 merchants — não cruza nenhuma sobreposição real ainda) / **Muito Alto potencial** se confirmado em 2+ merchants (EAN idêntico é identidade quase certa, um `MatchStrategy` novo poderia até dispensar fuzzy matching — mudança de Product Identity, fora de escopo aqui) | Nenhum | Alto potencial, Baixo hoje | Baixo | Médio | Só Shopping China |
| **SKU/externalId** | Nenhum incremental — já 100% capturado por todos os 5 conectores | Nenhum | Nenhum incremental | Nenhum | Nenhum | Já capturado |
| **Peso/Dimensões** | Não avaliável — nenhuma evidência de disponibilidade encontrada em nenhum dos 5 merchants nesta Sprint | — | — | — | — | Não encontrado |

## 3. Achado de sequência que a matriz revela

**Categoria e Capacidade são as únicas duas linhas em "Muito Alto" para CPC** — e não são substitutas uma da outra: a Sprint 2.3 já provou algebricamente (`MERGECANDIDATE_FLOW_REPORT.md` §4) que corrigir só uma das duas não basta para cruzar o threshold de 70 no caso real auditado. **As duas precisam andar juntas** para o primeiro conjunto de pares reais atravessar o threshold.

**Ressalva importante sobre o par de maior overlap real conhecido** (Shopping China × Mega Eletrônicos, `MERCHANT_OVERLAP_MATRIX.md`): Mega Eletrônicos tem `feature_product` rico; Shopping China não tem nenhum atributo estruturado além de marca/categoria/EAN. `specOverlap()` no `ProductIdentityEngine` só pontua chaves presentes **nos dois lados** — enriquecer só Mega Eletrônicos não ajuda esse par específico enquanto Shopping China não tiver ao menos alguma `specifications` própria (via tabela de atributos Magento, hoje não populada, ou outra fonte). Nomeado aqui para não ser esquecido no roadmap.
