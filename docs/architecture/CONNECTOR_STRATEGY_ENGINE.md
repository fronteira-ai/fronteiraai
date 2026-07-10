# CONNECTOR_STRATEGY_ENGINE.md
# Connector Strategy Engine

**Versão**: 1.0 (proposta — aguardando aprovação do CTO)
**Criado**: 2026-07-10 (Program Σ — Mission Σ-1)
**Status**: PROPOSTA ARQUITETURAL — nenhum código escrito
**Categoria**: `docs/architecture/`
**Companion**: `CONNECTOR_PLATFORM_V3.md` (visão geral e roadmap), `CONNECTOR_CAPABILITY_MATRIX.md` (dados que alimentam a decisão), `CONNECTOR_INTELLIGENCE.md` (métricas que validam a escolha)

---

## 1. O que este componente é — e o que deliberadamente não é

O **Connector Strategy Engine** é o componente responsável por associar, a cada connector, uma combinação declarada de:

- **Discovery Strategy** — como descobrir o universo (ou uma amostra) de produtos da fonte.
- **Progress Strategy** — como saber o que já foi coletado antes, para avançar em vez de repetir.
- **Sampling Policy** — quando a descoberta completa não é viável, como escolher o que priorizar.

**Não é** um dispatcher em runtime que "decide sozinho" qual estratégia usar por reflection, plugin discovery ou machine learning online. Program B Wave 2 baniu explicitamente event bus, Kafka/RabbitMQ/Redis, plugin framework, reflection e DI complexo neste código-base — um Strategy Engine autônomo violaria esse precedente sem necessidade real (hoje, 5 connectors; a decisão de estratégia por connector é um evento raro — acontece uma vez, na criação/certificação do connector, não a cada sync). O Engine é, na prática, **uma tabela de decisão estática consultada por humano + uma validação automática na Certificação de que a declaração é coerente com a Capability Matrix real da fonte.**

---

## 2. As três interfaces (proposta, pseudocódigo — nada disto existe no código hoje)

```ts
// Discovery: enumera candidatos a produto. Cada connector implementa UMA.
interface IDiscoveryStrategy {
  readonly kind: "sitemap" | "paginated-api" | "category-crawl" | "search-crawl" | "feed";
  discover(ctx: DiscoveryContext): Promise<DiscoveredEntry[]>;
  // DiscoveredEntry = { url, externalId, lastModified?, category?, sourceOrder? }
  estimateTotalKnown(ctx: DiscoveryContext): Promise<number | null>;
  // null = fonte não declara total (ex.: HTML sem contagem) — cobertura vira "desconhecida", não "0%"
}

// Progress: decide o que já foi visto vs. o que é novo/mudou. Generalização do
// DeltaImportPlanner existente (hoje só funciona sobre sitemap lastmod).
interface IProgressStrategy {
  plan(entries: DiscoveredEntry[], known: KnownEntrySnapshot[]): ProgressPlan;
  // ProgressPlan = { toFetch: DiscoveredEntry[], skipped: DiscoveredEntry[], reason }
  checkpoint(fetched: DiscoveredEntry[]): KnownEntrySnapshot[];
  // persistido via a MESMA tabela connector_url_snapshots já existente — chave
  // (connector_id, external_key) generalizada além de "url", ver §5
}

// Sampling: só entra em jogo quando Discovery não cobre 100% em uma execução
// (catálogos muito grandes, ou fonte sem paginação completa). Nunca sobrepõe Progress —
// roda DEPOIS de já saber o que é novo, decidindo a ORDEM de prioridade dentro do backlog.
interface ISamplingPolicy {
  prioritize(pending: DiscoveredEntry[], budget: number): DiscoveredEntry[];
}
```

Implementações concretas propostas (nomes ilustrativos, nenhuma escrita):

| Discovery | Já existe hoje como | Novo? |
|---|---|---|
| `SitemapDiscoveryStrategy` | `sdk/sitemap/SitemapCrawler` (adaptado à interface) | Wrapper apenas — lógica já existe e está em produção |
| `PaginatedApiDiscoveryStrategy` | Loop cru na Mobile Zone (`connector.ts`) | Sim — extrai o padrão offset/limit hoje hardcoded na Mobile Zone para algo reutilizável por qualquer futura API paginada |
| `CategoryDiscoveryStrategy` | Não existe | Sim — para fontes sem sitemap nem contagem total, mas com navegação por categoria |

| Progress | Já existe hoje como | Novo? |
|---|---|---|
| `LastModifiedProgressStrategy` | `DeltaImportPlanner` (hoje acoplado a sitemap `lastmod`) | Generalização — mesma lógica, input desacoplado de "vem de sitemap" |
| `CursorProgressStrategy` | Não existe | Sim — para APIs que devolvem cursor/offset estável e `count` total (caso da Mobile Zone hoje) |
| `NoProgressStrategy` (explícita, não omissão) | É o que a Mobile Zone usa hoje, implicitamente | Formalizar como escolha declarada e visível na Certificação, não um "esquecimento" |

| Sampling | Já existe hoje como | Novo? |
|---|---|---|
| `FifoSamplingPolicy` (ordem de descoberta, sem priorização) | Comportamento implícito de todos os 5 connectors hoje | Formalizar como default explícito |
| `CatalogValueSamplingPolicy` | Reaproveita `CatalogIntelligenceService` (score 0-100, Release 1.6 Epic 4) | Composição, não novo scoring — ver `CONNECTOR_INTELLIGENCE.md` §3 |
| `CategoryBalancedSamplingPolicy` | Não existe | Sim — evita que uma execução limitada esgote o orçamento em uma única categoria populosa |

---

## 3. Connector Strategy Profile — a declaração

```ts
interface ConnectorStrategyProfile {
  connectorId: string;
  discovery: IDiscoveryStrategy["kind"];
  progress: "last-modified" | "cursor" | "none";
  sampling: "fifo" | "catalog-value" | "category-balanced";
  declaredAt: string;       // data da certificação que validou esta declaração
  declaredBy: string;       // quem certificou (humano — engenheiro ou CTO)
  rationale: string;        // por que esta combinação, obrigatório, nunca vazio
}
```

Este objeto é o equivalente, para estratégia, do que `ConnectorCapabilities` já é para capacidades — um campo **obrigatório e estático**, não algo computado. Mesma filosofia da Capability Matrix v1: "afirmação honesta do autor do connector", não um valor mágico calculado.

**Retrofit dos 5 connectors reais para este modelo** (o que a declaração seria, se este componente existisse hoje):

| Connector | discovery | progress | sampling | rationale |
|---|---|---|---|---|
| Shopping China | `sitemap` | `last-modified` | `fifo` | Sitemap completo, delta real já funcionando — sem necessidade de priorização, orçamento por execução já cobre o backlog pendente na maioria dos runs |
| Mega Eletrônicos | `sitemap` | `last-modified` | `fifo` | Idem |
| Roma Shopping | `sitemap` | `last-modified` | `fifo` | Idem (132 sub-sitemaps, mesma mecânica) |
| Atacado Connect | `sitemap` | `last-modified` | `fifo` | Idem |
| **Mobile Zone** | `paginated-api` | **`none`** ← gap real, declarado explicitamente em vez de implícito | `fifo` | Declaração honesta expõe o mesmo achado do §1 de `CONNECTOR_PLATFORM_V3.md`: sem Progress Strategy, a cobertura nunca passa de ~2,87%. Este profile é o item de retrofit prioritário do roadmap V2.1. |

---

## 4. A "decisão automática" — Fase 6 do mandato, respondida aqui

O mandato pergunta como descobrir automaticamente qual estratégia gera a maior cobertura. Duas respostas, deliberadamente diferentes:

**O que este design FAZ**: uma tabela de decisão determinística, consultada por quem certifica um connector novo, usando a Capability Matrix real da fonte (ver `CONNECTOR_CAPABILITY_MATRIX.md`):

```
Fonte declara total real (sitemap count, ou API `count`)?
  SIM → Fonte tem lastmod/updated_at por item?
          SIM → discovery=sitemap|paginated-api, progress=last-modified
          NÃO → Fonte tem cursor/offset estável entre execuções?
                  SIM → progress=cursor
                  NÃO → progress=none (declarado, não omitido) + ALERTA na Certificação
  NÃO  → discovery=category-crawl, progress=none, sampling=category-balanced
         (nunca fifo puro sem contagem total — risco de nunca sair da primeira categoria)
```

Isso resolve as 5 perguntas da Fase 6 sem heurística nova:
- **Maior cobertura** = preferir sempre a Discovery Strategy com `estimateTotalKnown() !== null` (sitemap ou API com `count`) sobre qualquer uma sem denominador conhecido.
- **Representatividade** = ver `CONNECTOR_INTELLIGENCE.md` §2 (Sampling Quality).
- **Overlap potencial** = já derivável hoje via `canonical_product_id` (Product Identity Shadow Mode) — não precisa de nada novo no Strategy Engine, só de expor como métrica nomeada (`CONNECTOR_INTELLIGENCE.md` §4).
- **Evitar importar produtos irrelevantes** = `CategoryBalancedSamplingPolicy`/allow-list declarativo por connector — curadoria humana, não classificação automática (evita o tipo de "decisão mágica" que este código-base já rejeitou na Capability Matrix v1, ver `CONNECTOR_PLATFORM_V2.md` §4 existente).
- **Priorizar produtos de maior valor comercial** = `CatalogValueSamplingPolicy` reaproveitando o score já existente do Catalog Intelligence (Release 1.6 Epic 4) — zero scoring novo.

**O que este design deliberadamente NÃO faz**: não tenta múltiplas estratégias em produção contra o site real do merchant para "ver qual cobre mais" (isso violaria `SOURCE_DISCOVERY_POLICY.md` — tráfego desnecessário contra a fonte, risco de ser lido como comportamento de bot agressivo) e não troca de estratégia autonomamente quando a cobertura cai (isso é uma decisão de Certificação, disparada por alerta de métrica — ver `CONNECTOR_INTELLIGENCE.md` §5, Connector Confidence).

---

## 5. Onde isto viveria (se aprovado)

`src/domains/connectors/strategy/` — ao lado de `sdk/`, dentro do domínio `connectors`. Diferente de Certification/Observability (que vivem em `lib/` porque compõem múltiplos domínios e `marketplace-operations` já depende de `connectors`, criando risco de dependência circular), o Strategy Engine só lê/escreve dados do próprio domínio de connectors — mesmo padrão de `IConnectorUrlSnapshotRepository`, que ficou dentro do domínio por ser puramente interno (Program B Wave 2).

A tabela `connector_url_snapshots` (já existe, já em produção) seria reaproveitada, não substituída — sua chave passaria de implicitamente "sitemap URL" para explicitamente `(connector_id, external_key, key_kind)`, onde `key_kind` é `"url" | "cursor" | "id"`. Isso é uma migration aditiva (nova coluna com default), não uma quebra — fica registrado aqui como decisão de design, não implementado nesta Mission.
