# ENGINEERING_DECISIONS.md

**Categoria**: `docs/architecture/`
**Propósito**: registro condensado das decisões de engenharia que fecharam o núcleo arquitetural (Programas Κ→ΩΩ) — o resumo executivo da sequência de fechamento. O registro completo, decisão por decisão, com problema/alternativas/motivação/evidência individuais, vive em `docs/architecture/DECISION_LOG.md` (não substituído por este documento). ADRs numerados de produto/negócio permanecem em `docs/operations/DECISIONS.md`.

## Decisões que se tornaram permanentes

1. **Product Identity nunca automerge** (Κ, reafirmado em todo Programa subsequente). Todo merge é uma sugestão (`merge_candidates`, status `pending`) até aprovação humana explícita.
2. **Marketplace Memory é um cache de leitura parity-validado, não uma fonte de verdade nova** (Ω-1/Ω-3). Todo valor reaproveitado é verificado contra o cálculo original; qualquer divergência prefere o valor fresco.
3. **A composição de catálogo, não o algoritmo, é o gargalo de Comparable Product Coverage** (Λ-1, confirmado por Μ-1 e Ν-1). Esta é a decisão mais importante de toda a sequência — reorienta todo investimento futuro de "melhorar o motor" para "expandir catálogo com foco em categorias de overlap comprovado".
4. **A fila de revisão de alta confiança não é a prioridade de negócio** (correção de Μ-1 sobre a recomendação inicial de Λ-1) — 98% dos candidates de alta/média confiança são intra-loja; os 85 candidates cross-loja que realmente movem CPC estão no tier de revisão manual.
5. **O ganho de performance da Marketplace Memory é uma decisão operacional separada de sua correção** (Ω-4). A arquitetura está correta e congelada; a decisão de reduzir `PARITY_SAMPLE_PERCENT` para realizar o ganho de performance é uma escolha operacional futura, não uma reabertura de código.
6. **O núcleo arquitetural está encerrado** (ΩΩ-1/ΩΩ-2). Nenhuma falha estrutural foi encontrada capaz de impedir o ParaguAI de escalar na faixa de negócio evidenciada (dezenas a centenas de merchants, até a ordem de 1 milhão de produtos).

## Decisões explicitamente revertidas ou refinadas durante a sequência

| Decisão original | Refinamento | Onde |
|---|---|---|
| Revisar primeiro a fila de merge candidates de alta confiança (≥95%) | Revisar primeiro os 85 candidates cross-loja do tier de revisão manual — são os únicos que movem CPC | Λ-1 → Μ-1 |
| (Nenhuma outra reversão registrada) | — | — |

Nenhuma contradição não resolvida foi encontrada entre as decisões dos Programas Κ, Π, Ω, Λ, Μ, Ν e Ο (ΩΩ-1, Objetivo 8).
