# OFFER_CONVERGENCE_ANALYSIS.md
# PROGRAM Δ — Mission Δ-3 — O Marketplace Tem Produtos Equivalentes Vendidos por Múltiplos Merchants?

**Categoria**: `docs/product/` (companion de Program Ω/Δ)
**Data**: 2026-07-08 — medição direta, catálogo 100% canonicalizado, zero estimativa

---

## Resposta objetiva

**Quase não.** Dos 1.262 canonical products com pelo menos uma oferta, **apenas 4 (0,32%)** têm ofertas de mais de uma loja. **1.258 (99,68%)** são vendidos por exatamente uma loja.

## Achado que corrige a leitura inicial dos 4 casos

Uma inspeção direta dos 4 casos de convergência mostrou que **3 dos 4 envolvem `nissei`/`cellshop`** — duas lojas que **não são conectores reais**. Investigação de proveniência:

- `stores.created_at`: 2026-06-16/17 — antes até da existência do Connector Platform (Release 1.7, ~2026-07-01)
- `cover_image`: `placehold.co/...` — imagem placeholder, não uma imagem real capturada
- Essas duas lojas correspondem, por slug, aos merchants **oficialmente bloqueados** em `docs/marketplace/Tier1_Merchants.md` (`Restricted — Commercial Partnership Recommended`, nunca raspados, `robots.txt` proíbe `ClaudeBot`)

**Conclusão**: `nissei`/`cellshop` no banco são dado de seed manual/demo do MVP original (pré-Release 1.0), não dado de mercado real — nunca deveriam ter sido comparados como se fossem uma segunda fonte de mercado legítima. Corrigindo para considerar apenas os 4 conectores reais e certificados (Shopping China, Mega Eletrônicos, Roma Shopping, Atacado Connect):

## Convergência real (só os 4 conectores certificados)

| Par | Produtos compartilhados |
|---|---|
| Shopping China × Mega Eletrônicos | **1** |
| Shopping China × Roma Shopping | 0 |
| Shopping China × Atacado Connect | 0 |
| Mega Eletrônicos × Roma Shopping | 0 |
| Mega Eletrônicos × Atacado Connect | 0 |
| Roma Shopping × Atacado Connect | 0 |

**Entre os 4 merchants reais e certificados, existe exatamente 1 produto em comum, em todo o catálogo.**

## Os merchants atuais trabalham com catálogos essencialmente distintos

**Sim, confirmado quantitativamente, não por suposição.** Roma Shopping (372 produtos canônicos) e Atacado Connect (392) — os dois maiores catálogos — têm **zero** sobreposição entre si e com qualquer outro merchant. Os 4 merchants reais operam, na prática, como 4 catálogos paralelos que raramente ou nunca vendem o mesmo item.

## Por que isso é o achado central desta missão

Todas as métricas de densidade melhoraram substancialmente desde Ω-4.0 (Marketplace Density Score 59,7 → 83,2). Mas a pergunta que a Visão do ParaguAI existe para responder — "qual loja tem o menor preço para o que eu quero comprar" — só tem uma resposta não-trivial para **1 produto em mais de 1.200**. Nenhuma quantidade de canonicalização, limpeza de dado ou crescimento de catálogo dentro dos mesmos 4 merchants resolve isso — os catálogos em si não competem.
