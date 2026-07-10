# CONNECTOR_PLATFORM_V3.md
# Connector Platform V3 — Adaptive Discovery Architecture

**Versão**: 1.1 (§1-§7 = proposta da Mission Σ-1, ainda aguardando aprovação do CTO nas partes não implementadas; §8 = Mission Σ-2, IMPLEMENTADA)
**Criado**: 2026-07-10 (Program Σ — Mission Σ-1: Adaptive Connector Intelligence)
**Atualizado**: 2026-07-10 (Program Σ — Mission Σ-2: Delta Engine Generalization)
**Status**: §1-§7 permanecem PROPOSTA ARQUITETURAL (Strategy Engine, Capability Matrix v2, Connector Intelligence — nada disso foi implementado). §8 documenta trabalho real, já implementado nesta Mission — ver detalhes de arquivos/commit em §8.
**Categoria**: `docs/architecture/`
**Companion docs**: `CONNECTOR_STRATEGY_ENGINE.md`, `CONNECTOR_CAPABILITY_MATRIX.md`, `CONNECTOR_INTELLIGENCE.md` (mesma pasta)

---

## 0. Nota de nomenclatura — leia antes do resto

O mandato desta Mission pede um documento `docs/architecture/CONNECTOR_PLATFORM_V2.md`. Esse nome já está em uso: `docs/engineering/CONNECTOR_PLATFORM_V2.md` (Release 1.8, Program A Wave 5 + Program B Wave 2) já documenta uma geração real e **já implementada em produção** — SDK unificado, Capability Matrix v1, Certification Framework, Quality Score, Delta Import Engine (com persistência real), Registry/Directory facade, Observability, Source Discovery Policy.

Chamar a proposta desta Mission de "V2" duplicaria um nome já ocupado por um documento diferente, sobre uma entrega diferente, em uma categoria diferente — exatamente o tipo de inconsistência que a regra de não-duplicação do Knowledge System existe para evitar. Este documento é a **próxima geração depois da V2 já entregue**, então foi numerado **V3**. Nenhum conteúdo do mandato foi omitido — apenas o rótulo de versão foi corrigido para refletir a realidade do repositório. Ver §9 (Roadmap) para a linha do tempo completa V1 → V2 → V2.1 → V3 → V3.1.

---

## 1. Correção de premissa — o que a auditoria real encontrou

O mandato descreve a Mobile Zone como o "primeiro caso" de uma estratégia de coleta que não escala: offset inicial fixo, `maxProducts` fixo, ordem arbitrária da API. A auditoria desta Mission (leitura completa dos 5 connectors reais e da infraestrutura de plataforma) confirma o diagnóstico, mas corrige dois pontos factuais importantes antes de prosseguir:

1. **O problema não está distribuído igualmente pelos 5 connectors.** Shopping China, Mega Eletrônicos, Roma Shopping e Atacado Connect **já não sofrem** desse padrão — os 4 usam descoberta completa via Sitemap (`sdk/sitemap/SitemapCrawler`) + Delta Import real e persistido (`DeltaImportPlanner` + tabela `connector_url_snapshots`, Program B Wave 2). Cada execução avança progressivamente pelo sitemap completo; URLs já sincronizadas com `lastmod` inalterado são puladas. Isso é cobertura eventual completa, não uma amostra estática.
2. **Mobile Zone não é mais o mesmo caso descrito no mandato.** Em 2026-07-08 (commit `2dcf9af`, Wave Xi-1) a Mobile Zone foi integrada via a API REST pública legítima do próprio site (`ConnectorType.ApiRest`), não mais bloqueada por renderização client-side. O problema arquitetural, porém, **persiste sob nova forma**: o connector faz um loop cru de `offset`/`limit` contra a API, sem Delta Import, sem snapshot, sem tracking de progresso entre execuções. Toda execução repete `offset=0..200` contra um catálogo real de 6.956 produtos — cobertura estática de ~2,87%, que não avança com o tempo.

**O achado real não é "a Mobile Zone está quebrada".** É: **o mecanismo de progresso incremental (Delta Import) está acoplado especificamente ao Sitemap Discovery, não generalizado como uma capacidade da plataforma.** Todo connector que não descobre produtos via sitemap começa do zero em tracking de progresso, medição de cobertura e dimensionamento adaptativo de amostra — a Mobile Zone é a primeira instância observada desse gap estrutural, não um bug isolado nela. Isso responde à Fase 10, pergunta 1, com evidência concreta (ver §10 no fim deste documento).

---

## 2. Fase 1 — Auditoria por connector (estado real, 2026-07-10)

| Connector | Descoberta | Paginação | Ordenação | Sync/Delta | Cobertura estimada | Ponto fraco |
|---|---|---|---|---|---|---|
| Shopping China | Sitemap completo (recursivo, sem cap de profundidade útil) | N/A — sitemap entrega o universo de URLs | Ordem do arquivo (estável) | Delta real (lastmod vs. snapshot) | Progressiva → completa ao longo de execuções sucessivas | `supportsStock: false` declarado honestamente (sem sinal real de estoque na página) |
| Mega Eletrônicos | Sitemap completo | N/A | Ordem do arquivo | Delta real | Progressiva → completa | Formatação numérica US (`parseAmountUSFormat` dedicado) — risco de regressão se reutilizado por engano em outro parser |
| Roma Shopping | Sitemap completo (132 sub-sitemaps) | N/A | Ordem do arquivo | Delta real | Progressiva → completa | Nenhum canonical match com os outros merchants ainda (0,0%) — não é falha técnica, é catálogo genuinamente não sobreposto |
| Atacado Connect | Sitemap completo (JSON-LD schema.org por página) | N/A | Ordem do arquivo | Delta real | Progressiva → completa | Nenhum |
| **Mobile Zone** | API REST pública, sem sitemap | `offset`/`limit` cru, sem persistência de cursor | **Não documentada pela fonte** (assumida estável, nunca verificada) | **Nenhum** — sem `DeltaImportPlanner`, sem `ConnectorUrlSnapshotRepository` | **Estática ~2,87%** (200/6.956), não avança | Exatamente o padrão "offset 0 + maxProducts fixo + ordem arbitrária" do mandato — só que contra uma API legítima, não HTML |
| Visão VIP | — | — | — | — | 0% | `robots.txt` nomeia `ClaudeBot` como bloqueado — reclassificado como `Restricted — Commercial Partnership Recommended`, fora do escopo técnico por política (`SOURCE_DISCOVERY_POLICY.md`) |
| Cellshop / Nissei / Casa Americana / New Zone | — | — | — | — | 0% | Cloudflare + `robots.txt` nomeado — `Data Partnership`, fora do escopo técnico por política |

Infraestrutura de plataforma já construída e reutilizada por este desenho (não redesenhada aqui): Capability Matrix v1 (`types/capability.types.ts`), Certification Framework + Quality Score (`lib/connector-certification-service.ts`), Observability (`lib/connector-observability-service.ts`), Registry/Directory (`ConnectorRegistryImpl` + `ConnectorDirectoryService`), Delta Import Engine (`sdk/sitemap/DeltaImportPlanner`), Source Discovery Policy (hierarquia legal de acesso). Ver `CONNECTOR_CAPABILITY_MATRIX.md` §1 para o mapa completo de reaproveitamento.

---

## 3. Fase 2 — Classificação real (corrige os exemplos ilustrativos do mandato)

O mandato exemplifica classes por *conveniência de leitura* (Shopping China = sitemap, Mega = API paginada, Mobile Zone = API limitada). A auditoria mostra que 4 dos 5 connectors reais são todos Sitemap — a classificação real precisa de dois eixos, não um: **completude da descoberta** × **existência de tracking de progresso**.

| Classe | Descoberta | Progresso entre execuções | Membros reais hoje |
|---|---|---|---|
| **Classe A — Full Discovery + Delta Tracking** | Enumera o universo real de URLs (sitemap, feed completo) | Sim — persiste o que já foi visto, avança a cada run | Shopping China, Mega Eletrônicos, Roma Shopping, Atacado Connect |
| **Classe B — Full Discovery, No Delta Tracking** | Fonte permite conhecer o total real (ex.: API retorna `count`), mas nada persiste progresso | Não | **Vazia hoje** — é o alvo de retrofit imediato da Mobile Zone (§9, V2.1) |
| **Classe C — Partial/Static Discovery** | Sem enumeração do universo real; amostra de tamanho fixo, sem crescer | Não | **Mobile Zone (hoje)** |
| **Classe D — Blocked/Restricted** | Bloqueada por política (robots.txt nomeado, Cloudflare) | N/A | Visão VIP, Cellshop, Nissei, Casa Americana, New Zone |

A Mobile Zone hoje está em Classe C não porque a API seja limitada (ela devolve `count` real, então tecnicamente suporta Classe B), mas porque o connector não foi escrito para usar isso — confirma a leitura de §1: gap arquitetural, não limitação da fonte.

---

## 4. Fase 3 — Princípios do V3

O V3 não substitui a V2 já entregue — estende exatamente o ponto que ficou implícito nela: Delta Import foi construído *dentro* do módulo de sitemap (`sdk/sitemap/DeltaImportPlanner`), nunca extraído como uma capacidade independente de descoberta. Três princípios guiam o V3:

1. **Progresso é uma capacidade da plataforma, não do sitemap.** Qualquer estratégia de descoberta (sitemap, API paginada, category crawl) deve poder alimentar um mecanismo comum de "o que já vimos, o que falta". Ver `CONNECTOR_STRATEGY_ENGINE.md` §2.
2. **Nenhuma estratégia nova depende de offset 0, `maxProducts` fixo sem memória, ou ordem arbitrária assumida estável.** Todo `maxProducts`/limite de execução passa a ser um orçamento por execução sobre um backlog conhecido (delta pendente), não um teto absoluto do catálogo.
3. **Decisão de estratégia é declarativa e revisada por humano na certificação, não descoberta em runtime.** Este código-base baniu explicitamente reflection, plugin frameworks e dispatch dinâmico complexo (Program B Wave 2). O "Strategy Engine" (Fase 4) é uma tabela de decisão + validação na Certificação — não um sistema autônomo que tenta estratégias em produção. Ver `CONNECTOR_STRATEGY_ENGINE.md` §4 e a resposta à Fase 10 pergunta 4.

---

## 5. Onde este documento se conecta aos outros três

- **`CONNECTOR_STRATEGY_ENGINE.md`** — Fase 4: como uma estratégia (Discovery + Progress + Sampling) é declarada, validada e associada a cada connector.
- **`CONNECTOR_CAPABILITY_MATRIX.md`** — Fase 5: extensão do `ConnectorCapabilities` v1 existente com os campos que faltam, e o preenchimento real para os 5 connectors + os 5 bloqueados.
- **`CONNECTOR_INTELLIGENCE.md`** — Fases 6 e 7: como medir cobertura, overlap, representatividade, e o catálogo completo de métricas pedido no mandato, mapeado contra o que já existe (`ConnectorObservabilityService`, `ConnectorQualityScore`, canonical match) vs. o que é genuinamente novo.

---

## 6. Fase 9 — Roadmap de migração (sem quebrar compatibilidade)

```
V1  (pré Release 1.8 Wave 5)
  Cada connector com sua própria lógica de fetch/paginação ad hoc.
    ↓
V2  (Release 1.8, Wave 5 + Program B Wave 2 — JÁ ENTREGUE, docs/engineering/CONNECTOR_PLATFORM_V2.md)
  SDK unificado, Capability Matrix v1, Certification + Quality Score, Delta Import
  (sitemap-only), Registry/Directory facade, Observability, Source Discovery Policy.
    ↓
V2.1  (retrofit incremental — não quebra nada da V2)
  ✅ PARTE 1 ENTREGUE (Mission Σ-2, §8): núcleo do antigo DeltaImportPlanner extraído
  para o Delta Engine (`src/domains/connectors/delta/`), independente de sitemap.
  Os 4 connectors Classe A recertificados sobre o novo Delta Engine, comportamento
  idêntico, quality gate verde.
  ⏳ PARTE 2 PENDENTE: retrofit da Mobile Zone para Classe B — persistir cursor/offset
  processado usando o Delta Engine + usar o `count` real da API como denominador de
  cobertura. Explicitamente fora do escopo da Mission Σ-2 ("Mobile Zone: NÃO alterar
  ainda") — aguarda uma Mission futura.
    ↓
V3  (esta proposta — aditiva sobre V2.1)
  Connector Strategy Engine (declaração formal de Discovery+Progress+Sampling por
  connector, validada na Certificação). Capability Matrix v2 (Source Capabilities vs.
  Connector Capabilities, campos novos aditivos — nenhum campo v1 removido).
  Connector Intelligence (Coverage %, Overlap %, Discovery Score, Sampling Quality,
  Connector Confidence — novos, compostos sobre dados já existentes onde possível).
    ↓
V3.1  (evolução futura, fora do escopo desta Mission)
  Sampling Popularidade/Marca usando CatalogIntelligenceService (já existe, Release 1.6
  Epic 4) como sinal de priorização. Ainda declarativo/humano-revisado — "adaptativo"
  significa "os números orientam a revisão", não "a máquina troca de estratégia sozinha
  em produção" (ver Fase 10, pergunta 4).
```

Compatibilidade: nenhuma etapa remove ou renomeia um tipo, campo de banco, ou contrato de API existente. `ConnectorCapabilities` v1 permanece um subconjunto válido de v2 (campos novos são opcionais até que cada connector seja recertificado). `DeltaImportPlanner` atual continua funcionando para os 4 connectors Classe A sem alteração — V2.1 generaliza a interface, não substitui a implementação usada hoje.

---

## 7. Fase 10 — Respostas finais

Ver seção dedicada no final de `CONNECTOR_INTELLIGENCE.md` — as 5 perguntas do mandato são respondidas lá, depois que os conceitos de cobertura/confiança usados nas respostas já foram definidos. Resumo de uma linha cada:

1. **Mobile Zone é caso isolado?** Não — é o primeiro caso *observado* de um gap estrutural (progresso acoplado a sitemap) que qualquer connector não-sitemap futuro reproduz.
2. **Quantos podem sofrer do mesmo problema?** Hoje, 1 de 5 (20%) confirmado; estruturalmente, qualquer connector futuro que não seja Sitemap-first, sem limite superior conhecido.
3. **Qual arquitetura elimina essa classe de problema?** Desacoplar tracking de progresso/cobertura da estratégia de descoberta específica — capacidade da plataforma, não do módulo sitemap.
4. **Como tornar a plataforma inteligente e auto-adaptável?** Declaração estática + métricas observadas que **disparam revisão humana** — nunca dispatch dinâmico ou troca autônoma de estratégia em produção, coerente com a proibição já registrada de reflection/plugin frameworks.
5. **Aproxima do VISION_2035?** Sim, diretamente — Capability Matrix já foi construída "reservada para o Brain"; cobertura/confiança por connector é exatamente o tipo de dado de qualidade que VISION_2035 descreve como pré-condição para a Inteligência Regional.

---

## 8. Mission Σ-2 — Delta Engine Generalization (ENTREGUE, 2026-07-10)

Diferente de §1-§7 (proposta arquitetural da Mission Σ-1, ainda não implementada), esta seção documenta trabalho **real**, já feito nesta Mission: extração do Delta Import do Sitemap Engine para um serviço reutilizável do Connector Platform — exatamente a Parte 1 de V2.1 (§6). Princípio seguido à risca: **mover comportamento, não mover responsabilidade** — o Sitemap Engine continua exclusivamente responsável por descoberta de URLs; o novo Delta Engine é responsável apenas por progresso, checkpoints, sincronização incremental e persistência de estado.

### 8.1 Arquivos modificados

- `src/domains/connectors/crawler/shoppingchina/connector.ts`
- `src/domains/connectors/crawler/megaeletronicos/connector.ts`
- `src/domains/connectors/crawler/romashopping/connector.ts`
- `src/domains/connectors/crawler/atacadoconnect/connector.ts`
- `src/domains/connectors/sdk/sitemap/index.ts` (parou de exportar o antigo `DeltaImportPlanner`)
- `src/domains/connectors/index.ts` (barrel do domínio — exporta `DeltaEngine`/`IDeltaStateRepository`/`SupabaseDeltaStateRepository` em vez dos nomes antigos)

### 8.2 Arquivos criados

- `src/domains/connectors/delta/DeltaEngine.ts` — lógica pura de decisão (generalização do antigo `DeltaImportPlanner`), tipos `DeltaCandidate{key, checkpoint}`/`DeltaPlan{toFetch, skipped}`
- `src/domains/connectors/delta/index.ts` — superfície pública do Delta Engine
- `src/domains/connectors/repositories/IDeltaStateRepository.ts` — contrato genérico de persistência (generalização de `IConnectorUrlSnapshotRepository`), `DeltaStateEntry{key, checkpoint}`
- `src/domains/connectors/infrastructure/SupabaseDeltaStateRepository.ts` — implementação Supabase, mapeia `key`/`checkpoint` para as colunas existentes `url`/`lastmod` da tabela `connector_url_snapshots` (nenhuma migration)
- `src/domains/connectors/__tests__/DeltaEngine.test.ts` — os mesmos 5 casos de teste do antigo `DeltaImportPlanner.test.ts`, portados para o vocabulário genérico

### 8.3 Arquivos removidos

- `src/domains/connectors/sdk/sitemap/DeltaImportPlanner.ts` (substituído por `delta/DeltaEngine.ts`)
- `src/domains/connectors/repositories/IConnectorUrlSnapshotRepository.ts` (substituído por `repositories/IDeltaStateRepository.ts`)
- `src/domains/connectors/infrastructure/SupabaseConnectorUrlSnapshotRepository.ts` (substituído por `infrastructure/SupabaseDeltaStateRepository.ts`)
- `src/domains/connectors/__tests__/DeltaImportPlanner.test.ts` (substituído por `__tests__/DeltaEngine.test.ts`)

### 8.4 Diagrama antigo

```
Connector Platform
├── sdk/
│   ├── fetch/          (HttpFetchStrategy, RateLimitedFetchStrategy)
│   ├── sitemap/
│   │   ├── SitemapCrawler.ts        ← descoberta de URLs
│   │   └── DeltaImportPlanner.ts    ← progresso/delta, PRESO dentro do sitemap
│   ├── parsing/
│   └── mapping/
├── repositories/
│   └── IConnectorUrlSnapshotRepository.ts   ← nomeado por "URL" (vocabulário de sitemap)
├── infrastructure/
│   └── SupabaseConnectorUrlSnapshotRepository.ts
└── crawler/{shoppingchina,mega,roma,atacado}/connector.ts
      → cada um importa DeltaImportPlanner do MÓDULO DE SITEMAP
      → Mobile Zone (API REST) não tem DE ONDE herdar progresso — o único
        mecanismo de delta que existe é sitemap-specific
```

### 8.5 Diagrama novo

```
Connector Platform
├── sdk/
│   ├── fetch/          (HttpFetchStrategy, RateLimitedFetchStrategy) — inalterado
│   ├── sitemap/
│   │   └── SitemapCrawler.ts        ← descoberta de URLs, ÚNICA responsabilidade
│   ├── parsing/                     — inalterado
│   └── mapping/                     — inalterado
├── delta/                            ← NOVO — Delta Engine, serviço de plataforma
│   ├── DeltaEngine.ts                  não conhece HTML/REST/XML/sitemap/connector
│   └── index.ts                        específico — só (key, checkpoint) opacos
├── repositories/
│   └── IDeltaStateRepository.ts      ← genérico (key/checkpoint, não url/lastmod)
├── infrastructure/
│   └── SupabaseDeltaStateRepository.ts   (mesma tabela/colunas — zero migration)
└── crawler/{shoppingchina,mega,roma,atacado}/connector.ts
      → cada um importa DeltaEngine de "../../delta" (platform-level),
        SitemapCrawler continua vindo do sdk (discovery-level)
      → Mobile Zone (e qualquer connector futuro não-sitemap) agora TEM de
        onde herdar progresso — só falta ser retrofitado (V2.1 parte 2,
        fora do escopo desta Mission)
```

### 8.6 Fluxo antigo (por connector Classe A, ex.: Shopping China)

```
1. new SupabaseConnectorUrlSnapshotRepository(client).getSnapshotMap(id)
     → Map<url, lastmod>
2. SitemapCrawler.collectEntries(sitemapUrl) → SitemapEntry[]{url, lastmod}
3. new DeltaImportPlanner().plan(entries, snapshots) → {toFetch: url[], skipped: url[]}
   (DeltaImportPlanner importado de sdk/sitemap — mesmo pacote da descoberta)
4. fetch/parse cada url em toFetch
5. saveSnapshots(id, [...fetched, ...skipped].map(url→{url, lastmod}))
```

### 8.7 Fluxo novo (mesmo connector, mesmo resultado observável)

```
1. new SupabaseDeltaStateRepository(client).getCheckpoints(id)
     → Map<key, checkpoint>                          (mesma tabela, nomes genéricos)
2. SitemapCrawler.collectEntries(sitemapUrl) → SitemapEntry[]{url, lastmod}
   (inalterado — Discovery continua no sdk, sem saber que Delta existe)
3. candidates = entries.map(e => ({key: e.url, checkpoint: e.lastmod}))
   new DeltaEngine().plan(candidates, checkpoints) → {toFetch: key[], skipped: key[]}
   (DeltaEngine importado de "../../delta" — pacote separado do sitemap)
4. fetch/parse cada key (=url) em toFetch                      (inalterado)
5. saveCheckpoints(id, [...fetched, ...skipped].map(key→{key, checkpoint}))
```

O passo 4 (fetch/parse — regra de negócio de cada connector) é byte-a-byte idêntico entre os dois fluxos. Os passos 1/3/5 mudam de nome e de módulo de origem, nunca de resultado.

### 8.8 Responsabilidades — antes e depois

| Responsabilidade | Antes | Depois |
|---|---|---|
| Descobrir URLs de produto | `SitemapCrawler` (sdk/sitemap) | `SitemapCrawler` (sdk/sitemap) — **inalterado** |
| Decidir o que buscar vs. pular | `DeltaImportPlanner` (sdk/sitemap — dentro do módulo de descoberta) | `DeltaEngine` (delta/ — módulo de plataforma independente) |
| Vocabulário da decisão | `url`/`lastmod` (específico de sitemap) | `key`/`checkpoint` (opaco, qualquer fonte) |
| Persistir o que foi visto | `IConnectorUrlSnapshotRepository`/`SupabaseConnectorUrlSnapshotRepository` | `IDeltaStateRepository`/`SupabaseDeltaStateRepository` — mesma tabela `connector_url_snapshots`, mesmas colunas `url`/`lastmod` (mapeadas para `key`/`checkpoint` só na borda do repositório) |
| Regra de negócio (parse, categoria, fallback) | Em cada `connector.ts` | Em cada `connector.ts` — **inalterado** |
| Quem pode consumir o mecanismo de progresso | Só connectors que importam do módulo de sitemap | Qualquer connector, de qualquer estratégia de descoberta (sitemap, API paginada, feed) |

### 8.9 Justificativa arquitetural

O achado da Mission Σ-1 (§1 deste documento) identificou que Delta Import nunca foi uma capacidade da plataforma — foi construído fisicamente dentro do módulo de sitemap porque, até agora, todo connector real usava sitemap. Isso significa que o próximo connector não-sitemap (hoje, a Mobile Zone; no futuro, qualquer merchant integrado via API) não tem de onde herdar tracking de progresso — precisaria reescrever a mesma lógica do zero, ou pior, continuar sem ela (o estado real da Mobile Zone hoje). Extrair o Delta Engine para um módulo de plataforma independente, com um contrato de dados opaco (`key`/`checkpoint`, sem nenhuma palavra de sitemap/URL/HTML), remove essa barreira estrutural sem exigir nenhuma decisão sobre COMO a Mobile Zone deveria usá-lo — essa decisão fica para uma Mission futura, deliberadamente fora do escopo aqui.

### 8.10 Impacto

- **Comportamento de produção**: zero mudança para os 4 connectors Classe A — mesmo algoritmo, mesma tabela, mesmas colunas, mesmo padrão de chunked upsert (500 por lote), mesmo invariante de "dry-run nunca escreve".
- **Mobile Zone**: zero mudança — não foi tocada, conforme mandato.
- **Capability Registry / Strategy Engine**: não implementados nesta Mission, conforme mandato — nenhuma interface nova foi criada para eles além do que já existia como proposta em `CONNECTOR_STRATEGY_ENGINE.md`.
- **Superfície pública do domínio** (`src/domains/connectors/index.ts`): 3 nomes exportados mudaram (`DeltaImportPlanner`→`DeltaEngine`, `SupabaseConnectorUrlSnapshotRepository`→`SupabaseDeltaStateRepository`, `IConnectorUrlSnapshotRepository`/`UrlSnapshotEntry`→`IDeltaStateRepository`/`DeltaStateEntry`). Nenhum consumidor externo a `src/domains/connectors/` foi encontrado usando os nomes antigos (grep confirmado antes da mudança) — impacto de fato zero fora do domínio.
- **Banco de dados**: zero mudança de schema — mesma tabela `connector_url_snapshots`, mesmas colunas, nenhuma migration.

### 8.11 Riscos

- **Risco de digitação na migração de nomes** (ex.: trocar `key`/`checkpoint` sem atualizar todos os 4 connectors) — mitigado: os 4 connectors foram editados individualmente e verificados via leitura direta do arquivo final, não apenas confiança no diff; quality gate completo (lint/typecheck/test/build) rodado após todas as mudanças.
- **Risco de um consumidor externo não encontrado pelo grep** (import dinâmico, string literal) — mitigado: `npm run build` (Next.js/Vercel bundler, resolve todos os imports estaticamente) e `tsc --noEmit` passaram limpos; um import quebrado teria falhado em ambos.
- **Risco de regressão silenciosa de comportamento** (mesmo algoritmo, mas divergência sutil na tradução `lastmod`→`checkpoint`) — mitigado: os 5 casos de teste do antigo `DeltaImportPlanner.test.ts` foram portados 1:1 para `DeltaEngine.test.ts` (mesmos cenários: sem snapshot anterior, lastmod inalterado, lastmod avançado, sem lastmod declarado, lote misto) — todos passando.

### 8.12 Plano de rollback

Reversível em um único `git revert` do commit desta Mission — nenhuma migration foi criada, nenhum dado foi migrado ou transformado (a tabela `connector_url_snapshots` nunca mudou de forma), nenhuma API pública fora do domínio de connectors foi afetada. Reverter o commit restaura `DeltaImportPlanner.ts`, `IConnectorUrlSnapshotRepository.ts`, `SupabaseConnectorUrlSnapshotRepository.ts` e os 4 `connector.ts` exatamente como estavam, sem nenhum passo manual adicional (sem dado a limpar, sem migration a reverter).
