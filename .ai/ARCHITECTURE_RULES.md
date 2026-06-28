# ARCHITECTURE_RULES.md

> Bloco 1 do ParaguAI Engineering Framework (PEF). Este documento define **princípios atemporais** de arquitetura — onde o código pertence, como as camadas se relacionam, como decidir entre reutilizar e criar, como escalar. Para o estado **real e atual** da arquitetura (o que existe hoje, com exceções e dívidas), ver `docs/architecture/ARCHITECTURE.md`, que é gerado por leitura de código e deve ser consultado junto com este documento, nunca no lugar dele.

## Propósito

Princípios sem estado real para confrontar viram dogma desatualizado; estado real sem princípios para guiar vira cópia do que já existe, certo ou errado. Este documento é a metade estável: as regras que `docs/architecture/ARCHITECTURE.md` deveria estar seguindo a cada nova auditoria.

## Princípios Arquiteturais

1. **Fluxo de dados unidirecional por camada.** Dados sempre fluem `types → services → hooks → components → app`, nunca ao contrário, nunca pulando uma camada por conveniência (uma página jamais chama o Supabase direto — sempre via service).
2. **Cada domínio é uma fatia vertical, não uma camada horizontal.** Produto, Loja, Busca, Catálogo cada um ganha sua própria pasta em `components/`, seu próprio `hooks/use<Domínio>.ts` quando há estado client-side real, seu próprio `<domínio>.service.ts` — mas todos compartilham o mesmo padrão de camadas.
3. **Nenhuma duplicação de lógica de negócio ou de componente.** Antes de criar, perguntar "isso já existe em outro domínio com um nome ligeiramente diferente?" — ver "Reutilização" abaixo.
4. **Server Component é o padrão; Client Component é a exceção justificada.** Um componente só recebe `"use client"` quando precisa de estado, efeito, API de navegador, ou hook de navegação client-side — nunca por hábito.
5. **Tipos são contrato com a realidade, não com a intenção.** Um tipo TypeScript que modela uma tabela do Supabase deve refletir o schema real confirmado, não o que parecia razoável escrever na primeira vez (causa raiz do ADR-008 — ver `docs/architecture/DOMAIN_MODEL.md`).
6. **Toda query ao banco pensa em escala desde a primeira versão.** Filtro, paginação e contagem são resolvidos no banco (via PostgREST/SQL), nunca carregando tudo para filtrar em memória — a única exceção tolerada é uma limitação documentada com plano de correção (ver "Escalabilidade" abaixo).

## Organização por Domínios

A árvore de pastas real e completa está em `docs/architecture/ARCHITECTURE.md` ("Estrutura de pastas (real)") — não duplicada aqui. A regra que essa árvore deve sempre respeitar:

```
app/<domínio>/              rotas — Server Component por padrão
components/<domínio>/       componentes de apresentação do domínio
hooks/use<Domínio>.ts       estado client-side do domínio (só quando necessário)
services/<domínio>.service.ts   toda query ao Supabase do domínio
types/<domínio>.ts          tipos do domínio, 1:1 com a tabela + tipos de composição
```

Um domínio novo deve, sempre que possível, **espelhar deliberadamente um domínio já validado** em vez de inventar uma estrutura própria — foi assim que Loja (Sprint 3.4) espelhou Produto, e como o Catálogo (Sprint 3.5) seguiu o padrão de Busca para SEO/`<Suspense>`. Divergir do padrão estabelecido é uma decisão arquitetural e exige registro em `docs/operations/DECISIONS.md`, não um acidente de implementação.

## Responsabilidades das Camadas

- **`types/`**: uma interface por entidade, nome em `PascalCase`, arquivo em `camelCase` singular. Tipos de composição (joins, agregações para exibição) existem como interfaces próprias (`extends` ou paralelas), nunca como `any`/`Record<string, unknown>`.
- **`services/`**: única camada que toca `lib/supabase.ts`. Toda função retorna o tipo esperado ou um valor vazio seguro (`[]`/`null`) em erro — nunca lança exceção para erro de query (ver `CODING_RULES.md`, Tratamento de Erros).
- **`hooks/`**: estado e efeitos do lado cliente para um domínio. Um hook nunca deveria existir só para repassar uma chamada de service sem agregar estado real — se um Server Component pode chamar o service direto, ele deve fazer isso, sem hook no meio.
- **`components/`**: apresentação. Nunca importa de `services/` ou `lib/` diretamente — só de `types/`, `utils/`, `styles/`, `constants/`, outros `components/`, e (só em Client Components) `hooks/`.
- **`app/`**: composição de rota. Server Component por padrão chama `services/` diretamente (com `cache()` quando o mesmo dado é usado por `generateMetadata` e pelo corpo da página); só usa um hook quando a página precisa de refetch ou interação genuinamente client-side.

## Fluxo de Camadas

```
types/*.ts → services/*.service.ts → hooks/use*.ts → components/* → app/*
```

Duas variações válidas, ambas em uso hoje (ver `docs/architecture/ARCHITECTURE.md` para onde cada uma é aplicada):

- **Fluxo client-side** (`/product/[slug]`, `/store/[slug]`): a página é Client Component, busca via hook, que chama o service. Aceito como padrão histórico, mas **não é o padrão recomendado para domínios novos** (ver Regras de Server vs Client abaixo).
- **Fluxo server-first** (`/search`, `/products`): a página é Server Component, chama o service direto (com `<Suspense>` em torno da parte que depende de dados), sem hook de fetch. **Este é o padrão recomendado para qualquer domínio novo** — menos código, sem fetch duplicado entre layout e página, melhor streaming.

O grafo real de imports entre arquivos (sem ciclos confirmados) está em `docs/architecture/DEPENDENCY_GRAPH.md`.

## Regras de Server vs Client Components

Um componente só é Client quando precisa de pelo menos um destes: `useState`/`useEffect`, API de navegador (`localStorage`, `IntersectionObserver`, clipboard), ou hook de navegação client-side (`useParams`, `useRouter`, `useSearchParams`). Tudo o resto é Server Component, mesmo recebendo props complexas.

Páginas inteiras marcadas `"use client"` por conveniência (padrão usado em `/product/[slug]` e `/store/[slug]`) são uma exceção histórica documentada, não a regra — perdem streaming/SSR para conteúdo que poderia ser estático. `/products` (Sprint 3.5) é a referência atual do padrão correto: página Server, com um Client Component pequeno (`ProductFilters`) isolado só para a parte que realmente precisa de interação, e a URL como fonte de verdade do estado (via hook dedicado, ex. `useProductFilters`) em vez de estado React solto.

## Reutilização

Antes de criar um componente, service ou hook:

1. Consultar `docs/architecture/COMPONENT_INDEX.md` e `docs/architecture/API_CONTRACTS.md` — a função ou componente pode já existir, talvez com um nome ligeiramente diferente do esperado.
2. Se dois componentes existentes fazem quase a mesma coisa (mesmo layout, props diferentes), a resposta é unificá-los com props mais genéricas — nunca criar um terceiro. Exemplo de referência: `ProductCard` (ADR-010) unificou o que antes eram `ProductCard` e `ProductHighlightCard`, usando props achatadas (`slug`, `name`, `imageUrl`...) em vez do tipo de domínio completo, para que qualquer domínio possa reaproveitar sem acoplamento.
3. Um componente genérico (`components/ui/`) deve receber dados já resolvidos pelo chamador (props primitivas), nunca um tipo de domínio inteiro — isso é o que permite reaproveitar entre domínios (`Breadcrumb`, `Pagination`, `Select`, `Input` são os exemplos atuais).
4. Lógica pequena e repetida (ex.: escapar caracteres de `LIKE`/`ILIKE`) pertence a `utils/`, compartilhada — nunca duplicada arquivo a arquivo (`utils/search.ts` é o exemplo atual, extraído quando o segundo consumidor apareceu).

## Escalabilidade

O objetivo declarado do produto é suportar milhões de produtos e centenas de milhares de usuários (`docs/archive/ROADMAP.md`). Isso muda decisões de hoje:

- **Filtro sempre no banco.** Filtrar por categoria/marca/loja/preço/disponibilidade é resolvido via query (incluindo filtros sobre tabelas relacionadas, via embedding do PostgREST), nunca buscando tudo e filtrando em JavaScript.
- **Paginação sempre real**, via `.range()`/`count: "exact"` (ou equivalente), nunca limitando um array já carregado por completo.
- **Ordenação por uma coluna nativa é grátis; ordenação por uma agregação entre tabelas não é.** Quando a ordenação depende de um cálculo entre tabelas (ex.: menor preço entre as ofertas de um produto), o caminho correto em escala é uma view ou função no banco — não uma solução de aplicação que tenta simular isso (overfetch, deduplicação client-side). Quando essa view ainda não foi aprovada/aplicada, a limitação é implementada da forma mais honesta possível (corrigir o que está visível na página atual) e **documentada explicitamente como dívida**, com uma proposta de migration registrada (não aplicada) — nunca escondida atrás de uma aproximação que parece certa. Exemplo de referência: ADR-011 e `database/migrations/0003_proposed_product_catalog_price_view.sql`.
- **Mudança de schema nunca é decidida pela camada de aplicação.** Quando uma feature precisaria de uma coluna, view ou índice novo, a resposta é propor uma migration (arquivo em `database/migrations/`, não aplicada) e pedir aprovação — nunca alterar o banco a partir do código sem esse passo.

## Convenções Arquiteturais

- **Uma única fonte de acesso a `process.env`**: `lib/env.ts` (ADR-001). Nenhum outro arquivo lê `process.env` diretamente.
- **Migrations são propostas, nunca aplicadas pelo código.** Todo arquivo em `database/migrations/` é uma proposta para revisão humana — `npm run build`/deploy nunca executa SQL contra o Supabase.
- **Toda divergência entre um tipo TypeScript e o schema real, uma vez encontrada, é corrigida na origem** (o tipo), não contornada no componente que a usa — ver ADR-009 como o exemplo de correção completa (tipo → service → todos os componentes consumidores, na mesma sprint).

## Relação com outros documentos

`docs/architecture/ARCHITECTURE.md` é o companheiro obrigatório deste documento (estado real vs. princípio). `docs/architecture/DOMAIN_MODEL.md`, `docs/architecture/API_CONTRACTS.md`, `docs/architecture/COMPONENT_INDEX.md` e `docs/architecture/DEPENDENCY_GRAPH.md` são os inventários gerados que comprovam (ou contradizem) que os princípios acima estão sendo seguidos. Ver `CODING_RULES.md` para como o código dentro de cada camada deve ser escrito, e `PROJECT_RULES.md` para quando uma auditoria de arquitetura é obrigatória.
