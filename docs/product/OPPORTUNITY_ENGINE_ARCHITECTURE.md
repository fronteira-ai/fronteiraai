# OPPORTUNITY_ENGINE_ARCHITECTURE.md
# RELEASE 2.0 — Experience Iteration 6.5 — Opportunity Engine

**Categoria**: `docs/product/`
**Data**: 2026-07-13
**Natureza**: arquitetura aprovada pelo CTO, **não implementada**. Nenhum código, migration ou algoritmo em produção foi alterado. Este documento formaliza e substitui, em status (não em conteúdo — preservado como registro histórico do achado original), `docs/product/OPPORTUNITY_SCORE_PROPOSAL.md` (Mission UX-1C), que identificou o problema mas ainda não tinha mandato de Release para propor a solução definitiva.

---

## 1. Auditoria da arquitetura atual do Achado do Dia (Objetivo 1)

```
lib/home-premium-service.ts
        │
        ├─ createCanonicalCatalogServices(client).catalogRepo.findAll({limit:50})
        ├─ createMarketInsightsServices(client).priceIntelligenceService.getSavingsOpportunity(productId)  [por produto]
        │
        ▼
rankSavingsAcrossCatalog(client, limit)
   — ordena por savings.maxSavingsPercent (único fator), corta em `limit`
        │
        ├─ getBestSavingsToday(client)  → limit=1  → components/home/AchadoDoDia.tsx
        └─ getFlashOffers(client)       → limit=6  → components/home/dashboard/FlashOffersCard.tsx
```

**Serviços utilizados**: `ICanonicalCatalogRepository.findAll` (Canonical Catalog), `PriceIntelligenceService.getSavingsOpportunity` (Market Insights). Nenhum outro serviço é consultado — nem `TrustComposer`, nem `FreshnessService`, nem `PurchaseTimingComposer`, nem qualquer sinal de popularidade.

**Limitações confirmadas**:
- Um único fator de decisão (percentual de desconto).
- Nenhuma verificação de estoque, confiança da loja ou frescor do preço.
- Nenhuma consulta ao veredito de timing — um produto em queda contínua pode "vencer" hoje e ser um mau conselho.
- `getBestSavingsToday` e `getFlashOffers` chamam a mesma função — confirmado por grep que **nenhum outro arquivo do repositório** referencia `getBestSavingsToday`/`getFlashOffers`/`rankSavingsAcrossCatalog` além de `AchadoDoDia.tsx` e `FlashOffersCard.tsx`. É lógica 100% presa à Home, sem nenhum ponto de reuso.

**Experiências que dependem dele hoje**: exatamente duas (`AchadoDoDia`, `FlashOffersCard`), ambas na Home. Nenhuma outra experiência (Search, Product Detail, Comparison, Advisor, Alerts, Favorites) tem acesso a este ranking.

## 2. Arquitetura do Opportunity Engine (Objetivo 2)

Filosofia explícita: **sem score, sem Machine Learning, sem pesos arbitrários** — uma árvore de decisão com gates sequenciais e um critério de desempate determinístico, cada etapa nomeável e citável ao comprador, seguindo exatamente a mesma disciplina já usada por `PurchaseTimingComposer`/`TrustComposer`/`ParaguAIAdvisorComposer` (composição sobre serviços já existentes, nenhum número opaco).

```
OpportunityEngine (proposto — composição pura, mesmo padrão do
ParaguAIAdvisorComposer: lê serviços já existentes, não introduz I/O novo
além do que rankSavingsAcrossCatalog já faz hoje)
        │
        ├─ ICanonicalCatalogRepository.findAll                  (já usado)
        ├─ PriceIntelligenceService.getSavingsOpportunity        (já usado)
        ├─ CanonicalOfferView.inStock                            (já existe, não consultado hoje)
        ├─ FreshnessService.computeForOffer                      (já existe, EI-4 já o usa)
        ├─ TrustComposer.composeCompactForStores / isVerifiedStore (já existe, EI-4)
        ├─ PurchaseTimingComposer verdict do produto vencedor    (já existe, EI-3)
        └─ contagem de eventos buyer_events (ProductClicked) por produto — sinal já
           coletado desde a Release 2.0 Wave 1, nunca agregado por produto até hoje;
           implementar popularidade exigiria UMA nova consulta de agregação sobre
           dados já existentes, não uma nova coleta.
        ▼
getTopOpportunities(limit): Promise<Opportunity[]>
```

## 3. Árvore oficial de decisão (Objetivo 3)

```
Para cada produto canônico candidato (mesma amostragem de hoje):

1. Possui estoque?                          — CanonicalOfferView.inStock
   NÃO → eliminado
2. Preço atualizado recentemente?            — FreshnessService (classificação ≠ Old/Stale)
   NÃO → eliminado
3. Loja confiável?                           — TrustComposer.isVerifiedStore
   NÃO → [ver nota de calibração abaixo — pode ser eliminatório ou apenas
          um desempate, a depender da cobertura real de lojas verificadas]
4. Economia real relevante?                  — piso mínimo de economia absoluta
                                                E percentual (valores exatos a
                                                calibrar na implementação, não
                                                fixados aqui)
   NÃO → eliminado
5. Vale a pena comprar agora (não "melhor aguardar")? — PurchaseTimingComposer.verdict
   verdict === "better_wait" → eliminado (ver Objetivo 4, Exemplo C)
        │
        ▼
   Participa da disputa
        │
        ▼
   Maior economia ABSOLUTA (US$) vence
        │
        ▼
   Empate (mesma economia absoluta, dentro de uma tolerância)?
        ├─ 1º desempate: maior economia PERCENTUAL
        ├─ 2º desempate: maior popularidade (mais compradores se beneficiam de saber)
        └─ 3º desempate (raríssimo): atualização de preço mais recente vence —
           nunca uma escolha aleatória.
```

**Nota de calibração honesta**: o gate #3 (loja confiável) é o único cuja severidade (eliminatório vs. apenas desempate) depende de dado real que este documento não tem acesso a medir sem consulta ao banco — se hoje poucas lojas têm badge ativo, um gate eliminatório esvaziaria demais os candidatos. Recomenda-se medir a cobertura real de `isVerifiedStore=true` no catálogo **antes** de decidir, na implementação, se este gate elimina ou apenas desempata. Nenhum valor foi assumido aqui para não fixar uma constante de produção sem essa medição.

## 4. "Maior desconto" vs. "maior oportunidade" (Objetivo 4)

| Situação | Maior desconto? | É uma oportunidade real? |
|---|---|---|
| **Exemplo A**: produto com 90% de desconto, US$ 2 de economia absoluta, esgotado | Sim (percentual altíssimo) | **Não** — eliminado no gate de estoque |
| **Exemplo B**: produto com 15% de desconto, US$ 500 de economia absoluta, loja verificada, preço atualizado hoje | Não (percentual modesto) | **Sim** — vence mesmo com percentual bem menor que outros candidatos |
| **Exemplo C**: produto com 40% de desconto hoje, mas Purchase Timing indica tendência de queda contínua (`verdict: better_wait`) | Sim | **Não** — o desconto é real, mas amanhã provavelmente será ainda maior; recomendar "aproveite agora" seria um conselho errado |
| **Exemplo D**: produto com 20% de desconto de uma loja sem verificação e sem histórico | Sim | **Depende da calibração do gate #3** — desconto real, mas confiança não confirmada |

**Diferença central**: desconto é uma propriedade do preço; oportunidade é uma propriedade da **decisão de compra completa** — só existe quando o produto está disponível, o preço é confiável, a loja é confiável, e o momento é o certo. Um desconto que falha qualquer uma dessas condições não é uma oportunidade, por maior que seja o percentual.

## 5. Fonte única da verdade (Objetivo 5)

```
OpportunityEngine.getTopOpportunities(limit)
        │
        ├─ Dashboard "Economia do dia"  → getTopOpportunities(6)
        ├─ Home "Achado do Dia"          → getTopOpportunities(1)[0]
        └─ Qualquer experiência futura reutiliza exatamente os mesmos dados —
           nenhuma lógica de ranking duplicada em nenhum outro lugar.
```

Local proposto: `src/domains/buyer-intelligence/services/OpportunityEngine.ts` — mesmo domínio de composição das Waves 2-5 (Best Deal, Purchase Timing, Trust, Advisor), substituindo `lib/home-premium-service.ts`'s `rankSavingsAcrossCatalog` (hoje uma função privada presa a um arquivo de Home) por um serviço de domínio de primeira classe, acessível a qualquer consumidor do `buyer-intelligence`.

## 6. Integração com a Release 2.0 (Objetivo 6/7/8)

**Objetivo 8 — a quem pertence**: ao Release 2.0, como **Experience Iteration 6.5**, não ao Program ΔR. Justificativa técnica: o Opportunity Engine é uma camada de **decisão** (gates + desempate sobre sinais já existentes) — exatamente a mesma natureza arquitetural de Best Deal (EI-2), Purchase Timing (EI-3), Trust (EI-4) e do Advisor (EI-5), todos compositores puros de sinais de domínios inferiores. Program ΔR, por sua vez, melhora a **qualidade de um dado de entrada** (câmbio em tempo real) — uma responsabilidade de camada de dados, não de decisão. Misturar as duas camadas repetiria exatamente o erro que esta missão está corrigindo: lógica de decisão espalhada por múltiplos lugares em vez de centralizada em um único composer.

**Objetivo 6 — evolução para câmbio em tempo real**: o tipo de resultado do engine deve carregar o valor monetário como uma estrutura já pronta para uma segunda moeda (`{ usd: number; brl: number | null }`, com `brl` nulo até o Program ΔR estar pronto) — não implementado agora, mas o desenho já reserva o campo, para que a chegada do câmbio em tempo real seja apenas um preenchimento de dado, nunca uma mudança de arquitetura ou de árvore de decisão.

**Objetivo 7 — pontos de integração futuros** (nenhum implementado nesta missão):
- **Advisor**: uma linha adicional opcional ("está entre as maiores oportunidades do marketplace hoje") quando o produto em análise aparecer em `getTopOpportunities`.
- **Search**: um selo compacto adicional, mesmo padrão batched de `TrustComposer.composeCompactForStores`.
- **Product Detail / Comparison**: um destaque quando o produto pertence à lista atual de oportunidades.
- **Alertas**: notificar quando um produto favoritado/observado entra no Top Opportunities.
- **Favoritos**: sinalizar dentro da lista de favoritos quais estão atualmente em oportunidade.
- **Home**: os dois consumidores já existentes, agora lendo da mesma fonte.

## 7. Roadmap atualizado (Objetivo 9 da resposta)

| Experience Iteration | Nome | Status |
|---|---|---|
| EI-1 | Buyer Savings | ✅ |
| EI-2 | Best Deal | ✅ |
| EI-3 | Should I Buy Now | ✅ |
| EI-4 | Trust Experience | ✅ |
| EI-5 | ParaguAI Advisor | ✅ |
| **EI-6.5** | **Opportunity Engine** | **Arquitetura aprovada — aguardando implementação** |

EI-6 (mencionada em missões anteriores como um possível "Buyer Decision Center") permanece sem escopo formal definido — a numeração 6.5 foi adotada exatamente como o CTO especificou, independente da definição futura de EI-6.
