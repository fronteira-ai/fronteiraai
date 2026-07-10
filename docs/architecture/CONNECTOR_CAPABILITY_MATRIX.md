# CONNECTOR_CAPABILITY_MATRIX.md
# Connector Capability Matrix v2

**Versão**: 2.0 (proposta — aguardando aprovação do CTO; v1 já existe e permanece em produção)
**Criado**: 2026-07-10 (Program Σ — Mission Σ-1)
**Status**: PROPOSTA ARQUITETURAL — nenhum código escrito
**Categoria**: `docs/architecture/`
**Companion**: `CONNECTOR_PLATFORM_V3.md`, `CONNECTOR_STRATEGY_ENGINE.md`, `CONNECTOR_INTELLIGENCE.md`

---

## 1. O que já existe (v1) — não duplicado aqui

`types/capability.types.ts` já define `ConnectorCapabilities`, campo obrigatório de `ConnectorMetadata`, declarado estaticamente por quem constrói o connector: `supportsRealtime, supportsSearch, supportsPagination, supportsImages, supportsBrands, supportsCategories, supportsStock, supportsExchange, supportsStructuredData, supportsCanonicalMatching`. Reservado para o Brain, ainda sem consumidor (documentado em `docs/engineering/CONNECTOR_PLATFORM_V2.md` §4).

**Gap semântico real da v1**, encontrado nesta auditoria: os campos hoje respondem "o que o código do connector extrai da fonte", não "o que a fonte, objetivamente, oferece". Exemplo concreto: `supportsSearch: false` está declarado em todos os 5 connectors — mas isso mistura dois fatos diferentes (a Mobile Zone talvez tenha um endpoint de busca na sua API pública, nunca verificado; os 4 connectors de sitemap genuinamente não têm como pesquisar, sitemap não é um índice de busca). Sem separar os dois, a Matrix não consegue responder "vale a pena investir em usar busca nesta fonte?" — só "usamos busca hoje?".

---

## 2. v2 — duas matrizes, não uma

| | **Source Capability Matrix** | **Connector Capability Matrix (= v1, mantida)** |
|---|---|---|
| Pergunta que responde | O que o sistema do merchant objetivamente oferece? | O que o nosso connector hoje efetivamente implementa contra essa fonte? |
| Quem declara | Quem faz o audit de onboarding (como já acontece em `docs/marketplace/Tier1_Merchants.md`) | Quem escreve o connector, na Certificação |
| Muda quando | O merchant muda o site/API dele (raro) | Toda vez que o connector evolui (comum) |
| Já existe hoje? | Não, como estrutura formal — existe informalmente dentro da prosa do dossiê de cada merchant | Sim (v1) |

**A diferença entre as duas colunas de uma mesma linha é o backlog real daquele connector** — não dívida técnica genérica, um item concreto e priorizável. Exemplo: se Source declara `supportsCursor: true` para a Mobile Zone (a API tem paginação real) e Connector declara `supportsDelta: false` (ninguém implementou o tracking ainda), a lacuna É o item de retrofit V2.1 nomeado em `CONNECTOR_PLATFORM_V3.md` §9.

---

## 3. Campos propostos — comparados ao pedido do mandato

| Campo (nome do mandato) | Já existe em v1? | Ação nesta proposta |
|---|---|---|
| Supports Pagination | Sim (`supportsPagination`) | Mantido, sem mudança |
| Supports Category Filter | Sim (`supportsCategories`, semântica ligeiramente diferente — hoje significa "extrai categoria", não "a fonte permite filtrar por categoria") | Mantido em Connector; adicionado à Source com a semântica de filtro |
| Supports Search | Sim, mas sempre `false` na prática | Mantido; adicionado à Source para distinguir "nunca implementamos" de "a fonte não oferece" |
| Supports Incremental Updates | Não | **Novo** — alias declarativo de `progress !== "none"` no Strategy Profile (`CONNECTOR_STRATEGY_ENGINE.md` §3), redundante por design (mesma verdade, exposta em dois lugares para quem só olha a Matrix) |
| Supports Last Modified | Não | **Novo** — Source: a fonte expõe timestamp por item? Connector: estamos usando isso hoje? |
| Supports Sitemap | Não (implícito em qual SDK module o connector importa) | **Novo** — torna explícito o que hoje só se descobre lendo o código-fonte do connector |
| Supports Delta | Não | **Novo** — Source: a fonte permite pedir "só o que mudou desde X"? Connector: implementamos isso? |
| Supports Popularity Ranking | Não | **Novo** — Source only por enquanto; nenhum connector usa isso ainda (ver `CatalogValueSamplingPolicy`, ainda não implementada) |
| Supports Cursor | Não | **Novo** — Source: a API tem cursor/offset estável? Caso real: Mobile Zone = true na Source, false na Connector hoje (gap) |
| Supports Sorting | Não | **Novo** — a fonte permite pedir ordenação (ex.: por data, por preço)? Nenhum connector usa hoje |
| Supports Brand Filter | Parcial (`supportsBrands` = extrai marca, não = filtra por marca) | Mesmo tratamento de Category Filter acima |
| Supports Stock Filter | Parcial (`supportsStock` = extrai estoque) | Mesmo tratamento |
| Supports Price Filter | Não | **Novo** — a fonte permite filtrar/ordenar por faixa de preço? |

Nenhum campo v1 é removido ou renomeado — v2 é estritamente aditiva, compatível com todo consumidor atual de `ConnectorCapabilities` (hoje só `ConnectorRegistry.findByCapability`).

---

## 4. Preenchimento real — os 5 connectors ativos

Fonte: leitura direta de `capabilities.ts` de cada connector (Connector Capability, coluna esquerda de cada par) + inferência do que a fonte pública demonstravelmente oferece, a partir do que os connectors já usam ou dos dossiês de `Tier1_Merchants.md` (Source Capability, coluna direita — marcada `?` onde não há confirmação por fetch real, para não inventar fato não verificado).

| Capacidade | Shopping China (Conn / Source) | Mega Eletrônicos (Conn / Source) | Roma Shopping (Conn / Source) | Atacado Connect (Conn / Source) | Mobile Zone (Conn / Source) |
|---|---|---|---|---|---|
| Pagination | ✅ / ✅ (sitemap) | ✅ / ✅ | ✅ / ✅ | ✅ / ✅ | ✅ / ✅ (API real) |
| Category Filter | ✅ extrai / `?` | ✅ / `?` | ✅ / `?` | ✅ / `?` | ❌ / `?` |
| Search | ❌ / `?` | ❌ / `?` | ❌ / `?` | ❌ / `?` | ❌ / `?` (nunca testado contra a API real) |
| Incremental Updates | ✅ (delta real) / ✅ | ✅ / ✅ | ✅ / ✅ | ✅ / ✅ | **❌** / ✅ (`count` real existe, cursor não usado) |
| Last Modified | ✅ (`lastmod`) / ✅ | ✅ / ✅ | ✅ / ✅ | ✅ / ✅ | `?` / `?` (API não confirmada a expor timestamp por item) |
| Sitemap | ✅ / ✅ | ✅ / ✅ | ✅ / ✅ (132 sub-sitemaps) | ✅ / ✅ | ❌ / ❌ (SPA, sitemap não é o caminho — API é) |
| Delta | ✅ / ✅ | ✅ / ✅ | ✅ / ✅ | ✅ / ✅ | **❌** / `?` — gap principal desta Mission |
| Popularity Ranking | ❌ / `?` | ❌ / `?` | ❌ / `?` | ❌ / `?` | ❌ / `?` |
| Cursor | N/A (sitemap não usa cursor) | N/A | N/A | N/A | **❌** / **✅** — o `offset`/`limit` real da API é um cursor não aproveitado como tal |
| Sorting | ❌ / `?` | ❌ / `?` | ❌ / `?` | ❌ / `?` | ❌ / `?` |
| Brand Filter | ✅ extrai / `?` | ✅ / `?` | ✅ / `?` | ✅ / `?` | ❌ / `?` |
| Stock Filter | ❌ (hardcoded `true`) / `?` | ✅ extrai / `?` | ✅ / `?` | ✅ / `?` | ✅ extrai / `?` |
| Price Filter | ❌ / `?` | ❌ / `?` | ❌ / `?` | ❌ / `?` | ❌ / `?` |
| Structured Data | ❌ (heurística de texto) / N/A | ❌ (heurística) / N/A | ✅ (Open Graph) / ✅ | ✅ (JSON-LD schema.org) / ✅ | ✅ (JSON real) / ✅ |

**Leitura da tabela**: a única lacuna Connector=❌ / Source=✅ confirmada é a da Mobile Zone em Incremental Updates/Delta/Cursor — exatamente o achado de `CONNECTOR_PLATFORM_V3.md` §1, agora expresso como dado estruturado em vez de prosa. Todos os `?` são itens de auditoria futura (repetir o exercício de `Tier1_Merchants.md` com essa lente nova), não suposições assumidas como fato.

---

## 5. Os 5 bloqueados (Classe D) — por completude, não é omissão

Cellshop, Nissei, Casa Americana, New Zone, Visão VIP: Source Capability Matrix não pode ser preenchida com confiança sem violar `SOURCE_DISCOVERY_POLICY.md` (robots.txt nomeado/Cloudflare bloqueiam até a checagem inicial de estrutura). Ficam como `N/A — Restricted`, não como `false` — declarar `false` sugeriria "auditado e confirmado ausente", que não é o caso.
