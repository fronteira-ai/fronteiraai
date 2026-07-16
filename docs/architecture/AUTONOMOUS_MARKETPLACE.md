# AUTONOMOUS_MARKETPLACE.md
# Program Ξ (Xi) — Mission Ξ-1 — Autonomous Marketplace Engine

**Categoria**: `docs/architecture/`
**Criado**: 2026-07-16
**Status**: Proposta arquitetural pura — zero código, zero migration, zero algoritmo alterado. Fundamentada inteiramente em auditorias já realizadas nesta sequência de Missions (Φ-1, Κ-4, Κ-5, Ψ-1, OPS-1, Π-1) e em leitura direta de código já existente, nunca em opinião nova.
**Ver também**: `MARKETPLACE_MEMORY.md`, `LEARNING_PIPELINE.md`, `CONFIDENCE_ENGINE.md`, `EVOLUTION_ENGINE.md`, `docs/engineering/SCALABILITY_REPORT.md`.

---

## 1. Pipeline Audit (Objetivo 1) — onde o conhecimento é perdido, verificado por leitura de código

```
Connector → Importação → Canonical → Identity → Merge → Opportunity → Advisor → Search → Buyer
```

| Elo | O que existe hoje | Onde o conhecimento é perdido (confirmado por código) |
|---|---|---|
| Connector → Importação | `ATTRIBUTE_KEY_ALIASES` (Κ-3) é um mapa estático hardcoded, o mesmo para todo merchant | Nenhuma memória por merchant — se a Loja X usa uma chave de especificação nunca vista, o sistema nunca aprende essa chave especificamente para a Loja X; o mapa global não cresce sozinho |
| Importação → Canonical | `CanonicalProductService.bootstrapFromProduct`/`syncFromProduct` (Κ-4) | Sincronização sincroniza campos, não decisões — não existe registro de "por que" um valor foi aceito, só o valor final |
| Canonical → Identity | **`buildProductSignature()` é uma função pura, sem cache, sem persistência — confirmado por leitura direta do código (Program Κ-3/Κ-4)** | **O achado central**: toda vez que `CanonicalMergeSuggestionService.suggestMergesFor()` roda (a cada sincronização, a cada bootstrap, a cada simulação), `manufacturerCode`/`model`/`color`/etc. são recalculados do zero, para o MESMO produto, sobre o MESMO texto — mesmo quando nada mudou. Mission OPS-1 mediu isso na prática: 18.010 chamadas reais de `suggestMergesFor`, recomputando a mesma extração repetidamente |
| Identity → Merge | `findByPair()` previne sugerir a mesma dupla duas vezes | Não generaliza — uma rejeição humana ensina só sobre aquele par exato, nunca sobre o padrão (ex.: "esta variação de nome de marca não é confiável") |
| Merge → Opportunity/Advisor | Consomem `canonical_product_id`/Comparable Coverage como estão | Nenhuma perda adicional aqui — corretamente desacoplados, cada um lê o resultado já resolvido |
| Search → Buyer | Busca textual sobre `products.name` | Nenhum aprendizado de comportamento do comprador realimenta a confiança de identidade (gap nomeado, não abordado nesta Mission — fora do escopo, "não alterar Buyer Intelligence") |

**A frase que resume o achado**: o ParaguAI não tem um problema de algoritmo incorreto — tem um sistema que **esquece o que já calculou, a cada vez que calcula de novo**. Ver `MARKETPLACE_MEMORY.md`/`LEARNING_PIPELINE.md` para a arquitetura que resolve isso.

## 2. Síntese executiva das seções restantes

Ver documentos dedicados: `MARKETPLACE_MEMORY.md` (Objetivo 2), `LEARNING_PIPELINE.md` (Objetivo 3), `CONFIDENCE_ENGINE.md` (Objetivo 4/5), `EVOLUTION_ENGINE.md` (Objetivo 6/7), `docs/engineering/SCALABILITY_REPORT.md` (Objetivo 8).

## 3. Executive Recommendation (Objetivo 10) — ordenado exclusivamente por ROI medido

| Ordem | Mudança | Por que este ROI, com evidência já auditada |
|---|---|---|
| **1** | **Persistir a saída de `buildProductSignature`/`extractManufacturerCode` por produto** (cache de resultado, não algoritmo novo) | Elimina a recomputação confirmada por código em toda sincronização — mesmo cálculo, zero vezes a menos hoje, todas as vezes eliminável. Pré-requisito de tudo mais nesta Mission |
| **2** | **Elevar `manufacturerCode` a gate de identidade** (já recomendado em `PRODUCT_IDENTITY_V2.md`, Mission Π-1) | Teto já medido: 397 grupos 2+ lojas (28x hoje) — o ROI mais alto já quantificado nesta sequência de Missions inteira |
| **3** | **Memória de padrão por merchant para chaves de especificação não mapeadas** (`MARKETPLACE_MEMORY.md` §Padrões recorrentes) | Elimina retrabalho de extração repetida por sincronização — sem isso, cada novo merchant começa do zero, mesmo que sua nomenclatura seja previsível |
| 4 | Migrar agregação de categoria/marca em memória para `GROUP BY` no Postgres | Ponto de virada real já medido em `MARKETPLACE_FOUNDATION_SCALE_AUDIT.md`: 50-100 mil produtos — não urgente hoje (18 mil), torna-se obrigatório antes de qualquer expansão de escala real |
| 5 | Persistir Merchant Priority Engine como agregado incremental | Ponto de virada real já medido: 5 milhões de `offers` — ordem de grandeza distante da realidade atual, correto adiar |

## 4. Veredito

Ver §10 da resposta desta Mission.
