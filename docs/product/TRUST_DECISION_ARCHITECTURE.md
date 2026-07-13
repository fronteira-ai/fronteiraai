# TRUST_DECISION_ARCHITECTURE.md
# RELEASE 2.0 — Experience Iteration 4 (EI-4) — Trust Experience

**Categoria**: `docs/product/`
**Data**: 2026-07-13
**Natureza**: arquitetura de composição — nenhum score, badge ou verificação novos. `TrustComposer` lê e traduz sinais que já existem em `BadgeService`, `MerchantProfileService` e `TrustHistoryService`; nunca recalcula confiança.

---

## 1. Todos os serviços reutilizados (Objetivo 1 — auditoria)

| Serviço | O que já fornecia | Usado por TrustComposer para |
|---|---|---|
| `BadgeService.getActiveBadges` | Badge ativo por lista de merchants (já usado por `ComparisonIntelligenceComposer` para `isVerifiedStore`) | `composeCompactForStores` (versão compacta de busca) |
| `IMerchantStoreLinkRepository.findMerchantIdsByStoreIds` | Resolução em lote loja → merchant (já usada na Wave 1) | Descobrir se uma loja tem perfil de merchant vinculado |
| `MerchantProfileService.getPublicProfile` | Perfil público agregado do merchant (trust score, status, badge, badges ativos, sinais, reviews, timeline) — já existente para o Merchant Passport | Nível de confiança, badges disponíveis |
| `TrustHistoryService.getMerchantHistory` | Até 30 snapshots diários de `trust_score` (já gravados por `createDailySnapshot`) | Histórico consistente (tendência) |
| `RankedOfferIntelligence.isVerifiedStore` | Já resolvido pela `ComparisonIntelligenceComposer` (Wave 1) a partir do mesmo `BadgeService` | Loja verificada — reaproveitado diretamente, nunca recalculado |
| `RankedOfferIntelligence.freshness` (`FreshnessService`) | Já resolvido pela Wave 1 | Atualização recente |
| `CanonicalOfferView.inStock` | Já existente na oferta | Estoque confirmado |

Serviços auditados e **não usados** nesta Wave (fora de escopo por decisão consciente, não por omissão):
- **Offer Ranking** — apenas lido indiretamente via `RankedOfferIntelligence`, nunca chamado ou alterado.
- **Marketplace Health / Merchant Intelligence / Merchant Ownership (Claim/Delegation)** — métricas operacionais e de dono de loja, não sinais voltados ao comprador; citá-los inflaria a Trust Card com dados que o comprador não pode avaliar.
- **VerificationService** (fluxo de verificação em si) — o resultado da verificação já chega através de `trustSummary.status`/`badgeLevel`; chamar o serviço de verificação diretamente duplicaria a mesma informação.

## 2. O Trust Composer (Objetivo 2)

```
RankedOfferIntelligence (offer, isVerifiedStore, freshness — já existentes, Wave 1)
        │
        ▼
TrustComposer.composeForOffer(offer)                              [NOVO — Wave 4]
        │
        ├─ IMerchantStoreLinkRepository.findMerchantIdsByStoreIds([storeId])
        ├─ merchantId nulo? → card com todos os campos de merchant nulos + "Informação indisponível"
        ├─ senão:
        │   ├─ MerchantProfileService.getPublicProfile(merchantId)
        │   └─ TrustHistoryService.getMerchantHistory(merchantId, 30)
        ├─ compara snapshot mais novo vs. mais antigo → historyTrend (tolerância de 5 pontos)
        └─ monta signals[] + limitations[] — nunca inventa um valor ausente
        ▼
TrustCardResult
```

`src/domains/buyer-intelligence/services/TrustComposer.ts` — mesmo domínio de composição pura das Waves 1-3, nenhum domínio novo criado.

## 3. Trust Card (Objetivo 3)

| Sinal | Fonte | Quando aparece "Informação indisponível" |
|---|---|---|
| 🛡️ Loja verificada | `RankedOfferIntelligence.isVerifiedStore` | Nunca — sempre `true` ou `false`, é o mesmo valor exibido em outras partes do app |
| ⭐ Nível de confiança | `MerchantProfileService` (`trustScore` + `badgeLevel`) | Loja sem merchant vinculado |
| 🕒 Atualização recente | `FreshnessService` (via a oferta) | Oferta sem cálculo de frescor disponível |
| 📦 Estoque confirmado | `offer.inStock` | Nunca — sempre presente na oferta |
| 🏅 Badges disponíveis | `MerchantProfileService.activeBadges` | Nenhum badge ativo no momento |
| 📈 Histórico consistente | `TrustHistoryService` (tendência) | Menos de 2 snapshots de histórico |
| ⚠️ Limitações conhecidas | Lista honesta de todas as ausências acima | Sempre presente quando há qualquer ausência |

## 4. Explicabilidade (Objetivo 4)

Cada linha do card é um `TrustSignalLine { factor, label, evidence }` — a mesma disciplina de `BestDealReason`/`PurchaseTimingReason`. "Por que esta loja recebeu alto nível de confiança?" tem resposta direta: a evidência cita o `trustScore` numérico e o nome do badge (`badgeLabel`), nunca uma explicação genérica. Nenhuma caixa-preta: não existe nenhum valor no card que não seja rastreável a um campo nomeado de um serviço já existente.

## 5. Onde vive, e onde não aparece (Objetivo 5)

- **Product Detail** (`app/product/[slug]/page.tsx`) — Trust Card para a loja do Best Deal (rank-1), a mesma loja que o comprador veria clicar.
- **Comparison Experience** (`app/compare/[slug]/page.tsx`) — mesmo critério (loja recomendada), logo abaixo do Should I Buy Now.
- **Search Results** (`components/search/SearchResults.tsx` via `ProductCard`) — versão compacta: apenas o selo "🛡️ Verificada" (`TrustComposer.composeCompactForStores`, lote por lista de `storeId`, nunca N+1).
- **Home Premium** — não tocada. Nenhum arquivo em `components/home/**` ou `app/page.tsx` foi alterado.

## 6. Todos os casos de "Informação indisponível" / "Não há informação suficiente" (Objetivo 6)

1. **Loja sem merchant vinculado** (`IMerchantStoreLinkRepository` não encontra registro) — todo o bloco de confiança do merchant (`trustScore`, `badgeLevel`, `activeBadges`, `historyTrend`) fica nulo/vazio; apenas `isVerified` (sempre `false` neste caso), `freshness` e `inStock` continuam vindo da própria oferta.
2. **Falha ao carregar o perfil de confiança** (`MerchantProfileService.getPublicProfile` lança erro) — isolada em `errors.profile`, os campos de confiança ficam nulos, mas o card não quebra.
3. **Nenhum badge ativo no momento** — a linha "Badges disponíveis" simplesmente não aparece na lista de sinais, e uma limitação explícita é adicionada.
4. **Menos de 2 snapshots de `trust_history`** — `historyTrend` é `"unknown"`, a linha "Histórico consistente" não aparece, e uma limitação explícita ("Histórico insuficiente para avaliar consistência") é adicionada — nunca um "estável" adivinhado a partir de um único ponto.
5. **Frescor indisponível para a oferta** — a linha "Atualização recente" não aparece; limitação registrada.

## 7. Limites conhecidos

- **A tolerância de 5 pontos para `historyTrend`** é a mesma disciplina de "ignorar ruído" já usada em todas as Waves anteriores (2% para tendência de preço/câmbio, 10% para mediana) — apenas expressa nas próprias unidades deste sinal (pontuação de confiança 0-100), não um novo conceito de pontuação.
- **A janela de histórico é de até 30 snapshots diários** (mesmo padrão já usado por `TrustHistoryService` em outros contextos) — uma mudança de tendência mais recente pode não aparecer se o merchant tiver poucos snapshots.
- **`isVerified` é lido, nunca recomputado** — se a definição de "loja verificada" mudar no futuro (nova regra de badge), este card automaticamente reflete a mudança sem exigir nenhuma alteração aqui, porque não existe uma segunda definição concorrente.

## 8. Preparação para EI-5 (Objetivo 7)

O `TrustComposer` já expõe exatamente o formato que o **Buyer Decision Center** precisará: `composeForOffer(offer: RankedOfferIntelligence): Promise<TrustCardResult>` — uma função pura de composição, sem estado, sem UI acoplada. O Decision Center poderá:
- Chamar `composeForOffer` para qualquer oferta já rankeada (mesmo padrão do Best Deal e Should I Buy Now) e combinar `TrustCardResult` com `BestDealResult`/`PurchaseTimingResult` em uma única visão consolidada de decisão.
- Reaproveitar `composeCompactForStores` para qualquer lista de lojas em um contexto de grade/resumo, sem nenhuma nova query.
- Nenhuma alteração no `TrustComposer` é esperada para isso — a composição do Decision Center é, ela mesma, mais uma composição sobre composições já existentes, seguindo a mesma disciplina desta Wave.

Nenhuma implementação do Decision Center ocorreu nesta missão.
