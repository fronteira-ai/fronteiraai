# MARKETPLACE_OPPORTUNITY.md
# Program Ψ (Psi) — Mission Ψ-1 — Marketplace Dominance

**Categoria**: `docs/product/`
**Criado**: 2026-07-16
**Status**: Auditoria estratégica, zero código. Reaproveita `cpc-report.ts`/`observatory-report.ts` (já certificados) mais duas verificações pontuais read-only (mesmo padrão de Φ-1/Κ-4/Κ-5), e a pesquisa já existente em `docs/product/CATEGORY_GAP_REPORT.md` (docs/marketplace/, 2026-07-14)/`CATEGORY_DOMINATION_PLAN.md` (2026-07-08) — citadas, não reproduzidas, com data explícita para marcar o que pode estar desatualizado.
**Ver também**: `docs/product/EXPANSION_MATRIX.md`, `docs/product/CATEGORY_DOMINANCE.md`, `docs/product/MARKETPLACE_DOMINANCE.md`, `docs/product/PUBLIC_BETA_READINESS.md`.

---

## 1. Baseline real (2026-07-16, reconfirmado nesta Mission)

| Métrica | Valor |
|---|---:|
| Products | 18.010 |
| Offers | 18.015 |
| Comparable (2+ lojas) | 6 (0,03%) |
| Comparable (3+ lojas) | 0 |
| Merchants com oferta | 7 (5 substanciais + nissei/cellshop residuais) |
| Marketplace Health | 63/100 |
| AI Readiness | 52,6/100 |
| `buyer_events` (7 dias) | 46 |
| `exchange_rates` | 0 linhas (API key não provisionada) |
| `merchants` (contas reais) | 2 |

## 2. Ranking de categorias — o que é medição real vs. o que é histórico citado

**Medição real desta Mission** (via `cpc-report.ts`, catálogo de hoje, categorias brutas de `products.category_id`): das poucas categorias com Comparable Coverage > 0%, **"Celulares"** lidera com 16,67% (2 de 12 canonical products com oferta comparável) — a maior taxa percentual do marketplace inteiro hoje, embora em volume absoluto pequeno. "Notebooks" vem em seguida (10%, 1/10). "Drones" mostra 33% mas sobre uma base de apenas 3 produtos — estatisticamente insignificante, citado por transparência, não como sinal de prioridade.

**Histórico citado, não remedido nesta Mission** (`docs/marketplace/CATEGORY_GAP_REPORT.md`, 2026-07-14 — catálogo era menor então, volumes absolutos abaixo já cresceram, mas a estrutura relativa entre categorias tende a ser mais estável que o volume total):

| Categoria | Volume (medido 07-14) | Comparabilidade real (07-14) | Observação |
|---|---:|---|---|
| Perfumes | ~1.450 produtos (8% do catálogo) | Zero comparação confirmada | Maior volume de qualquer categoria nomeada, zero comparabilidade — "maior contradição" já nomeada pelo próprio relatório |
| Celulares | ~1.025 produtos (fragmentado em 2 slugs) | Único par de comparação real conhecido na época (Shopping China × Mega Eletrônicos) | Melhor cobertura relativa de qualquer categoria nomeada |
| Informática | 392 produtos (maior catálogo de merchant único, Atacado Connect) | Zero par de comparação | — |
| Notebooks | ~245 produtos | Zero overlap medido entre os 2 merchants do cluster | — |
| Fotografia | Não medido | Depende inteiramente de Nissei (bloqueado) | — |
| Games, Drones, Auto, Instrumentos, Esportes | **Zero dado** | Zero dado | "Mais de um terço das categorias que o CTO nomeou como referência estratégica nunca foi auditado tecnicamente em nenhuma missão anterior" — citação literal do relatório original |

## 3. Ticket médio e frequência de compra — limitação de dado, declarada

`ParaguAI` é um marketplace de comparação/redirecionamento (`BUSINESS_MODEL.md`) — não processa checkout, não tem dado de compra completada. "Frequência de compra" **não existe como dado real** e não será estimada. O proxy real mais próximo é `OfferClicked` (clique de redirecionamento para a loja) — mas com apenas 46 eventos de comprador nos últimos 7 dias no total do marketplace, qualquer ranking de categoria por clique teria significância estatística desprezível. Reportado honestamente como um gap de instrumentação, não preenchido com um número inventado.

**Ticket médio**: não computado nesta Mission — exigiria agregação de preço por categoria sobre o catálogo bruto (join `offers.price_usd` × `products.category_id`), uma medição real possível mas não priorizada aqui porque, sem volume de busca/clique real para cruzar contra, um ranking por ticket médio isolado não distingue categorias de alto potencial comercial de categorias simplesmente caras.

## 4. Achado central desta auditoria

O ranking de categoria por **potencial comercial** que esta Mission pode responder com dado real hoje é, na prática, um ranking por **Comparable Coverage relativa** — porque é a única dimensão com medição real, reproduzível, e diretamente ligada ao Buyer Value que a Mission pede para maximizar. Busca e frequência de compra são gaps de instrumentação reais, nomeados no §8 desta auditoria (Beta Readiness) e em `MARKETPLACE_DOMINANCE.md`, não presumidos.
