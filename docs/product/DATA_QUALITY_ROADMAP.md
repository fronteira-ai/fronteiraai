# DATA_QUALITY_ROADMAP.md
# FASE 2 — SPRINT 2.4 — Data Quality Discovery — Objetivo 5

**Categoria**: `docs/product/`
**Data**: 2026-07-11
**Companion**: `ATTRIBUTE_PRIORITY_MATRIX.md` (impacto), `DATA_QUALITY_AUDIT.md` (esforço por merchant)

---

## 1. Critério de sequenciamento

Ordenado por **retorno (Objetivo 4) dividido por esforço (Objetivo 1)**, com uma restrição adicional: nenhum item desta sequência requer nova infraestrutura de scraping/discovery, nova chamada HTTP, ou mudança em `ProductIdentityEngine`/Shadow Mode — todos os dados identificados **já chegam no mesmo payload que os conectores baixam hoje**. Isso os qualifica como extensões de parser (baixo risco, mesma categoria de mudança que já é rotineira nesta base) e não como mudança arquitetural.

## 2. Sequência recomendada

| Ordem | Item | Esforço | Retorno (da matriz de prioridade) | Por quê nesta posição |
|---|---|---|---|---|
| **1** | **Normalização de taxonomia de categoria** (dicionário sinônimo → categoria canônica, aplicado na ingestão) | **Muito Baixo** — não depende de re-scraping nenhum merchant; os `category_id` já existem, só precisam de um mapeamento estático + 1 backfill opcional sobre `canonical_products`/`products` já existentes | Muito Alto em CPC e Product Identity (`ATTRIBUTE_PRIORITY_MATRIX.md` §2-3) | Menor esforço de toda a lista (não toca em nenhum conector) e é metade da correção comprovadamente necessária (`MERGECANDIDATE_FLOW_REPORT.md` §4) |
| **2** | **Mobile Zone: extrair `productHasDetails`/`productHasColors`** | Baixo — 2 campos já presentes no JSON já baixado a cada sync; só requer estender `ApiProduct`/`product-mapper.ts` para lê-los e mapear para `specifications` | Muito Alto (capacidade/modelo/cor, 85-92% cobertura em celulares) | Maior cobertura estrutural dos 5 merchants, zero HTTP novo |
| **3** | **Mega Eletrônicos: extrair `feature_product`** | Baixo-médio — precisa localizar/parsear de forma confiável o blob de estado embutido na página (não é um seletor CSS simples como o resto do parser atual) | Alto (modelo/cor confirmados) | Segundo maior retorno; é metade do par de maior overlap real medido (junto com o item 4) |
| **4** | **Shopping China: extrair EAN via `data-flix-ean`** | Baixo — 1 atributo, 1 regex, já confirmado em 2/2 amostras | Baixo hoje isolado, mas é a outra metade do par Shopping China × Mega Eletrônicos (`ATTRIBUTE_PRIORITY_MATRIX.md` §3) — sem isso, o enriquecimento do item 3 fica sem efeito nesse par específico por causa de `specOverlap()` exigir chave presente nos dois lados | Fazer logo após o item 3, não antes — sozinho não teria com o que combinar ainda |
| **5** | **Roma Shopping: extrair tabela `pa_*`** | Baixo-médio — parsear uma tabela HTML já baixada | Alto em qualidade de dado geral, mas **Roma Shopping tem 0% de overlap medido com qualquer outro merchant hoje** (`MERCHANT_OVERLAP_MATRIX.md`) — o ganho em CPC é adiado até haver um segundo merchant no mesmo cluster de categoria | Vale para Search Quality/AI Readiness já, mas não é urgente para CPC |
| **6** | **Atacado Connect: extração por NLP da `description`** | **Alto** — única fonte sem dado estruturado disponível; exigiria uma técnica de extração diferente (regex/NLP sobre texto livre, menor confiança, mais superfície de erro) | Médio, incerto até prototipar | Maior esforço, menor confiança — deixar por último deliberadamente, não por omissão |

## 3. O que NÃO entra nesta sequência

- **Peso/Dimensões**: sem evidência de disponibilidade em nenhum merchant — não sequenciado até uma fonte ser encontrada.
- **GTIN como novo `MatchStrategy` do `ProductIdentityEngine`**: seria uma mudança em Product Identity (fora do mandato desta Sprint e da anterior). Extrair o EAN (item 4) é preparação de dado; decidir se e como o engine passaria a usá-lo é uma decisão de Sprint futura, com seu próprio mandato explícito do CTO — mesmo princípio já registrado em `PRODUCT_IDENTITY_VALIDATION_FRAMEWORK.md`.
- **Backfill retroativo em massa** dos 9.549 canonical products existentes: mencionado como opção no item 1, mas a decisão de rodar (e quando) é de execução, não desta Sprint de descoberta.

## 4. Recomendação final — a primeira implementação (Definition of Done)

**Normalização de taxonomia de categoria** (item 1) é a recomendação de maior retorno com menor esforço, isolada de todas as outras:

- **Esforço**: menor de toda a lista — não requer tocar em nenhum dos 5 conectores, nenhuma nova requisição HTTP, nenhum parser novo. É um dicionário estático (dado já levantado em `CATEGORY_NORMALIZATION_REPORT.md` §2) aplicado em um único ponto de normalização.
- **Retorno**: o único item classificado "Muito Alto" tanto em CPC quanto em qualidade do sinal de Product Identity que, sozinho, já é metade da correção comprovada necessária no caso real auditado pela Sprint 2.3.
- **Risco**: mínimo — não altera `ProductIdentityEngine`, não altera Shadow Mode, não altera Connector Platform, não cria heurística nova (é mapeamento de string para string, não inferência).

Não implementado nesta Sprint (mandato é descoberta e planejamento). Recomendado como primeiro item de uma Sprint de execução futura, com seu próprio mandato do CTO.
