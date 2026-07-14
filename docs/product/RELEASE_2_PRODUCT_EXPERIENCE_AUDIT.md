# RELEASE_2_PRODUCT_EXPERIENCE_AUDIT.md
# RELEASE 2.0 — Fase 2 Closure — Product Experience Review

**Categoria**: `docs/product/`
**Data**: 2026-07-13
**Natureza**: auditoria de produto — nenhum código alterado. Toda evidência citada abaixo foi verificada diretamente no código-fonte atual (`app/page.tsx`, `app/product/[slug]/page.tsx`, `app/compare/[slug]/page.tsx`, e os componentes que renderizam).

---

## O que deve permanecer exatamente como está

- **A disciplina de composição em si** (nenhum score novo, toda evidência rastreável a um serviço nomeado) — é a vantagem estrutural real do ParaguAI e não deve ser sacrificada por velocidade.
- **`ParaguAIAdvisorComposer` como camada de decisão** — o conceito de uma composição de 2ª camada que unifica os composers de 1ª camada é correto; o problema é de apresentação (ver abaixo), não de arquitetura.
- **A honestidade de "Informação indisponível"/"Não há dados suficientes"** em todos os cards — nenhum outro comparador do mercado admite isso; é um diferencial de confiança genuíno.
- **`docs/design/DESIGN_CONSTITUTION.md` (Home congelada)** — o processo de governança em si está correto; o problema não é o freeze, é o que foi congelado antes de a inteligência existir.

## O que deve ser refinado

1. **Ordem do Recommendation Summary** — hoje `RecommendationSummary` (≤5 linhas, "entender em 10 segundos") renderiza *depois* do `ParaguAIAdvisor` completo em ambas as páginas (`app/product/[slug]/page.tsx:96-97`, `app/compare/[slug]/page.tsx:87-90`). Isso inverte a própria razão de existir do componente — o resumo deveria vir primeiro, com o card completo disponível para quem quiser detalhe.
2. **Metadados e copy do Home ainda dizem "comparador de preços"** — `app/page.tsx:43-61` (title, description, keywords, OpenGraph, Twitter card) usam literalmente "Compare preços", "comparador de preços", "A maior plataforma de comparação de preços do Paraguai". É o texto que aparece no Google e em qualquer link compartilhado — a primeira impressão de qualquer pessoa que nunca usou o produto ainda vende a versão anterior à Fase 2.
3. **"Perguntar para a IA" promete uma conversa que não existe** — `components/home/AIShowcase.tsx` mostra exemplos de perguntas em linguagem natural ("Quero um iPhone até US$900") e um botão "Perguntar para a IA" que leva a `/search`, uma busca por palavra-chave sem nenhuma IA conversacional. Isso é uma promessa quebrada no primeiro clique.
4. **Duas definições independentes de "loja verificada"** — `stores.is_verified` (campo legado, editado manualmente por admin, exibido em `CompareOfferCard.tsx`, `StoreCard.tsx`, `/lojas`) coexiste com `isVerifiedStore`/badges do domínio Trust (`TrustCard`, `BestDealCard`, `ParaguAIAdvisor`, o selo compacto de busca). Nada garante que concordem para a mesma loja — na página de comparação as duas aparecem lado a lado.

## O que deve ser simplificado

1. **Product Detail hoje empilha 4 cards de inteligência com sinais repetidos**: `ParaguAIAdvisor` (🛡️💰🕒) → `RecommendationSummary` → `BestDealCard` (repete 💰🛡️📈📦⏱🌎 + lista de razões) → `ShouldIBuyNowCard` (repete o veredito de timing com outro vocabulário) → `TrustCard` (repete verificação/badges/estoque/frescor). O comprador vê a mesma confiança e a mesma economia três vezes, com ícones e frases ligeiramente diferentes a cada vez.
2. **Compare page acrescenta uma quinta e sexta repetição**: `CompareSummary` (menor/maior preço, diferença, economia máxima — uma 3ª restatement da economia) e cada `CompareOfferCard` do rank 1 mostra "Recomendada: ..." mais um **"Score: 87/100" cru** — um número de algoritmo exposto diretamente ao comprador, contradizendo a própria disciplina de "nunca expor um score bruto" que o Advisor adota.
3. **Vocabulário de veredito de timing inconsistente entre os dois lugares onde aparece**: o Advisor usa "Sim, bom momento para comprar / Pode esperar / Melhor aguardar"; `ShouldIBuyNowCard` usa "Comprar agora / Pode esperar / Melhor aguardar" com emojis 🟢🟡🔴 próprios. É a mesma variável (`PurchaseTimingVerdict`) traduzida duas vezes, de duas formas.

## O que nunca deveria ter sido construído (nesta forma)

- **`ShouldIBuyNowCard`, `BestDealCard` e `TrustCard` como componentes visíveis simultaneamente ao lado do Advisor.** Cada um foi corretamente construído como o composer de 1ª camada que alimenta o Advisor — mas expô-los como três cards completos *adicionais* na mesma tela, em vez de como conteúdo expansível/drill-down dentro do próprio Advisor, foi a decisão que criou toda a redundância listada acima. O erro não é a inteligência; é tê-la duplicado na superfície em vez de consolidado.
- **O "Score: X/100" cru em `CompareOfferCard`** — um vestígio pré-Advisor que nunca foi revisitado depois que a filosofia de "nenhum número opaco, apenas sinais nomeados" foi formalizada em `DECISION_EXPERIENCE_GUIDE.md`.

## O que deve entrar na Release 2.1

1. **Consolidar os 4 cards de Product Detail/Compare em uma única superfície** — o Advisor como card primário, com um único ponto de "ver detalhes" (accordion/tab) que revela Best Deal/Timing/Trust como seções, não como cards irmãos repetidos.
2. **Atualizar o copy institucional (metadata, OG, Twitter, `AIShowcase`) para refletir "consultor inteligente de compras"** — isso é texto, não arquitetura, e é a mudança de menor esforço com maior impacto de posicionamento.
3. **Unificar a definição de "loja verificada"** — decidir qual das duas fontes é a autoritativa e aposentar (ou migrar) a outra.
4. **Remover o "Score: X/100" cru do `CompareOfferCard`**, substituindo por uma citação de fator nomeado (já existe `topFactors`/`factors[].evidence` — a informação certa já está ali, só precisa parar de mostrar o número junto).
5. **Decidir, deliberadamente, se/como o Advisor aparece na Home** — mesmo que a Home continue congelada visualmente, uma versão compacta do Advisor (ex.: no `EconomiaDoDia` ou em um novo card do `DashboardStrip`, via Sprint isolado por componente conforme ADR-053) resolveria o problema central desta auditoria: hoje nenhuma evidência de inteligência aparece antes do clique em um produto específico.
