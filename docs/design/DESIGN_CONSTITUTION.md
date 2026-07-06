# DESIGN_CONSTITUTION.md

**Versão**: 1.0
**Data**: 2026-07-06 (Release 1.9 — pós Program F Wave 1)
**Status**: LOCKED — congelamento visual aprovado pelo CTO
**Categoria**: `docs/design/` (11ª categoria oficial, ADR-050)

> Este documento não descreve como o visual da Home foi construído — `docs/engineering/PREMIUM_HOME_EXPERIENCE.md` já faz isso. Este documento declara que esse visual está **congelado** e define o que pode e não pode mudar a partir de agora.

---

## 1. Declaração

A Premium Home Experience (Release 1.9 — Program F — Wave 1), gerada a partir do design v0 e integrada aos domínios reais do ParaguAI, foi **oficialmente aprovada pelo CTO como o Design System do ParaguAI**.

A partir desta versão, o resultado visual da Home é **READ-ONLY**. Não é um rascunho em evolução — é a referência visual congelada para o restante do produto.

## 2. Superfície coberta pelo congelamento

Todo o visual renderizado por:

- `app/page.tsx` (Home)
- `app/categorias/page.tsx` (`/categorias`)
- Todos os componentes em `components/home/*.tsx` e `components/home/dashboard/*.tsx` (`Hero`, `HeroCTAs`, `HeroGlobe`, `SearchBar`, `DashboardStrip` e seus `*Card`, `EconomiaDoDia`, `StoreCarousel`, `Offers`, `AIShowcase`, `HowItWorks`, `Brands`, `ForLojistasSection`, `CTASection`, `LiveCameras`)
- Os tokens visuais definidos em `app/globals.css` que esses componentes consomem (paleta, sombras, tema espacial escuro)

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
9. **Não alterar o Hero** (`Hero`, `HeroCTAs`, `HeroGlobe`, `SearchBar`).
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

Ver ADR-050 (`docs/operations/DECISIONS.md`) para o registro formal desta decisão e da criação da categoria `docs/design/`.
