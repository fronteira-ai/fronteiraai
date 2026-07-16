# MARKETPLACE_DOMINANCE.md
# Program Ψ (Psi) — Mission Ψ-1 — Marketplace Dominance

**Categoria**: `docs/product/`
**Criado**: 2026-07-16
**Status**: Síntese executiva. Nenhum código escrito, nenhuma arquitetura alterada, nenhuma migration criada.
**Ver também**: `docs/product/MARKETPLACE_OPPORTUNITY.md`, `EXPANSION_MATRIX.md`, `CATEGORY_DOMINANCE.md`, `PUBLIC_BETA_READINESS.md`.

---

## 1. Competitive Gap (Objetivo 5)

**Disciplina de honestidade**: esta Mission não coletou dado real de concorrentes (Compras Paraguai, Google Shopping, marketplaces tradicionais) — nenhum crawl, nenhuma medição de catálogo/preço deles foi feita. Tudo abaixo que se refere a eles é conhecimento estrutural/de modelo de negócio, não medição — marcado como tal, nunca misturado com os números reais do ParaguAI.

**Onde já somos melhores (estrutural, não medido contra o concorrente)**: o ParaguAI é o único, entre os citados, com integração de conector real e profunda a 5 lojas específicas do Paraguai (dado de produto, preço e estoque direto da fonte, não um agregador de links) e com um motor de correspondência de produto explicável (`ProductIdentityEngine`, cada score rastreável a um fator nomeado) — Google Shopping agrega globalmente sem esse nível de curadoria local; marketplaces tradicionais (se forem varejistas próprios, não comparadores) não comparam preço entre lojas concorrentes por definição de modelo de negócio.

**Onde ainda perdemos (estrutural)**: amplitude de catálogo e tráfego. Google Shopping agrega milhares de vendedores globais; qualquer marketplace tradicional estabelecido no Paraguai provavelmente já tem reconhecimento de marca e tráfego que o ParaguAI, com 46 eventos de comprador em 7 dias, não tem hoje.

**Onde podemos abrir vantagem em 90 dias**: exatamente onde os dados medidos desta Mission apontam — Comparable Coverage real na categoria Celulares/Eletrônicos (`CATEGORY_DOMINANCE.md`). Nenhum concorrente citado tem, provavelmente, o mesmo nível de granularidade explicável de correspondência de produto local — mas isso é uma inferência estrutural, não uma medição, e é reportado como tal.

## 2. Marketplace Dominance Score (Objetivo 7)

**Não é um algoritmo novo** — é uma média simples de 3 métricas já oficiais e já medidas (`MarketplaceHealthEngine`, AI Readiness Score, Merchant Coverage % sobre o universo de 10 Tier 1), para leitura executiva rápida. CPC não entra separadamente na média porque já é um dos 3 componentes do AI Readiness Score (evitar contar duas vezes).

| Momento | Marketplace Health | AI Readiness | Merchant Coverage (Tier 1) | **Dominance Score (média simples)** |
|---|---:|---:|---:|---:|
| **Hoje (medido)** | 63 | 52,6 | 50% (5/10) | **55,2** |
| Após Prioridade 1 (execução dos 66 candidatos, simulado) | ~63 (sem mudança medida) | ~52,7 (CPC vai de 0,03% a até 0,36% — variação real, mas pequena numa média de 3 termos) | 50% (nenhuma loja nova) | **~55,2** (variação desprezível) |
| Após Prioridade 2 (Cellshop + Nissei, contingente a parceria comercial — não medido) | projeção, não medido | projeção, não medido | 70% (7/10) — **medido apenas se a parceria se concretizar** | projeção |
| Após Prioridade 3 (10/10 Tier 1, contingente) | projeção, não medido | projeção, não medido | 100% (10/10) | projeção |

**Achado honesto que este índice revela**: a Prioridade 1 (zero esforço técnico, zero dependência comercial) move o número que mais importa (CPC) proporcionalmente muito — 0,03%→0,36% é 12x — mas move o índice composto quase nada, porque CPC é uma fração pequena dentro de uma média de métricas em escalas muito diferentes. Isso não é um motivo para não executar a Prioridade 1 (é a ação de maior ROI por esforço de todas as três — zero engenharia, resultado real medido já disponível); é um motivo para não usar o Dominance Score sozinho como critério de decisão — os números granulares (`EXPANSION_MATRIX.md`) são a fonte de verdade, o índice é só um resumo executivo.

## 3. Program Κ closure — reafirmação

Todo o pré-requisito técnico citado no contexto desta Mission (Buyer Intelligence, Product Intelligence, Product Identity, Universal Taxonomy, Product Signature, Merge Engine, Opportunity Engine, Money Presentation, Exchange Domain, Home Redesign, Program Κ) está de fato concluído — confirmado por `docs/engineering/PROGRAM_K_FINAL_REPORT.md` e pelas ADRs 056-058. Esta Mission não reabre nenhum deles.

## 4. Veredito

Ver §10 da resposta desta Mission para a Executive Recommendation completa e o veredito formal.
