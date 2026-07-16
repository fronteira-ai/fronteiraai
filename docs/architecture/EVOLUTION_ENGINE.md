# EVOLUTION_ENGINE.md
# Program Ξ (Xi) — Mission Ξ-1 — Autonomous Marketplace Engine

**Categoria**: `docs/architecture/`
**Criado**: 2026-07-16
**Status**: Proposta arquitetural pura.

---

## 1. Continuous Evolution (Objetivo 6)

| Evento | Como torna o ParaguAI melhor automaticamente (sem algoritmo novo) |
|---|---|
| Cada sincronização | Se a Marketplace Memory existir (`MARKETPLACE_MEMORY.md`), cada sync que não muda dado de origem custa zero recomputação — o "melhor" aqui é custo operacional caindo, não inteligência subindo por si só |
| Cada novo merchant | Contribui novos pares `(brand_id, manufacturerCode)` à Memória — se esse merchant vende produtos que outro merchant já vende, o grupo já existe e se beneficia imediatamente (Objetivo 5); se não, a Memória cresce, mas nunca piora o que já existia (a mesma disciplina append-only de `merge_executions`, já em produção desde Program Ω) |
| Cada novo produto | Um produto com `manufacturerCode` já visto (mesma marca) entra em um grupo existente sem esperar o Engine reavaliar do zero — proporção real medida: 53,63% dos produtos hoje têm esse sinal (Mission Π-1) |
| Cada nova categoria | Sem Família/Linha modelada (gap nomeado, `PRODUCT_KNOWLEDGE_GRAPH.md`), uma categoria nova não herda nada de categorias irmãs — este é o único evento dos 4 que **não** melhora automaticamente hoje, porque a estrutura que permitiria isso ainda não existe |

## 2. Operational Automation Matrix (Objetivo 7)

| Atividade | Manual | Assistido | Automático | Autônomo |
|---|---|---|---|---|
| Aprovação de merge (decisão final) | — | — | — | **permanece aqui, por restrição explícita** ("não alterar Merge Engine") — Shadow Mode não é negociável nesta proposta |
| Normalização de chave de especificação (`ATTRIBUTE_KEY_ALIASES`) | — | — | ✅ já é automático hoje (mapa estático) | poderia evoluir para autônomo por merchant (`MARKETPLACE_MEMORY.md` §Padrões recorrentes) — gap real, não implementado |
| Extração de atributo (`buildProductSignature`) | — | — | ✅ já é automático | ✅ pode se tornar autônomo-com-memória — mesma função, só parar de descartar o resultado |
| Revisão de candidato Manual (70-84%) | ✅ hoje | — | — | permanece manual — mesma razão da linha 1 |
| Revisão de candidato Média (85-94%) | ✅ hoje | poderia virar assistido (sinalizar "padrão já visto e aprovado antes" para acelerar a decisão humana, nunca substituí-la) | — | — |
| Detecção de duplicata reversa (mesma dupla, direção oposta) | ✅ hoje (implícito — 2 dos 10 candidatos Média de Mission OPS-1 eram isso) | — | poderia ser automático via Memória (§`CONFIDENCE_ENGINE.md` §2) | — |
| Re-extração após produto já resolvido, sem mudança de fonte | — | — | ❌ hoje é redundante, não "automático" no sentido útil — roda de novo sem necessidade | seria autônomo real: nunca rodar de novo enquanto o dado de origem não mudar |
| Detecção de drift (`diffFromProduct`) | — | — | ✅ já é automático (Κ-4) | ✅ já funciona corretamente, nenhuma mudança necessária |

**Leitura honesta**: a única atividade que esta proposta move para "Autônomo" de fato é **eliminação de trabalho redundante** (extração/normalização repetida) — nenhuma atividade que hoje exige julgamento humano (aprovação de merge) é proposta para automação, porque a restrição da própria Mission proíbe isso e porque nenhuma medição desta sequência de Missions jamais sugeriu que seria seguro.
