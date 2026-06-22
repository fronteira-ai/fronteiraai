# CHANGELOG.md

Reconstruído a partir do histórico real de commits (`git log`) e do estado atual do código. Formato: data, commit, o que mudou de fato (verificado no diff/estado resultante, não só na mensagem).

## 2026-06-15 — `fd07de5` Primeira versão do ParaguAI

Commit inicial do repositório.

## 2026-06-20 — `70e0698` feat: initialize ParaguAI architecture

Define a estrutura de pastas oficial (`app/`, `components/`, `hooks/`, `services/`, `types/`, `lib/`, `utils/`, `database/`, `docs/`, `ai/`, `assets/`), os documentos de processo (`docs/CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/PROJECT_STATUS.md`), o `lib/supabase.ts`, e a maior parte dos placeholders vazios (services, types, hooks, utils, styles) que ainda existem hoje. Estabelece o convênio "arquivo vazio = trabalho planejado, não esquecido".

## 2026-06-21 — `1c5319a` feat(product): implementa Release 0.2 e Sprint 2.2 do domínio Produto

Primeira feature funcional ponta-a-ponta: rota `/product/[slug]` completa (`page.tsx`, `layout.tsx` com `generateMetadata`+JSON-LD, `loading.tsx`, `error.tsx`, `not-found.tsx`), componentes do domínio Produto (`ProductCard`, `ProductGallery`, `ProductHeader`, `ProductSpecifications`, `ProductOffers`, `ProductBreadcrumb`, `RelatedProducts`, `FavoriteButton`, `ShareButton`, `ProductHighlightCard`), `hooks/useProduct.ts`, `hooks/useFavorites.ts`, `services/product.service.ts`, `services/offer.service.ts` com integração real ao Supabase. Cumpre o Release 0.2 do roadmap original.

## 2026-06-21 — `33860e9` feat(home): reconstrói a Home (Sprint 3.0) e adiciona sistema de motion (Sprint 3.2)

Reescreve toda a Home com as 10 seções atuais (`Hero`, `Categories`, `Offers`, `FeaturesStores`, `AIShowcase`, `HowItWorks`, `Brands`, `Stats`, `CTASection`) usando dados de exemplo tipados com os tipos reais do domínio. Introduz o sistema de animação (`styles/animations.ts`, keyframes em `globals.css`, `Reveal`) usado de forma consistente em praticamente todo componente visual. Junto com este commit veio uma dependência nova de ícones (`lucide-react`) que **não foi declarada em `package.json`** — origem do problema corrigido no commit seguinte.

## 2026-06-22 — `9e8298e` fix: add lucide-react dependency

Adiciona `lucide-react` ao `package.json`/lockfile, que estava sendo importado por vários componentes desde o commit anterior sem estar declarado como dependência.

## 2026-06-22 — `ae432d3` fix: resolve Vercel deployment issues

Commit de correção de deploy — neste ponto, `types/store.ts` permanecia committed como arquivo vazio (0 bytes) mesmo sendo importado por 4 arquivos já commitados (`app/page.tsx`, `FeaturesStores.tsx`, `StoreCard.tsx`, `types/offer.ts`), causando `Type error: File 'types/store.ts' is not a module.` na Vercel apesar do build local funcionar (a versão real do arquivo existia apenas, não commitada, no disco local). Este commit resolve esse problema.

## 2026-06-22 — `3d3f1ff` chore: remove accidental package file

Remove um arquivo espúrio criado por um comando mal formatado no Windows (nome de arquivo contendo `:`), sem relação com código de produção.

## 2026-06-22 — `647382f` chore: trigger redeploy

Commit vazio/trivial para forçar um novo build na Vercel após as correções acima.

## 2026-06-22 — Sprint 3.2: Encerramento e Consolidação da Base de Engenharia (sem novas features)

Sprint declarada como "sem funcionalidades de negócio", focada em consolidar a base técnica:

- **`lib/env.ts`** passa a ser a única fonte de acesso a `process.env` no projeto. `lib/supabase.ts` e `constants/routes.ts` (que tinham cada um sua própria leitura de env var) agora importam `env` de lá. Mensagens de erro distinguem ambiente local (`.env.local`) de Vercel (painel do projeto), usando `process.env.VERCEL === "1"` para diferenciar. Ver ADR-001 em `docs/DECISIONS.md`.
- **`.gitignore`** corrigido: a regra `.env*` bloqueava silenciosamente `.env.example` (um template sem segredos, pensado para ser commitado). Adicionada a exceção `!.env.example`. O arquivo, que existia no lugar errado (`lib/.env.example`), foi movido para a raiz do projeto e ganhou a variável `NEXT_PUBLIC_SITE_URL` que faltava. Ver ADR-002.
- **`package.json`**: removido o script `format` (referenciava `prettier`, nunca instalado como dependência — script quebrado); `clean` reescrito de sintaxe `cmd.exe` (Windows-only) para um one-liner Node multiplataforma. Scripts `dev`/`build`/`start`/`lint`/`typecheck`/`check` confirmados presentes e funcionais. Ver ADR-003 e ADR-004.
- **Documentação**: criados `docs/DECISIONS.md`, `docs/CONVENTIONS.md`, `docs/API_CONTRACTS.md`, `docs/DOMAIN_MODEL.md`, `docs/COMPONENT_INDEX.md`, `docs/DEPENDENCY_GRAPH.md`. Atualizados `docs/PROJECT_STATUS.md`, `docs/ARCHITECTURE.md`, `docs/TECH_DEBT.md`, `docs/NEXT_STEPS.md` para refletir as mudanças acima.
- Validado: `npm run lint` (0 erros), `npm run typecheck` (0 erros), `npm run build` (sucesso) — incluindo um teste manual de remover/restaurar `.env.local` para confirmar a nova mensagem de erro.

Nenhuma rota, componente, hook ou comportamento visível ao usuário foi alterado nesta sprint.
