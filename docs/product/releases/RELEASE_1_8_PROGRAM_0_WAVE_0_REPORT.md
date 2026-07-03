# RELEASE_1_8_PROGRAM_0_WAVE_0_REPORT.md
# Program 0, Wave 0 — Brain Analytics Integration — Relatório Final

**Versão**: 1.0
**Criado**: 2026-07-02
**Status**: Entregue
**Mandato**: projetar e implementar a ponte oficial entre Analytics (`buyer_events`) e o Brain, de forma que buyer_events produzam Brain Events, o Brain acumule conhecimento comportamental real, sem PII, exclusivamente pseudônimo, sem duplicação, com idempotência, append-only, rastreável. Demonstrar evidências reais de todo o loop.

---

## O que existia antes desta Wave

Duas descobertas mudaram o escopo real do trabalho antes de qualquer linha de código:

1. **`CognitiveBrainService.ingest()`** — o serviço de ingestão do Brain, construído e testado desde o Release 1.5 Epic 4 — **nunca havia sido chamado por nenhum código de produção**, só por um teste de integração. `EventService.recordMerchantViewed()`, a `TrustEventType.MerchantViewed` factory (`merchantViewedEvent()`), e boa parte de `KnowledgeGraphService.deriveRelationsFromEvent()` estavam na mesma situação: código real, com testes, zero consumidor em produção.
2. **`merchant_trust_events.merchant_id` é `NOT NULL`** — o Brain, como existe hoje, é estruturalmente centrado em merchant. Não existe (e não deveria ser inventado nesta Wave) um caminho para eventos de comprador sem contexto de merchant — busca, navegação por categoria/marca, visualização de produto sem loja específica. Isso define uma fronteira real de escopo, não uma limitação de implementação: só `buyer_events` com `merchant_id` resolvido pode atravessar a ponte.

Essas duas descobertas moldaram a decisão de design central: a ponte roda **sincronamente**, dentro da mesma requisição que grava o `buyer_events` — sem fila, sem cron, sem polling. Mais simples, mais imediata (compatível com "aprender continuamente"), e sem exigir nenhuma infraestrutura nova que este projeto já decidiu conscientemente não ter.

---

## O que foi construído

### `BuyerEventBrainBridgeService`

Novo, `src/domains/merchant-analytics/services/`. Roda dentro de `EventPlatformService.processEvent()`/`processBatch()`, logo após o insert em `buyer_events` ser confirmado. Para cada linha inserida com `merchant_id` não nulo:

1. Mapeia o `AnalyticsEventType` para o `TrustEventType` correspondente — usando os tipos **já existentes e já mapeados em `TRUST_EVENT_BRAIN_IMPACT`** (`MerchantViewed`, `MerchantPassportViewed`, `MerchantContactClicked`), não os 18 tipos `Analytics*` paralelos que já existiam na taxonomia sem nunca terem sido emitidos. Os 3 cliques de contato específicos (WhatsApp/telefone/site) são consolidados em `TrustEventType.MerchantContactClicked` com um `contact_channel` em metadata — reaproveita a derivação de grafo que já existia para esse tipo, em vez de deixar 3 variantes paralelas igualmente não-derivadas.
2. Constrói um `TrustDomainEvent` e chama `CognitiveBrainService.ingest()` — a primeira chamada real de produção que esse serviço já teve.
3. Marca `buyer_events.brain_synced_at` (sucesso) ou `brain_sync_error` (falha) — nova coluna, migration `20260702110000_brain_analytics_bridge.sql`. **Esse marcador é toda a idempotência**: uma linha só é processada uma vez, no mesmo request que a gravou.
4. Nunca falha a resposta HTTP — a ponte é `await`ada (não fire-and-forget: um handler serverless pode congelar antes de uma promise não aguardada terminar), mas via `Promise.allSettled`, com cada erro individual capturado e logado. Um erro na ponte nunca derruba a escrita de `buyer_events` que a originou.

**Fronteira de PII, aplicada de verdade, não só declarada**: a única identidade que atravessa a ponte é `buyer_id ?? anonymous_id` (já pseudônimo, nunca ligado a email/nome/telefone). Nunca vai para `created_by` — essa coluna é FK para `profiles(id)`, e um comprador nunca é uma linha de `profiles` (ADR-031/046). Vai para `metadata.buyer_pseudonym`, um campo `jsonb` sem FK.

### Dois bugs reais encontrados e corrigidos, não apenas contornados

Como a ponte é a primeira chamada real de produção para `CognitiveBrainService`/`KnowledgeGraphService`, ela expôs bugs que nenhum teste anterior — todos escritos com atores no formato de staff — jamais exercitaria:

1. **`CognitiveBrainService.ingest()` encaminhava `actor_id` para `created_by` incondicionalmente.** Todo evento de comprador violaria a FK para `profiles(id)`. Corrigido na fonte (`CognitiveBrainService.ts`): só encaminha quando `actor_role !== Buyer`. Coberto por teste novo (`src/domains/trust/__tests__/CognitiveBrainService.test.ts`).
2. **`KnowledgeGraphService.deriveRelationsFromEvent()` lia `event.created_by`** para identificar o comprador em toda relação `Buyer→Merchant` — que nunca seria populado para eventos de comprador pela mesma razão acima. Corrigido para ler `metadata.buyer_pseudonym` primeiro, com fallback para `created_by` (preserva o caminho teórico de um ator staff). Coberto por teste novo (`src/domains/trust/__tests__/KnowledgeGraphService.test.ts`).

Achado colateral, não corrigido: `src/domains/trust/tests/*.test.ts` (sem underscore) nunca são descobertos pelo Jest — `testMatch` exige `__tests__/`. Os testes pré-existentes do domínio trust nunca rodaram via `npm test`. Os testes novos desta Wave foram colocados corretamente em `__tests__/`; mover os antigos é dívida nomeada, não corrigida aqui.

### `GET /api/trust/merchant/[merchantId]/graph`

Novo. Primeira rota a expor `KnowledgeGraphService` — que existia desde o Release 1.5 sem nenhum consumidor. Retorna as relações derivadas e um resumo (`totalRelations`, `byRelationType`, `uniqueBuyers`) para um merchant. Existe porque o mandato exige demonstrar "Consulta funcionando" — sem essa rota, não havia como.

### Instrumentação adicional (para a ponte ter algo real para processar)

`services/stores-public.service.ts` passou a expor `merchantId` (antes só `isUnclaimed`) — resolvido via o mesmo join com `merchant_stores` que já existia. `StoreViewTracker` (Sprint 0.1) agora recebe e propaga esse `merchantId`. Novo `components/store/StoreContactLinks.tsx` extrai os links de telefone/WhatsApp/site de `/lojas/[slug]/page.tsx` para um client component com `onClick` rastreado — sinal de altíssimo valor para Growth Engine/Merchant Intelligence que não tinha nenhum caminho de emissão antes desta Wave.

---

## Evidências reais (demonstradas contra produção, não simuladas)

Contra um build de produção local, usando um dos 2 `merchants` reais já existentes (apenas como referência de FK — nenhuma linha de merchant foi alterada):

1. `POST /api/analytics/session` → sessão real criada.
2. `POST /api/analytics/events` com `event_type: MerchantViewed`, `merchant_id` real → `{"success":true,"inserted":1}`.
3. Query direta: `buyer_events.brain_synced_at` preenchido, `brain_sync_error: null`.
4. Query direta: linha nova em `merchant_trust_events` — `event_type: merchant_viewed`, `metadata.buyer_pseudonym`, `metadata.buyer_events_id`, `metadata.correlation_id` presentes (rastreabilidade completa: dá para seguir de volta do evento do Brain até a linha exata de `buyer_events` que o originou).
5. `GET /api/trust/merchant/{id}/graph` → `{"summary":{"totalRelations":1,"byRelationType":{"buyer_viewed":1},"uniqueBuyers":1}, "relations":[...]}`.
6. Repetido com `MerchantWhatsAppClicked` → `totalRelations` sobe para 2, `byRelationType` ganha `buyer_contacted_via` — conhecimento acumulando de verdade através de duas visitas.
7. Controle negativo: `SearchPerformed` (sem `merchant_id`) → `brain_synced_at` permanece `null`, confirmando que a fronteira de escopo é respeitada em produção, não só em teste unitário.
8. Toda a linha de teste — `buyer_events`, `buyer_sessions`, `merchant_trust_events` — **removida** depois da confirmação.

**Buyer Event → Brain Event → Knowledge atualizado → Consulta funcionando**: demonstrado, ponta a ponta, contra o banco real.

---

## O que fortalece, de fato — e o que não fortalece ainda

| Ativo/Sistema | Fortalecido por esta Wave? |
|---|---|
| **Merchant Intelligence** | Sim — diretamente. Views e cliques de contato agora acumulam conhecimento real por merchant. |
| **Growth Engine** | Sim, indiretamente — consome sinais merchant-scoped, que agora existem. |
| **C-6 Buyer Behavioral Knowledge** | Mecanismo sim; volume não — ver limitação abaixo. |
| **Marketplace Intelligence** | Não — depende de sinais sem merchant (navegação geral), fora do alcance estrutural desta ponte. |
| **Recommendation Engine** | Não — mesma razão. |

## Limitação real, nomeada, não escondida

**Zero lojas estão reivindicadas em produção hoje.** `merchant_stores` está vazio; existem 2 `merchants` (ambos `status: draft`, `onboarding_done: false`) e zero `store_claims` aprovadas. Isso significa que, em tráfego real, `StoreViewTracker`/`StoreContactLinks` sempre passam `merchantId: null` hoje — a ponte é real e funciona, mas não tem substrato real para processar até que o Claim Flow (Wave 5, Release 1.7) produza pelo menos uma loja reivindicada. Isso não é um bug desta Wave — é um funil de produto que ainda não converteu ninguém.

**Marketplace Intelligence / Search Intelligence (C-4)** — sinais sem merchant (busca, navegação por categoria/marca) continuam sem nenhum destino no Brain. `merchant_trust_events.merchant_id NOT NULL` é uma decisão de schema do Release 1.5, correta para o que essa tabela representa (confiança de merchant) — misturar sinais sem merchant nela seria confundir dois conceitos, não corrigir uma lacuna. Um armazenamento próprio para esses sinais é uma decisão real de arquitetura, fora do mandato desta Wave ("Não criar arquitetura nova" não foi dito desta vez, mas construir uma segunda tabela append-only paralela para um conjunto de sinais totalmente diferente teria sido escopo novo de verdade, não a "ponte oficial" que foi pedida).

---

## QUALITY GATE

| Critério | Status |
|---|---|
| `buyer_events` produz Brain Events | ✅ — para eventos com `merchant_id` resolvido; demonstrado contra produção |
| Brain acumula conhecimento comportamental | ✅ — `merchant_trust_events` + `KnowledgeGraphService`, verificado |
| Nenhuma informação pessoal enviada ao Brain | ✅ — só `buyer_id`/`anonymous_id` (já pseudônimos), nunca via `created_by` |
| Uso exclusivo de pseudônimo | ✅ — `metadata.buyer_pseudonym`, nunca PII |
| LGPD preservada | ✅ — nenhuma coluna de PII em `buyer_events` ou `merchant_trust_events` |
| Não duplicar eventos | ✅ — `brain_synced_at` como guarda de execução única |
| Idempotência | ✅ — mesmo mecanismo acima |
| Append-only | ✅ — `merchant_trust_events` nunca sofre UPDATE/DELETE pela ponte |
| Rastreabilidade | ✅ — `metadata.buyer_events_id` + `correlation_id` ligam cada Brain Event de volta à linha exata de origem |
| `lint`/`tsc`/`test`/`db:lint`/`build` | ✅ — 0/0/297 de 297/OK/sucesso |

---

## RESPOSTA À PERGUNTA OBRIGATÓRIA DO CTO

> "O Brain agora aprende continuamente com o comportamento real dos compradores, transformando cada nova interação em patrimônio estratégico permanente do ParaguAI?"

**Sim, para o comportamento que tem contexto de merchant — e ainda não, para o resto.** O mecanismo é real, verificado ponta a ponta contra produção, correto em suas garantias (pseudonimização, idempotência, rastreabilidade, append-only), e corrigiu dois bugs genuínos que existiam silenciosamente há Releases inteiros porque nada nunca tinha chamado esse código de verdade. A partir de agora, toda visita a uma loja reivindicada e todo clique em contato vira conhecimento permanente no Brain, sem intervenção manual.

Duas ressalvas honestas, não escondidas: primeiro, o volume real hoje é zero, não porque o mecanismo falhe, mas porque nenhuma loja foi reivindicada em produção ainda — um problema de funil, não de engenharia. Segundo, a maior parte do comportamento real de um marketplace — busca, navegação, comparação sem loja específica — segue sem destino no Brain, porque a tabela que o Brain usa hoje foi desenhada para confiança de merchant, não para conhecimento comportamental geral. Resolver isso é uma decisão de arquitetura real (um armazenamento próprio para sinais sem merchant), não uma extensão trivial desta ponte — recomendo que vire sua própria decisão explícita, não uma expansão silenciosa de escopo da próxima Wave.
