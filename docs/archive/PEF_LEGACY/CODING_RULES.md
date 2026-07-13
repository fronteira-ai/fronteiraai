# CODING_RULES.md

> Bloco 1 do ParaguAI Engineering Framework (PEF). Este documento define **como o código é escrito** — sintaxe, nomenclatura, comentários, erros, componentização, acessibilidade. Para **onde** o código pertence (camadas, domínios), ver `ARCHITECTURE_RULES.md`. Para as convenções confirmadas no código real, com exceções marcadas explicitamente, ver `docs/engineering/CONVENTIONS.md` — este documento define a regra; aquele documento audita se ela está sendo seguida.

## Propósito

Padrão de código consistente não é estética — é o que permite a qualquer pessoa (ou IA) entender um arquivo que nunca viu sem precisar perguntar a quem escreveu. As regras abaixo já estão em uso no projeto; este documento as torna explícitas para que continuem sendo seguidas mesmo quando quem escreve código mudar.

## TypeScript

- **Modo estrito sempre**; nunca usar `any`. Quando o tipo de um valor é genuinamente desconhecido, usar `unknown` e refinar.
- **Tipos modelam a realidade, não a intenção.** Um tipo que representa uma tabela do Supabase deve ter exatamente os campos que a tabela tem, com os nomes reais — confirmados por consulta direta quando há qualquer dúvida, nunca assumidos a partir do nome ou de uma sprint anterior (ver `ARCHITECTURE_RULES.md`, Princípio 5).
- **Tipos de composição** (resultado de um `select()` com join, ou de uma agregação para exibição) são interfaces próprias — `extends` do tipo base quando fizer sentido, ou uma interface paralela. Nunca um `Record<string, unknown>` para "resolver depois".
- **`as Tipo[]`** é aceito como o padrão atual dos services (retorno do Supabase já validado pela query), mas é um risco conhecido: uma mudança de coluna no banco não quebra o TypeScript, só em runtime. Ao tocar um service que faz isso, não é necessário introduzir validação em runtime por conta própria (mudança de dependência, fora de escopo de uma tarefa pontual) — mas é obrigatório confirmar que o cast ainda corresponde ao schema real antes de confiar nele.

## React 19 / Next.js 16

Este projeto usa Next.js 16.2.9 e React 19.2.4 — versões mais novas que o conhecimento de treinamento de qualquer modelo de IA atual, com mudanças que quebram padrões antigos do App Router. **Antes de escrever qualquer código de rota, data-fetching ou config, ler o guia relevante em `node_modules/next/dist/docs/`** — esta regra está fixada em `CLAUDE.md` (raiz) e `docs/engineering/AGENTS.md` e não é repetida aqui além desta referência.

Regras específicas deste projeto sobre os dois frameworks:

- Server Component é o padrão (ver `ARCHITECTURE_RULES.md`). `"use client"` só no arquivo que realmente precisa, no nível mais baixo possível da árvore.
- `generateMetadata` busca apenas o que a metadata precisa (título, descrição, OG, canonical, robots) — nunca a listagem completa de dados que o corpo da página vai buscar de novo; quando os dois precisam do mesmo dado pontual (ex.: um produto por slug), usar `React.cache()` para não duplicar a query dentro da mesma requisição de servidor.
- Toda rota que depende de uma consulta que pode ser lenta usa `<Suspense>` com um fallback de skeleton dedicado, para que o resto da página (cabeçalho, filtros, navegação) não espere por ela.
- JSON-LD (`schema.org`) é adicionado via `<script type="application/ld+json">` com o conteúdo escapado (`.replace(/</g, "\\u003c")`) — nunca interpolado direto sem escapar.
- Combinações de filtro/paginação que geram conteúdo fino ou duplicado (resultados de busca, catálogo filtrado, página > 1) usam `robots: { index: false, follow: true }`; a versão "canônica" sem filtro permanece indexável.

## Nomenclatura

Ver `docs/engineering/CONVENTIONS.md`, seção "Nomenclatura", para a referência completa e auditada contra o código real. Resumo normativo:

- Componentes: `PascalCase.tsx`, um componente default-exportado por arquivo.
- Hooks: `camelCase.ts`, prefixo `use`.
- Services: `<domínio>.service.ts`, funções nomeadas exportadas (nunca default).
- Tipos: interface em `PascalCase`, arquivo em `camelCase` singular.
- Imports: sempre absolutos via `@/*`, nunca relativos cruzando camadas (excepção aceita: imports relativos dentro da mesma pasta de rota, ex. `./loading`).

## Comentários

- **Não escrever comentários que descrevem o que o código faz** — um nome de variável/função bem escolhido já faz isso.
- **Escrever um comentário apenas quando o "porquê" não é óbvio**: uma restrição invisível, uma decisão que parece estranha sem contexto, uma limitação conhecida, uma referência a uma decisão registrada. Exemplo de referência (`services/product.service.ts`): o comentário sobre a ordenação por preço ser "best effort" existe porque o código por si só não explica por que a solução não é a ideal — sem o comentário, alguém tentaria "corrigir" um comportamento que já é uma limitação conhecida e documentada (ADR-011).
- Nunca deixar `console.log` de depuração no código entregue. `console.error` é aceito e esperado no padrão de tratamento de erro de service (ver abaixo).

## Tratamento de Erros e Logs

Padrão único para toda função de `services/*.service.ts` que consulta o Supabase (ver `docs/engineering/CONVENTIONS.md`):

```ts
const { data, error } = await supabase.from("tabela").select(...);
if (error) {
  console.error(error);
  return [];   // ou null, para singulares
}
return data as Tipo[];
```

- Nunca lançar exceção para erro de query individual — sempre devolver um valor "vazio" seguro e logar.
- Excessão aceita: uma função que agrega várias consultas paralelas (ex.: busca global) pode lançar `Error` quando **todas** falham, porque não há resposta parcial sensata. Erro parcial (algumas falharam, outras não) ainda é logado e ignorado, devolvendo o que funcionou.
- Hooks e componentes tratam ausência de dados (`null`/`[]`), não exceções — isso simplifica toda a árvore de componentes acima do service.

## Componentização

- Componentes pequenos, com responsabilidade única — um componente que mistura busca de dados, lógica de filtro e apresentação visual deveria ser três coisas, não uma.
- Props de um componente reaproveitável entre domínios devem ser **primitivas/achatadas**, não o tipo de domínio inteiro — isso é o que permite reaproveitar sem acoplar o componente a um domínio específico (ver `ARCHITECTURE_RULES.md`, Reutilização, e o exemplo do `ProductCard` unificado).
- `memo()` é usado em componentes de apresentação que recebem props estáveis e são renderizados em lista (cards, itens de grid) — não em componentes únicos por página (`Navbar`, `Footer`, layouts de seção) nem em componentes que recebem `children` livres.

## Reutilização

Antes de escrever um componente, hook, service ou função utilitária nova, verificar se ela já existe (`docs/architecture/COMPONENT_INDEX.md`, `docs/architecture/API_CONTRACTS.md`) — ver `ARCHITECTURE_RULES.md` para o processo completo. No nível de código, isso significa especificamente: nunca copiar e colar um trecho de lógica de um arquivo para outro — extrair para `utils/` (lógica pura) ou um componente/hook compartilhado (lógica com estado/apresentação) na primeira vez que um segundo consumidor precisar dela.

## Acessibilidade

- Todo input de formulário tem um `<label>` associado (via `htmlFor`/`id`) ou, quando visualmente omitido, um `aria-label`.
- Controles de navegação (paginação, breadcrumb, abas) marcam o item ativo/atual com `aria-current`.
- Controles compostos só de ícone (botão de próxima página, busca no header) têm `aria-label` descrevendo a ação, nunca dependendo só do ícone.
- Elementos de navegação semântica (`<nav>`) declaram `aria-label` quando há mais de um `<nav>` na página (ex.: paginação vs. breadcrumb).
- Não há ainda varredura automatizada de acessibilidade configurada além do que `eslint-config-next` cobre — isso é uma lacuna conhecida (ver `docs/engineering/TECH_DEBT.md`), não uma regra deste documento a ignorar enquanto não for resolvida.

## Relação com outros documentos

`docs/engineering/CONVENTIONS.md` confirma (ou aponta exceção a) cada regra deste documento contra o código real — leia os dois juntos. `ARCHITECTURE_RULES.md` define onde o código vive; este documento define como ele é escrito uma vez que já sabe onde mora. `CHECKLIST.md` traduz a Definition of Done de `PROJECT_RULES.md` em passos verificáveis, que incluem confirmar as regras deste documento.
