# NEXT_STEPS.md

Proposta de continuação, baseada no estado real do código (não no roadmap aspiracional original) e no roadmap pré-existente em `docs/ROADMAP.md`.

## Sprint 3.2 (encerrada)

Consolidação de engenharia sem features novas: unificação de `process.env` em `lib/env.ts`, correção do `.gitignore`/`.env.example`, limpeza de `package.json`, e criação de 6 documentos permanentes (`DECISIONS`, `CONVENTIONS`, `API_CONTRACTS`, `DOMAIN_MODEL`, `COMPONENT_INDEX`, `DEPENDENCY_GRAPH`). Ver `docs/CHANGELOG.md` para o detalhe completo. `npm run lint`/`typecheck`/`build` confirmados limpos após as mudanças.

## Sprint 3.3 (encerrada nesta auditoria)

Diferente do que esta seção propunha anteriormente (fechar o Domínio de Loja), a sprint que efetivamente rodou implementou o **Domínio de Busca** (Release 0.4, parte 1 — equivalente à antiga "Sprint B" proposta abaixo): `app/search/page.tsx` lê `searchParams.q` e ganha `generateMetadata`; `hooks/useSearch.ts` e `services/search.service.ts` saem de placeholder/código morto; `SearchResults` renderiza resultados reais agrupados por tipo; `loading.tsx`/`error.tsx`/`SearchResultsSkeleton` espelham o padrão de `/product/[slug]`; `app/layout.tsx` ganhou metadata real + JSON-LD `WebSite`/`SearchAction`. Ver `docs/CHANGELOG.md` para o detalhe completo. Validado com `npm run lint`/`typecheck`/`build`.

O **Domínio de Loja** (Release 0.3), que esta seção recomendava priorizar, continua pendente — vira a Sprint 3.4 proposta abaixo.

## Sprint 3.4 (encerrada)

Fecha o Domínio de Loja (Release 0.3), replicando deliberadamente a arquitetura do Domínio de Produto: `getStoreBySlug`/`getRelatedStores` (`store.service.ts`), `getOffersByStore` (`offer.service.ts`, novo tipo `OfferWithProduct`), `hooks/useStore.ts`, `StoreDetails`/`StoreOffers`/`StoreGrid`, `app/store/[slug]/` completo (`layout`/`page`/`loading`/`error`/`not-found`), `storePath`/`storeUrl`. Ver `docs/CHANGELOG.md` para o detalhe completo. Validado com `npm run lint`/`typecheck`/`build`.

**Dois achados importantes desta sprint, registrados em `docs/DECISIONS.md`**:
- **ADR-006**: contato e horário de funcionamento da loja não foram implementados — concluiu-se (incorretamente, ver Sprint 3.4.1 abaixo) que não existiam no schema real do Supabase. Proposta de migration em `database/migrations/0001_proposed_store_contact_hours.sql`, **não aplicada**.
- **ADR-007**: testando manualmente contra o Supabase real, as 5 lojas cadastradas têm `slug: null`, e `products` tem 0 linhas. Os três domínios centrais da Home (Produto, Busca, Loja) estão **code-complete**, mas sem dado real navegável em produção hoje. Isso não é resolvido por código — precisa de alguém com acesso ao Supabase popular `slug` e cadastrar produtos/ofertas.

## Sprint 3.4.1 (encerrada nesta auditoria) — Consolidação da Camada de Dados

Sprint de diagnóstico puro, a pedido explícito do CTO ("não implemente novas funcionalidades de interface"), antes de iniciar qualquer Sprint 3.5. Auditou `stores`/`products`/`offers`/`brands`/`categories` direto no Supabase (consulta real, não inferência a partir dos tipos TS).

**Achado crítico — corrige a ADR-006**: a conclusão da Sprint 3.4 estava errada. As colunas de contato/horário **já existem** em `stores` (`phone`, `whatsapp`, `email`, `website`, `address`, `opening_hours`) — a Sprint 3.4 só verificou os campos que `types/store.ts` já declarava, sem fazer `select("*")` real. `database/migrations/0001_proposed_store_contact_hours.sql` foi marcado **superado**; `0002_revised_store_data_layer.sql` o substitui.

**Achado crítico novo — bug real, não dívida técnica**: `types/offer.ts` também diverge do schema real. `offer.price`/`stock`/`installments`/`url` **não existem** — o banco usa `price_usd`/`price_brl` (dois valores independentes, não 1 valor + taxa de conversão), `in_stock`/`available`/`stock_quantity`, e `product_url`. `store.banner_url`/`verified` também estão errados (`cover_image`/`is_verified`). Resultado: assim que houver uma oferta real, `ProductOffers`/`StoreOffers` vão mostrar preço `NaN`, estoque sempre "indisponível" e nunca o botão "Ver oferta"; o banner/badge de verificação da loja nunca aparecem. Nenhum erro de lint/TS/build pega isso. Ver `docs/DECISIONS.md` ADR-008 e `docs/DOMAIN_MODEL.md` (schema real completo, lado a lado com cada tipo).

**Também confirmado**: as 4 FKs usadas pelos services são reais (joins resolvidos pelo PostgREST); nenhuma das 14 tabelas "futuras" existe ainda (`reviews` incluída); duas tabelas reais não documentadas (`profiles`, `favorites`) foram descobertas.

Nenhum código de produção foi alterado nesta sprint — só documentação e a migration revisada (não aplicada).

## Sprint atual (avaliação)

Release 0.2 (Produto), Release 0.4 parte 1 (Busca) e Release 0.3 (Loja) estão concluídos na **arquitetura**, mas a Sprint 3.4.1 confirmou bugs reais na camada de tipos que afetam os três (mais Loja e Produto que Busca, já que Busca não exibe preço/estoque). Antes de avançar para qualquer tela nova (listagem de produtos, comparação, etc.), a base de dados precisa estar correta — continuar construindo sobre `offer.price`/`stock`/`url` inexistentes só multiplicaria o retrabalho.

**Próxima sprint recomendada**: Sprint 3.5 — corrigir `types/offer.ts`/`types/store.ts` e os componentes consumidores para usar os nomes reais (ver proposta abaixo), **antes** da antiga proposta de Sprint 3.5 (seed + Listagem de Produtos), que passa a ser Sprint 3.6.

---

## Roadmap proposto (próximos passos imediatos)

## Sprint 3.5 (proposta) — Corrigir o modelo de dados (`offer`/`store`)

**Objetivo**: eliminar os bugs confirmados na ADR-008 antes de qualquer nova tela. Isto é correção de bug, não feature nova — recomendo tratar com a mesma prioridade de um bug de produção, mesmo que ainda não visível (porque não há ofertas reais ainda).

**Escopo**:
1. `types/offer.ts`: renomear/substituir `price`→`price_usd`+`price_brl`, `stock`→`in_stock`/`available`/`stock_quantity` (decidir qual representa "disponível para compra" na UI), `url`→`product_url`; remover `installments` (sem equivalente real) ou propor a coluna em uma migration própria; adicionar `old_price`, `condition` se forem usados.
2. `types/store.ts`: `banner_url`→`cover_image`, `verified`→`is_verified`; adicionar os 13 campos reais ainda ausentes do tipo (`phone`, `whatsapp`, `email`, `website`, `address`, `opening_hours`, `instagram`, `latitude`, `longitude`, `delivery`, `pickup`, `pix_br`, `active`).
3. `utils/currency.ts`: reavaliar — se `price_usd`/`price_brl` já vêm prontos do banco, a conversão por taxa fixa (`USD_TO_BRL_RATE`) deixa de ser necessária para exibição (continua útil só se algum dia precisar converter para uma 3ª moeda sem coluna própria, ex. Guarani).
4. `services/offer.service.ts`/`store.service.ts`: ajustar qualquer `.order("price", ...)` para `.order("price_usd", ...)`.
5. `components/product/ProductOffers.tsx`, `components/store/StoreOffers.tsx`: atualizar para os novos nomes de campo.
6. `components/store/StoreCard.tsx`, `StoreDetails.tsx`, `app/store/[slug]/{page,layout}.tsx`: `cover_image`/`is_verified`; implementar a seção de Contato/Horário (agora possível, dados existem) em `StoreDetails.tsx`.
7. Aplicar a migration `0002_revised_store_data_layer.sql` (`UNIQUE (slug)`) — requer aprovação separada, fora do controle de código.
8. Atualizar `docs/API_CONTRACTS.md`/`COMPONENT_INDEX.md` com os contratos corrigidos.

**Riscos**: 🟢 Baixo no código (são renomeações diretas, sem mudança de lógica) — risco real é de produto/negócio: decidir o que `in_stock` vs `available` significam exatamente (perguntar a quem cadastra os dados, se possível), e se `old_price` é sempre USD/BRL ou tem moeda própria.

**Estimativa**: 1–2 dias.

**Impacto no produto**: faz `/product/[slug]` e `/store/[slug]` mostrarem preço/estoque/link corretos no instante em que existir uma oferta real — sem essa correção, a primeira oferta cadastrada exibiria `$NaN` em produção.

## Sprint 3.6 (proposta, antiga "Sprint 3.5") — Seed de dados + Listagem de Produtos

**Objetivo**: com o modelo de dados corrigido (Sprint 3.5), tornar os dados de demonstração testáveis e fechar a Listagem de Produtos (`/products`).

**Escopo**:
1. **Proposta de seed de dados** (não aplicada): gerar `database/seed/0001_proposed_demo_data.sql` com `UPDATE stores SET slug = ...` para as 5 lojas reais existentes (slugificando `name`) e alguns `INSERT INTO products`/`offers` de exemplo usando os nomes de coluna reais (`price_usd`/`price_brl`, não `price`) — documentado para revisão, **não executado** sem aprovação explícita.
2. **Listagem de produtos (`/products`)**: implementar `components/product/ProductGrid.tsx` (grid reaproveitando `ProductCard`, mesmo padrão de `StoreGrid`/`RelatedProducts`), criar `app/products/page.tsx` com filtro por categoria via `searchParams`, usando `getProducts()` já implementado.
3. **Categorias/marcas dinâmicas**: implementar `services/category.service.ts`/`brand.service.ts` (hoje vazios) para alimentar `/products`.
4. Atualizar `Navbar`/`Footer` (`/products` deixa de ser link morto).

**Riscos**: 🟡 Médio — a parte de seed/dados depende de decisão do CTO sobre alterar produção; a parte de código (grid + rota) é de baixo risco.

**Estimativa**: 2–3 dias de código + tempo de decisão/aprovação para a parte de dados.

**Impacto no produto**: primeira oportunidade real de testar Produto/Busca/Loja com dados de verdade e preço/estoque corretos (se a Sprint 3.5 + seed forem aprovados), e fecha a navegação de `/products`.

### Sprint C — Eliminar dívidas técnicas críticas antes de crescer mais
- **Prioridade**: 🟡 Média (mas crescente — quanto mais o código cresce, mais caro fica)
- **Risco**: Baixo
- **Complexidade**: Baixa–Média
- **Estimativa**: 1–2 dias (reduzida — unificação de `lib/supabase.ts`/`lib/env.ts` já concluída na Sprint 3.2, ver `docs/CHANGELOG.md`)
- Tarefas restantes: resolver o double-fetch de produto **e agora também de loja** (mover fetch para o server, reduzir `app/product/[slug]/page.tsx` e `app/store/[slug]/page.tsx` a ilhas client), trocar `<img>` por `next/image` nos 6 componentes apontados pelo lint.

### Releases seguintes (sem mudança em relação ao roadmap pré-existente)
0.5 Comparação de produtos → 0.6 Assistente de IA → 0.7 Painel Admin → 0.8 Crawler → 0.9 Plataforma de usuário (Auth/Favoritos reais/Histórico) → 1.0 Produção (SEO/Performance/Acessibilidade/PWA/Monitoramento). Ver `docs/ROADMAP.md` para o detalhamento original — segue válido como visão de longo prazo.

---

## Auditoria final (notas de 1 a 5)

| Critério | Nota | Justificativa |
|---|---|---|
| Arquitetura | ★★★★☆ | Camadas bem definidas e majoritariamente respeitadas, agora em 2 domínios completos (Produto, Loja); perde 1 ponto pelo double-fetch (replicado deliberadamente em Loja) e pelas páginas serem 100% client. |
| UX | ★★★☆☆ | Home, produto, busca e loja têm boa execução visual; mas sem dados reais navegáveis hoje (ADR-007) e, quando houver, preço/estoque exibidos incorretamente até a Sprint 3.5 (ADR-008) — links mortos remanescentes (`/products`, `/compare`, `/categories/[slug]`, etc.). |
| SEO | ★★★★☆ | Produto, Busca e Loja têm metadata+JSON-LD bem feitos (`Product`, `WebSite`/`SearchAction`, `LocalBusiness`); falta só Home ganhar Open Graph/canonical próprios e sitemap/robots.txt. |
| Performance | ★★★☆☆ | `<img>` em vez de `next/image` em 6 lugares, e fetch duplicado em produto e loja a cada visita. |
| Escalabilidade | ★★★★☆ | Modelagem relacional (FKs confirmadas na Sprint 3.4.1) e separação em camadas são boas bases; padrão Produto→Loja replicado com sucesso. |
| Organização | ★★★★☆ | Estrutura de pastas clara e consistente; ruído real remanescente é o volume de placeholders vazios sem marcação padronizada. |
| Código | ★★★☆☆ | TypeScript estrito e convenções de service consistentes, mas a Sprint 3.4.1 confirmou que `as Tipo[]` sem validação em runtime esconde bugs reais (`offer`/`store`) que nenhum lint/TS pega — perde 1 ponto a mais do que na auditoria anterior. |
| Manutenibilidade | ★★★★☆ | Convenções claras e documentadas (`CLAUDE.md`), fácil para outro dev continuar; risco principal é justamente assumir que um tipo reflete o banco sem verificar — exatamente a causa raiz do achado desta sprint. |
| Prontidão para Produção | ★★☆☆☆ | Código pronto para os 3 domínios centrais, mas **sem dados reais** (ADR-007) e com bugs confirmados de tipo↔schema que vão aparecer assim que houver dados (ADR-008) — duas camadas de risco antes de estar pronto para usuários reais. |

**Média geral: ≈ 3,5/5** — fundação arquitetural sólida, mas a auditoria de dados revelou que a camada de tipos não é tão confiável quanto o lint/TS sugeriam. Consistente com a estimativa de **40%** em `docs/PROJECT_STATUS.md` (percentual de funcionalidades implementadas não muda — o que muda é a confiança na correção do que já existe).
