# DESIGN_CONSTITUTION.md

**Versão**: 1.3
**Data**: 2026-07-07 (RC-8 — UI Polish, exceção pontual ao ADR-053)
**Status**: LOCKED — congelamento visual aprovado pelo CTO como artefato de produção
**Categoria**: `docs/design/` (11ª categoria oficial, ADR-050)

> Este documento não descreve como o visual da Home foi construído — `docs/engineering/PREMIUM_HOME_EXPERIENCE.md` já faz isso. Este documento declara que esse visual está **congelado** e define o que pode e não pode mudar a partir de agora. Para o inventário vivo de componentes (status, dono, dependências, impacto), ver `docs/design/HOME_COMPONENTS.md`.

---

## 0. Histórico de versões

- **v1.0** (2026-07-06, Program F Wave 1): primeiro congelamento, sobre a Premium Home Experience original.
- **v1.1** (2026-07-06, Program F Wave 2): **realinhamento contra o export oficial do v0.app** (`premium-home-interface-mRmShqDN4kh`), aprovado explicitamente pelo CTO como nova referência — não uma correção pontual, mas a substituição do visual congelado (nova paleta OKLCH, par tipográfico Sora+Inter, hero fotográfico, dashboard reestruturado em duas fileiras + faixa de confiança/CTA de lojista). Ver `docs/operations/CHANGELOG.md` (entrada "Program F — Premium Home Experience, Wave 2") para o detalhe do que mudou e por quê. O card de Câmeras ao Vivo manteve deliberadamente o estado honesto "Em breve" mesmo onde o export do v0 mostrava um badge permanente "Ao vivo" sem feed real — exceção explícita, registrada aqui por transparência, não um desvio do export.
- **v1.2** (2026-07-06, RC-7): reafirmação do congelamento como **artefato de produção** após duas rodadas de correção explicitamente autorizadas (RC-5: realinhamento de tokens/imagem contra um novo export do v0; RC-6: sistema de largura/containers restaurado para 1600px, incluindo `Navbar`, e preenchimento vertical de `StoreCarousel`/`CategoriesCard` corrigido). A partir desta versão, **toda evolução visual futura ocorre exclusivamente por Sprint isolada de um único componente** (ver §7) — nunca mais de um componente por Sprint sem autorização explícita do CTO. Ver ADR-053 (`docs/operations/DECISIONS.md`).
- **v1.3** (2026-07-07, RC-8): **exceção pontual e nomeada** ao processo de Sprint isolada (§7/ADR-053), concedida pelo CTO para um único UI Polish coordenado de ritmo vertical e tipografia — não uma revogação do processo, que volta a valer na próxima mudança. Escopo estrito: espaçamento (padding/margin) e escala tipográfica de heading, nunca cor/estrutura/ordem. `MarketPulseCard.tsx` e `DashboardCardShell.tsx` explicitamente preservados bit-a-bit; componentes de UI compartilhados fora de Home (`Button`, `Chip`, `Container`, `ProductCard`) não tocados para conter o blast radius a Home. Ver ADR-054 (`docs/operations/DECISIONS.md`) para o registro completo e `docs/design/HOME_COMPONENTS.md` para o que mudou em cada componente.

## 1. Declaração

A Premium Home Experience (Release 1.9 — Program F), gerada a partir do design v0 e integrada aos domínios reais do ParaguAI, foi **oficialmente aprovada pelo CTO como o Design System do ParaguAI**.

A partir desta versão, o resultado visual da Home é **READ-ONLY**. Não é um rascunho em evolução — é a referência visual congelada para o restante do produto.

## 2. Superfície coberta pelo congelamento

Todo o visual renderizado por:

- `app/page.tsx` (Home)
- `app/categorias/page.tsx` (`/categorias`)
- Todos os componentes em `components/home/*.tsx` e `components/home/dashboard/*.tsx` (`Hero`, `HeroStats`, `HeroCTAs`, `SearchBar`, `DashboardStrip` e seus `*Card`, `StoreCarousel`, `LiveCameras`, `BottomCta`, `EconomiaDoDia`, `Offers`, `AIShowcase`, `HowItWorks`, `Brands`, `ForLojistasSection`, `CTASection`)
- `components/layout/Navbar.tsx` e `components/layout/Footer.tsx` — compartilhados por todo o site, mas seu resultado visual **como renderizado na Home** também está congelado a partir da v1.2 (RC-6 já alinhou o `Navbar` a `max-w-[1600px]` com aprovação explícita do CTO); qualquer mudança futura nesses dois arquivos é uma Sprint própria (§7) e deve considerar o impacto sitewide antes de propor
- Os tokens visuais definidos em `app/globals.css` que esses componentes consomem: paleta de marca (`brand-blue`/`brand-cyan`/`brand-purple`/`positive`/`negative`/`amber`, bloco `@theme`), utilitário `glass-card`, e as faces `--font-home-display`/`--font-home-sans` (Sora + Inter, escopadas ao `<main>` de `app/page.tsx` — nenhuma outra página do site usa essas fontes)

`HeroGlobe.tsx` (a ilustração CSS/SVG do globo) foi removida na v1.1 — substituída pelo hero fotográfico (`public/hero-bridge.png`) e não tem mais nenhum uso no código.

## 3. O que está proibido

Sem uma nova decisão explícita do CTO (nova versão deste documento):

1. **Não redesenhar** a Home ou `/categorias` — nem parcial, nem total.
2. **Não alterar espaçamento** (padding, margin, gap) de nenhum bloco existente.
3. **Não alterar tipografia** (família, peso, escala, tracking).
4. **Não alterar proporções** (dimensões de card, aspect ratio, grid).
5. **Não alterar sombras** (`box-shadow`, glow, elevação).
6. **Não alterar cores** (paleta, gradientes, tema escuro espacial).
7. **Não alterar a estrutura visual dos cards** (`StoreCard`, `DashboardCardShell` e os `*Card` do dashboard).
8. **Não alterar a navegação** (estrutura, ordem, comportamento visual do header/nav).
9. **Não alterar o Hero** (`Hero`, `HeroStats`, `HeroCTAs`, `SearchBar`).
10. **Não alterar o layout** (ordem dos blocos, estrutura de `<Suspense>`, composição de `app/page.tsx`).
11. **Não substituir componentes** por reinterpretações — nem "melhorias" visuais não solicitadas.

Isto vale mesmo quando a mudança pareceria uma melhoria genuína. Uma sugestão de redesign é bem-vinda como **proposta ao CTO**, nunca como execução direta.

## 4. O que continua permitido — e é o trabalho esperado

O congelamento é sobre **pixel**, não sobre o sistema por trás dele. Continua explicitamente permitido e esperado:

- **Integrar a UI a services reais** — conectar qualquer parte ainda mockada/estática a `lib/home-premium-service.ts` e aos domínios estratégicos já existentes (Market Intelligence, Canonical Catalog, Marketplace Operations, Exchange Intelligence, Connector Platform).
- **Remover código duplicado** — sem tocar no resultado visual renderizado.
- **Melhorar performance** — cache, `revalidate`, streaming, redução de payload, otimização de imagem (`next/image`), tudo desde que o pixel final seja idêntico.
- **Melhorar acessibilidade** — `aria-*`, contraste dentro da paleta já aprovada, navegação por teclado, semântica HTML — desde que não altere a aparência visual.
- **Melhorar SEO** — metadata, `sitemap.ts`, `robots.ts`, dados estruturados, semântica de heading.
- **Melhorar manutenibilidade** — refatorar internamente (nomes, organização de arquivo, extração de lógica para services/hooks) sem alterar o DOM visual resultante.
- **Corrigir bugs reais** (ex.: link morto, dado fabricado exibido em vez de estado vazio honesto) — corrigir o bug, não redesenhar o componente ao redor dele.

**Regra prática**: se a mudança é observável a olho nu (algo parece diferente na tela), ela é proibida sem aprovação explícita. Se a mudança é invisível ao usuário (mesmo pixel, código diferente por trás), ela é bem-vinda.

## 5. Como pedir uma exceção

Uma mudança visual genuinamente necessária (ex.: um bug de acessibilidade que só se resolve mudando contraste de cor) não é decidida unilateralmente por quem implementa. O caminho é:

1. Nomear a mudança e a justificativa ao CTO.
2. Esperar aprovação explícita.
3. Só então versionar este documento (v1.0 → v1.1) e registrar o que mudou e por quê — nunca editar o congelamento silenciosamente.

## 6. Relação com o resto do Knowledge System

Este documento não substitui `docs/engineering/PREMIUM_HOME_EXPERIENCE.md` (que descreve a arquitetura técnica por trás da Home) nem `docs/foundation/PRODUCT_PRINCIPLES.md` (que define filosofia de produto permanente). Ele adiciona uma camada específica: **o resultado visual desta Wave específica é, a partir de agora, a referência congelada**, não apenas um estado de passagem.

Ver ADR-050 (`docs/operations/DECISIONS.md`) para o registro formal desta decisão e da criação da categoria `docs/design/`. Ver ADR-053 para o registro formal do congelamento v1.2 e do processo de Sprint por componente (§7).

## 7. Desenvolvimento futuro: exclusivamente por Sprint de componente isolado

A partir da v1.2, nenhuma exceção ao congelamento (§5) é concedida em bloco para "a Home" — apenas para **um componente nomeado por vez**. Todo pedido de mudança visual futura segue esta sequência fixa, sem pular etapas:

1. **Auditar** somente o componente-alvo (nunca a Home inteira).
2. **Listar problemas** encontrados nesse componente.
3. **Propor melhorias**, nomeando a mudança e a justificativa.
4. **Aguardar aprovação explícita** do CTO antes de qualquer edição.
5. **Modificar apenas aquele componente** — nenhum outro arquivo de `components/home/**`, layout global, wrapper, grid, container, service, API ou integração pode ser tocado na mesma Sprint.
6. **Quality Gate**: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` — todos verdes.
7. **Aguardar aprovação** do resultado antes de finalizar.
8. **Commit** — só então a Sprint é considerada concluída.

Definition of Done de uma Sprint de componente: nenhum outro componente foi alterado; build, testes, lint e typecheck passaram; responsividade preservada; nenhuma regressão visual observável.

O inventário de componentes — status atual, última alteração, responsável, dependências e impacto — vive em `docs/design/HOME_COMPONENTS.md`, atualizado ao final de cada Sprint. Este documento (`DESIGN_CONSTITUTION.md`) permanece a fonte das regras permanentes; `HOME_COMPONENTS.md` é o registro operacional vivo.
