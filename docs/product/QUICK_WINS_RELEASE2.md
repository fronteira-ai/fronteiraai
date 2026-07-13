# QUICK_WINS_RELEASE2.md
# PROGRAM Π (PI) — MISSION Π-1 — Encerramento: Corte de Execução

**Categoria**: `docs/product/`
**Data**: 2026-07-13
**Natureza**: recomendação de escopo para a próxima Release — nenhuma implementação nesta Mission.

---

## 1. O corte — 8 itens, ICE ≥8,0, zero inteligência nova, zero decisão pendente

| Item | Composer (`BUYER_INTELLIGENCE_LAYER.md`) | Tela |
|---|---|---|
| Economia | `ProductIntelligenceComposer` / `ComparisonIntelligenceComposer` | Produto, Comparação |
| Melhor Oportunidade | `HomeIntelligenceComposer` | Home |
| Maior Confiança (no card, não só na página da loja) | `ProductIntelligenceComposer` | Produto, Comparação |
| Loja Recomendada | `ComparisonIntelligenceComposer` | Comparação |
| Preço Justo | `ProductIntelligenceComposer` | Produto |
| Preço Abaixo da Média | `SearchIntelligenceComposer` | Busca, Catálogo |
| Busca com preço | `SearchIntelligenceComposer` | Busca |
| Frescor do dado | `ProductIntelligenceComposer` | Produto, Comparação |

Todos os 8: (1) já têm o dado calculado por um serviço testado e em produção; (2) não exigem nenhuma decisão Tipo 1 pendente (identidade de comprador, provedor de notificação, billing); (3) vivem nas mesmas 3-4 telas já existentes (produto, comparação, busca, Home) — nenhuma tela nova precisa ser inventada, só enriquecida.

## 2. Por que parar em 8, e não incluir os itens 9-10 do ICE

Vale Comprar Hoje e Preço em Queda (ICE 7,3, `BUYER_EXPERIENCE_PRIORITIES.md`) são reais e valiosos, mas dependem de uma camada de composição textual (nunca virar previsão, nunca soar como pressão de urgência) que se beneficia de os 8 itens acima já estarem no ar e testados com usuário real — a mesma lógica de sequenciamento já usada em `BUYER_INTELLIGENCE_ROADMAP.md` (Mission Λ-1, Onda 2). Não é uma rejeição — é reconhecer que "escrever a frase certa sobre volatilidade" é mais fácil de acertar depois de já saber como o comprador reage aos números diretos.

## 3. O que esta Release 2 explicitamente não inclui, e por quê

- **Alertas, Reviews, Favoritos sincronizados** — bloqueados por decisões Tipo 1 do CTO (Buyer Identity Model, provedor de notificação), não por esforço de engenharia. Nomeados em `BUYER_INTELLIGENCE_ROADMAP.md` (Λ-1) como Trilha B, correndo em paralelo por decisão, não por sequência de código.
- **Produto Equivalente, Alternativa Inteligente** — exigiriam inteligência nova (matching por equivalência funcional, taxonomia hierárquica), o que viola a restrição central desta Mission. Ver `INTELLIGENCE_CARD_LIBRARY.md` §10-11.
- **Preço em Alta, Economia agregada** — ICE mais baixo (6,3-6,7), candidatos naturais de uma Release 3, não descartados, apenas não priorizados agora.

## 4. Definition of Done proposta para esta Release (a validar pelo CTO antes de qualquer Wave real)

Cada um dos 8 itens só é considerado "pronto" quando:

1. O composer correspondente (`BUYER_INTELLIGENCE_LAYER.md` §3) chama exclusivamente serviços já existentes — nenhuma nova query de agregação, nenhum novo campo calculado fora dos serviços já testados.
2. Nenhuma alteração em `Product Identity`, `Connector Platform` ou `Canonical Catalog` (restrição permanente desta e das Missions anteriores — Κ, Λ).
3. Todo número exibido ao comprador tem uma fonte rastreável a um serviço nomeado nesta Mission — nenhum "número mágico" novo.
4. Nenhum card usa `buyer_events` além do que já é anônimo/agregado (mesma restrição de `BUYER_VALUE_MATRIX.md`, Λ-1, dado o gap de LGPD/rate-limiting ainda não corrigido).
5. Home, `/categorias` e demais superfícies sob `docs/design/DESIGN_CONSTITUTION.md` (ADR-050) continuam visualmente congeladas — qualquer novo card nessas telas segue o processo de Sprint isolado por componente já em vigor (`docs/design/HOME_COMPONENTS.md`, ADR-053), não uma mudança direta de layout.

## 5. Encerramento

Esta Mission, somada à Λ-1, deixa um caminho de execução completo e sem ambiguidade para a próxima Release de Buyer Experience: **o que construir primeiro (§1), por que essa ordem (§2), o que fica de fora e por quê (§3), e como saber que foi feito certo (§4)** — sem que nenhuma linha de inteligência nova precise ser escrita. O trabalho que falta é inteiramente de composição e interface, não de algoritmo.
