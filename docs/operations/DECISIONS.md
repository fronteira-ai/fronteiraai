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

**Contexto**: `docs/operations/PROJECT_STATUS.md` e `docs/architecture/ARCHITECTURE.md` originais foram escritos antes da implementação do domínio de Produto e descreviam um estado de planejamento ("Sprint 0", 15% de progresso, "Release 0.2: Planned") que não correspondia mais ao código.

**Decisão**: esses dois arquivos passam a ser gerados/atualizados a partir de leitura real do código a cada sprint de consolidação, não editados manualmente como plano. `docs/archive/ROADMAP.md` e `docs/CLAUDE.md` (a versão em `docs/`, distinta da raiz) permanecem como documentos de visão/processo de longo prazo e não são reescritos por essa auditoria — eles descrevem intenção, não estado.

**Consequência**: ao final de cada sprint de consolidação, repetir a leitura completa do código antes de tocar em `PROJECT_STATUS.md`/`ARCHITECTURE.md`/`FEATURES.md`/`TECH_DEBT.md`/`CHANGELOG.md`/`NEXT_STEPS.md`.

---

## ADR-006 — Contato e horário de funcionamento da loja ficam fora do schema até aprovação

**Data**: 2026-06-22 (Sprint 3.4)
**Status**: ⚠️ Premissa corrigida na Sprint 3.4.1 (ver ADR-008) — a conclusão de que as colunas "não existem no banco real" estava **errada**. A Sprint 3.4 só consultou o subconjunto de colunas que `types/store.ts` já declarava, sem fazer `select("*")` real contra o Supabase. A auditoria da Sprint 3.4.1 (com `select("*")` de verdade) encontrou `phone`, `whatsapp`, `email`, `website`, `address` e `opening_hours` já existentes. A migration `0001` gerada por este ADR está marcada como **superada** — ver `0002_revised_store_data_layer.sql`. Decisão original preservada abaixo para histórico.

**Contexto**: a missão da Sprint 3.4 pedia que a página de loja (`app/store/[slug]/`) exibisse contato e horário de funcionamento. Nenhum dos dois existe em `types/store.ts` nem na tabela real `stores` no Supabase (confirmado via query direta nesta sprint: colunas atuais são `id, name, slug, description, city, country, rating, logo_url, banner_url, verified, created_at`). `docs/database/DATABASE.md` também não documenta essas colunas.

**Decisão**: não adicionar campos ao tipo `Store` que não existem no banco real (evita repetir o incidente de `types/store.ts` vazio documentado no `CHANGELOG.md`, e respeita a regra do projeto de nunca alterar schema sem aprovação). A página de loja foi implementada usando exclusivamente os campos hoje existentes; as seções de Contato e Horário simplesmente não são renderizadas (sem mocks, sem valores fixos, sem props opcionais especulativas no tipo `Store`). Uma proposta de migration foi gerada em `database/migrations/0001_proposed_store_contact_hours.sql` (`phone`, `whatsapp`, `email`, `website_url`, `address`, `business_hours jsonb`, todas nullable) para avaliação — **não aplicada**.

**Alternativas descartadas**: (a) adicionar os campos como opcionais no tipo `Store` mesmo sem confirmação de que existem no banco — rejeitada por criar uma mentira de tipo (`Store` afirmaria ter campos que `select("*")` nunca preencheria) e por já ter causado problemas similares neste projeto; (b) usar dados fictícios/mocados para essas seções — rejeitada por instrução explícita do CTO ("não utilize mocks, não utilize valores fixos").

**Consequência**: quando a migration proposta for revisada e aplicada manualmente no Supabase, atualizar `types/store.ts`, `services/store.service.ts` (se necessário) e adicionar as seções de Contato/Horário em `StoreDetails.tsx` (ou um componente novo). Até então, a ausência dessas seções na UI é o comportamento correto, não uma lacuna esquecida — ver `docs/engineering/TECH_DEBT.md`.

---

## ADR-007 — Achado de dados: `stores.slug` nulo e `products` vazia no Supabase real

**Data**: 2026-06-22 (Sprint 3.4)
**Status**: Registrado (não é uma decisão de schema/código, é um achado de conteúdo)

**Contexto**: ao testar manualmente `app/store/[slug]/` com dados reais (Sprint 3.4), uma consulta direta ao Supabase mostrou que as 5 linhas reais de `stores` (Cellshop, Nissei, Shopping China, Mega Eletrônicos, Atacado Games) têm `slug: null`, e a tabela `products` está com 0 linhas. Isso significa que `/store/[slug]` (Sprint 3.4) e, em menor grau, `/product/[slug]` (Release 0.2) e a Busca (Sprint 3.3) não têm dados reais navegáveis hoje em produção, apesar do código estar correto e validado — `getStoreBySlug`/`getProductBySlug` retornam `null` corretamente porque nenhuma linha tem o `slug` buscado.

**Decisão**: não alterar dados de produção (inserir/popular `slug`) sem aprovação explícita — é uma ação sobre um sistema externo compartilhado, não uma decisão de código. Registrado aqui para que a causa de "página de loja/produto retorna 404 mesmo após o código estar pronto" não seja confundida com um bug de implementação em sprints futuras.

**Consequência**: antes de considerar o Domínio de Loja (ou Produto) "pronto para usuários reais", alguém com acesso ao painel do Supabase precisa popular `stores.slug` (slugificar `name`, ex. "Shopping China" → "shopping-china") e cadastrar ao menos alguns `products`/`offers` reais. Ver `docs/engineering/TECH_DEBT.md`.

---

## ADR-008 — Auditoria de dados (Sprint 3.4.1): `types/store.ts` e `types/offer.ts` divergem do schema real do Supabase

**Data**: 2026-06-22 (Sprint 3.4.1 — Consolidação da Camada de Dados)
**Status**: Registrado — **nenhuma alteração de código ou schema aplicada nesta sprint**, decisão de correção pendente de aprovação.

**Contexto**: a Sprint 3.4.1 auditou o banco real consultando o Supabase diretamente — via `select("*")` (para tabelas com dados, como `stores`) e via teste coluna-por-coluna lendo o erro "column does not exist" do PostgREST (para tabelas vazias, como `products`/`offers`/`brands`/`categories` — método somente-leitura, sem precisar de service-role key). O resultado contradiz partes do que ADR-006/ADR-007 e `docs/architecture/DOMAIN_MODEL.md` assumiam, porque aquelas sprints nunca fizeram um `select("*")` real — só verificaram os campos que os tipos TypeScript já declaravam.

**Achados**:

1. **`stores`** (24 colunas reais vs. 11 no tipo): `banner_url` (tipo) deveria ser `cover_image` (banco); `verified` (tipo) deveria ser `is_verified` (banco). Resultado em produção: o banner da loja nunca aparece e o badge "Verificada" nunca aparece, mesmo quando a loja tem capa/é verificada. Faltam no tipo: `whatsapp`, `website`, `address`, `instagram`, `opening_hours`, `latitude`, `longitude`, `delivery`, `pickup`, `pix_br`, `active`, `phone`, `email` — todos já existem no banco e **invalidam a proposta de migration `0001`** (ADR-006), que tentava criar colunas que já existiam.
2. **`offers`** (16 colunas reais vs. 12 no tipo) — **divergência mais grave**: `price` não existe (o banco usa `price_usd`/`price_brl`, dois valores independentes, não um valor + taxa de conversão); `stock` não existe (o banco usa `in_stock`/`available`/`stock_quantity`); `installments` não existe (nenhum campo de parcelamento encontrado); `url` não existe (o banco usa `product_url`). Resultado: assim que existir uma oferta real, `ProductOffers.tsx`/`StoreOffers.tsx` vão exibir preço como `NaN` (via `convertToUSD(undefined, ...)`), o badge de estoque vai sempre mostrar "Sem estoque", e o botão "Ver oferta" nunca vai aparecer — apesar do `npm run build`/`lint`/`typecheck` passarem limpos (o TypeScript não pega isso porque `data as Offer[]` é um cast manual, não validado em runtime — risco já registrado em `docs/engineering/TECH_DEBT.md` antes desta sprint, agora confirmado como real, não hipotético).
3. **`products`** (16 colunas reais vs. 9 no tipo) — sem nomes trocados, só campos faltantes no tipo (`sku`, `weight`, `model`, `updated_at`, `active`, `gtin`, `release_date`). Não bloqueante.
4. **`brands`/`categories`** — tipos corretos, sem divergência encontrada.
5. Os 4 relacionamentos usados pelos services (`offers→stores`, `offers→products`, `products→brands`, `products→categories`) foram confirmados como FKs reais (PostgREST resolveu os joins sem erro). A modelagem relacional está correta — o problema é só nos nomes/forma dos campos de preço e estoque.
6. Tabelas reais não documentadas: `profiles` (id, email, created_at — possível scaffold de Supabase Auth) e `favorites` (id, product_id, created_at — paralela e desconectada do `useFavorites.ts` via `localStorage`). Nenhuma das 14 tabelas listadas como "futuras" em `docs/database/DATABASE.md` existe de fato (confirmado, documentação correta nesse ponto).

**Decisão**: registrar o achado e **não corrigir o código nesta sprint** — a missão da Sprint 3.4.1 foi explicitamente de auditoria/diagnóstico ("não implemente novas funcionalidades de interface"), e corrigir `types/offer.ts`/`types/store.ts` + os componentes que os consomem é uma mudança de código real, não documentação. Fica como decisão explícita para o CTO aprovar antes da Sprint 3.5: corrigir agora (como parte da consolidação de dados) ou abrir uma sprint dedicada.

**Alternativas descartadas**: corrigir os tipos silenciosamente durante esta auditoria — rejeitada porque a missão pediu diagnóstico antes de ação, e uma mudança nos tipos/services tocaria componentes já em produção (`ProductOffers`, `StoreOffers`, `StoreCard`, `StoreDetails`) sem o usuário ter visto o tamanho real do problema primeiro.

**Consequência**: `database/migrations/0001_proposed_store_contact_hours.sql` marcado como superado; `0002_revised_store_data_layer.sql` propõe apenas constraints de integridade (`UNIQUE (slug)`), já que nenhuma coluna nova é necessária. `docs/architecture/DOMAIN_MODEL.md` reescrito com o schema real lado a lado com o tipo. Qualquer sprint futura que toque `offers`/`stores` deve assumir os nomes reais (`price_usd`/`price_brl`, `in_stock`/`available`, `product_url`, `cover_image`, `is_verified`), não os do tipo atual, até a correção ser aprovada e aplicada.

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

**Consequência**: bugs de `NaN`/"Sem estoque sempre"/botão "Ver oferta" ausente (ADR-008) ficam resolvidos assim que existir uma oferta real. `docs/architecture/DOMAIN_MODEL.md`, `API_CONTRACTS.md`, `TECH_DEBT.md` atualizados para remover o aviso de divergência tipo↔schema.

---

## ADR-010 — Unificação de `ProductCard`/`ProductHighlightCard` em um único componente

**Data**: 2026-06-23 (Sprint 3.5)
**Status**: Aceita e aplicada

**Contexto**: `docs/architecture/ARCHITECTURE.md`/`TECH_DEBT.md` já apontavam `ProductCard` e `ProductHighlightCard` como quase-duplicados (mesmo layout de card — imagem, nome, preço, link —, divergindo só em campos extras de desconto/estoque/loja e no tipo de entrada). A Sprint 3.5 precisava de um card de produto para o novo `ProductGrid` (catálogo); criar um terceiro componente teria piorado a duplicação em vez de resolvê-la, e a missão da sprint pede explicitamente para corrigir duplicações encontradas durante a auditoria.

**Decisão**: unificar em um único `components/product/ProductCard.tsx`, com props já achatadas (`slug`, `name`, `imageUrl`, `priceUSD?`, `originalPriceUSD?`, `subtitle?`, `inStock?`) em vez de receber o tipo de domínio inteiro (`Product`/`ProductHighlight`/`ProductCatalogItem`) — cada call site (`RelatedProducts`, `SearchResults`, `ProductGrid`, `home/Offers.tsx`) faz seu próprio mapeamento simples na hora de renderizar. O visual adotado é o do antigo `ProductHighlightCard` (mais completo: badge de desconto, badge "Esgotado", CTA com seta) para todos os usos, elevando a consistência visual em vez de manter dois padrões. `components/product/ProductHighlightCard.tsx` foi removido (aprovação explícita do CTO antes da remoção, por restrição do `CLAUDE.md`).

**Alternativas descartadas**: manter os dois componentes e só adicionar um terceiro para o catálogo — rejeitada por aumentar a duplicação já identificada como dívida técnica; fazer `ProductCard` aceitar genericamente `Product | ProductHighlight | ProductCatalogItem` via union type — rejeitada por acoplar o componente de apresentação a três tipos de domínio diferentes, quando props achatadas o tornam agnóstico e mais simples de testar/reutilizar.

**Consequência**: qualquer tela nova que precise de um card de produto reaproveita `ProductCard` com um mapeamento de poucas linhas, sem decidir entre dois componentes quase iguais. `docs/architecture/COMPONENT_INDEX.md` atualizado.

---

## ADR-011 — Ordenação por preço no catálogo (`/products`) é "best effort" até existir uma view de agregação

**Data**: 2026-06-23 (Sprint 3.5)
**Status**: Aceita — limitação documentada, com proposta de correção não aplicada

**Contexto**: o catálogo de produtos (`getProductsCatalog`, `services/product.service.ts`) precisa ordenar produtos por "menor preço"/"maior preço", mas preço pertence à oferta, não ao produto (`docs/architecture/DOMAIN_MODEL.md`) — um produto pode ter N ofertas, e "o preço do produto" para fins de ordenação é o mínimo entre elas. PostgREST/Supabase resolvem filtros sobre tabelas relacionadas via embedding (`offers!inner`), o que cobre corretamente os filtros de loja/disponibilidade/faixa de preço sem precisar de view nenhuma — mas **ordenar** as linhas de `products` por uma agregação (`MIN(offers.price_usd)`) por grupo não é algo que o PostgREST resolve nativamente numa única query paginada, sem uma view/RPC dedicada.

**Decisão**: para esta sprint, implementar a ordenação por preço como correção client-side da página já buscada: a query principal continua paginando por `created_at` (ou pelos filtros ativos) no banco, embute as ofertas relevantes por produto, calcula `lowestPriceUSD` em memória, e — somente quando o usuário pede `price_asc`/`price_desc` — reordena o array da página atual por esse valor antes de devolver ao componente. Isso garante que **a página exibida está sempre corretamente ordenada**, mas não garante ordem global perfeita entre páginas diferentes em catálogos com muitos produtos (ex.: o produto mais barato da página 3 pode, em teoria, ser mais barato que algum da página 2, se a paginação de base não foi feita por preço). Dado que a tabela `products` está vazia em produção hoje (ADR-007), esse limite é teórico, não observável, e documentado para ser resolvido antes de qualquer carga real de dados.

**Correção proposta, não aplicada**: `database/migrations/0003_proposed_product_catalog_price_view.sql` cria uma materialized view `product_price_summary` (preço mínimo/máximo, contagem de ofertas e flag de estoque por produto, com índice único e índice no preço) que permitiria `getProductsCatalog` ordenar nativamente por preço com paginação correta entre páginas, sem o reordenamento client-side. Não aplicada nesta sprint por ser uma alteração de schema (restrição do `CLAUDE.md`: nunca alterar schema sem aprovação).

**Alternativas descartadas**: "sobrebuscar" (overfetch) um lote maior de ofertas ordenadas por preço e deduplicar por produto — rejeitada por ser uma solução frágil ("temporária" no sentido que `CLAUDE.md` proíbe), que falha silenciosamente em catálogos com produtos de muitas ofertas duplicadas e não escala para "milhões de produtos" (objetivo explícito da missão); chamar um `rpc()` que ainda não existe no banco e mascarar o erro com fallback silencioso — rejeitada por esconder a limitação em vez de documentá-la.

**Consequência**: filtros (categoria/marca/loja/disponibilidade/faixa de preço) e paginação são 100% corretos e escaláveis hoje, sem depender de nenhuma migration. Apenas a ordenação por preço tem o limite descrito acima, documentado em código (`services/product.service.ts`) e aqui. Ver `docs/engineering/TECH_DEBT.md`.

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

**Contexto**: o ParaguAI compara **ofertas**, não produtos — preço vive em `offers.price_usd`/`price_brl`, independentes entre si (ADR-009). Histórico de preços (`price_history`, já prevista em `docs/database/DATABASE.md` como tabela futura), alertas de preço e a ordenação do catálogo (ADR-011) todos vão depender, no futuro, de uma única fonte de verdade para "o preço atual" de uma oferta e de como ele mudou ao longo do tempo. Hoje, nada escreve em `offers.price_usd`/`price_brl` em produção (sem Admin/Crawler implementados) — é o momento certo para definir a arquitetura antes que múltiplos pontos de escrita apareçam.

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

**Contexto**: a Sprint 3.7 já registrava como risco não verificado (`docs/engineering/TECH_DEBT.md`) que `NEXT_PUBLIC_SUPABASE_ANON_KEY` podia não ter permissão de escrita por RLS. A Sprint 3.8 confirmou isso ao vivo, com duas variantes distintas do mesmo problema:

1. **`INSERT` em `brands`/`categories`/`products`** com a chave anônima falhou de forma explícita: `new row violates row-level security policy for table "<tabela>"`. Comportamento esperado de uma policy de RLS bem configurada.
2. **`UPDATE` de `stores.slug`/`active`** com a chave anônima **não retornou erro nenhum**, mas também não alterou nenhuma linha — a policy de RLS filtrou as linhas pela cláusula `USING` antes do `UPDATE` ser aplicado, e o PostgREST/Supabase não reporta isso como erro quando a chamada não usa `.select()` para confirmar o que foi afetado. `database/seed/index.js` não verifica o resultado da escrita (só a ausência de `error`), então logou `[OK]` para as 5 lojas mesmo sem ter escrito nada — confirmado comparando snapshots antes/depois da tentativa (`stores.slug` continuava `null` em todas).

**Decisão**: resolver adicionando `SUPABASE_SERVICE_ROLE_KEY` a `.env.local` (CTO obteve a chave no painel do Supabase, Settings → API) — `database/seed/lib/client.js` já preferia essa chave quando presente (Sprint 3.7), sem precisar de nenhuma alteração de código. Não alterar policies de RLS das tabelas, que continuam protegendo escrita pública pela chave anônima (correto para a aplicação Next.js, que só lê). A chave de serviço é usada exclusivamente pelo tooling de `database/seed/`, nunca pela aplicação (`lib/supabase.ts` continua só com a chave anônima).

**Alternativas descartadas**: afrouxar as policies de RLS para aceitar `INSERT`/`UPDATE` pela chave anônima — rejeitada por expor a tabela a escrita pública não autenticada, regressão de segurança real para resolver um problema de tooling.

**Achado adicional, não corrigido nesta sprint**: o "falso positivo" de log em `database/seed/index.js` (passo 1, backfill de `stores`) é um bug de tooling — o `UPDATE` deveria confirmar linhas afetadas (ex. `.select("id")` no retorno e checar se veio vazio) antes de logar `[OK]`. Não corrigido porque não era necessário para concluir a carga de dados desta sprint (a causa raiz era a chave, não o script) e a missão pediu para não implementar funcionalidades novas. Registrado em `docs/engineering/TECH_DEBT.md` para uma sprint futura de manutenção do seed.

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

**Consequência**: a Sprint 3.9 entrega o Price Engine **code-complete e testado em todos os caminhos que não dependem da tabela existir** (graceful degradation confirmada ao vivo). Para se tornar operacional de fato (gravar histórico real), alguém com acesso ao painel do Supabase precisa colar o conteúdo de `0006_proposed_price_history.sql` no SQL Editor — uma ação humana de poucos minutos, não uma tarefa de código pendente. Ver `docs/engineering/TECH_DEBT.md`.

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

**Consequência**: este é o item de maior prioridade do projeto agora — maior que qualquer trabalho do Price Engine ou do Compare Engine, porque o catálogo inteiro pode estar invisível para usuários reais. Recomendo aplicar `0007` antes de qualquer outra coisa, incluindo antes de abrir a Sprint 4.0. Ver `docs/operations/PROJECT_STATUS.md`/`docs/engineering/TECH_DEBT.md`/`docs/operations/NEXT_STEPS.md` para a correção da reivindicação da Sprint 3.8.

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

---

## ADR-024 — Acquisition Engine: localização em `acquisition/`, desacoplado da app Next.js

**Data**: 2026-06-26 (Release 0.9 — Acquisition Engine)
**Status**: Aceita e aplicada

**Contexto**: o Release 0.9 exige uma infraestrutura de aquisição de dados (pipeline, conectores, validação, normalização, persistência). A decisão central é onde e como essa camada vive no repositório.

**Decisão**: a pasta `acquisition/` vive na raiz do projeto, paralela a `app/`, `services/`, `types/` etc., mas é **desacoplada da aplicação Next.js**: não é um route handler, não é importada por nenhuma página, não usa `"use client"` / `"use server"`. É um módulo Node.js standalone, executável via `tsx` ou integrável futuramente como worker separado. Internamente organizada em `types/`, `core/`, `parsers/`, `engines/`, `persistence/`, `observability/`, `lib/`, `connectors/`, `datasets/`, `scripts/`.

**Alternativas descartadas**:
- Dentro de `app/api/` como Route Handler — descartado: execução de pipeline longa não cabe no modelo stateless de serverless functions; além disso, escrita exige service role que não deve ficar em rotas públicas.
- Pasta `tools/` ou `scripts/` — descartado para não misturar com os scripts de seed existentes em `database/seed/`; o Acquisition Engine tem complexidade própria que justifica pasta dedicada.
- Monorepo separado — descartado por ser overengineering para o estágio atual do projeto.

**Consequência**: o `tsconfig.json` já inclui `**/*.ts`, então todos os tipos do `acquisition/` passam pelo `tsc --noEmit`. O `@/` alias funciona de `acquisition/` para os tipos compartilhados com a app.

---

## ADR-025 — `tsx` e `sharp` como devDependencies para o Acquisition Engine

**Data**: 2026-06-26 (Release 0.9)
**Status**: Aceita e aplicada

**Contexto**: os scripts do Acquisition Engine são TypeScript (`.ts`). Antes, todos os scripts de tooling eram `.js` (database/seed). O Media Pipeline requer conversão de imagens para WebP.

**Decisão**: adicionar `tsx ^4.19.0` como devDependency para executar scripts TypeScript sem build step (substitui o padrão `node file.js` por `tsx file.ts`). Adicionar `sharp ^0.33.0` como devDependency para conversão de imagens WebP/AVIF e resize no Media Pipeline.

**Por que devDependencies**: nenhuma das duas é importada pela aplicação Next.js em runtime. `sharp` é usado apenas nos scripts de importação (`acquisition/scripts/`), e a Media Pipeline faz dynamic import com graceful degradation (converte para WebP se `sharp` estiver disponível, envia original caso contrário).

**Alternativas descartadas**:
- Manter scripts como `.js` com JSDoc types — descartado: perderia type safety e os tipos do Acquisition Engine são complexos o suficiente para justificar TypeScript puro.
- `ts-node` — descartado em favor de `tsx`, que tem cold-start mais rápido, suporte nativo a ESM e não requer configuração adicional de `moduleResolution`.
- `jimp` ou `canvas` para processamento de imagem — descartados: `sharp` tem melhor performance (baseado em libvips), menor uso de memória, e já é usado internamente pelo Next.js para `next/image`.

**Consequência**: `npm run acquisition:*` requerem `tsx` instalado (garantido por `npm install`). O Media Pipeline degrada graciosamente se `sharp` não estiver disponível — nenhuma etapa do pipeline falha por ausência do módulo.

---

## ADR-026 — Modelo de aquisição: RawOffer como unidade central (offer-first)

**Data**: 2026-06-26 (Release 0.9)
**Status**: Aceita e aplicada

**Contexto**: o Acquisition Engine precisa de um modelo interno uniforme para representar dados de qualquer origem. A questão é qual entidade é a unidade central: o produto, a oferta, ou as duas separadas.

**Decisão**: a unidade central de aquisição é o `RawOffer` — uma oferta com o produto embutido. Isso reflete a realidade de qualquer fonte de dados real: uma loja exporta seus produtos com preço — não exporta produtos sem preço e preços sem produto em tabelas separadas. O produto (`RawProduct`) vive dentro do `RawOffer`, não no nível raiz. O pipeline separa internamente produto e oferta na etapa de normalização.

**Consequência**: qualquer conector produz `RawOffer[]`. O `CatalogWriter` faz o mapeamento para as tabelas normalizadas (`brands → categories → products → offers`). A filosofia do banco ("preço pertence à oferta, não ao produto") é preservada — o `RawOffer.priceUSD` nunca vai para `products`.

---

## ADR-027 — Observabilidade: in-memory + console no Release 0.9; sem tabela `import_jobs` ainda

**Data**: 2026-06-26 (Release 0.9)
**Status**: Aceita e aplicada

**Contexto**: o Release 0.9 especifica observabilidade (tempo de processamento, falhas, métricas por etapa). A questão é se as métricas devem ser persistidas em banco (tabela `import_jobs`) ou ficam em memória.

**Decisão**: no Release 0.9, as métricas ficam em memória durante a execução do pipeline e são impressas no console ao final (`printReport()`). Não há migration para tabela `import_jobs` neste Release. A estrutura `PipelineMetrics` é tipada e completa — persistência em banco é adicionada ao `CatalogWriter` em Release futura sem alterar a interface.

**Alternativas descartadas**:
- Criar tabela `import_jobs` agora — descartado para não adicionar migration sem validação de uso real. O formato de `PipelineMetrics` pode ainda evoluir antes de ser persistido.

**Consequência**: o `PipelineResult` retornado por `pipeline.run()` contém o objeto `metrics` completo — qualquer código que chame o pipeline pode persistir as métricas onde quiser sem aguardar o Release 1.0.

## ADR-028 — Admin Platform: `@supabase/ssr` para autenticação cookie-based no Next.js 16

**Data**: 2026-06-26 (Release 1.0)
**Status**: Aceita

**Contexto**: O painel admin precisa de sessão persistente compatível com App Router. O cliente legado `@supabase/auth-helpers-nextjs` não suporta Next.js 15+.

**Decisão**: usar `@supabase/ssr ^0.12.0` com `createServerClient` (cookies assíncronos via `await cookies()`) no servidor e `createBrowserClient` no cliente. Dois clientes por rota — o servidor usa anon key (valida sessão), o service role bypassa RLS para writes admin.

**Alternativas descartadas**:
- `@supabase/auth-helpers-nextjs` — descontinuado para Next.js 15+.
- JWT manual via middleware — mais complexo, sem benefício.

**Consequência**: `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/supabase/service.ts` são as três entradas únicas para Supabase em contextos diferentes. `lib/admin-auth.ts` compõe server + service para autenticar e autorizar em API routes.

## ADR-029 — import_logs: schema simplificado (`total_raw`, `total_persisted`, `total_errors`, `metrics` JSONB)

**Data**: 2026-06-26 (Release 1.0)
**Status**: Aceita

**Contexto**: Migration 0009 inicialmente modelou `import_logs` com colunas granulares `received/validated/persisted/skipped/failed`. As API routes e o tipo `ImportLog` precisam de uma estrutura compatível com `PipelineResult`.

**Decisão**: simplificar `import_logs` para: `total_raw` (int), `total_persisted` (int), `total_errors` (int), `success` (bool), `metrics` (JSONB — guarda o `PipelineMetrics` completo), `errors` (JSONB nullable). Granularidade extra fica dentro do JSONB `metrics.totals`.

**Alternativas descartadas**:
- Manter colunas granulares — redundante com `metrics.totals`, exige mapeamento extra.

**Consequência**: se futuras queries precisarem filtrar por `totals.validated`, usam `metrics->>'totals'->>'validated'` via JSONB operator. Aceito para logs de importação onde queries analíticas não são prioritárias no Release 1.0.

## ADR-030 — Admin CRUD: service role client para todos os writes, anon client apenas para validar sessão

**Data**: 2026-06-26 (Release 1.0)
**Status**: Aceita

**Contexto**: As API routes do admin precisam escrever em tabelas com RLS ativo (products, offers, stores, etc.) sem criar políticas RLS específicas para admins.

**Decisão**: `requireAdmin()` retorna um `serviceClient` (service role) após validar que o usuário autenticado tem `role IN ('admin','operator')` na tabela `profiles`. Toda escrita admin usa `serviceClient`; leitura de sessão usa o client com anon key.

**Alternativas descartadas**:
- Políticas RLS para role admin — exige `auth.uid()` + join com `profiles` em cada política; mais frágil.
- Passar JWT do usuário para writes — o service role é mais simples e seguro para operações de backoffice.

**Consequência**: o service role key (`SUPABASE_SERVICE_ROLE_KEY`) deve existir apenas em `.env.local` (servidor) e nunca ser exposto ao cliente.

---

## ADR-031 — Role `merchant` adicionado ao `profiles` compartilhado

**Data**: 2026-06-26 (Release 1.2)
**Status**: Aceita

**Contexto**: A Release 1.2 introduz um novo tipo de usuário — lojistas (merchants) — que precisam de autenticação própria. A questão é se usam o mesmo sistema de auth do admin/operator ou um sistema separado.

**Decisão**: Reutilizar o mesmo `auth.users` e `profiles` do Supabase, adicionando `'merchant'` ao CHECK constraint de `profiles.role`. O `requireMerchant()` em `lib/merchant-auth.ts` espelha o padrão do `requireAdmin()`, verificando `role = 'merchant'` antes de retornar o registro da tabela `merchants`.

**Alternativas descartadas**:
- Auth separado para merchants — duplicaria infraestrutura de sessão, cookies e middleware sem benefício claro.
- Row na tabela `merchants` sem verificação de role — permitiria que admins e operadores acessassem o portal de lojistas sem bloqueio explícito.

**Consequência**: A migration 0012 faz `DROP CONSTRAINT IF EXISTS profiles_role_check` e recria com `('admin','operator','merchant')`. Ao cadastrar, o flow de registro atualiza o `profiles.role` de `'operator'` (padrão do trigger) para `'merchant'` via service key.

---

## ADR-032 — Tabela junction `merchant_stores` (M:N)

**Data**: 2026-06-26 (Release 1.2)
**Status**: Aceita

**Contexto**: Um lojista pode ter múltiplas lojas. Uma loja pode ser administrada por múltiplos usuários no futuro (multi-user account). Adicionar `merchant_id` direto em `stores` seria uma FK simples, mas quebraria a escalabilidade.

**Decisão**: Tabela `merchant_stores (merchant_id, store_id, is_primary)` com UNIQUE `(merchant_id, store_id)`. Isso prepara para o cenário de múltiplas lojas por merchant e múltiplos merchants por loja (marketplace futuro), sem migração de schema.

**Alternativas descartadas**:
- `merchant_id` direto em `stores` — quebraria dados existentes (lojas sem merchant) e impede multi-merchant por loja.

---

## ADR-033 — Portal `/merchant/*` com design system compartilhado

**Data**: 2026-06-26 (Release 1.2)
**Status**: Aceita

**Contexto**: O portal de lojistas precisa de um visual profissional SaaS. O design system do admin (`components/admin/ui/`) já é sólido.

**Decisão**: Reutilizar `ToastContext`, `ToastContainer`, e UI components do admin diretamente no portal merchant. Criar novos componentes merchant apenas onde a semântica é diferente (Sidebar, ScoreCard, RecommendationsPanel). Acento de cor verde-esmeralda (`emerald`) para diferenciar merchant do admin (índigo) visualmente.

**Alternativas descartadas**:
- Duplicar UI components — viola explicitamente o princípio "não criar código duplicado".

---

## ADR-034 — Merchant Score computado on-demand

**Data**: 2026-06-26 (Release 1.2)
**Status**: Aceita

**Contexto**: O Merchant Score (0-100) é calculado com base em dados que mudam a cada importação. Como manter o score atualizado?

**Decisão**: Computar o score em `GET /api/merchant/dashboard/stats` a cada carregamento do dashboard, persistir o resultado em `merchants.merchant_score`, e exibir o breakdown no `ScoreCard`. Sem materialized view ou background job nesta release.

**Alternativas descartadas**:
- Materialized view — overhead de manutenção sem benefício de escala até milhares de merchants.
- Background job/cron — complexidade desnecessária nesta fase.

---

## ADR-035 — Plans Engine como tabela seed (sem gateway de pagamento)

**Data**: 2026-06-26 (Release 1.2)
**Status**: Aceita

**Contexto**: A plataforma precisa de planos (Free/Pro/Business/Enterprise) com features diferentes. Mas a cobrança não é implementada nesta release.

**Decisão**: Tabela `merchant_plans` com seed de 4 planos e features mapeadas como colunas boolean/integer. O `plan` em `merchants` é uma FK para esta tabela. A UI exibe o plano atual e as features, mas não há gateway de pagamento. Upgrade via "entre em contato" por ora.

**Alternativas descartadas**:
- Enum hardcoded no código — impede alteração de planos sem deploy.
- Integração com Stripe nesta release — prematura; validar modelo de planos com usuários reais primeiro.

---

## ADR-036 — Páginas públicas `/lojas` usam service role para enriquecer dados de merchant

**Data**: 2026-06-27 (Release 1.4)
**Status**: Aceita

**Contexto**: A tabela `merchants` tem RLS que permite leitura apenas ao próprio usuário (`auth.uid() = user_id`). As páginas públicas `/lojas` e `/lojas/[slug]` precisam exibir `merchant_score` e `verified_level` para compradores anônimos.

**Decisão**: Criar `services/stores-public.service.ts` com as funções `getStorePublic(slug)` e `getStoresRanking(limit)` — ambas usam `getSupabaseServiceClient()` (service role) via import server-only. As funções só são chamadas a partir de Server Components (`app/lojas/page.tsx`, `app/lojas/[slug]/page.tsx`), nunca de client components ou do browser. Os dados públicos expostos são limitados a: `merchant_score`, `verified_level` — sem dados privados (user_id, e-mail, telefone interno, etc.).

**Alternativas descartadas**:
- Criar policy pública de leitura em `merchants` — exporia dados de contato e user_id ao anon.
- Denormalizar score/verified em `stores` — duplicação de dados; inconsistência quando score muda.

**Consequência**: `stores-public.service.ts` nunca deve ser importado por client components. Qualquer dado de merchant em páginas públicas deve passar por este serviço.

---

## ADR-037 — Merchant Progress Engine: completude computada on-demand, sem coluna nova

**Data**: 2026-06-27 (Release 1.4)
**Status**: Aceita

**Contexto**: O Module 1 do Release 1.4 exige um tracker de completude de perfil (%) para o dashboard do lojista.

**Decisão**: `computeProfileCompletion(merchant, stats)` é uma função pura em `services/merchant.service.ts` que retorna `MerchantProfileCompletion` sem tocar o banco. Os 7 critérios checados são: `company_name`, `contact_phone`, `contact_whatsapp`, `company_website`, `totalStores > 0`, `lastImportAt !== null`, `verified_level !== "none"`. O resultado é incluído no payload de `/api/merchant/dashboard/stats` e renderizado por `MerchantProgressCard`.

**Alternativas descartadas**:
- Coluna `profile_completion_pct` na tabela `merchants` — overhead de UPDATE a cada mudança; o cálculo é instantâneo e barato, não merece persistência.
- Endpoint separado — adiciona latência e round-trip; o dado é suficientemente barato para ir junto com os stats.

---

## ADR-038 — Reputation Center: arquitetura sem reviews públicos (Release 1.4)

**Data**: 2026-06-27 (Release 1.4)
**Status**: Aceita

**Contexto**: Reviews de compradores não existem ainda (tabela `reviews` não criada). O Release 1.4 pede "arquitetura de reputação" sem reviews públicos.

**Decisão**: A reputação pública da loja é derivada de dados já existentes: `Merchant Score` (calculado por `computeMerchantScore`), `verified_level` (badge), `store.rating` (campo já na tabela `stores`), e `offerCount`/`productCount` (contados via query). Não há nova tabela. O `MerchantBadge` exibido em `/lojas/[slug]` e `/lojas` consolida esses sinais visualmente.

A tabela `reviews` será criada no Release 1.5 junto com o sistema de moderação. O campo `store.rating` permanece como fonte de dados até lá.

**Consequência**: qualquer feature que exiba "avaliação de compradores" deve verificar se a tabela `reviews` existe antes de fazer query.

---

## ADR-039 — Analytics Events: tabela `merchant_analytics_events` como write-only nesta fase

**Data**: 2026-06-27 (Release 1.4)
**Status**: Aceita

**Contexto**: O Module 8 do Release 1.4 pede estrutura de analytics (clicks, views, conversions). A tabela `merchant_analytics_events` já existe (migration 0012).

**Decisão**: O Release 1.4 não implementa tracking de eventos de compradores — apenas documenta a arquitetura. Qualquer evento (view_store, view_offer, click_whatsapp, etc.) deve ser registrado via `logAuditEvent()` adaptado, ou via um futuro endpoint `/api/merchant/analytics/track` usando a tabela existente. A página `/merchant/analytics` continua como stub. A razão: sem volume de dados real, não há como validar dashboards de analytics — construí-los agora seria over-engineering.

**Alternativas descartadas**:
- Usar posthog/mixpanel — custo e dependência externa antes de validar o modelo; a tabela própria é suficiente para 10k merchants no curto prazo.

---

## ADR-040 — Database Migration System V2: Supabase CLI supera o bloqueio de DDL do ADR-017

**Data**: 2026-07-01 (mandato do CTO, pós Release 1.7 — Epic 1/Wave 2/Wave 3)
**Status**: Aceita — supera parcialmente ADR-017/018

**Contexto**: ADR-017 registrou, em 2026-06-24, um bloqueio real de ferramenta: `@supabase/supabase-js` fala PostgREST, que não executa DDL arbitrário; não havia `pg`, `DATABASE_URL` nem Supabase CLI configurada neste projeto. Isso tornou "copiar a migration para o SQL Editor e o CTO aplicar manualmente" o único caminho possível — uma decisão correta para o contexto de 2026-06-24, mas que se tornou um passivo estrutural conforme o número de migrations cresceu (24 até esta data): `information_schema.tables.row_security` (coluna inexistente) embutido em 4 migrations de verificação (`0018`-`0021`), `CREATE POLICY` sem guard de idempotência causando uma falha real de reexecução (`0017_hotfix_trust_experience.sql`), nenhuma automação, nenhum rollback documentado, nenhuma validação automática.

**Decisão**: adota-se a Supabase CLI (`supabase db push`/`migration new`/`db diff`/`migration list`) como caminho oficial de aplicação de schema, documentado por completo em `docs/engineering/DATABASE_ENGINEERING.md` ("Database Migration System V2"). Migrations a partir de `0022` vivem em `supabase/migrations/`, nomeadas por timestamp, nunca mais coladas manualmente no SQL Editor. `npm run db:lint` (`scripts/db-migration-lint.ts`) valida programaticamente que nenhuma migration contém `SELECT` avulso — a regra que corrige a causa raiz do bug de `row_security`, movendo toda consulta de verificação para `database/verification/`/`database/health_checks/`, fora do caminho de aplicação.

**O que NÃO é revertido do ADR-017/018**: `database/migrations/0001`-`0021` permanecem exatamente como foram aplicados (congelados) — não são retroativamente migrados para `supabase/migrations/`, e nenhum "baseline"/"repair" é necessário: como `supabase/migrations/` só contém as migrations nunca antes aplicadas (`0022` em diante), o primeiro `supabase db push` aplica exatamente essas, sem tocar no schema já existente em produção.

**Consequência**: o SQL Editor do Supabase deixa de ser o fluxo padrão de aplicação de schema — passa a ser legítimo apenas para debug, consultas ad-hoc, inspeção e investigação (ETAPA 13 do mandato do CTO). A aplicação real contra o projeto de produção depende de um passo humano único: o CTO rodar `supabase login` + `supabase link --project-ref acairzpzsklctaqjsukw` + `npm run db:push` (runbook completo em `docs/engineering/DATABASE_ENGINEERING.md` §9) — esta sessão não tem, e não deveria ter, o access token/senha de banco necessários para fazer isso por conta própria. **Atualização (2026-07-02, Wave 6)**: o CTO executou esse passo — todas as 5 migrations de `supabase/migrations/` (`0022`-`0026`, crescidas ao longo das Waves 3-5) estão confirmadas aplicadas ao projeto live.

**Alternativas descartadas**:
- Reescrever `0001`-`0021` para o novo padrão — descartada: são migrations já aplicadas em produção; editar seu conteúdo não afeta o banco real, mas normalizar 21 arquivos sem poder confirmar contra o schema real ao vivo introduz risco de documentação divergente sem benefício correspondente.
- Automatizar o link/push desta própria sessão usando um token fornecido pelo usuário no chat — descartada por segurança operacional: credenciais de acesso a produção não devem transitar por uma conversa de chat, mesmo que fornecidas voluntariamente.
- Implementar dashboard de analytics agora — prematura sem eventos reais.

---

## ADR-042 — Wave 6 (Platform Hardening): Progressive Verification auto-approval desligado; rate limiting adiado

**Data**: 2026-07-02 (Release 1.7 — Wave 6, mandato do CTO: "Platform Hardening, Certification & Release Lock")
**Status**: Aceita

**Contexto**: a auditoria de segurança da Wave 6 encontrou uma falha crítica real, não hipotética, em `ProgressiveVerificationEngine` (Wave 5): todo sinal que o motor compara — telefone, WhatsApp, website, Instagram, domínio de e-mail — já é exibido publicamente em `/lojas/[slug]`. Telefone (peso 25) + WhatsApp (peso 20) somam 45, que ao mesmo tempo satisfaz o piso de peso aplicável (`MIN_APPLICABLE_WEIGHT = 45`) e, se ambos baterem, atinge sozinho o limiar de auto-aprovação (`AUTO_APPROVE_THRESHOLD = 80`, já que 45/45 = 100%). Qualquer conta de merchant autenticada podia copiar esses dois dados da própria página pública da loja e auto-aprovar uma claim fraudulenta, sem nenhum conhecimento privado real — o oposto exato da garantia que a Wave 5 testou explicitamente ("falso positivo é inaceitável").

Na mesma auditoria, um segundo achado relacionado (severidade média): `DelegationService.accept(token, userId)` aceitava qualquer usuário autenticado que apresentasse um token de convite válido, sem checar se o e-mail da sessão autenticada correspondia ao e-mail para quem o convite foi emitido — um token vazado (encaminhado por e-mail, print compartilhado, regra de encaminhamento comprometida) bastava para assumir uma vaga de delegado.

**Decisão (parte 1 — auto-aprovação)**: `ClaimService.create` desliga completamente o caminho de auto-aprovação (`AUTO_APPROVAL_ENABLED = false`, hardcoded, não uma flag de ambiente — não há cenário em que ligá-la de volta sem uma correção estrutural seja seguro). Toda claim passa a rotear para `AwaitingReview`, sem exceção. O `ProgressiveVerificationEngine` continua rodando e sua confidence/breakdown de sinais continua sendo persistida como evidência — o algoritmo não foi removido, só a ação de pular revisão humana com base nele. Restaurar um caminho rápido de aprovação exige uma verificação de canal privado real (ex.: OTP para o telefone/e-mail já cadastrado na loja, nunca comparado contra o que o requerente envia) — está fora do escopo de uma wave de hardening (sem features novas) e fica para o Release 1.8.

**Decisão (parte 2 — delegate accept)**: `DelegationService.accept` passa a exigir um terceiro parâmetro, o e-mail da sessão autenticada (resolvido só no servidor via `requireAuth()`, nunca enviado pelo cliente), e rejeita a aceitação se não bater (case-insensitive) com `delegate.invitedEmail`. Corrigido inline nesta Wave — diferente da auto-aprovação, essa correção não exigia nenhuma feature nova nem mudança de regra de negócio, só uma checagem ausente.

**Decisão (parte 3 — rate limiting, adiado)**: a auditoria confirmou que nenhum endpoint de mutação deste projeto tem rate limiting (`/api/merchant/claims`, `/api/merchant/delegates`, `/api/merchant/upgrade-interest` incluídos) — todos dependem só de autenticação de sessão. Severidade classificada como baixa (exige uma conta autenticada válida, não é anônimo) e a introdução de infraestrutura de rate limiting (Redis/Upstash ou equivalente) é, por definição, uma capacidade nova — incompatível com o mandato "nenhuma funcionalidade grande" desta Wave. Registrado como dívida técnica nomeada (`TECH_DEBT.md`), não uma lacuna silenciosa; candidato ao Release 1.8 se o volume de merchants justificar.

**Consequência**: nenhuma claim é mais aprovada automaticamente até que uma verificação de canal privado real exista — todo requerente aguarda revisão humana no `/admin/claims`, o que aumenta a carga operacional do time de suporte proporcionalmente ao volume de claims. Aceito deliberadamente: um falso positivo de propriedade (impostor aprovado) é uma classe de dano inaceitável (perda de confiança de um lojista real, possível fraude financeira via WhatsApp Business/Pix do lojista comprometido); um falso negativo (dono legítimo esperando revisão manual) é só fricção operacional, corrigível.

**Alternativas descartadas**:
- Reduzir `AUTO_APPROVE_THRESHOLD` ou remover peso de telefone/WhatsApp da fórmula — descartada: qualquer ajuste de peso continua vulnerável enquanto os sinais comparados forem os mesmos dados já públicos; o problema é estrutural (a fonte da verdade que o requerente precisa "acertar" é pública), não um ajuste de calibração.
- Implementar verificação por OTP nesta própria Wave — descartada por escopo: Wave 6 é hardening, não features; construir um novo mecanismo de verificação sem esse sign-off separado do CTO contrariaria o próprio mandato da Wave.
- Deixar a auto-aprovação ligada e só monitorar por fraude após o fato — descartada: dado o dano potencial (perda de controle de uma loja real), esperar por um incidente para agir não é aceitável quando a correção estrutural (desligar) é imediata e reversível.

---

## ADR-043 — Exchange Engine: ExchangeRate-API.com (plano Business) como fornecedor de câmbio

**Data**: 2026-07-02 (Release 1.8 — Wave 1, pré-requisito nomeado em `RELEASE_1_8_BLUEPRINT.md` Capítulo 3/12)
**Status**: Aceita

**Contexto**: o Exchange Engine (`RELEASE_1_8_BLUEPRINT.md` Capítulo 3) exige um fornecedor externo de cotação USD/BRL/PYG, com atualização "praticamente em tempo real" — decisão já aprovada pelo CTO antes deste Blueprint, não reaberta aqui. O Blueprint propôs uma cadência de 5–15 minutos como alvo prático. PYG (Guarani paraguaio) não é uma moeda coberta por todo fornecedor de câmbio — é o primeiro critério de exclusão, antes de qualquer comparação de preço ou frequência.

Pesquisa feita nesta data (não apenas conhecimento de treinamento, dado que preços e planos de SaaS mudam) confirmou cobertura de PYG e levantou os planos pagos reais de dois fornecedores estabelecidos:

| Fornecedor | Plano | Preço/mês | Cota | Frequência de atualização |
|---|---|---|---|---|
| ExchangeRate-API.com | Free | $0 | 1.500 req/mês | 1x/dia |
| ExchangeRate-API.com | Pro | $10 | 30.000 req/mês | a cada 60 min |
| **ExchangeRate-API.com** | **Business** | **$30** | **125.000 req/mês** | **a cada 5 min** |
| Open Exchange Rates | Free | $0 | 1.000 req/mês | 1x/hora (só base USD) |
| Open Exchange Rates | Developer | $12 | 10.000 req/mês | 1x/hora |
| Open Exchange Rates | Enterprise | $47 | 100.000 req/mês | a cada 30 min |
| Open Exchange Rates | Unlimited | $97 | ilimitado | a cada 5 min |

Ambos os fornecedores confirmam cobertura de PYG na documentação pública consultada. CurrencyLayer foi descartado sem levantamento de preço detalhado — seu posicionamento de mercado é "cálculo grau-contábil/compliance" (precisão para reconciliação financeira), um requisito que o ParaguAI não tem: o Exchange Engine exibe uma cotação de referência informativa para comparação de preço, nunca processa uma transação financeira real — pagar por precisão contábil seria over-engineering direto (`NORTH_STAR.md` §7, "tecnologias/capacidades sem problema identificado").

**Decisão**: adota-se **ExchangeRate-API.com, plano Business ($30/mês, 125.000 requisições/mês, atualização a cada 5 minutos)** como fornecedor do Exchange Engine.

**Por que Business, e não Pro**: a cadência de 5 minutos está dentro do intervalo aprovado pelo CTO (5–15 min); o plano Pro (60 min) ficaria fora desse intervalo. A diferença de custo entre os dois ($20/mês) é pequena frente ao valor estratégico do Live Pricing/Freshness Engine (`RELEASE_1_8_BLUEPRINT.md` Capítulos 2/4) — atualizar câmbio a cada hora enquanto ofertas "hot" atualizam a cada 2–5 minutos criaria uma inconsistência visível (preço convertido desatualizado ao lado de um preço original recém-verificado).

**Por que ExchangeRate-API.com, e não Open Exchange Rates**: a mesma cadência de 5 minutos custa $30/mês em um fornecedor contra $97/mês no outro — mais de 3x de diferença para a mesma característica técnica relevante (frequência de atualização + cobertura de PYG confirmada em ambos). Open Exchange Rates tem reputação de mercado mais estabelecida e um plano "VIP" com atualização por segundo — nenhum dos dois diferenciais justifica o custo adicional para o caso de uso deste Release (não somos um serviço financeiro que precisa de cotação ao segundo).

**Volume real esperado**: uma única chamada por ciclo de atualização, com moeda-base USD, retorna todas as taxas necessárias (`USD/PYG`, `USD/BRL`) em uma resposta — `BRL/PYG` é derivado por triangulação matemática (`taxa_BRL_PYG = taxa_USD_PYG / taxa_USD_BRL`), sem uma terceira chamada. A cada 5 minutos, 24/7, isso é ~8.640 requisições/mês — **7% da cota do plano Business ($30)**, com folga generosa para retentativas, backfill manual e picos operacionais.

**Resiliência obrigatória (não opcional)**: consistente com `AI_CONSTITUTION.md` V ("Degradação graciosa, sempre"), o `ExchangeService` (`RELEASE_1_8_BLUEPRINT.md` Capítulo 3) deve usar a última cotação válida registrada em `exchange_rates` quando uma chamada ao fornecedor falhar — nunca bloquear a exibição de preço convertido por uma falha temporária do fornecedor externo, e nunca mostrar erro ao comprador por causa disso. Uma cotação desatualizada por poucos minutos em uma falha pontual é aceitável; um preço convertido ausente não é.

**Consequência**: `exchange_rates.source` registra literalmente `"exchangerate-api.com"` — trocar de fornecedor no futuro (se justificado por SLA, cobertura ou preço) é uma mudança de configuração/adapter, não uma mudança de schema, desde que o novo fornecedor também cubra PYG/USD/BRL. Nenhum contrato anual foi assumido nesta decisão — recomenda-se cobrança mensal até que o Exchange Engine tenha operado em produção por pelo menos um ciclo completo, permitindo validar confiabilidade real antes de qualquer compromisso de longo prazo.

**Alternativas descartadas**:
- Open Exchange Rates (qualquer plano) — descartada por custo: mesma cadência de atualização exigida custaria mais de 3x o preço do fornecedor escolhido, sem diferencial técnico relevante para este caso de uso.
- CurrencyLayer — descartada por posicionamento: otimizada para precisão grau-contábil que o ParaguAI não precisa (não processamos transação financeira, só exibimos uma cotação de referência).
- Fonte oficial do Banco Central do Paraguay (BCP) direta — descartada nesta Wave: bancos centrais tipicamente publicam cotação oficial uma vez ao dia, incompatível com a cadência de 5–15 minutos já aprovada pelo CTO; também não há API pública documentada e estável identificada nesta pesquisa (só publicação em página web, exigiria scraping frágil para uma peça de infraestrutura crítica de precificação — risco desproporcional ao benefício). Pode ser reavaliada no futuro como fonte de auditoria/reconciliação diária, não como fonte primária de atualização contínua.
- Construir uma fonte própria de câmbio (scraping de múltiplas casas de câmbio de Ciudad del Este) — descartada por escopo: geraria um novo domínio de dados inteiro (crawler, normalização, detecção de anomalia) para resolver um problema que um fornecedor de mercado já resolve de forma confiável e barata — direto Anti-Pattern de `NORTH_STAR.md` §7 ("tecnologias da moda"/complexidade desnecessária), embora possa ser uma fonte de validação cruzada interessante em uma Wave futura, não como substituto do fornecedor principal.

---

## ADR-045 — Buyer Personal-Data Model: LGPD como referência primária, `buyers` como tabela própria, deleção por anonimização

**Data**: 2026-07-02 (Release 1.8 — Wave 6, pré-requisito nomeado em `RELEASE_1_8_BLUEPRINT.md` Capítulo 6/12)
**Status**: Aceita — schema e princípios; texto legal de política de privacidade e designação de Encarregado permanecem ação do CTO, fora do escopo desta ADR (ver Consequência)

**Contexto legal (pesquisado nesta data, não assumido de memória — leis de proteção de dados mudam)**: o ParaguAI é uma empresa paraguaia, mas `BUSINESS_MODEL.md` §3 é explícito — "compradores de todo o Brasil cruzam fronteiras" é o público central. A LGPD (Lei Geral de Proteção de Dados, Brasil) tem alcance extraterritorial confirmado: aplica-se a qualquer tratamento de dados de pessoa física localizada no Brasil, **independentemente de onde a empresa está sediada ou onde o dado está hospedado**, sem limiar mínimo de escala ou faturamento — um único comprador brasileiro já é suficiente para a lei se aplicar. Isso não é uma possibilidade a considerar — é a condição inicial do Buyer Account System deste Release. Verificado separadamente: a Lei paraguaia 6534/2020 (frequentemente citada como "lei de proteção de dados" do Paraguai) é, na prática, específica para **dados creditícios** (bureaus de crédito, sob autoridade do BCP/SEDECO) — não é uma lei geral de proteção de dados equivalente à LGPD/GDPR, e não se aplica diretamente a uma conta de comprador de marketplace (o ParaguAI não é um birô de crédito). Conclusão: a LGPD é a referência de conformidade vinculante real deste capítulo; o desenho abaixo segue seus princípios com rigor suficiente para também servir de boa prática caso o Paraguai publique uma lei geral no futuro, ou caso o ecossistema se expanda para outros mercados (`VISION_2035.md` Capítulo 11).

**Achado de schema (verificado, não assumido) que esta decisão precisa resolver**: `profiles` (`database/migrations/0009_admin_platform.sql`) já existe, mas seu `CHECK` restringe `role` a `('admin', 'operator')` — é uma tabela de **staff interno**, não de usuário geral. Um trigger (`handle_new_user()`) roda em **todo** `INSERT` em `auth.users` e cria automaticamente uma linha em `profiles` com `role = 'operator'` — sem essa correção, qualquer comprador que se cadastrasse seria automaticamente rotulado como "operador" interno, uma mistura semântica real, não apenas uma inconsistência de nomenclatura. Adicionalmente, `merchant_reviews.reviewer_id` (`0016_trust_experience.sql`) já referencia `profiles(id)` — um vínculo que hoje nunca foi de fato alimentado por um comprador real, porque nenhum fluxo de cadastro de comprador jamais existiu. Este é um gap latente do Release 1.5, descoberto ao pesquisar esta ADR, não introduzido por ela.

**Decisão — identidade**: nasce `buyers`, tabela própria, seguindo exatamente o mesmo precedente arquitetural de `merchants` (não reaproveita `profiles`, que continua exclusiva para staff interno):

```
buyers
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid()
  user_id          uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL  -- não CASCADE, ver Deleção abaixo
  email            text
  display_name     text        -- opcional, nunca exige nome real
  phone            text        -- opcional, só se optar por alertas via WhatsApp
  marketing_opt_in boolean NOT NULL DEFAULT false
  anonymized_at    timestamptz -- null enquanto ativo; setado no momento da anonimização
  created_at       timestamptz NOT NULL DEFAULT now()

buyer_consent_log  -- INSERT-only, mesma disciplina de review_history/signal_provenance
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
  buyer_id     uuid NOT NULL REFERENCES buyers(id) ON DELETE CASCADE
  consent_type text NOT NULL   -- 'terms_of_service' | 'marketing' | 'analytics'
  granted      boolean NOT NULL  -- cada mudança é uma linha nova, nunca um UPDATE
  recorded_at  timestamptz NOT NULL DEFAULT now()
```

**Decisão — minimização de dado (princípio LGPD, não apenas boa prática)**: coleta-se apenas e-mail (obrigatório, da própria autenticação) por padrão. Nome de exibição e telefone são opcionais e coletados só quando o comprador ativamente opta por um recurso que os exige (nome para atribuição pública de review; telefone só se o comprador ligar alertas via WhatsApp, `RELEASE_1_8_BLUEPRINT.md` Capítulo 6, item 7). Nenhum documento (CPF/RG/CI), endereço ou dado de pagamento é coletado — o ParaguAI não processa pagamento (`AI_CONSTITUTION.md` I, "não somos um e-commerce"), então não há justificativa de propósito para coletar esse dado.

**Decisão — consentimento**: toda concessão ou revogação de consentimento (termos de uso, marketing, analytics) gera uma linha nova em `buyer_consent_log` — nunca uma atualização in-place — dando exatamente o registro auditável "quando e o quê foi consentido" que a LGPD exige para provar conformidade, e reaproveitando o mesmo padrão INSERT-only já usado em `review_history`/`price_history` (`STRATEGIC_ASSETS.md` Anti-Pattern 5).

**Decisão — deleção, a parte mais delicada desta ADR**: a LGPD garante direito de eliminação/esquecimento; `STRATEGIC_ASSETS.md` Anti-Pattern 5 proíbe destruir dado histórico ("dados de Core Assets são INSERT-only... um dia de dados perdidos não pode ser recuperado"). Essas duas regras **não colidem de fato** — colidiriam apenas se dado pessoal identificável e sinal comportamental agregado fossem tratados como a mesma coisa. `VISION_2035.md` Capítulo 10 já resolveu esse princípio antes desta ADR precisar inventá-lo: "toda inteligência regional produzida é agregada e anonimizada... nenhuma informação que permita identificar comportamento de um comprador específico... é exposta." A LGPD, no Artigo 12, também trata dado efetivamente anonimizado como fora do escopo de dado pessoal. A operacionalização:

1. Ao receber um pedido de eliminação, `buyers.email`/`display_name`/`phone` são sobrescritos (não a linha inteira — `id` permanece estável) e `anonymized_at` é setado.
2. `buyers.user_id` usa `ON DELETE SET NULL`, não `CASCADE` — a conta em `auth.users` pode ser de fato apagada (o "esquecimento" real, no nível de autenticação) sem cascatear a destruição da linha `buyers` já anonimizada, preservando a integridade referencial de `buyer_favorites`/`buyer_events`/`price_alerts` (Capítulo 6 do Blueprint) — que continuam existindo como sinal comportamental agregado e não-identificável, alimentando `C-6 Buyer Behavioral Knowledge` normalmente.
3. `buyer_consent_log` nunca é apagado nem anonimizado — é, ele mesmo, o registro de conformidade que prova que a solicitação de consentimento/revogação aconteceu; apagá-lo destruiria a evidência de conformidade, o oposto do que a LGPD pede.

**Prazo operacional**: a LGPD dá até 15 dias para resposta a uma solicitação de titular. Recomenda-se um SLA interno mais agressivo (72h), consistente com o padrão de rigor já aplicado a outras decisões deste projeto (ex.: notificação de vazamento em `AI_CONSTITUTION.md`/Wave 6) — não porque a lei exige, mas porque o próprio projeto já opera com um viés de "honestidade rápida" mais alto que o mínimo legal.

**Consequência — dois fixes companheiros obrigatórios, não opcionais, antes de qualquer cadastro público de comprador**:
1. `handle_new_user()` (`0009_admin_platform.sql`) precisa parar de criar uma linha em `profiles` incondicionalmente para todo novo `auth.users`. Sem essa correção, o Buyer Account System nasceria já com o exato problema de rotulagem identificado no Contexto. A implementação exata (ex.: sinalizar tipo de conta nos metadados do signup e rotear condicionalmente) é decisão de execução da Wave 6, não desta ADR.
2. `merchant_reviews.reviewer_id` deve migrar de `profiles(id)` para `buyers(id)` — fecha um gap latente do Release 1.5 que nunca foi de fato exercitado, e alinha o domínio de reviews à identidade correta (comprador, não staff).

**Consequência — fora do escopo técnico desta ADR, ação explícita do CTO**: a LGPD exige a designação de um Encarregado (equivalente a DPO) com contato publicamente divulgado (Art. 41), e uma política de privacidade real, escrita e revisada por aconselhamento jurídico — não gerada por este documento. Uma ADR de engenharia define o modelo de dado e as salvaguardas técnicas; não substitui revisão jurídica formal. Nomeado aqui como bloqueador de conformidade, não como algo já resolvido.

**Consequência — segurança**: o Buyer Account System é a primeira superfície de autenticação pública (self-signup, sem convite) deste projeto — merchant/admin hoje são fluxos controlados. Isso torna a ausência de rate limiting (`TECH_DEBT.md`, ADR-042 parte 3) mais urgente precisamente nesta Wave — recomenda-se resolver rate limiting em endpoints de auth/signup de comprador como parte da própria Wave 6, não adiado novamente.

**Alternativas descartadas**:
- Reaproveitar `profiles` para comprador, estendendo o `CHECK` para incluir `'buyer'` — descartada: conflaria identidade de staff interno com identidade de consumidor público na mesma tabela, e não resolveria o bug de rotulagem do trigger, só o esconderia atrás de um valor de enum a mais. Viola "um dono por decisão" (`AI_CONSTITUTION.md` V).
- Deleção real (hard delete) da linha `buyers` e de todo dado vinculado — descartada: destruiria sinal comportamental agregado que `STRATEGIC_ASSETS.md` protege como Core Asset (C-6), sem necessidade legal real — a LGPD não exige apagar dado anonimizado, exige que dado pessoal identificável deixe de existir. Hard delete resolveria conformidade destruindo patrimônio que a anonimização preserva com a mesma conformidade.
- Aplicar o modelo de conformidade da GDPR europeia diretamente, sem verificar a LGPD brasileira — descartada por precisão: os dois regimes são semelhantes mas não idênticos (prazos, definições, base legal de tratamento diferem); a pesquisa desta ADR verificou LGPD especificamente, porque é o regime que de fato se aplica ao público comprador real do ParaguAI.

---

## ADR-046 — Buyer Identity Model: aggregate root próprio, desacoplado de `profiles` e de `auth.users`

**Data**: 2026-07-02 (Pré-Release 1.8 — decisão final de arquitetura, mandato do CTO: "nenhuma Wave do Release 1.8 deverá começar antes desta decisão estar completamente definida")
**Status**: Aceita
**Detalhamento completo**: `docs/product/releases/RELEASE_1_8_BUYER_IDENTITY_MODEL.md` (15 seções — auditoria, modelo de domínio, ciclo de vida, identificadores, LGPD, Brain, security, trade-offs). Esta entrada é o registro formal e resumido; o documento é a análise completa.

**Contexto**: a ADR-045 já decidiu que `buyers` é uma tabela própria (não reaproveita `profiles`) e que deleção é anonimização, não hard delete — em nível de schema. Esta ADR aprofunda a decisão para o nível de modelo de domínio completo, depois de uma auditoria que revelou: (1) `profiles` já é, por decisão deliberada da Release 1.2 (ADR-031), a identidade compartilhada de **staff e merchant** — não uma tabela neutra disponível para reuso; (2) `buyer_events`/`buyer_sessions` (Release 1.6) já referenciam `auth.users(id)` diretamente como `buyer_id`, um acoplamento entre identidade de domínio e mecanismo de autenticação que antecede esta decisão e precisa ser corrigido; (3) o Trust domain (Release 1.5) usa `profiles(id)` onde Merchant Platform usa `merchants(id)` para o mesmo conceito de "merchant", uma inconsistência de convenção pré-existente, não causada por este trabalho; (4) o Brain já reserva vocabulário de comprador (`BrainEntityType.Buyer`, relações `Buyer*`) desde o Release 1.5, nunca conectado por falta de identidade real.

**Decisão**: Buyer é um domínio próprio (`src/domains/buyer-identity/`, conceitual — sem código nesta etapa), com um aggregate root (`buyers.id`) que é o identificador canônico de comprador para sempre — desacoplado tanto de `profiles` (reservado exclusivamente para staff/operator/merchant, por decisão que permanece válida e não é revisitada aqui) quanto de `auth.users` (tratado como implementação de autenticação, nunca referenciado diretamente por Analytics/Trust/Favoritos/Alertas/Brain). Ciclo de vida de 6 estados (Visitante Anônimo → Anonymous Session → Buyer Conhecido [não verificado → verificado] → Buyer Autenticado → Buyer Recorrente [rótulo derivado, não uma transição real] → Buyer Premium [futuro, não implementado]), mais um estado terminal de Anonimização (LGPD). `buyers.id` funciona como chave de pseudonimização controlada por RLS — o Brain e qualquer processamento comportamental só recebem o UUID, nunca as colunas de PII (`email`/`display_name`/`phone`), que ficam restritas ao próprio comprador.

**Consequência — dois itens nomeados, não corrigidos nesta etapa**: `buyer_events.buyer_id`/`buyer_sessions.buyer_id` devem migrar seu alvo de FK de `auth.users(id)` para `buyers(id)` — decisão tomada, execução fica para a Wave 6 (custo baixo: nenhum `buyer_id` de produção real existe ainda para migrar). Dois achados de segurança de severidade alta, já em produção hoje e não causados por esta decisão, foram revelados pela auditoria: ausência de rate limiting real em `buyer_events`/`buyer_sessions` (o comentário do código alega proteção que a auditoria de segurança da Wave 6 deste mesmo Release já confirmou não existir), e ausência de qualquer aviso de privacidade/consentimento para a coleta comportamental que já roda desde o Release 1.6 — ambos recomendados para correção prioritária na própria Wave 6.

**Consequência — parâmetro deixado em aberto deliberadamente**: o prazo de retenção de conta de comprador inativa não é fixado por esta ADR — é uma decisão jurídica/de negócio do CTO, não uma decisão técnica; inventar um número sem justificativa seria pior do que nomear explicitamente a lacuna.

**Alternativas descartadas**:
- Estender `profiles.role` pela segunda vez para incluir `'buyer'`, repetindo o padrão da ADR-031 — descartada: a motivação original de ADR-031 (evitar duplicar sessão/cookies/middleware) continua válida e é honrada (Buyer reaproveita Supabase Auth), mas a motivação para uma tabela de **identidade de domínio** compartilhada não se sustenta pela segunda vez — staff/merchant não têm as exigências de minimização de PII, consentimento e anonimização que LGPD impõe a um consumidor final, nem o mesmo volume de escala.
- Deixar `buyer_events`/`buyer_sessions.buyer_id` apontando para `auth.users(id)` indefinidamente, sem nomear a correção — descartada: perpetuaria o acoplamento entre identidade de domínio e mecanismo de autenticação identificado na auditoria, tornando mais caro corrigir depois que houver dado de produção real para migrar.
- Corrigir a inconsistência `profiles(id)` vs. `merchants(id)` no Trust domain como parte desta decisão — descartada por escopo: é uma dívida pré-existente, não introduzida nem agravada pelo Buyer Identity Model; misturar sua correção aqui violaria a própria instrução do CTO de registrar dívidas sem corrigi-las fora do Release específico que as endereçar.
- Anonimização total (sem pseudonimização) desde o primeiro dia de vida da conta — descartada: inviabilizaria personalização real (histórico, recomendações, "Compra Inteligente"), que depende estruturalmente de alguma continuidade de identidade; a LGPD reconhece pseudonimização com controle de acesso como medida de redução de risco válida (Art. 13), tornando a anonimização total um exagero desnecessário enquanto a conta está ativa.

---

## ADR-047 — Exchange Intelligence Platform: reaproveitar `offers.currency`, RLS sem policy pública, escopo de multi-provider

**Data**: 2026-07-03 (Release 1.8 — Program A — Wave 1)
**Status**: Aceita

**Contexto**: `RELEASE_1_8_BLUEPRINT.md` Capítulo 3 propôs uma coluna nova `original_currency` em `offers`/`price_history` para capturar a moeda original do preço. Pesquisa de schema feita no início desta Wave (não assumida do Blueprint) encontrou que `offers.currency` **já existe** — coluna real, já preenchida por todo conector (`raw.currency ?? "USD"` em `OfferNormalizer.ts`) — e já significa exatamente "moeda em que o preço original foi informado". Criar uma segunda coluna para o mesmo conceito duplicaria schema sem necessidade.

**Decisão 1 — reaproveitar `offers.currency`**: nenhuma coluna `original_currency` foi criada. `AutomaticCurrencyService.convert()` lê `offers.currency` como "Moeda Original" (Epic 5 do brief). `rateUsed`/`convertedPrice`/`conversionDate`/`rateVersion` são computados sob demanda a cada chamada — nunca persistidos em `offers`/`price_history`, preservando "nunca alterar o preço original" de forma estrutural (não há coluna para alterar). `rateVersion` referencia a linha exata de `exchange_rates` usada (par + `captured_at` + fonte), dando explainability completa sem custo de schema.

**Decisão 2 — RLS habilitada, zero policy pública, leitura via service_role**: `exchange_rates`, `exchange_provider_runs`, `exchange_conversion_log` seguem o mesmo padrão já usado por `canonical_products` (confirmado por releitura da migration `20260701120300_canonical_catalog.sql`: RLS habilitada, nenhuma `CREATE POLICY`, comentário "leitura/escrita exclusivamente via service_role"). As rotas públicas (`/api/exchange/current`, `/history`, `/convert`) leem com o client de `service_role` no servidor — mesmo caminho já usado por `/api/canonical-catalog/[slug]` (ADR-036). Nenhuma policy pública nova foi criada; ver `docs/engineering/DATABASE_ENGINEERING.md` §12 para o padrão agora documentado explicitamente.

**Decisão 3 — escopo do Provider Registry (Epic 2 do brief)**: o brief pediu um motor multi-provedor cobrindo Banco Central do Paraguai, Banco Central do Brasil, AwesomeAPI e um "provedor próprio". A ADR-043 (já aceita, Wave anterior) pesquisou e **rejeitou explicitamente** integração direta com bancos centrais (sem API pública estável, cotação só diária — incompatível com a cadência de 5 minutos já aprovada) e construção de fonte própria (Anti-Pattern de `NORTH_STAR.md` §7, "tecnologias da moda"/"complexidade desnecessária"). Confirmado com o CTO nesta Wave: constrói-se o mecanismo real de registro/failover (`ExchangeProviderRegistryImpl`, prioridade ordenável, múltiplos provedores suportados estruturalmente), mas apenas **um** provedor é de fato registrado (`ExchangeRateApiProvider`, ADR-043). Adicionar um segundo provedor real no futuro é aditivo (`registry.register(...)`) — mas exige sua própria pesquisa (custo, confiabilidade, cobertura de PYG) e, portanto, sua própria ADR, não fabricado nesta Wave.

**Consequência**: nenhuma migration futura deve reintroduzir `original_currency` sem primeiro confirmar que `offers.currency` não resolve o mesmo caso — checar este ADR antes de propor uma coluna nova para "moeda".

**Alternativas descartadas**:
- Adicionar `original_currency` conforme o Blueprint propunha originalmente — descartada após confirmação de que `offers.currency` já cobre o conceito; manter as duas seria uma fonte dupla de verdade para o mesmo dado.
- Criar uma policy `SELECT` pública em `exchange_rates` para leitura direta via anon key — descartada: nenhuma rota deste projeto precisa disso (todas as leituras públicas já passam por uma API route com `service_role`), e seria a primeira policy pública deste tipo no projeto, sem precedente nem necessidade real.
- Integrar Banco Central do Paraguai/Brasil ou construir um scraper próprio nesta Wave — descartada, reafirmando a ADR-043: nenhum dos dois atende a cadência de 5 minutos já aprovada, e um scraper próprio é complexidade sem problema real a resolver hoje.

---

## ADR-048 — `docs/marketplace/` como 9ª categoria oficial do Knowledge System

**Data**: 2026-07-03 (Release 1.8 — Program A — Wave 3, Programa de Certificação de Connectors Tier 1)
**Status**: Aceita

**Contexto**: O mandato desta Wave (auditoria técnica de 10 lojas candidatas a Connector Tier 1 e criação de `docs/marketplace/Tier1_Merchants.md`) pediu explicitamente um caminho `docs/marketplace/` — uma categoria que não existe nas 8 oficiais do Knowledge System (`foundation/architecture/engineering/product/operations/database/adr/archive`, ver `docs/README.md` §"Regras do Knowledge System" item 1). A regra existente exige aprovação explícita do CTO e uma ADR correspondente antes de criar uma categoria nova — este ADR é essa aprovação, registrada antes da criação do arquivo, não depois.

**Por que nenhuma categoria existente serve**: `Tier1_Merchants.md` (e documentos futuros da mesma família — auditorias de lojas, certificação de conectores, perfis de merchant) não é `product/` (não é sobre o que o *produto ParaguAI* faz ou planeja — é sobre entidades *externas*, as lojas reais da fronteira); não é `engineering/` (não é um padrão de código — é um dossiê técnico-comercial por loja: robots.txt, sitemap, moeda, `Certification Status`, `Integration Strategy`); não é `operations/` (não é o estado do projeto — é o estado do mercado que o projeto observa). Existe uma dimensão real e distinta: documentação sobre o **mercado/lojas que o Marketplace modela**, separada da documentação sobre o **produto que o modela**. `docs/marketplace/` cobre essa dimensão.

**Decisão**: `docs/marketplace/` passa a ser a 9ª categoria oficial. Propósito: documentação sobre entidades reais do mercado da fronteira (lojas, conectores certificados, perfis de merchant) — nunca sobre arquitetura interna do ParaguAI (isso continua em `architecture/`/`engineering/`). Primeiro documento: `Tier1_Merchants.md`. `docs/README.md` (árvore, tabela de categorias, regra 1) e `docs/foundation/FOUNDATION_INDEX.md` atualizados no mesmo commit desta ADR — nenhuma categoria fica fora do mapa (regra 7 do Knowledge System).

**Consequência**: toda auditoria futura de merchant/loja (Tier 2, Tier 3, etc.) tem um lar natural em `docs/marketplace/` sem precisar de uma nova ADR de categoria a cada vez — apenas documentos genuinamente fora desta natureza (mercado real observado) precisam de nova categoria.

**Alternativas descartadas**:
- Usar `docs/product/TIER1_MERCHANTS.md` — descartada: misturaria "o que o ParaguAI é/planeja" com "o que as lojas da fronteira são", duas perguntas diferentes; o precedente abriria a porta para toda futura documentação de mercado (concorrência, tendências, perfis de loja) ser empurrada para `product/` por falta de lugar próprio.
- Usar `docs/engineering/TIER1_MERCHANTS.md` (ao lado de `CONNECTOR_GUIDE.md`) — descartada: `engineering/` é sobre como o ParaguAI constrói software, não sobre o que uma loja específica da fronteira usa de tecnologia; um dossiê comercial/técnico por loja externa é uma categoria de informação diferente da que `engineering/` já serve.
- Não criar categoria nova e recusar o caminho `docs/marketplace/` pedido no mandato — descartada porque o CTO, ao dar a instrução original, já sinalizou a intenção; esta ADR formaliza essa intenção seguindo a própria regra do Knowledge System, em vez de silenciosamente ignorá-la ou silenciosamente violá-la.

---

## ADR-049 — `docs/business/` como 10ª categoria oficial do Knowledge System

**Data**: 2026-07-03 (Release 1.8 — Program C — Wave 0, Merchant Partnership Program)
**Status**: Aceita

**Contexto**: O mandato desta Wave pediu `docs/business/MERCHANT_PARTNERSHIP_PROGRAM.md`, `docs/business/TIER1_PARTNERS.md` e `docs/business/PARTNERSHIP_PROPOSAL.md` — um caminho fora das 9 categorias oficiais existentes (que já incluem `marketplace/`, criada por ADR-048 há poucas horas nesta mesma Release). Mesma regra do Knowledge System se aplica: categoria nova exige aprovação do CTO + ADR correspondente.

**Por que `docs/marketplace/` (a categoria mais próxima, criada minutos atrás) não serve**: `marketplace/` documenta o que as lojas da fronteira **são** — fatos técnicos observáveis (robots.txt, sitemap, moeda, estrutura de URL) — nunca como o ParaguAI se relaciona comercialmente com elas. Este mandato é o oposto: processo de negociação, NDA, proposta comercial, template de e-mail institucional, pipeline de parceria (`Not Contacted → ... → Official Partner`) — nada disso é uma propriedade técnica de uma loja, é o **processo de desenvolvimento de negócio do próprio ParaguAI**. Misturar as duas neste momento specific criaria um documento (`Tier1_Merchants.md`) que precisaria carregar tanto "o robots.txt bloqueia ClaudeBot" quanto "reunião agendada para 15/07, contato comercial: Fulano" — dados de natureza e ciclo de vida completamente diferentes (um é auditoria técnica estável, o outro é estado de negociação que muda semanalmente).

**Decisão**: `docs/business/` passa a ser a 10ª categoria oficial. Propósito: processo comercial do ParaguAI com terceiros (parcerias de dado, propostas, contratos, pipeline de negociação) — nunca fatos técnicos sobre uma loja (isso continua em `marketplace/`) nem estratégia de produto/roadmap (isso continua em `product/`). Primeiros documentos: `MERCHANT_PARTNERSHIP_PROGRAM.md`, `TIER1_PARTNERS.md`, `PARTNERSHIP_PROPOSAL.md`, `PARTNERSHIP_EMAIL_TEMPLATE.md`. `docs/README.md`/`docs/foundation/FOUNDATION_INDEX.md`/`CLAUDE.md` atualizados no mesmo commit.

**Consequência**: `docs/marketplace/Tier1_Merchants.md` mantém `Certification Status`/`Integration Strategy` (fatos técnicos); `docs/business/TIER1_PARTNERS.md` referencia esses mesmos campos por nome (nunca duplicando o valor) e adiciona o estado comercial (`Partner Status`, `Current Stage`, contatos, datas) — uma tabela lê a outra, nenhuma reescreve a outra. Toda futura documentação de processo comercial (parcerias de mídia, acordos de dado com outras fontes) tem lar natural aqui sem nova ADR de categoria.

**Alternativas descartadas**:
- Colocar estes documentos dentro de `docs/marketplace/` — descartada pelo motivo acima: misturaria dado técnico estável com estado de negociação volátil no mesmo arquivo, e todo processo comercial futuro (não só merchants) ficaria sem lar natural.
- Colocar em `docs/product/` — descartada: `product/` é sobre o que o produto ParaguAI faz/planeja, não sobre como a empresa negocia com terceiros — mesmo raciocínio já usado para descartar essa opção na ADR-048.
- Recusar o caminho `docs/business/` pedido no mandato — descartada pela mesma razão da ADR-048: o CTO já sinalizou a intenção ao nomear o caminho explicitamente; esta ADR formaliza em vez de ignorar ou violar silenciosamente a regra do Knowledge System.

---

## ADR-050 — `docs/design/` como 11ª categoria oficial do Knowledge System; congelamento visual da Premium Home Experience

**Data**: 2026-07-06 (pós Release 1.9 — Program F — Wave 1)
**Status**: Aceita

**Contexto**: o CTO aprovou formalmente o resultado visual da Premium Home Experience (Home + `/categorias`, gerado a partir do design v0 e integrado aos domínios reais na Wave anterior, ver `docs/engineering/PREMIUM_HOME_EXPERIENCE.md`) como o Design System oficial do ParaguAI, e determinou que esse visual passa a ser **READ-ONLY** — nenhuma nova mudança de espaçamento, tipografia, proporção, sombra, cor, estrutura de card, navegação, Hero ou layout é permitida sem aprovação explícita futura. O mandato pediu um documento formal (`DESIGN_CONSTITUTION`) registrando essa restrição, em um caminho (`docs/design/`) que não existe nas 10 categorias oficiais até então (`foundation/architecture/engineering/product/operations/database/adr/archive/marketplace/business`).

**Por que nenhuma categoria existente serve**: não é `engineering/` (não descreve como o código é construído — `PREMIUM_HOME_EXPERIENCE.md` já faz isso e continua vivo; este documento descreve o que **não pode mudar** no resultado visual, uma pergunta diferente de "como funciona"); não é `product/` (não é sobre o que o produto faz ou planeja — é sobre uma restrição a um resultado visual já entregue); não é `operations/` (não é estado do projeto nem histórico — é uma regra permanente de congelamento, consultada antes de qualquer mudança futura na Home, não depois). Existe uma dimensão real e distinta, já prevista implicitamente pela distinção entre documentos "vivos" e "LOCKED" da Foundation (`FOUNDATION_INDEX.md` Seção II): algumas partes do produto deixam de evoluir livremente e passam a exigir aprovação explícita para qualquer mudança observável. `docs/design/` cobre essa dimensão para superfícies visuais (distinta da Foundation, que cobre princípios, não pixels).

**Decisão 1 — `docs/design/` passa a ser a 11ª categoria oficial**. Propósito: declarar superfícies visuais aprovadas como definitivas pelo CTO e as regras do que pode/não pode mudar em cada uma — nunca arquitetura técnica (isso continua em `engineering/`) nem filosofia de produto (isso continua em `foundation/PRODUCT_PRINCIPLES.md`). Primeiro documento: `DESIGN_CONSTITUTION.md`. `docs/README.md`, `docs/foundation/FOUNDATION_INDEX.md` e `CLAUDE.md` atualizados no mesmo commit desta ADR — nenhuma categoria fica fora do mapa (regra 7 do Knowledge System).

**Decisão 2 — congelamento formal da Premium Home Experience**: `docs/design/DESIGN_CONSTITUTION.md` declara `app/page.tsx`, `app/categorias/page.tsx` e todo `components/home/*.tsx`/`components/home/dashboard/*.tsx` como READ-ONLY visualmente. Proibido sem nova aprovação do CTO: redesign, mudança de espaçamento/tipografia/proporção/sombra/cor/estrutura de card/navegação/Hero/layout, ou substituição de componente por reinterpretação. Permitido e esperado, sem necessidade de aprovação prévia: integração com services reais, remoção de duplicação, performance, acessibilidade, SEO e manutenibilidade — desde que o DOM/pixel renderizado permaneça idêntico.

**Consequência**: toda tarefa futura que toque `app/page.tsx`, `/categorias` ou `components/home/**` deve consultar `docs/design/DESIGN_CONSTITUTION.md` antes de implementar — uma mudança visualmente observável nessas superfícies sem aprovação explícita do CTO é uma violação desta ADR, não uma escolha de execução válida. Futuras superfícies do produto que o CTO aprovar como visual definitivo (ex.: um futuro Merchant Dashboard) ganham seu próprio documento em `docs/design/` sem precisar de nova ADR de categoria.

**Alternativas descartadas**:
- Registrar o congelamento apenas como uma seção dentro de `docs/engineering/PREMIUM_HOME_EXPERIENCE.md` — descartada: misturaria "como o sistema foi construído" (vivo, atualiza a cada Wave que tocar a Home) com "o que está proibido mudar" (regra permanente até nova aprovação); o precedente empurraria todo futuro congelamento visual para dentro de documentos de arquitetura já existentes, sem lar próprio.
- Tratar o congelamento como uma extensão de `docs/foundation/PRODUCT_PRINCIPLES.md` — descartada: a Foundation é permanente e filosófica (por que o ParaguAI existe, como pensa sobre produto), não uma lista de componentes React específicos e o que pode/não pode mudar neles; misturar as duas coisas diluiria o caráter LOCKED da Foundation com detalhe de implementação de uma Wave específica.
- Não criar categoria nova e recusar o caminho `docs/design/` pedido no mandato — descartada pela mesma razão das ADR-048/049: o CTO já sinalizou a intenção ao nomear o caminho explicitamente ao criar o arquivo vazio `docs/design/DESIGN_CONSTITUTION`; esta ADR formaliza em vez de ignorar ou violar silenciosamente a regra do Knowledge System.

---

## ADR-051 — Definition of Done de Wave: Quality Gate + Commit + Push + Deploy Preview + Documentação, sempre completos

**Data**: 2026-07-06 (PROGRAM Z — Repository Consolidation, RC-1)
**Status**: Aceita

**Contexto**: RC-1 auditou o repositório e encontrou `HEAD`/`origin/main` parados em `64c276c` ("Program 0 Wave 0 — Brain Analytics Integration") enquanto praticamente todo o Release 1.8 (Programs A, B, C, D) e o início do Release 1.9 (Program F Wave 1, mais o Design Freeze) existiam apenas em working tree local — 149 caminhos alterados, ~300 arquivos, nenhum commit, nenhum push. Múltiplas entradas deste mesmo `DECISIONS.md` e de `CHANGELOG.md`/`PROJECT_STATUS.md` descreviam essas Waves como "entregues" — e, no sentido de "código escrito, testado localmente e funcional", estavam — mas nenhuma delas jamais foi commitada, muito menos deployada. Isso significa que, durante dias, o estado documentado como "verdade do projeto" e o estado realmente versionado/deployável divergiram sem que nenhuma sessão anterior tivesse detectado ou sinalizado a divergência.

**Decisão**: uma Wave só pode ser declarada concluída — em `CHANGELOG.md`, `PROJECT_STATUS.md`, ou qualquer outro documento — quando as cinco condições abaixo estiverem **integralmente** cumpridas, nunca apenas "código funcionando localmente":

1. **Quality Gate**: `lint`, `typecheck`, `test`, `build` (e `db:lint` quando a Wave tocar migrations) executados e verdes contra o estado final da Wave.
2. **Commit**: as mudanças da Wave existem como commit(s) Conventional Commits reais, agrupados por domínio — nunca apenas em working tree.
3. **Push**: o(s) commit(s) estão em `origin/main` (ou branch equivalente aprovada) — nunca apenas `HEAD` local.
4. **Deploy Preview**: existe evidência de que o build deployado (preview ou produção, conforme o pipeline do projeto) reflete o commit — nunca presumido a partir do sucesso do build local.
5. **Documentação mínima**: os documentos afetados (`CHANGELOG.md` sempre; `PROJECT_STATUS.md`/`TECH_DEBT.md`/outros conforme a natureza da mudança) refletem o estado real, não a intenção.

Se qualquer uma das cinco não puder ser cumprida no momento em que a Wave termina (ex.: push/deploy pendem de aprovação explícita do CTO, por afetarem estado compartilhado/produção), a Wave é registrada como **"commits locais completos, aguardando aprovação para push/deploy"** — nunca como "entregue" ou "concluída" sem qualificação. A qualificação em si não é opcional.

**Consequência**: toda sessão futura, ao declarar uma Wave concluída, deve citar explicitamente as cinco condições (ou nomear qual está pendente e por quê). Este ADR não invalida trabalho anterior — RC-1 já consolidou tudo o que estava pendente até esta data — mas estabelece que a lacuna que RC-1 corrigiu não pode se repetir silenciosamente.

**Alternativas descartadas**:
- Confiar em Quality Gate local como critério suficiente de "concluído" — descartada: foi exatamente esse critério, usado sozinho, que permitiu múltiplas Waves reais e funcionais se acumularem sem nunca chegarem a `origin/main`; código verde localmente não é sinônimo de código versionado ou deployado.
- Exigir push/deploy automático ao final de toda Wave, sem checkpoint humano — descartada: pushes para `origin/main` e deploys de produção são ações de alto impacto e baixa reversibilidade (`AI_CONSTITUTION.md`/princípios de engenharia deste projeto já tratam produção com esse cuidado); a regra exige que as cinco condições sejam *nomeadas e rastreadas*, não que sejam automatizadas sem supervisão.
- Tratar esta lacuna como um incidente isolado do RC-1, sem registrar regra permanente — descartada: sem uma regra explícita, a mesma divergência entre "documentado como pronto" e "realmente versionado" tende a se repetir na próxima sequência de Waves consecutivas sem commit intermediário.

---

## ADR-052 — High Frequency Scheduler Decoupling: gatilho de cron desacoplado da Vercel, via GitHub Actions até `pg_cron` na Release 2.0

**Data**: 2026-07-06 (PROGRAM Z — RC-3 — Infrastructure Decoupling + Final Hardening)
**Status**: Aceita

**Contexto**: a Vercel Hobby recusou deployment porque `vercel.json` declarava 3 crons mais frequentes que diário (`exchange/refresh` `*/5`, `realtime-commerce/market-pulse` e `buyer-alerts` `*/15`) — "Hobby accounts are limited to daily cron jobs". As 5 rotas de cron deste projeto (`app/api/cron/**`) já eram, por construção desde o Release 1.7 — Wave 2 (`lib/cron-auth.ts`), Route Handlers Next.js comuns autenticadas por segredo compartilhado (`requireCronSecret()`), sem nenhum import ou dependência do runtime de cron da Vercel — `vercel.json` sempre foi só uma de várias formas possíveis de disparar essas rotas, nunca a única estruturalmente possível. RC-3 confirmou isso por leitura direta das 5 rotas antes de alterar qualquer arquivo, conforme mandato do CTO ("antes de modificar qualquer arquivo, primeiro faça uma análise completa").

**Decisão 1 — manter as rotas, trocar o gatilho**: `vercel.json` mantém apenas as 2 entradas já diárias (`connectors/sync`, `marketplace-operations/snapshot`). As 3 rotas de alta frequência continuam existindo, inalteradas, com o mesmo contrato HTTP (`GET` + `Authorization: Bearer <CRON_SECRET>`) — nenhuma rota, service ou domínio foi removido ou modificado. O gatilho passou para `.github/workflows/high-frequency-crons.yml` (schedule `*/5`/`*/15`, mais `workflow_dispatch` manual), seguindo a mesma convenção "dormant até secrets configurados" já usada por `.github/workflows/database.yml` — sem `CRON_SECRET` (secret) e `CRON_APP_URL` (variable) configurados em Settings → Secrets and variables → Actions, o workflow loga `::warning::` e não faz nenhuma chamada, em vez de falhar às cegas.

**Decisão 2 — Supabase `pg_cron`/`pg_net` não implementado agora, mas nomeado como alvo da Release 2.0**: seria o scheduler mais robusto a longo prazo (execução dentro da própria infraestrutura de dados do projeto, sem depender da confiabilidade sub-hora do agendador de um CI de terceiros — o GitHub documenta que workflows agendados podem atrasar em repositórios de baixa atividade), e o projeto já depende do Supabase. Não foi escolhido nesta Wave porque exigiria uma migration aplicada ao banco vivo (habilitar extensões, criar `cron.job`), e RC-3 foi explicitamente restrita a não alterar banco — qualquer mudança de schema requer sua própria ADR e aprovação explícita, regra permanente deste projeto. Documentado em `docs/engineering/CRON_INFRASTRUCTURE.md` §7 com o desenho exato (`cron.schedule` + `net.http_get` + segredo no Supabase Vault) para quando a Release 2.0 decidir executá-lo.

**Decisão 3 — hardening de produção no próprio workflow (RC-3 Final Hardening)**: `.github/scripts/call-cron-endpoint.sh`, compartilhado pelos 3 jobs de endpoint, adiciona timeout explícito por tentativa (`curl --max-time 20`), até 3 tentativas com backoff exponencial (2s, 4s), log estruturado por tentativa (endpoint, timestamp ISO-8601 UTC, duração em ms, HTTP status, resultado), e uma falha definitiva termina o workflow com anotação `::error::` e código de saída não-zero — visível como um run vermelho no GitHub Actions, não uma falha silenciosa. Testado localmente antes do commit: caminho de sucesso (1 tentativa, exit 0) e caminho de falha definitiva (3 tentativas, backoff 2s/4s confirmado nos logs, exit 1) ambos verificados contra endpoints reais/inacessíveis, não apenas lidos.

**Consequência**: nenhuma rota, API, service, domínio, componente React, layout, Design Constitution ou frequência de execução foi alterada por esta ADR — só o mecanismo que dispara as 3 rotas de alta frequência. Reversível a qualquer momento (voltar as 3 entradas para `vercel.json` se a Vercel mudar de plano, sem tocar em nenhuma rota). O contrato HTTP + `CRON_SECRET` é o que garante essa reversibilidade — todo scheduler futuro (GitHub Actions, `pg_cron`, um worker dedicado) aponta para a mesma URL sem exigir nova mudança de código nas rotas.

**Alternativas descartadas**:
- Reduzir a frequência dos 3 crons para diário só para caber no Hobby — descartada explicitamente pelo mandato do CTO ("não quero uma solução temporária apagando funcionalidades") e seria uma perda real de capacidade (ADR-043 já justificou a cadência de 5 minutos do câmbio pelo custo/benefício do plano Business da ExchangeRate-API).
- Fazer upgrade do plano Vercel para Pro só para manter os crons nativos — não descartada tecnicamente, mas fora do escopo desta ADR (decisão de custo/negócio do CTO, não uma decisão de arquitetura de engenharia).
- Implementar `pg_cron`/`pg_net` imediatamente nesta Wave — descartada porque violaria a restrição explícita de não alterar banco nesta Wave; nomeada como próxima etapa em vez de silenciosamente adiada sem registro.
