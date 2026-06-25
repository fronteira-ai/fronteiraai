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

---

## ADR-009 — Correção aplicada: `types/offer.ts`/`types/store.ts` passam a refletir o schema real

**Data**: 2026-06-23 (Sprint 3.5 — Catálogo Premium de Produtos)
**Status**: Aceita e aplicada

**Contexto**: ADR-008 (Sprint 3.4.1) documentou, mas não corrigiu, a divergência entre `types/offer.ts`/`types/store.ts` e o schema real do Supabase. A missão da Sprint 3.5 (Catálogo de Produtos) depende diretamente de preço/estoque corretos (ordenação "menor/maior preço", filtro de faixa de preço e disponibilidade) — construir o catálogo sobre os tipos antigos teria multiplicado o retrabalho. Decisão tomada com o CTO antes de iniciar a implementação: corrigir a camada de dados primeiro.

**Decisão**:
- `types/offer.ts`: `price`/`currency` → `price_usd` + `price_brl` (valores independentes, não convertidos); `stock` → `in_stock` (fonte da verdade para o badge "Em estoque" na UI — `available`/`stock_quantity` também passam a existir no tipo, mas não são usados em nenhuma tela ainda); `url` → `product_url`; `installments` removido (nenhuma coluna real equivalente foi encontrada na auditoria); `old_price`/`condition` adicionados (colunas reais sem uso de UI ainda).
- `types/store.ts`: `banner_url` → `cover_image`; `verified` → `is_verified`; adicionados os 13 campos reais que faltavam (`phone`, `whatsapp`, `email`, `website`, `address`, `opening_hours`, `instagram`, `latitude`, `longitude`, `delivery`, `pickup`, `pix_br`, `active`).
- `utils/currency.ts`: `convertToUSD`/`convertToBRL` removidos (a conversão por taxa fixa não tem mais consumidor — o banco já entrega `price_usd`/`price_brl` prontos).
- `services/offer.service.ts`: `.order("price", ...)` → `.order("price_usd", ...)`.
- Consumidores atualizados: `ProductOffers.tsx`, `StoreOffers.tsx`, `StoreCard.tsx`, `StoreDetails.tsx` (que ganhou a seção de Contato/Horário antes bloqueada pelo ADR-006), `app/store/[slug]/{page,layout}.tsx`, `app/product/[slug]/layout.tsx`, `app/page.tsx` (dados de exemplo).

**Decisão de produto incluída**: entre `in_stock`/`available`, `in_stock` foi escolhido como a fonte da UI para "disponível para compra" — é o nome mais direto e o que mais se aproxima semanticamente do campo antigo `stock` que a UI já usava. `available` fica modelado no tipo, sem consumidor, para uma decisão futura caso sua semântica (ex.: "produto descontinuado" vs. "temporariamente esgotado") precise aparecer separadamente na UI.

**Consequência**: bugs de `NaN`/"Sem estoque sempre"/botão "Ver oferta" ausente (ADR-008) ficam resolvidos assim que existir uma oferta real. `docs/DOMAIN_MODEL.md`, `API_CONTRACTS.md`, `TECH_DEBT.md` atualizados para remover o aviso de divergência tipo↔schema.

---

## ADR-010 — Unificação de `ProductCard`/`ProductHighlightCard` em um único componente

**Data**: 2026-06-23 (Sprint 3.5)
**Status**: Aceita e aplicada

**Contexto**: `docs/ARCHITECTURE.md`/`TECH_DEBT.md` já apontavam `ProductCard` e `ProductHighlightCard` como quase-duplicados (mesmo layout de card — imagem, nome, preço, link —, divergindo só em campos extras de desconto/estoque/loja e no tipo de entrada). A Sprint 3.5 precisava de um card de produto para o novo `ProductGrid` (catálogo); criar um terceiro componente teria piorado a duplicação em vez de resolvê-la, e a missão da sprint pede explicitamente para corrigir duplicações encontradas durante a auditoria.

**Decisão**: unificar em um único `components/product/ProductCard.tsx`, com props já achatadas (`slug`, `name`, `imageUrl`, `priceUSD?`, `originalPriceUSD?`, `subtitle?`, `inStock?`) em vez de receber o tipo de domínio inteiro (`Product`/`ProductHighlight`/`ProductCatalogItem`) — cada call site (`RelatedProducts`, `SearchResults`, `ProductGrid`, `home/Offers.tsx`) faz seu próprio mapeamento simples na hora de renderizar. O visual adotado é o do antigo `ProductHighlightCard` (mais completo: badge de desconto, badge "Esgotado", CTA com seta) para todos os usos, elevando a consistência visual em vez de manter dois padrões. `components/product/ProductHighlightCard.tsx` foi removido (aprovação explícita do CTO antes da remoção, por restrição do `CLAUDE.md`).

**Alternativas descartadas**: manter os dois componentes e só adicionar um terceiro para o catálogo — rejeitada por aumentar a duplicação já identificada como dívida técnica; fazer `ProductCard` aceitar genericamente `Product | ProductHighlight | ProductCatalogItem` via union type — rejeitada por acoplar o componente de apresentação a três tipos de domínio diferentes, quando props achatadas o tornam agnóstico e mais simples de testar/reutilizar.

**Consequência**: qualquer tela nova que precise de um card de produto reaproveita `ProductCard` com um mapeamento de poucas linhas, sem decidir entre dois componentes quase iguais. `docs/COMPONENT_INDEX.md` atualizado.

---

## ADR-011 — Ordenação por preço no catálogo (`/products`) é "best effort" até existir uma view de agregação

**Data**: 2026-06-23 (Sprint 3.5)
**Status**: Aceita — limitação documentada, com proposta de correção não aplicada

**Contexto**: o catálogo de produtos (`getProductsCatalog`, `services/product.service.ts`) precisa ordenar produtos por "menor preço"/"maior preço", mas preço pertence à oferta, não ao produto (`docs/DOMAIN_MODEL.md`) — um produto pode ter N ofertas, e "o preço do produto" para fins de ordenação é o mínimo entre elas. PostgREST/Supabase resolvem filtros sobre tabelas relacionadas via embedding (`offers!inner`), o que cobre corretamente os filtros de loja/disponibilidade/faixa de preço sem precisar de view nenhuma — mas **ordenar** as linhas de `products` por uma agregação (`MIN(offers.price_usd)`) por grupo não é algo que o PostgREST resolve nativamente numa única query paginada, sem uma view/RPC dedicada.

**Decisão**: para esta sprint, implementar a ordenação por preço como correção client-side da página já buscada: a query principal continua paginando por `created_at` (ou pelos filtros ativos) no banco, embute as ofertas relevantes por produto, calcula `lowestPriceUSD` em memória, e — somente quando o usuário pede `price_asc`/`price_desc` — reordena o array da página atual por esse valor antes de devolver ao componente. Isso garante que **a página exibida está sempre corretamente ordenada**, mas não garante ordem global perfeita entre páginas diferentes em catálogos com muitos produtos (ex.: o produto mais barato da página 3 pode, em teoria, ser mais barato que algum da página 2, se a paginação de base não foi feita por preço). Dado que a tabela `products` está vazia em produção hoje (ADR-007), esse limite é teórico, não observável, e documentado para ser resolvido antes de qualquer carga real de dados.

**Correção proposta, não aplicada**: `database/migrations/0003_proposed_product_catalog_price_view.sql` cria uma materialized view `product_price_summary` (preço mínimo/máximo, contagem de ofertas e flag de estoque por produto, com índice único e índice no preço) que permitiria `getProductsCatalog` ordenar nativamente por preço com paginação correta entre páginas, sem o reordenamento client-side. Não aplicada nesta sprint por ser uma alteração de schema (restrição do `CLAUDE.md`: nunca alterar schema sem aprovação).

**Alternativas descartadas**: "sobrebuscar" (overfetch) um lote maior de ofertas ordenadas por preço e deduplicar por produto — rejeitada por ser uma solução frágil ("temporária" no sentido que `CLAUDE.md` proíbe), que falha silenciosamente em catálogos com produtos de muitas ofertas duplicadas e não escala para "milhões de produtos" (objetivo explícito da missão); chamar um `rpc()` que ainda não existe no banco e mascarar o erro com fallback silencioso — rejeitada por esconder a limitação em vez de documentá-la.

**Consequência**: filtros (categoria/marca/loja/disponibilidade/faixa de preço) e paginação são 100% corretos e escaláveis hoje, sem depender de nenhuma migration. Apenas a ordenação por preço tem o limite descrito acima, documentado em código (`services/product.service.ts`) e aqui. Ver `docs/TECH_DEBT.md`.

---

## ADR-012 — Seed tooling (`database/seed/`) vive fora da camada da aplicação, em JavaScript puro

**Data**: 2026-06-23 (Sprint 3.7 — Data Foundation v2)
**Status**: Aceita e aplicada

**Contexto**: a Sprint 3.7 pediu um sistema de seed modular e reexecutável (`database/seed/{brands,categories,stores,products,offers}/`, `index.ts` no enunciado da missão). O projeto não tem `ts-node`/`tsx` instalado, e instalar uma dependência nova exige aprovação explícita (Restrição Absoluta), fora do escopo desta sprint. Além disso, `lib/env.ts` (ADR-001) é a única fonte de `process.env` **dentro da árvore da aplicação Next.js** (`app/`, `components/`, `hooks/`, `services/`, `lib/`) — um script de seed não roda dentro dessa árvore, roda como processo Node standalone, separado do bundle da aplicação.

**Decisão**: `database/seed/` é tooling de infraestrutura, fora do fluxo `types → services → hooks → components → app` que `.ai/ARCHITECTURE_RULES.md` governa. Por isso: (a) escrito em JavaScript puro (CommonJS), executável só com `node`, sem dependência nova; (b) lê `process.env` diretamente (`database/seed/lib/client.js`), não via `lib/env.ts` — o escopo de ADR-001 é a aplicação Next.js, não scripts de banco standalone; (c) `eslint.config.mjs` ganhou `database/seed/**` em `globalIgnores`, pelo mesmo motivo — as regras de import de `eslint-config-next/typescript` (`no-require-imports`) não fazem sentido para tooling Node fora da árvore que esse config foi escrito para governar.

**Alternativas descartadas**: instalar `tsx`/`ts-node` (dependência nova sem necessidade comprovada); escrever em TypeScript e compilar manualmente via `tsc` para um diretório separado antes de rodar (complexidade desproporcional ao tamanho do script); manter os scripts dentro do lint padrão e suprimir o erro linha a linha com `eslint-disable` (rejeitada por escopo errado — o problema não é uma exceção pontual, é uma fronteira arquitetural inteira).

**Consequência**: qualquer ferramenta nova em `database/` (seed, scripts de migração futuros etc.) segue essa mesma convenção — JavaScript puro, `process.env` direto, fora do lint da aplicação — a menos que uma decisão futura justifique adicionar um executor de TypeScript ao projeto.

---

## ADR-013 — Arquitetura do Price Engine (futuro, não implementado)

**Data**: 2026-06-23 (Sprint 3.7 — Data Foundation v2)
**Status**: Aceita como direção arquitetural — nenhum código/schema novo implementado

**Contexto**: o ParaguAI compara **ofertas**, não produtos — preço vive em `offers.price_usd`/`price_brl`, independentes entre si (ADR-009). Histórico de preços (`price_history`, já prevista em `database/DATABASE.md` como tabela futura), alertas de preço e a ordenação do catálogo (ADR-011) todos vão depender, no futuro, de uma única fonte de verdade para "o preço atual" de uma oferta e de como ele mudou ao longo do tempo. Hoje, nada escreve em `offers.price_usd`/`price_brl` em produção (sem Admin/Crawler implementados) — é o momento certo para definir a arquitetura antes que múltiplos pontos de escrita apareçam.

**Decisão (arquitetura proposta, não implementada nesta sprint)**:
- **Fluxo de atualização**: toda alteração de `price_usd`/`price_brl` em `offers` é tratada como um evento, não uma sobrescrita silenciosa. Quando o Admin (Release 0.7) ou o Crawler (Release 0.8) existirem, ambos devem escrever através de um único caminho (um futuro `updateOfferPrice()` em `services/offer.service.ts`, não múltiplos call sites) — esse caminho grava a linha anterior em `price_history` antes/junto de atualizar `offers`.
- **Consistência**: `price_usd`/`price_brl` continuam independentes, nunca derivados um do outro por taxa de conversão fixa (ADR-009 removeu exatamente isso de `utils/currency.ts`) — quando uma fonte fornecer só um dos dois, o outro permanece `null` até ter fonte própria.
- **Preparação para histórico**: `price_history` (proposta, não criada nesta sprint) teria `offer_id`, `price_usd`, `price_brl`, `old_price`, `recorded_at` — sempre `INSERT`, nunca `UPDATE`. Uma consulta como "preço mais baixo dos últimos 30 dias" (típica de um alerta de preço) vira um `SELECT` simples sobre essa tabela, sem precisar reconstruir histórico a partir de logs.

**Não implementado nesta sprint**: a tabela `price_history` não foi criada (seria uma migration de schema nova, fora do escopo "não implemente histórico ainda" desta missão); `updateOfferPrice()` não existe ainda — não há, hoje, nenhum consumidor real que escreva preço.

**Consequência**: quando Admin/Crawler forem implementados, a primeira tarefa de dados deve ser esta arquitetura, não uma solução ad-hoc por feature — evita repetir, na escrita de preço, o mesmo tipo de divergência silenciosa que o ADR-008/009 já corrigiu na leitura.

---

## ADR-014 — Offer Ranking: algoritmo inicial (estratégia, não implementado)

**Data**: 2026-06-23 (Sprint 3.7 — Data Foundation v2)
**Status**: Aceita como estratégia — nenhum código novo implementado

**Contexto**: `getOffersByProduct`/`getOffersByStore` (`services/offer.service.ts`) ordenam ofertas só por `price_usd` ascendente. Isso é "best effort" correto para a maioria dos casos, mas não captura confiabilidade da loja nem qualidade do cadastro — uma oferta mais barata de uma loja sem `rating` ou com cadastro incompleto pode não ser, de fato, a "melhor oferta" para o usuário. Achado concreto da Sprint 3.6 que prova o ponto: "Atacado Games" tem `rating: 5.0`, mas `phone`/`email`/`address` nulos e `slug` nulo — rating alto isolado não é suficiente como proxy de confiabilidade.

**Decisão (estratégia, não implementada)**: pontuação composta (0–100), calculada em memória pela camada de aplicação a partir de campos já existentes — sem IA, sem coluna nova:
- **Preço** (peso 50): normalizado dentro do conjunto de ofertas do mesmo produto — a mais barata recebe 50; as demais decaem proporcionalmente à distância percentual do menor preço.
- **Disponibilidade** (peso 25): `in_stock=true` → 25; `false` → 0 — esgotado nunca deveria ranquear acima de disponível, mesmo se mais barato.
- **Confiabilidade da loja** (peso 15): `store.rating` (0–5) normalizado para 0–15. Loja sem rating (`null`) recebe a média do conjunto, não 0 — uma loja nova não deveria ser punida como não confiável só por falta de dado.
- **Qualidade do cadastro** (peso 10): proporção de campos relevantes preenchidos na oferta/loja (`warranty`, `condition`, `product_url` na oferta; `phone`/`whatsapp`/`email`/`website`/`opening_hours` na loja) — cada campo presente soma uma fração igual do peso total.

Esta pontuação é a candidata natural a consumir a `store_ranking_summary` proposta no ADR-015, e a substituir "menor preço primeiro" por "melhor oferta primeiro" na ordenação default de `getOffersByProduct`/`getProductsCatalog`.

**Alternativas descartadas**: usar só `rating` da loja como proxy de confiabilidade — rejeitada pelo achado "Atacado Games" acima, que prova a métrica isolada enganosa.

**Não implementado nesta sprint** — mudar a ordenação visível do produto/catálogo é uma decisão de produto, não só de código, e fica para quando houver aprovação explícita de mudar esse comportamento.

---

## ADR-015 — Views de apoio: consolidação e Store Ranking View

**Data**: 2026-06-23 (Sprint 3.7 — Data Foundation v2)
**Status**: Aceita — proposta de migration não aplicada

**Contexto**: a missão da Sprint 3.7 pediu Product Lowest Price View, Product Highest Price View, Product Offer Count View e Store Ranking View. As três primeiras já são cobertas por uma única view já proposta na Sprint 3.5 (`database/migrations/0003_proposed_product_catalog_price_view.sql`, `product_price_summary`: `lowest_price_usd`, `highest_price_usd`, `offer_count`, `has_stock_offer`) — criar três views separadas duplicaria a mesma agregação por produto em três lugares, violando o princípio "um tema, um dono" que o próprio PEF defende.

**Decisão**: não duplicar — `0003` permanece a única fonte para métricas por produto. Uma proposta nova, `database/migrations/0005_proposed_store_ranking_view.sql`, cobre só o que ainda não existe: `store_ranking_summary` (uma linha por loja: `rating`, `offer_count`, `in_stock_offer_count`, `last_offer_updated_at`), insumo direto do Offer Ranking (ADR-014).

**Vantagens**: ranking de loja vira um `SELECT` simples, sem reagregar `offers` a cada request. **Custo de manutenção**: materialized view exige `REFRESH` periódico (mesma ressalva do ADR-011/0003) — aceitável porque rating/contagem de ofertas não mudam a cada segundo.

**Consequência**: nem `0003` nem `0005` foram aplicadas nesta sprint — ambas seguem como proposta, junto de `0004_proposed_catalog_integrity_and_indexes.sql` (constraints `UNIQUE (slug)` em `products`/`brands`/`categories` + índices em `offers.product_id`/`offers.store_id`/`offers.price_usd`/`products.brand_id`/`products.category_id`, também desta sprint).

---

## ADR-016 — Achado: chave anônima não escreve em `brands`/`categories`/`products`/`offers`; `UPDATE` de `stores` é filtrado silenciosamente por RLS

**Data**: 2026-06-24 (Sprint 3.8 — Seed Execution & Catalog Validation)
**Status**: Registrado — achado de ambiente/segurança, resolvido operacionalmente nesta sprint (sem alterar policy de RLS)

**Contexto**: a Sprint 3.7 já registrava como risco não verificado (`docs/TECH_DEBT.md`) que `NEXT_PUBLIC_SUPABASE_ANON_KEY` podia não ter permissão de escrita por RLS. A Sprint 3.8 confirmou isso ao vivo, com duas variantes distintas do mesmo problema:

1. **`INSERT` em `brands`/`categories`/`products`** com a chave anônima falhou de forma explícita: `new row violates row-level security policy for table "<tabela>"`. Comportamento esperado de uma policy de RLS bem configurada.
2. **`UPDATE` de `stores.slug`/`active`** com a chave anônima **não retornou erro nenhum**, mas também não alterou nenhuma linha — a policy de RLS filtrou as linhas pela cláusula `USING` antes do `UPDATE` ser aplicado, e o PostgREST/Supabase não reporta isso como erro quando a chamada não usa `.select()` para confirmar o que foi afetado. `database/seed/index.js` não verifica o resultado da escrita (só a ausência de `error`), então logou `[OK]` para as 5 lojas mesmo sem ter escrito nada — confirmado comparando snapshots antes/depois da tentativa (`stores.slug` continuava `null` em todas).

**Decisão**: resolver adicionando `SUPABASE_SERVICE_ROLE_KEY` a `.env.local` (CTO obteve a chave no painel do Supabase, Settings → API) — `database/seed/lib/client.js` já preferia essa chave quando presente (Sprint 3.7), sem precisar de nenhuma alteração de código. Não alterar policies de RLS das tabelas, que continuam protegendo escrita pública pela chave anônima (correto para a aplicação Next.js, que só lê). A chave de serviço é usada exclusivamente pelo tooling de `database/seed/`, nunca pela aplicação (`lib/supabase.ts` continua só com a chave anônima).

**Alternativas descartadas**: afrouxar as policies de RLS para aceitar `INSERT`/`UPDATE` pela chave anônima — rejeitada por expor a tabela a escrita pública não autenticada, regressão de segurança real para resolver um problema de tooling.

**Achado adicional, não corrigido nesta sprint**: o "falso positivo" de log em `database/seed/index.js` (passo 1, backfill de `stores`) é um bug de tooling — o `UPDATE` deveria confirmar linhas afetadas (ex. `.select("id")` no retorno e checar se veio vazio) antes de logar `[OK]`. Não corrigido porque não era necessário para concluir a carga de dados desta sprint (a causa raiz era a chave, não o script) e a missão pediu para não implementar funcionalidades novas. Registrado em `docs/TECH_DEBT.md` para uma sprint futura de manutenção do seed.

**Consequência**: `SUPABASE_SERVICE_ROLE_KEY` é, a partir de agora, uma variável de ambiente esperada em qualquer ambiente onde `database/seed/` precise escrever (nunca em produção/Vercel da aplicação, só local/CI de quem administra dados) — deve ser tratada com o mesmo cuidado de um segredo de banco, nunca commitada nem exposta como `NEXT_PUBLIC_*`.

---

## ADR-017 — Price Engine v1: schema, caminho único de escrita e bloqueio de DDL

**Data**: 2026-06-24 (Sprint 3.9 — Price Engine v1 + Compare Foundation)
**Status**: Aceita — código implementado; migration de schema **proposta, não aplicada** (bloqueio de ferramenta, não de aprovação)

**Contexto**: a Sprint 3.7 (ADR-013) descreveu a arquitetura do Price Engine sem implementar nada. A missão da Sprint 3.9 pediu a "primeira versão operacional" — registrar mudança de preço, preservar histórico, calcular menor/maior preço histórico e variação percentual, com dados disponíveis para o futuro `/compare`.

**Decisão — schema** (`database/migrations/0006_proposed_price_history.sql`): tabela `price_history` (`id`, `offer_id` FK para `offers.id` com `ON DELETE CASCADE`, `price_usd`, `price_brl`, `old_price_usd`, `source` (texto livre, validado só no tipo `PriceChangeSource` — mesmo padrão de `offers.condition`/`currency`, sem `CHECK` no banco), `recorded_at`), com índice composto `(offer_id, recorded_at DESC)` — cobre a única consulta real (`getOfferPriceMetrics`, filtra por `offer_id`, ordena por `recorded_at`).

**Decisão — caminho único de escrita** (`services/offer.service.ts`): `updateOfferPrice(offerId, newPriceUSD, newPriceBRL, source)` é a única função que deve alterar `offers.price_usd`/`price_brl` a partir de agora (ver comentário no código). Ela: 1) lê o preço atual; 2) se idêntico ao novo, retorna sem gravar nada (`changed: false`, não é uma "alteração"); 3) grava uma linha em `price_history` com o preço antigo, o novo e a origem; 4) só então atualiza `offers`, com o mesmo padrão de confirmação de linhas afetadas adotado no ADR-016 (`.select("id")`, checando se veio vazio) — para não repetir o mesmo bug de log falso-positivo num caminho de escrita novo.

**Decisão — métricas com degradação graciosa**: `getOfferPriceMetrics(offerId)` lê `offers` (sempre real) e `price_history` (pode não existir ainda). Erro ao consultar `price_history` não propaga — a função retorna `currentPriceUSD` real e `null` nos 4 campos dependentes de histórico, testado e confirmado nesta sprint contra o Supabase real (erro `Could not find the table 'public.price_history'`, capturado, sem crash). Isso significa que o código já é "verdadeiramente operacional" assim que a migration `0006` for aplicada, sem precisar tocar `services/offer.service.ts` de novo.

**Bloqueio real encontrado — DDL não executável com as ferramentas atuais**: diferente de todas as migrations anteriores (`0001`–`0005`), que ficaram propostas por decisão/aprovação pendente, a `0006` ficou proposta por **impossibilidade técnica**: `@supabase/supabase-js` usa PostgREST, que só expõe CRUD via REST sobre tabelas/views/RPCs já existentes — não executa `CREATE TABLE`. Confirmado nesta sprint: não há `pg` (ou qualquer client Postgres) instalado, não há `DATABASE_URL`/connection string em `.env.local`, não há Supabase CLI configurado (sem `.supabase/`), e a introspecção do OpenAPI do PostgREST (`GET /rest/v1/`) não lista nenhuma RPC própria para executar SQL arbitrário. Isso corresponde exatamente a uma das condições de parada definidas pelo CTO para esta sprint ("necessidade de credencial inexistente") — registrado aqui em vez de simulado ou contornado.

**Alternativas descartadas**: instalar `pg` e usar uma `DATABASE_URL` para aplicar a migration via script — rejeitada por exigir uma credencial nova (senha do Postgres) que não foi fornecida nesta sessão, e por introduzir uma segunda forma de conexão ao banco (paralela ao `@supabase/supabase-js`) sem decisão arquitetural prévia sobre quando usar uma ou outra.

**Consequência**: a Sprint 3.9 entrega o Price Engine **code-complete e testado em todos os caminhos que não dependem da tabela existir** (graceful degradation confirmada ao vivo). Para se tornar operacional de fato (gravar histórico real), alguém com acesso ao painel do Supabase precisa colar o conteúdo de `0006_proposed_price_history.sql` no SQL Editor — uma ação humana de poucos minutos, não uma tarefa de código pendente. Ver `docs/TECH_DEBT.md`.

---

## ADR-018 — Price Engine v1: validado fim a fim contra `price_history` real; bug de métrica encontrado e corrigido; classificação "backend Production Ready"

**Data**: 2026-06-24 (Sprint 3.9, adendo — após o CTO aplicar `0006` manualmente)
**Status**: Aceita

**Contexto**: o CTO aplicou `database/migrations/0006_proposed_price_history.sql` manualmente no SQL Editor do Supabase, removendo o bloqueio registrado no ADR-017. Isso permitiu, pela primeira vez, testar `updateOfferPrice`/`getOfferPriceMetrics` contra a tabela real em vez de só validar a degradação graciosa na ausência dela.

**Bug real encontrado durante a validação** (antes de qualquer escrita real): `getOfferPriceMetrics` calculava `lowestPriceUSD`/`highestPriceUSD`/`priceChangePercent` usando apenas `entries[].price_usd` (o preço **novo** de cada mudança registrada) e o preço atual — nunca o preço **original** (anterior à primeira mudança), que só existe em `firstEntry.old_price_usd`. Resultado: se o preço só caísse desde o início do histórico, o "maior preço" real (o original, mais alto) nunca apareceria no cálculo — `highestPriceUSD` ficaria igual a `lowestPriceUSD`/`currentPriceUSD`, silenciosamente errado, sem nenhum erro de tipo ou de runtime que o denunciasse. Só apareceria testando com dados reais de mudança de preço — exatamente o que esta validação fez.

**Correção**: `prices` passou a incluir `firstEntry.old_price_usd` (quando existe) além de `entries[].price_usd` e do preço atual; `firstPrice` (base do cálculo de `priceChangePercent`) passou a ser `firstEntry.old_price_usd`, não `firstEntry.price_usd` — captura corretamente "a variação desde o primeiro preço já visto", não "desde a primeira vez que o preço mudou".

**Validação executada** (chave de serviço, contra a oferta real `iphone-16-pro-256gb-titanio-preto@cellshop`, preço original 999 USD):
1. Leitura de `price_history` vazia para a oferta — confirmado.
2. Métricas baseline (sem histórico): `current=lowest=highest=999`, variação `null` — confirmado.
3. `updateOfferPrice` 999→949: histórico grava 1 linha (`price_usd=949`, `old_price_usd=999`, `source=manual`); métricas pós-mudança: `current=949`, `lowest=949`, `highest=999` (correto, pico original capturado), `change≈-5.005%` — confirmado.
4. `updateOfferPrice` 949→1050 (2ª mudança real): métricas: `current=1050`, `lowest=949`, `highest=1050` (correto, mínimo e máximo entre os 3 pontos 999/949/1050), `change≈+5.105%` desde o preço original — confirmado.
5. `updateOfferPrice` chamado com o preço **já vigente** (1050): retornou `changed: false`, nenhuma linha nova de histórico — confirmado (no-op funciona).
6. `updateOfferPrice` 1050→999 (restaura o preço original): 3ª linha real de histórico; oferta volta a `price_usd=999` (preço de catálogo da Sprint 3.8 preservado); métricas finais: `current=999`, `lowest=949`, `highest=1050`, `change=0%` (voltou ao ponto de partida) — confirmado.
7. `npm run db:validate` depois de tudo: 0 problemas — nenhuma regressão na integridade dos dados de catálogo.

**Achado de segurança, não corrigido nesta sprint**: a chave anônima (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, usada pela aplicação via `lib/supabase.ts`) foi testada e **confirmada bloqueada** tanto para `INSERT` em `price_history` (erro explícito de RLS) quanto para `UPDATE` em `offers` (bloqueio silencioso, 0 linhas, mesmo padrão do ADR-016) — consistente com o mesmo modelo de RLS já confirmado em `brands`/`categories`/`products`. Isso significa que `updateOfferPrice()`, chamado pelo client público da aplicação hoje, retornaria `null` de forma segura (sem crash), mas **não escreveria de fato**. Não é um bug — é o comportamento de segurança esperado de uma tabela que só Admin/Crawler (com credencial própria, ainda não implementados) devem poder escrever. Registrado como pré-requisito da Sprint 4.0/Release 0.7/0.8, não corrigido agora (decisão de RLS é de segurança/produto, não unilateral).

**Correção registrada após verificação adicional (ver ADR-019)**: a frase original desta entrada afirmava que a leitura (`SELECT`) de `price_history` "já funciona com a chave anônima". **Isso estava errado** — verificado e corrigido minutos depois, ainda nesta sessão: a chave anônima também não lê nenhuma linha de `price_history` (nem de `brands`/`categories`/`products`/`offers`). Mantido aqui, tachado, em vez de editado silenciosamente, para que o processo de verificação fique visível — ver ADR-019 para o achado completo e a causa.

**Decisão de classificação (revisada pelo ADR-019)**: o **Price Engine v1 é "Backend Production Ready"** — schema real, lógica testada e correta contra dados reais, sem regressão. **Não pode ser classificado como "Production Ready" de ponta a ponta** — não só por Admin/Crawler não existirem ainda, mas porque a leitura pública (`getOfferPriceMetrics` via `lib/supabase.ts`) está bloqueada pelo mesmo problema de RLS descrito no ADR-019, que afeta todo o catálogo, não só preço.

---

## ADR-019 — CRÍTICO: a chave anônima não lê `brands`/`categories`/`products`/`offers`/`price_history` — o catálogo real provavelmente está vazio para usuários reais desde a Sprint 3.8

**Data**: 2026-06-24 (Sprint 3.9, adendo)
**Status**: **Achado crítico, não corrigido** — requer ação humana urgente (RLS é decisão de segurança/produto, e eu não tenho ferramenta para aplicar DDL/DCL mesmo se autorizado, ver ADR-017)

**Contexto**: ao validar a leitura de `price_history` com a chave anônima (a única que `lib/supabase.ts` usa, em qualquer ambiente — confirmado lendo o arquivo), o resultado foi `{ error: null, data: [] }` mesmo para uma oferta com 3 linhas reais de histórico (visíveis e confirmadas com a chave de serviço). Isso motivou verificar as outras tabelas do domínio com a mesma chave:

| Tabela | Linhas reais (chave de serviço) | Linhas visíveis (chave anônima) |
|---|---|---|
| `stores` | 5 | **5** (leitura pública funciona) |
| `brands` | 5 | **0** |
| `categories` | 5 | **0** |
| `products` | 6 | **0** (confirmado também por busca direta de 1 produto por `slug`, retornou `null`) |
| `offers` | 9 | **0** |
| `price_history` | 3 | **0** |

`stores` é a única tabela com leitura pública funcionando para a chave anônima. Todas as outras retornam vazio silenciosamente — sem erro, então nenhum log de erro jamais teria denunciado isso.

**Por que isso passou despercebido até agora**: `brands`/`categories`/`products`/`offers` estavam genuinamente vazias antes da Sprint 3.8 — "0 linhas reais" e "0 linhas visíveis por RLS" são indistinguíveis quando a tabela está vazia de qualquer forma. A partir da Sprint 3.8 (seed real), as tabelas passaram a ter linhas reais, mas todas as auditorias que rodei desde então (`npm run db:validate`, os snapshots `node .../snapshot.js`, a auditoria de anti-join real) usam `database/seed/lib/client.js`, que **prefere `SUPABASE_SERVICE_ROLE_KEY` quando presente** (ela passou a existir nesta mesma sessão, Sprint 3.8) — ou seja, toda validação "0 problemas" feita desde então enxergava o banco através da chave de serviço, que ignora RLS, não através da chave que a aplicação real usa. Isso mascarou completamente o problema: eu reportei "dados reais navegáveis em produção" (Sprint 3.8) sem nunca ter confirmado isso com a chave que o site de fato usa.

**Impacto concreto**: `lib/supabase.ts` (cliente único de toda a aplicação Next.js, local e Vercel) usa exclusivamente `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Por dedução direta (mesma configuração de cliente, mesma chave pública): `/products`, `/product/[slug]`, `/search`, e a seção de ofertas de `/store/[slug]` muito provavelmente retornam catálogo vazio para qualquer usuário real agora — apesar dos dados existirem de fato no banco desde a Sprint 3.8. Não tenho acesso de navegador para confirmar isso ao vivo no site implantado, mas a inferência é direta a partir do código-fonte e dos testes acima, não uma suposição.

**Decisão**: registrar como achado crítico e propor a correção (`database/migrations/0007_proposed_public_read_policies.sql`) — policies de `SELECT` público para `anon`/`authenticated` em `brands`/`categories`/`products`/`offers`/`price_history`, mirando o padrão que já funciona em `stores`. **Não aplicado nesta sessão**: é uma mudança de RLS em produção (decisão de segurança, Restrição Absoluta do projeto) e, mesmo que autorizada, eu não tenho ferramenta para executar DDL/DCL (mesmo bloqueio do ADR-017). Não alterei nenhuma policy.

**Alternativas descartadas**: não há alternativa de código — isso não é algo que `services/*.service.ts` possa contornar (a única forma de uma `SELECT` ver uma linha bloqueada por RLS é a policy mudar; cache, retry ou outra chave pública não resolvem sem reintroduzir o mesmo risco de expor uma chave privada no client).

**Consequência**: este é o item de maior prioridade do projeto agora — maior que qualquer trabalho do Price Engine ou do Compare Engine, porque o catálogo inteiro pode estar invisível para usuários reais. Recomendo aplicar `0007` antes de qualquer outra coisa, incluindo antes de abrir a Sprint 4.0. Ver `docs/PROJECT_STATUS.md`/`docs/TECH_DEBT.md`/`docs/NEXT_STEPS.md` para a correção da reivindicação da Sprint 3.8.

---

## ADR-020 — Compare Engine v1: 3 queries por comparação, batch de price_history, ranking em memória

**Data**: 2026-06-25 (Sprint 4.0 — Compare Engine v1)
**Status**: Aceita e aplicada

**Contexto**: a Sprint 4.0 pediu o primeiro Compare Engine funcional, integrando o Price Engine da Sprint 3.9. O design de queries era o ponto mais sensível: uma abordagem ingênua chamaria `getOfferPriceMetrics(offerId)` para cada oferta, gerando 2N queries (N = número de ofertas para o produto). Com 9 ofertas no seed atual, isso são 18 queries; com escala, isso piora proporcionalmente.

**Decisão**: `services/compare.service.ts` implementa o compare engine com **exatamente 3 queries por comparação**, independente do número de ofertas:
1. `products` JOIN `brands` + `categories` (1 query — produto com relações).
2. `offers` JOIN `stores` (1 query — todas as ofertas do produto com dados da loja).
3. `price_history` para **todos os offer_ids** via `.in("offer_id", offerIds)` (1 query — batch completo de histórico de preços).

A computação de métricas por oferta (`lowestPriceUSD`, `highestPriceUSD`, `priceChangePercent`, `lastPriceChangeAt`) e o ranking (ADR-014) são feitos inteiramente em memória, sem query adicional. Isso replica a lógica de `getOfferPriceMetrics()` (testada e validada no ADR-018) para o contexto batch, sem copiar o estado de "offer não encontrado" porque aqui a lista de ofertas já é conhecida.

**Alternativas descartadas**:
- Chamar `getOfferPriceMetrics()` N vezes via `Promise.all` — descartada por ser O(N) em latência de round-trip mesmo com paralelismo, e por não ser escalável; escolhida como opção de fallback apenas se o batch não funcionar.
- Materializar a comparação em uma view ou RPC do Supabase — descartada por exigir DDL (bloqueado, ADR-017) e por ser overengineering para o volume atual (6 produtos, 9 ofertas).

**Consequência**: o Compare Engine escala horizontalmente sem degradação de latência para qualquer número de ofertas por produto — o gargalo passa a ser o número de produtos comparados em paralelo (não implementado nesta sprint), não o número de ofertas por produto.

**Limitação conhecida (ADR-019)**: as 3 queries usam `lib/supabase.ts` (chave anônima). `products`/`offers`/`price_history` não são visíveis pela chave anônima enquanto `0007_proposed_public_read_policies.sql` não for aplicada — o compare engine retorna `null` para usuários reais até lá. Isso não é uma limitação do design, é uma pré-condição de dados.

---

## ADR-021 — Módulo `_cache.ts` compartilhado por `layout.tsx` e `page.tsx` na mesma rota

**Data**: 2026-06-25 (Sprint 4.1 — Public Release Readiness)
**Status**: Aceita e aplicada

**Contexto**: em `app/product/[slug]/` e `app/store/[slug]/`, o `layout.tsx` (server) já buscava a entidade principal para `generateMetadata` e JSON-LD, mas o `page.tsx` era `"use client"` e chamava o mesmo serviço novamente via hook (`useProduct`/`useStore`), causando um double-fetch: dois round-trips ao Supabase por visita. A Sprint 4.1 converteu esses pages para server components, criando o risco de um novo double-fetch se layout e page instanciassem `React.cache()` separadamente (cada arquivo com `const cached = cache(fn)` cria um escopo de cache diferente).

**Decisão**: criar um módulo `_cache.ts` por rota dinâmica (`app/product/[slug]/_cache.ts`, `app/store/[slug]/_cache.ts`) que exporta as funções cacheadas com `React.cache()`. Tanto `layout.tsx` quanto `page.tsx` importam do mesmo módulo, garantindo que compartilham o mesmo escopo de cache dentro de uma requisição. Resultado: a entidade principal (produto/loja) é buscada uma única vez por render, mesmo sendo usada em dois arquivos.

**Alternativas descartadas**:
- Exportar as funções cacheadas do `layout.tsx` e importá-las no `page.tsx` — descartada porque Next.js não garante que exports de arquivos de route (`layout`, `page`, `error`, etc.) sejam importáveis como módulos regulares; cria dependência circular implícita.
- Usar `unstable_cache` do Next.js — descartado por ser uma API instável ainda, com semântica diferente (cache persistente entre requisições, não apenas dentro de uma).
- Aceitar o double-fetch — descartado porque é a dívida técnica que a sprint veio resolver.

**Consequência**: qualquer rota dinâmica que precise compartilhar fetches entre `layout.tsx` e `page.tsx` deve seguir este padrão. O prefixo `_` no nome do arquivo sinalize que é um módulo interno da rota, não um componente/page exportável pelo Next.js.

---

## ADR-022 — Supabase Storage: bucket único `catalog` público, estrutura de pastas por tipo de entidade

**Data**: 2026-06-25 (Sprint 4.3 — Data Integrity & Media Foundation)
**Status**: Aceita e aplicada

**Contexto**: o projeto precisa de infraestrutura de imagens para servir fotos de produtos, capas de loja e logos de marca. As opções eram: (a) hospedar em Supabase Storage, (b) CDN externo (Cloudflare Images, Cloudinary), (c) manter URLs externas no banco sem hospedar. A Sprint 4.3 delimitou o objetivo como "fundação — não subir milhares de imagens".

**Decisão**: criar um único bucket público `catalog` no Supabase Storage, com estrutura de pastas por tipo de entidade e slug:
```
catalog/
  products/{slug}/main.webp
  products/{slug}/gallery/{0..n}.webp
  stores/{slug}/cover.webp
  stores/{slug}/logo.webp
  brands/{slug}/logo.webp
```

Bucket criado programaticamente via `database/storage/init.js` (chave de serviço). URL pública:
`{SUPABASE_URL}/storage/v1/object/public/catalog/{path}`

Utilitário `utils/storage.ts` exporta `catalogStorage.*` (builders de URL tipados) e `resolveImageUrl` (fallback automático para Storage quando a coluna do banco está nula).

**Alternativas descartadas**:
- Múltiplos buckets (`products`, `stores`, `brands`) — descartado por não simplificar o modelo de permissões (um bucket público é suficiente) e aumentar superfície de configuração.
- CDN externo — descartado para não introduzir dependência de terceiro não necessária nesta fase; Supabase Storage está no mesmo projeto/conta.
- Aceitar `image_url: null` para sempre — descartado; a experiência sem imagens é inferior.

**Restrições**:
- `allowedMimeTypes`: `image/webp`, `image/jpeg`, `image/png`, `image/avif`
- `fileSizeLimit`: 5 MB por arquivo
- Escrita: somente via chave de serviço (Admin/Crawler) ou painel do Supabase — a chave anônima não escreve (política RLS de Storage, default do Supabase para buckets públicos)
- Leitura: pública sem autenticação (bucket `public: true`)

**Consequência**: `next/image` já tem `remotePatterns` para `*.supabase.co` (adicionado na Sprint 4.2). Imagens reais precisam ser carregadas no bucket seguindo a convenção de nomenclatura — não há validação de nome em runtime, a convenção é a única garantia.

---

## ADR-023 — Migration 0008: constraints UNIQUE em slugs + índices de performance

**Data**: 2026-06-25 (Sprint 4.3 — Data Integrity & Media Foundation)
**Status**: Proposta — aguardando aplicação no SQL Editor (mesma dinâmica de 0006/0007)

**Contexto**: `0002_revised_store_data_layer.sql` (Sprint 3.4.1) propôs `UNIQUE(slug)` em `stores`; `0004_proposed_catalog_integrity_and_indexes.sql` (Sprint 3.7) estendeu a mesma constraint para `products`/`brands`/`categories` e propôs índices nas FKs e em `offers.price_usd`. Ambas estão propostas há mais de 2 semanas sem aplicação, porque nenhuma ferramenta do projeto executava DDL diretamente.

**Pré-condições verificadas** antes de gerar a migration final (auditoria 2026-06-25):
- 0 slugs duplicados em `stores`, `products`, `brands`, `categories`
- 0 slugs nulos em qualquer tabela
- 0 ofertas órfãs (product_id / store_id)

**Decisão**: consolidar 0002 e 0004 em uma única migration `0008_data_integrity.sql`, idempotente (DO blocks com verificação em `pg_constraint` para UNIQUE, `CREATE INDEX IF NOT EXISTS` para índices). Constraints criadas:
- `stores_slug_unique`, `products_slug_unique`, `brands_slug_unique`, `categories_slug_unique`

Índices criados:
- `offers_product_id_idx`, `offers_store_id_idx`, `offers_price_usd_idx`
- `products_brand_id_idx`, `products_category_id_idx`
- `price_history_offer_id_recorded_at_idx`

**Por que não `NOT NULL`**: com 6 produtos / 9 ofertas / 5 entidades por tabela, não há volume suficiente para validar que 100% de linhas futuras sempre virão preenchidas. Reavaliar quando o seed engine ou Admin escreverem em escala.

**Alternativas descartadas**:
- `CREATE OR REPLACE POLICY` — não existe em PostgreSQL para UNIQUE constraint (aprendido no hotfix de ADR-019); `DO block + IF NOT EXISTS` é o padrão idiomático.
- Manter 0002 e 0004 separadas — descartado para reduzir o número de passos manuais no SQL Editor.

**Consequência**: após a aplicação, o banco recusa inserções de slug duplicado mesmo fora do seed engine; queries de catálogo/oferta usam índices em vez de full-table scan; o validador `npm run db:validate:43` inclui instruções SQL de verificação pós-execução.
