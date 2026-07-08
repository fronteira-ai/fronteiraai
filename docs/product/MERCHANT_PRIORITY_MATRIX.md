# MERCHANT_PRIORITY_MATRIX.md
# PROGRAM Δ — Mission Δ-1 — Matriz de Priorização de Merchants

**Categoria**: `docs/product/` (companion de Program Ω/Δ)
**Data**: 2026-07-08
**Fonte primária, reaproveitada, não recriada**: `docs/marketplace/Tier1_Merchants.md` (auditoria técnica, 2026-07-03) + `docs/business/TIER1_PARTNERS.md` (pipeline comercial) — este documento **não substitui nenhum dos dois**, apenas os reorganiza em formato de matriz de execução para esta missão, citando os mesmos fatos.

---

## Critérios objetivos (herdados, não inventados)

| Critério | Fonte |
|---|---|
| Relevância comercial | `Business Priority` (`Tier1_Merchants.md` §6) |
| Viabilidade técnica | `Certification Status` + `Connector Complexity` (`Tier1_Merchants.md` §5) |
| Variedade de catálogo | Número de categorias/departamentos observados na auditoria técnica (§5, por loja) |
| Potencial de comparação | Presença de categorias já cobertas pelos 4 connectors ativos (overlap qualitativo — análise quantitativa de overlap real não foi feita, mesma limitação já documentada em `Tier1_Merchants.md` §8) |
| Facilidade técnica | `Connector Complexity` (Baixa/Média/Alta) |
| Impacto para o usuário | Tamanho estimado de catálogo × ausência de bloqueio |

## Matriz — 10 merchants Tier 1

| Merchant | Relevância Comercial | Viabilidade Técnica | Catálogo Estimado | Complexidade | Status Real (produção) | Ordem de Execução |
|---|---|---|---|---|---|---|
| **Roma Shopping** | Alta | Alta — Certified | ~24.370 URLs reais (sitemap confirmado) | Baixa-Média | **205 ofertas ativas, 100% canonical, 4/5 syncs OK** | 1 (recertificado, já em produção — ver Coverage Map) |
| **Atacado Connect** | Média-Alta | Alta — Certified | 8.000+ (extrapolado) | Baixa-Média | **206 ofertas ativas, 99% imagem, 100% canonical, 4/4 syncs OK** | 1 (já em produção) |
| **Mega Eletrônicos** | Alta | Alta — Certified | ~1.000–1.500 | Baixa-Média | **203 ofertas ativas, 100% completo, 4/4 syncs OK** | 1 (já em produção) |
| **Shopping China** | Alta | Alta — connector existe, **não recertificado** | ~1.000–1.500 estimado, **apenas 35 ativos hoje** | Baixa (recertificação, não construção) | **35 ofertas — muito abaixo do estimado, sitemap real nunca adotado** | **1 — maior prioridade de todo este documento** (ver Backlog) |
| Cellshop | Alta | Bloqueada — Data Partnership | Não verificável (bloqueio) | N/A (comercial) | 0 — sem connector possível | Comercial, prioridade 1 (`TIER1_PARTNERS.md`) |
| Nissei | Alta | Bloqueada — Data Partnership | Não verificável (bloqueio) | N/A (comercial) | 0 | Comercial, prioridade 1 |
| New Zone | Média-Alta | Bloqueada — Data Partnership | Não verificável (bloqueio) | N/A (comercial) | 0 | Comercial, prioridade 2 |
| Casa Americana | Média | Bloqueada — Data Partnership | Não verificável (bloqueio) | N/A (comercial) | 0 | Comercial, prioridade 3 |
| Mobile Zone | Média | Incerta — Needs Technical Spike | Não verificável (suspeita de SPA) | Média-Alta (até spike) | 0 | Spike técnico, prioridade 4 |
| Visão VIP | Média | Incerta — Needs Technical Spike | Não verificável (sitemap sem produto) | Média-Alta (até spike) | 0 | Spike técnico, prioridade 4 |

## Leitura da matriz — o achado que muda a ordem de execução

A auditoria técnica original (`Tier1_Merchants.md`, 2026-07-03) já apontava Shopping China como "melhor candidato a certificação de referência" porque o connector existe mas usa 3 categorias hardcoded em vez do sitemap real. A medição desta missão **confirma isso com número real de produção**: apenas 35 ofertas ativas contra uma estimativa de 1.000–1.500 — o connector está entregando entre 2% e 3,5% do seu potencial estimado, o pior aproveitamento entre os 4 connectors ativos por uma margem enorme.

Diferente dos outros 6 merchants Tier 1 (que exigem trabalho novo — parceria comercial ou spike técnico), Shopping China exige **apenas terminar um trabalho já começado**, usando infraestrutura 100% existente (`SitemapParser`, já genérico e reaproveitado pelos outros 3 connectors certificados). Ver `CONNECTOR_EXECUTION_BACKLOG.md` item 1.

## Ordem de contato comercial (não alterada, apenas referenciada)

Ver `docs/business/TIER1_PARTNERS.md` §"Ordem recomendada de contato" — não duplicada aqui. Nenhum contato foi feito até esta data (todos `Not Contacted`).
