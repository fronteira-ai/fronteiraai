# OPPORTUNITY_SCORE_PROPOSAL.md
# PROGRAM UX — Mission UX-1C — Home Final Polish

**Categoria**: `docs/product/`
**Data**: 2026-07-13
**Natureza**: proposta arquitetural — não implementada. Nenhum código, algoritmo ou score foi alterado nesta missão. Este documento existe porque a auditoria do Objetivo 7 concluiu que a seleção atual do "Achado do Dia" não representa, de fato, a maior oportunidade do marketplace.

---

## 1. Auditoria do algoritmo atual

**Onde vive**: `lib/home-premium-service.ts`, função `rankSavingsAcrossCatalog` (linhas 181-233), compartilhada por `getBestSavingsToday` (Achado do Dia, `limit=1`) e `getFlashOffers` (card "Economia do dia" do dashboard, `limit=6`).

**Como funciona hoje**:
1. Busca até 50 produtos canônicos (`SAVINGS_CANDIDATE_SAMPLE`) — hoje cobre o catálogo inteiro (36 produtos canônicos existem no total).
2. Para cada um, chama `PriceIntelligenceService.getSavingsOpportunity(product.id)` — a mesma função já usada pelo Best Deal (EI-2).
3. **Ordena exclusivamente por `savings.maxSavingsPercent` (percentual)**, do maior para o menor.
4. Retorna o primeiro item (Achado do Dia) ou os 6 primeiros (Economia do dia).

**Fator único usado**: dispersão percentual de preço entre a oferta mais barata e a mais cara do mesmo produto canônico. Nenhum outro fator entra na decisão.

**Achado crítico não documentado antes**: como as duas experiências ("Achado do Dia" e o card "Economia do dia" do dashboard) chamam a mesma função com o mesmo critério de ordenação, **o item #1 do card do dashboard é, por construção, sempre o mesmo produto do Achado do Dia** — não são duas seleções independentes que coincidentemente concordam; são a mesma seleção computada duas vezes.

**É realmente a maior oportunidade do marketplace? Não.** É apenas o produto com o maior desconto percentual entre suas próprias ofertas. Isso ignora:
- **Economia absoluta**: um produto com 90% de desconto mas apenas US$ 2 de diferença pode superar um produto com 15% de desconto mas US$ 500 de diferença.
- **Confiança da loja mais barata**: a oferta vencedora pode vir de uma loja não verificada.
- **Disponibilidade**: a oferta vencedora pode estar sem estoque.
- **Atualização do preço**: a oferta vencedora pode ter um preço desatualizado há semanas (nenhum uso de `FreshnessService` aqui).
- **Popularidade/relevância**: um produto de baixíssimo interesse pode "vencer" só por ter uma dispersão de preço incomum.
- **Timing**: nenhuma consulta ao Purchase Timing (EI-3) — o produto pode estar em tendência de queda contínua, tornando "comprar agora" precisamente o conselho errado.

**Conclusão do Objetivo 7**: a seleção de hoje é honesta sobre o que faz (é literalmente "maior desconto percentual"), mas o rótulo "Achado do Dia" promete mais do que esse único fator garante. Justifica a proposta abaixo.

## 2. Proposta arquitetural — Opportunity Score

**Não implementado.** Proposta de composição (mesma disciplina de "nenhum cálculo novo duplicado, apenas combinar sinais já existentes" já usada pelo `ParaguAIAdvisorComposer`, EI-5):

```
OpportunityScoreComposer (proposto, não implementado)
        │
        ├─ economia absoluta      ← PriceIntelligenceService.getSavingsOpportunity (já existe)
        ├─ economia percentual    ← idem (já existe)
        ├─ confiança da loja      ← TrustComposer.composeCompactForStores / isVerifiedStore (já existe, EI-4)
        ├─ disponibilidade        ← CanonicalOfferView.inStock (já existe)
        ├─ atualização do preço   ← FreshnessService (já existe, Release 1.8)
        ├─ popularidade           ← buyer-intelligence / buyer_events (já existe, Release 2.0 Wave 1 Quick Wins — view count por produto)
        └─ relevância p/ comprador ← fora de escopo até existir personalização real (Buyer Identity Model, ainda não aplicado em produção)
        ▼
Um score composto, ORDENÁVEL, não exposto ao comprador como número cru
(mesma disciplina de "nunca um Score: X/100 visível" já adotada no
Advisor) — usado apenas internamente para escolher QUAL produto vira
"Achado do Dia", nunca renderizado como um número na tela.
```

**Cada fator já existe como serviço testado** — nenhum é novo. O trabalho de uma futura implementação seria puramente de composição, no mesmo espírito do `ParaguAIAdvisorComposer`: ler resultados já computados, combinar por um critério documentado (ex.: normalizar cada fator 0-1 e combinar com pesos explícitos e justificados, ou usar um sistema de eliminação por limiares — "só entra na disputa se estiver em estoque, verificado e com preço atualizado nos últimos N dias", e SÓ ENTÃO ordenar os sobreviventes por economia absoluta).

**Recomendação de desenho** (não implementada): eliminação por limiares antes de rankear — é mais simples de explicar ao comprador ("mostramos só ofertas em estoque, de lojas verificadas, com preço atualizado — e entre essas, a de maior economia") do que um score ponderado opaco, mantendo a mesma filosofia de "nenhum número mágico" já estabelecida em `PARAGUAI_ADVISOR_ARCHITECTURE.md`.

## 3. Escopo explícito desta proposta

Esta é uma proposta arquitetural para avaliação do CTO — nenhuma implementação, nenhuma alteração ao `rankSavingsAcrossCatalog`, `getBestSavingsToday` ou `getFlashOffers` ocorreu. Uma futura missão de implementação precisaria decidir: pesos exatos (se ponderado) ou ordem exata dos limiares (se eliminatório), e se `getFlashOffers`/`getBestSavingsToday` devem divergir (um mostrando um "runner-up" diferente do #1, por exemplo) ou continuar deliberadamente sincronizados.
