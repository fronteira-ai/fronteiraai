# PRODUCT_REBASELINE_REQUIREMENTS.md

**Categoria**: `docs/product/`
**Data**: 2026-08-26 (Produt Rebaseline V2)
**Status**: REGISTRADO — requisitos formais para backlog/roadmap. NENHUM implementado nesta missão (auditoria somente).

> **Atualização 2026-08-26 (Sprint "Search Ordering + Out-of-Stock + SEO Recovery")**: PR-001 e PR-002 **implementados e aplicados em produção** (ordenação global via RPC; RPCs aplicadas/validadas no self-hosted; `NEXT_PUBLIC_SITE_URL` em Vercel Production; merge para `main` publicado em `7eba0e1`). **Validação pós-deploy ainda pendente** (confirmar o deploy Vercel e o comportamento da busca/robots no host público). Ver `docs/operations/CHANGELOG.md` (2026-08-26) e `docs/operations/PROJECT_STATUS.md`.

> Registro formal dos novos requisitos de produto PR-001 a PR-006 introduzidos no
> **Product Rebaseline V2**. Este documento é a âncora normativa de cada requisito:
> escopo, regra de negócio, estado atual auditado e sequência de Sprint sugerida.
> Não é manual operacional nem substitui decisão de arquitetura (ver
> `docs/operations/DECISIONS.md` para ADRs).

---

## REQUISITO PR-001 — ORDENAÇÃO DOS PREÇOS (menor → maior)

**Regra de negócio**: após qualquer pesquisa de produto, ofertas disponíveis priorizam preço crescente:
`MENOR PREÇO → MAIOR PREÇO` (`AVAILABLE: price ASC`).

**Estado atual auditado** (2026-08-26):
- `price_usd` é `numeric(10,2)` na tabela `offers` (baseline `00000000000000`). **Sem risco de ordenação lexicográfica.**
- **Onde ordena hoje (fix 4a8b36d, apenas no HEAD do baseline):**
  - `services/search.service.ts:111-117` — sort em **JavaScript** sobre `products` (`inStock` primeiro, depois `lowestPriceUSD` asc). Busca `.limit(8)` por seção **sem** `ORDER BY` no SQL: o sort roda sobre no máximo 8 linhas, **não é ordenação global**.
  - `services/offer.service.ts:31-32` — `order("in_stock", desc)` + `order("price_usd", asc)` (SQL) em `getOffersByProduct`/`getOffersByStore`.
  - `services/product.service.ts:313-390` + RPC `search_products_catalog` (migration `20260809120000`) — ordenação **global** por preço do catálogo `/products?sort=price_asc|desc`. A RPC filtra→agrega MIN(price_usd)→ordena→pagina no banco (fecha ADR-011/P2-1).
  - `services/compare.service.ts` — `sortForDisplay` (in-stock primeiro, estável) após `OfferRankingService`.
- **Falha em produção**: o fix `4a8b36d`/`6d2a4d4` NÃO está em `main` (main=227caf3) e a RPC `search_products_catalog` **não existe** no banco self-hosted de produção. Ver Sprint 1 proposta.

**Gap**: ordenação da busca `/search` não é global (só 8 linhas). Catálogo global depende de RPC não aplicada.

---

## REQUISITO PR-002 — PRODUTOS ESGOTADOS SEMPRE NO FINAL

**Regra de negócio**:
- Grupo 1 — DISPONÍVEIS: primeiro, dentro do grupo `price ASC`.
- Grupo 2 — ESGOTADOS: depois, dentro do grupo `price ASC`.
- Nunca out-of-stock antes de available.

**Representação real** (auditada):
- `offers.in_stock boolean DEFAULT true` — disponibilidade da oferta (fonte da UI).
- `offers.available boolean` (nullable, sem default) — oferta **arquivada** (`available=false` ≠ `in_stock=false`; esgotada continua ativa, ADR-008).
- `offers.stock_quantity integer`, `condition`, etc. — modelados, sem consumidor de UI.

**Estado atual**:
- `search.service.ts:111-113`: `inStock` primeiro (fix no HEAD).
- `offer.service.ts`: `order in_stock desc` (fix no HEAD).
- `compare.service.ts sortForDisplay`: in-stock primeiro (fix no HEAD).
- **Catálogo `/products` (RPC)**: ordena por preço/NULLS LAST mas **NÃO separa esgotados** — `p_only_in_stock` só filtra, não garante esgotados por último na ordem global. Gap PR-002 no catálogo.

**Jornada target**: `availability DESC + price ASC`, adaptado à modelagem real (in_stock como chave primária).

---

## REQUISITO PR-003 — CÂMERAS AO VIVO DA PONTE DA AMIZADE NA HOME

**Escopo**: seção "Ponte da Amizade — Ao Vivo" na Home (câmera(s), direção BR↔PY, trânsito, horário da última atualização, status da transmissão, fallback offline).

**Estado atual auditado**:
- `components/home/LiveCameras.tsx` **já existe** com contrato `LiveCameraFeed { id, label, streamUrl, thumbnailUrl }` e layout `DashboardCardShell` (colunas 2×2). É **placeholder honesto**: sem `feeds` reais, cada slot renderiza badge "Em breve" — nunca um "Ao vivo" fabricado (AI_CONSTITUTION.md).
- Próxima Wave é um **adaptador**, não redesign: basta passar `feeds` reais.

**Viabilidade / análise (sem implementar)**:
- **Nenhuma fonte oficial/legal confirmada nesta auditoria.** Não assumir embed de câmera encontrada na internet; não fazer scraping frágil; não copiar stream protegido.
- Pesquisar fontes legítimas: câmeras oficiais do governo paraguaio (MOPC), rodovias federais (PRF/DNIT no lado BR), empresas privadas com API aberta, canais oficiais com embed explícito.
- Critérios: fonte oficial → disponibilidade pública → embed/iframe/HLS/API → CORS/CSP → direitos de uso → estabilidade → custo → mobile.
- Performance: carregar player somente quando próximo da viewport ou após interação (lazy); poster/fallback; acessibilidade; **não prejudicar CWV da Home**.

**Arquitetura futura sugerida**: componente `FriendshipBridgeLive` (já parcialmente materializado em `LiveCameras`), lazy-loading, estados loading/offline/stream-unavailable.

---

## REQUISITO PR-004 — LOGOMARCAS OFICIAIS DAS LOJAS

**Estado atual auditado (dados reais de produção, 2026-08-26)**:
- `stores.logo_url` existe, mas `STORE_LOGO_COVERAGE = 0%` (0 de 7 lojas têm `logo_url` preenchido).
- 4/7 lojas têm `address`; **0/7 têm latitude/longitude**.
- `components/store/StoreCard` e Featured Stores (`StoreCarousel` via `getFeaturedStores`) usam fallback/placeholder quando não há logo.

**Requisito futuro**: cada loja com identidade visual oficial ou asset autorizado/adequado. Não baixar imagens aleatórias. Estratégia segura: Storage/CDN (`bucket catalog`, `utils/storage.ts#resolveImageUrl`), otimização (`sharp` já em devDeps), aspect-ratio fixo, alt text, cache/atualização, fallback controle.

**Dependência de dados**: preencher `logo_url` para as lojas reais (com origem autorizada) — Sprint de dados/seed.

---

## REQUISITO PR-005 — GOOGLE MAPS: PONTE DA AMIZADE → LOJA

**Estado atual auditado**:
- `stores` tem `address` (4/7), `latitude`/`longitude` (0/7), `city`, `country`. **Sem** `google_place_id`/`maps_url`.
- **Nenhum CTA de mapa/rota existe** no código auditado. Não há `buildGoogleMapsDirectionsUrl()`.

**Requisito futuro**:
- CTA como "Como chegar" (Design System) em ProductOffers/OfferCard/StoreDetails mobile.
- Ao clicar: abrir Google Maps com rota **Ponte Internacional da Amizade → endereço real da loja**.
- Preferência: usar **Google Maps URL oficial** (`https://www.google.com/maps/dir/?api=1&origin=...&destination=...`), sem integrar Maps API.
- **Dependência de dados**: endereço/coordenadas das lojas (hoje 4/7 address, 0/7 latlng). Não inventar coordenadas/endereços.
- Planejar utility centralizada `buildGoogleMapsDirectionsUrl()` quando implementar (evitar duplicação).

---

## REQUISITO PR-006 + MATRIZ DE AUTONOMIA DOS AGENTES

**Objetivo**: fazer mais e perguntar menos — aumentar autonomia operacional dos agentes (DeepSeek), mantendo gates humanos onde há risco real.

**Estado atual auditado**:
- **PEF está arquivado** em `docs/archive/PEF_LEGACY/` (`CLAUDE_SYSTEM.md`, `PROJECT_RULES.md`, `CHECKLIST.md`, `START.md`, `SUPABASE_RULES.md`, etc.) — legado, **não normativo ativo**.
- **Autonomia real hoje** é controlada por **allow-lists de bash**:
  - `reasonix.toml` `[permissions].allow` (77 KB) — lista de comandos `Bash`, `Node`, `SSH`, `git add/commit/push`, `P()`, etc.
  - `.claude/settings.local.json` `permissions.allow` — comandos permitidos.
- `ai/rules`, `ai/prompts`, `ai/tools`, `ai/embeddings` estão **vazios** — não há sistema de prompts de agente ativo.
- `docs/engineering/ENGINEERING_CONSTITUTION.md` e `docs/engineering/AGENTS.md` são os guarda-corpos de qualidade atuais.

**Matriz de autonomia proposta (formalizar — NÃO aplicada nesta missão)**:

| Nível | Ações | Gate |
|---|---|---|
| **GREEN — executar sem perguntar** | leitura, busca, auditoria, lint/typecheck/testes/build, componentes dentro de Sprint aprovada, refactors locais reversíveis, testes, documentação factual, correções de lint/imports/tipagem, pequenas correções inequívocas, git read-only, execução sequencial de subtarefas aprovadas | nenhum |
| **YELLOW — executar com proteções** | criar migrations (não aplicar), refactors grandes reversíveis, novos módulos, dependências justificadas, alterar contratos internos, commits locais, seeds não aplicados | dentro da Sprint + rollback simples + testes + não tocar produção + documentar |
| **RED — exigir aprovação humana** | deletar dados, migration destrutiva em prod, DROP, alterar produção irreversivelmente, excluir Supabase Cloud, revogar credenciais, force push, reset destrutivo, billing/pagamentos, publicar secrets, infraestrutura crítica, mudança material de escopo | aprovação explícita |

**Fluxo alvo**: OWNER aprova Sprint → agente orquestra → implementa → testa → corrige → retesta → documenta → audita → relatório. Owner chamado só em RED ou ambiguidade material.

**Files a mudar (proposta — NÃO aplicada)**: `reasonix.toml` (acrescentar níveis/política), `.claude/settings.local.json`, `AGENTS.md` (referenciar matriz + regra "perguntar só quando RED/ambiguidade"), `docs/engineering/ENGINEERING_CONSTITUTION.md` (seção de autonomia), possivelmente reativar/docs de `ai/rules` para o fluxo DeepSeek. Todas exigem plano + alinhamento com o PEF antes de qualquer alteração normativa.

**Safety**: autonomia nunca se aplica a ações RED/destrutivas; gates de produção (db:push bloqueado, migrations não aplicáveis) permanecem inalterados.
