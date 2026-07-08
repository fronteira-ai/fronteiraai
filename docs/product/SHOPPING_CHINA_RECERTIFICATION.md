# SHOPPING_CHINA_RECERTIFICATION.md
# PROGRAM Δ — Mission Δ-2 — Shopping China: Correção de Premissa + Recertificação Real

**Categoria**: `docs/product/` (companion de Program Ω/Δ)
**Data**: 2026-07-08

---

## Correção importante ao registro de missões anteriores

O brief desta missão (e os documentos `MERCHANT_PRIORITY_MATRIX.md`/`CONNECTOR_EXECUTION_BACKLOG.md` da Mission Δ-1, que herdaram a mesma premissa de `docs/marketplace/Tier1_Merchants.md` §5.1, auditado em 2026-07-03) descreviam Shopping China como usando "3 categorias hardcoded" em vez do sitemap real.

**Isso já não era verdade no momento em que foi escrito.** A leitura direta de `src/domains/connectors/crawler/shoppingchina/connector.ts` nesta missão mostra:

```typescript
private readonly sitemapCrawler = new SitemapCrawler(this.fetcher);
private readonly deltaPlanner = new DeltaImportPlanner();
// ...
const entries = await this.sitemapCrawler.collectEntries(CFG.sitemapUrl, { ... });
```

Estrutural e literalmente idêntico ao padrão usado por Mega Eletrônicos, Roma Shopping e Atacado Connect. O comentário no topo do arquivo confirma: **"Wave 4 (Connector Tier 1 implementation) — recertificado para usar o sitemap real do site em vez de 3 categorias hardcoded"** — a migração já aconteceu, no Release 1.8 Program A Wave 4 (2026-07-04), antes desta missão e antes até da Mission Δ-1.

**Por que o achado anterior parecia certo mesmo estando desatualizado**: a produção só tinha 35 ofertas de Shopping China, o que *parece* consistente com "3 categorias hardcoded" — mas a causa real, confirmada nesta missão, era outra inteiramente.

## Causa real (confirmada por consulta ao histórico completo de `connector_sync_runs`)

Shopping China teve exatamente **uma** execução real (`dry_run: false`) antes desta missão — em 2026-07-04, processando **3 produtos** (um smoke test, não uma sincronização em escala). As outras 32 ofertas hoje atribuídas a essa loja vêm de dado anterior ao Connector Platform (seed original). Nunca houve uma segunda execução real em escala — não porque o conector estivesse quebrado, mas porque nunca foi rodado de novo.

## Ação desta missão

**Nenhuma migração de código foi necessária ou executada.** O connector já estava correto. A "recertificação" foi rodar o que já existia, pela primeira vez, em escala real:

```
Mode: EXECUTE
Received: 200 | Persisted: 200 | Skipped: 0 | Failed: 0
Duration: 113s
```

Sitemap real confirmado ao vivo nesta execução: **0 erros de parse em 200 páginas de produto reais**, `DeltaImportPlanner` funcionando corretamente (nenhum re-fetch desnecessário de URLs já vistas).

## Resultado

| Métrica | Antes desta missão | Depois |
|---|---|---|
| Ofertas Shopping China | 35 | 235 |
| Execuções reais em escala | 1 (3 itens, smoke test) | 2 (3 itens + 200 itens) |
| Uso de sitemap | Sim (já existia) | Sim (confirmado ao vivo, 0 erros) |

## Limitação real, não corrigida (fora do escopo desta missão)

`SHOPPING_CHINA_CONFIG.maxProducts = 200` — mesmo cap dos outros 3 conectores. O sitemap real tem mais de 20.000 URLs (comentário no próprio `config.ts`). Elevar esse limite é uma mudança de configuração pequena, mas delibaradamente não feita aqui — esta missão autoriza correção de cron/config de agendamento, não uma decisão de volume de crawl por execução, que tem implicação de custo/tempo (cada 200 itens já levou ~2 minutos) e deveria ser uma decisão explícita própria.
