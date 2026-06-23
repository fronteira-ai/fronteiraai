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
- **ADR-006**: contato e horário de funcionamento da loja não foram implementados — não existem no schema real do Supabase. Proposta de migration em `database/migrations/0001_proposed_store_contact_hours.sql`, **não aplicada**, aguardando aprovação.
- **ADR-007**: testando manualmente contra o Supabase real, as 5 lojas cadastradas têm `slug: null`, e `products` tem 0 linhas. Os três domínios centrais da Home (Produto, Busca, Loja) estão **code-complete**, mas sem dado real navegável em produção hoje. Isso não é resolvido por código — precisa de alguém com acesso ao Supabase popular `slug` e cadastrar produtos/ofertas.

## Sprint atual (avaliação)

Release 0.2 (Produto), Release 0.4 parte 1 (Busca) e Release 0.3 (Loja) estão concluídos no código. Os três domínios centrais da Home estão tecnicamente fechados. O gargalo real para qualquer demo com dados de produção passou a ser **dados**, não código — ver ADR-007.

**Próxima sprint recomendada**: Sprint 3.5 — ver proposta detalhada abaixo. Antes (ou em paralelo, fora do código), recomendo fortemente popular `stores.slug` e cadastrar ao menos alguns `products`/`offers` reais no Supabase, ou aprovar um script de seed proposto (ver Sprint 3.5).

---

## Roadmap proposto (próximos passos imediatos)

## Sprint 3.5 (proposta)

**Objetivo**: com os três domínios centrais (Produto, Busca, Loja) code-complete, esta sprint foca em (a) tornar os dados de demonstração testáveis sem tocar produção sem aprovação, e (b) fechar a Listagem de Produtos (`/products`), o próximo domínio mais próximo de "pronto" — `services/product.service.ts` (`getProducts`) já existe e está pronto, só falta rota e grid.

**Escopo**:
1. **Proposta de seed de dados** (não aplicada): gerar `database/seed/0001_proposed_demo_data.sql` com `UPDATE stores SET slug = ...` para as 5 lojas reais existentes (slugificando `name`) e alguns `INSERT INTO products`/`offers` de exemplo, no mesmo espírito da proposta de migration da Sprint 3.4 — documentado para revisão, **não executado** sem aprovação explícita (é dado de produção real, não fixture de teste).
2. **Listagem de produtos (`/products`)**: implementar `components/product/ProductGrid.tsx` (grid reaproveitando `ProductCard`, mesmo padrão de `StoreGrid`/`RelatedProducts`), criar `app/products/page.tsx` com filtro por categoria via `searchParams` (mesmo padrão de `app/search/page.tsx` lendo `?q=`), usando `getProducts()` já implementado.
3. **Categorias/marcas dinâmicas**: implementar `services/category.service.ts`/`brand.service.ts` (hoje vazios) para alimentar `/products` e, eventualmente, substituir os mocks da Home (`Categories`, `Brands`) — decisão de trocar a Home por dados reais pode ficar para uma sprint própria, manter esta com escopo de `/products`.
4. Atualizar `Navbar`/`Footer` (`/products` deixa de ser link morto).

**Riscos**: 🟡 Médio — a parte de seed/dados depende de decisão do CTO sobre alterar produção; a parte de código (grid + rota) é de baixo risco, já validada pelo padrão de Loja/Produto.

**Estimativa**: 2–3 dias de código + tempo de decisão/aprovação para a parte de dados (fora do controle do Claude Code).

**Impacto no produto**: primeira oportunidade real de testar Produto/Busca/Loja com dados de verdade (se a proposta de seed for aprovada), e fecha a navegação de `/products`, reduzindo os links mortos restantes no Navbar/Footer.

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
| UX | ★★★☆☆ | Home, produto, busca e loja têm boa execução visual e código funcional; mas sem dados reais navegáveis hoje (ver ADR-007) e com links mortos remanescentes (`/products`, `/compare`, `/categories/[slug]`, etc.). |
| SEO | ★★★★☆ | Produto, Busca e Loja têm metadata+JSON-LD bem feitos (`Product`, `WebSite`/`SearchAction`, `LocalBusiness`); falta só Home ganhar Open Graph/canonical próprios e sitemap/robots.txt. |
| Performance | ★★★☆☆ | `<img>` em vez de `next/image` em 6 lugares, e fetch duplicado em produto e (agora) loja a cada visita. |
| Escalabilidade | ★★★★☆ | Modelagem de dados (price na offer, não no produto) e separação em camadas são boas bases; padrão Produto→Loja replicado com sucesso, mostra que a arquitetura escala para novos domínios. |
| Organização | ★★★★☆ | Estrutura de pastas clara e consistente; ruído real remanescente é o volume de placeholders vazios sem marcação padronizada. |
| Código | ★★★★☆ | TypeScript estrito, convenções de service consistentes, zero erros de lint/TS; perde ponto pelos `as Tipo[]` sem validação. |
| Manutenibilidade | ★★★★☆ | Convenções claras e documentadas (`CLAUDE.md`), fácil para outro dev continuar; risco principal é justamente arquivo vazio parecendo implementado (causou o incidente de deploy investigado em sprint anterior). |
| Prontidão para Produção | ★★☆☆☆ | Código pronto para os 3 domínios centrais, mas **sem dados reais** (`stores.slug` nulo, `products` vazia — ADR-007) e com rotas de menu ainda inexistentes — não está pronto para usuários reais ainda, e agora por motivo de dados, não só de código. |

**Média geral: ≈ 3,7/5** — fundação sólida e os três domínios centrais da Home code-complete; o gargalo deixou de ser "falta implementar" e passou a ser "falta dado real". Consistente com a estimativa de **40%** em `docs/PROJECT_STATUS.md`.
