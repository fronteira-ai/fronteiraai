# DECISIONS.md

Registro de decisões arquiteturais (ADR leve). Cada entrada documenta o que foi decidido, por quê, e quais alternativas foram descartadas. Adicione uma nova entrada sempre que uma decisão estrutural for tomada — não edite entradas antigas, apenas acrescente.

---

## ADR-001 — `lib/env.ts` é a única fonte de acesso a `process.env`

**Data**: 2026-06-22 (Sprint 3.2, encerramento)
**Status**: Aceita

**Contexto**: `lib/supabase.ts` e `constants/routes.ts` acessavam `process.env` diretamente, cada um com sua própria forma de tratar variável ausente (`!` non-null assertion em um caso, fallback silencioso no outro). Havia também um `lib/env.ts` solto, criado mas nunca conectado a nada, duplicando a responsabilidade de validação.

**Decisão**: Centralizar todo acesso a `process.env` em `lib/env.ts`, exportando um objeto `env` tipado. Variáveis obrigatórias (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) lançam erro descritivo se ausentes, distinguindo a mensagem entre ambiente local (`process.env.VERCEL !== "1"`, recomenda `.env.local`) e Vercel (`process.env.VERCEL === "1"`, recomenda o painel do projeto). Variáveis opcionais (`NEXT_PUBLIC_SITE_URL`) têm fallback dentro do próprio `env.ts`. `lib/supabase.ts` e `constants/routes.ts` agora importam de `lib/env.ts` em vez de tocar `process.env`.

**Alternativas descartadas**: usar uma lib de validação de schema (ex. `zod`/`t3-env`) — rejeitada para não introduzir dependência nova sem necessidade comprovada (o projeto tem só 3 variáveis de ambiente hoje).

**Consequência**: qualquer variável de ambiente nova deve ser adicionada em `lib/env.ts`, nunca lida diretamente via `process.env` em outro arquivo. Isso é verificável com `grep -rn "process\.env" --include="*.ts" --include="*.tsx" .` — deve retornar apenas ocorrências dentro de `lib/env.ts`.

---

## ADR-002 — `.env.example` deixa de ser ignorado pelo Git

**Data**: 2026-06-22
**Status**: Aceita

**Contexto**: O `.gitignore` tinha a regra genérica `.env*`, que also capturava `.env.example` — um arquivo template sem segredos, pensado para ser commitado e orientar quem clona o repositório. Na prática isso significava que `.env.example` nunca chegava ao Git, mesmo intencionalmente criado (foi encontrado em `lib/.env.example`, também no lugar errado).

**Decisão**: adicionar `!.env.example` após a regra `.env*` no `.gitignore`, e mover o arquivo para a raiz do projeto (`.env.example`), local convencional onde ferramentas e desenvolvedores esperam encontrá-lo, junto de `NEXT_PUBLIC_SITE_URL` (antes ausente do exemplo).

**Consequência**: qualquer variável nova adicionada a `lib/env.ts` deve ganhar uma linha correspondente em `.env.example`.

---

## ADR-003 — Removido o script `format` do `package.json`

**Data**: 2026-06-22
**Status**: Aceita

**Contexto**: Um `package.json` editado nesta mesma janela de trabalho (ainda não commitado antes desta sprint) introduziu o script `"format": "prettier --write ."`, mas `prettier` nunca foi adicionado a `devDependencies` — o script falharia (`command not found`) se executado.

**Decisão**: remover o script em vez de adicionar `prettier` como dependência nova, seguindo a regra explícita desta sprint de não introduzir dependências sem necessidade comprovada. Formatação de código fica, por ora, a cargo do ESLint (`npm run lint`) e do formatter do editor.

**Alternativas descartadas**: adicionar `prettier` + `.prettierrc` agora — viável e provavelmente desejável no futuro, mas fora do escopo desta sprint de consolidação (que é sobre não adicionar peças novas, e sim arrumar o que já existia pela metade).

**Consequência**: se/quando Prettier for adotado, deve vir como uma decisão própria (nova entrada neste arquivo), com configuração e integração ao ESLint (`eslint-config-prettier`) para evitar regras conflitantes.

---

## ADR-004 — Script `clean` reescrito para ser multiplataforma

**Data**: 2026-06-22
**Status**: Aceita

**Contexto**: `"clean": "rmdir /s /q .next 2>nul || true"` é sintaxe de `cmd.exe` do Windows; falha (ou não faz nada útil) em qualquer outro shell, incluindo o ambiente de build da Vercel (Linux) e em macOS/Linux locais.

**Decisão**: reescrever como `"clean": "node -e \"require('fs').rmSync('.next', { recursive: true, force: true })\""` — usa apenas o módulo `fs` nativo do Node (já uma dependência do projeto via `next`), funciona identicamente em qualquer SO, sem adicionar pacotes como `rimraf`.

---

## ADR-005 — Documentação real substitui documentação aspiracional

**Data**: 2026-06-22
**Status**: Aceita

**Contexto**: `docs/PROJECT_STATUS.md` e `docs/ARCHITECTURE.md` originais foram escritos antes da implementação do domínio de Produto e descreviam um estado de planejamento ("Sprint 0", 15% de progresso, "Release 0.2: Planned") que não correspondia mais ao código.

**Decisão**: esses dois arquivos passam a ser gerados/atualizados a partir de leitura real do código a cada sprint de consolidação, não editados manualmente como plano. `docs/ROADMAP.md` e `docs/CLAUDE.md` (a versão em `docs/`, distinta da raiz) permanecem como documentos de visão/processo de longo prazo e não são reescritos por essa auditoria — eles descrevem intenção, não estado.

**Consequência**: ao final de cada sprint de consolidação, repetir a leitura completa do código antes de tocar em `PROJECT_STATUS.md`/`ARCHITECTURE.md`/`FEATURES.md`/`TECH_DEBT.md`/`CHANGELOG.md`/`NEXT_STEPS.md`.

---

## ADR-006 — Contato e horário de funcionamento da loja ficam fora do schema até aprovação

**Data**: 2026-06-22 (Sprint 3.4)
**Status**: ⚠️ Premissa corrigida na Sprint 3.4.1 (ver ADR-008) — a conclusão de que as colunas "não existem no banco real" estava **errada**. A Sprint 3.4 só consultou o subconjunto de colunas que `types/store.ts` já declarava, sem fazer `select("*")` real contra o Supabase. A auditoria da Sprint 3.4.1 (com `select("*")` de verdade) encontrou `phone`, `whatsapp`, `email`, `website`, `address` e `opening_hours` já existentes. A migration `0001` gerada por este ADR está marcada como **superada** — ver `0002_revised_store_data_layer.sql`. Decisão original preservada abaixo para histórico.

**Contexto**: a missão da Sprint 3.4 pedia que a página de loja (`app/store/[slug]/`) exibisse contato e horário de funcionamento. Nenhum dos dois existe em `types/store.ts` nem na tabela real `stores` no Supabase (confirmado via query direta nesta sprint: colunas atuais são `id, name, slug, description, city, country, rating, logo_url, banner_url, verified, created_at`). `database/DATABASE.md` também não documenta essas colunas.

**Decisão**: não adicionar campos ao tipo `Store` que não existem no banco real (evita repetir o incidente de `types/store.ts` vazio documentado no `CHANGELOG.md`, e respeita a regra do projeto de nunca alterar schema sem aprovação). A página de loja foi implementada usando exclusivamente os campos hoje existentes; as seções de Contato e Horário simplesmente não são renderizadas (sem mocks, sem valores fixos, sem props opcionais especulativas no tipo `Store`). Uma proposta de migration foi gerada em `database/migrations/0001_proposed_store_contact_hours.sql` (`phone`, `whatsapp`, `email`, `website_url`, `address`, `business_hours jsonb`, todas nullable) para avaliação — **não aplicada**.

**Alternativas descartadas**: (a) adicionar os campos como opcionais no tipo `Store` mesmo sem confirmação de que existem no banco — rejeitada por criar uma mentira de tipo (`Store` afirmaria ter campos que `select("*")` nunca preencheria) e por já ter causado problemas similares neste projeto; (b) usar dados fictícios/mocados para essas seções — rejeitada por instrução explícita do CTO ("não utilize mocks, não utilize valores fixos").

**Consequência**: quando a migration proposta for revisada e aplicada manualmente no Supabase, atualizar `types/store.ts`, `services/store.service.ts` (se necessário) e adicionar as seções de Contato/Horário em `StoreDetails.tsx` (ou um componente novo). Até então, a ausência dessas seções na UI é o comportamento correto, não uma lacuna esquecida — ver `docs/TECH_DEBT.md`.

---

## ADR-007 — Achado de dados: `stores.slug` nulo e `products` vazia no Supabase real

**Data**: 2026-06-22 (Sprint 3.4)
**Status**: Registrado (não é uma decisão de schema/código, é um achado de conteúdo)

**Contexto**: ao testar manualmente `app/store/[slug]/` com dados reais (Sprint 3.4), uma consulta direta ao Supabase mostrou que as 5 linhas reais de `stores` (Cellshop, Nissei, Shopping China, Mega Eletrônicos, Atacado Games) têm `slug: null`, e a tabela `products` está com 0 linhas. Isso significa que `/store/[slug]` (Sprint 3.4) e, em menor grau, `/product/[slug]` (Release 0.2) e a Busca (Sprint 3.3) não têm dados reais navegáveis hoje em produção, apesar do código estar correto e validado — `getStoreBySlug`/`getProductBySlug` retornam `null` corretamente porque nenhuma linha tem o `slug` buscado.

**Decisão**: não alterar dados de produção (inserir/popular `slug`) sem aprovação explícita — é uma ação sobre um sistema externo compartilhado, não uma decisão de código. Registrado aqui para que a causa de "página de loja/produto retorna 404 mesmo após o código estar pronto" não seja confundida com um bug de implementação em sprints futuras.

**Consequência**: antes de considerar o Domínio de Loja (ou Produto) "pronto para usuários reais", alguém com acesso ao painel do Supabase precisa popular `stores.slug` (slugificar `name`, ex. "Shopping China" → "shopping-china") e cadastrar ao menos alguns `products`/`offers` reais. Ver `docs/TECH_DEBT.md`.

---

## ADR-008 — Auditoria de dados (Sprint 3.4.1): `types/store.ts` e `types/offer.ts` divergem do schema real do Supabase

**Data**: 2026-06-22 (Sprint 3.4.1 — Consolidação da Camada de Dados)
**Status**: Registrado — **nenhuma alteração de código ou schema aplicada nesta sprint**, decisão de correção pendente de aprovação.

**Contexto**: a Sprint 3.4.1 auditou o banco real consultando o Supabase diretamente — via `select("*")` (para tabelas com dados, como `stores`) e via teste coluna-por-coluna lendo o erro "column does not exist" do PostgREST (para tabelas vazias, como `products`/`offers`/`brands`/`categories` — método somente-leitura, sem precisar de service-role key). O resultado contradiz partes do que ADR-006/ADR-007 e `docs/DOMAIN_MODEL.md` assumiam, porque aquelas sprints nunca fizeram um `select("*")` real — só verificaram os campos que os tipos TypeScript já declaravam.

**Achados**:

1. **`stores`** (24 colunas reais vs. 11 no tipo): `banner_url` (tipo) deveria ser `cover_image` (banco); `verified` (tipo) deveria ser `is_verified` (banco). Resultado em produção: o banner da loja nunca aparece e o badge "Verificada" nunca aparece, mesmo quando a loja tem capa/é verificada. Faltam no tipo: `whatsapp`, `website`, `address`, `instagram`, `opening_hours`, `latitude`, `longitude`, `delivery`, `pickup`, `pix_br`, `active`, `phone`, `email` — todos já existem no banco e **invalidam a proposta de migration `0001`** (ADR-006), que tentava criar colunas que já existiam.
2. **`offers`** (16 colunas reais vs. 12 no tipo) — **divergência mais grave**: `price` não existe (o banco usa `price_usd`/`price_brl`, dois valores independentes, não um valor + taxa de conversão); `stock` não existe (o banco usa `in_stock`/`available`/`stock_quantity`); `installments` não existe (nenhum campo de parcelamento encontrado); `url` não existe (o banco usa `product_url`). Resultado: assim que existir uma oferta real, `ProductOffers.tsx`/`StoreOffers.tsx` vão exibir preço como `NaN` (via `convertToUSD(undefined, ...)`), o badge de estoque vai sempre mostrar "Sem estoque", e o botão "Ver oferta" nunca vai aparecer — apesar do `npm run build`/`lint`/`typecheck` passarem limpos (o TypeScript não pega isso porque `data as Offer[]` é um cast manual, não validado em runtime — risco já registrado em `docs/TECH_DEBT.md` antes desta sprint, agora confirmado como real, não hipotético).
3. **`products`** (16 colunas reais vs. 9 no tipo) — sem nomes trocados, só campos faltantes no tipo (`sku`, `weight`, `model`, `updated_at`, `active`, `gtin`, `release_date`). Não bloqueante.
4. **`brands`/`categories`** — tipos corretos, sem divergência encontrada.
5. Os 4 relacionamentos usados pelos services (`offers→stores`, `offers→products`, `products→brands`, `products→categories`) foram confirmados como FKs reais (PostgREST resolveu os joins sem erro). A modelagem relacional está correta — o problema é só nos nomes/forma dos campos de preço e estoque.
6. Tabelas reais não documentadas: `profiles` (id, email, created_at — possível scaffold de Supabase Auth) e `favorites` (id, product_id, created_at — paralela e desconectada do `useFavorites.ts` via `localStorage`). Nenhuma das 14 tabelas listadas como "futuras" em `database/DATABASE.md` existe de fato (confirmado, documentação correta nesse ponto).

**Decisão**: registrar o achado e **não corrigir o código nesta sprint** — a missão da Sprint 3.4.1 foi explicitamente de auditoria/diagnóstico ("não implemente novas funcionalidades de interface"), e corrigir `types/offer.ts`/`types/store.ts` + os componentes que os consomem é uma mudança de código real, não documentação. Fica como decisão explícita para o CTO aprovar antes da Sprint 3.5: corrigir agora (como parte da consolidação de dados) ou abrir uma sprint dedicada.

**Alternativas descartadas**: corrigir os tipos silenciosamente durante esta auditoria — rejeitada porque a missão pediu diagnóstico antes de ação, e uma mudança nos tipos/services tocaria componentes já em produção (`ProductOffers`, `StoreOffers`, `StoreCard`, `StoreDetails`) sem o usuário ter visto o tamanho real do problema primeiro.

**Consequência**: `database/migrations/0001_proposed_store_contact_hours.sql` marcado como superado; `0002_revised_store_data_layer.sql` propõe apenas constraints de integridade (`UNIQUE (slug)`), já que nenhuma coluna nova é necessária. `docs/DOMAIN_MODEL.md` reescrito com o schema real lado a lado com o tipo. Qualquer sprint futura que toque `offers`/`stores` deve assumir os nomes reais (`price_usd`/`price_brl`, `in_stock`/`available`, `product_url`, `cover_image`, `is_verified`), não os do tipo atual, até a correção ser aprovada e aplicada.
