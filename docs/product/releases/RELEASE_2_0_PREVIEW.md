# RELEASE_2_0_PREVIEW.md
# Release 2.0 — Preview

**Categoria**: `docs/product/releases/` (mesma família de `RELEASE_1_5_BLUEPRINT.md`.../`RELEASE_1_8_BLUEPRINT.md`)
**Criado**: 2026-07-08 (PROGRAM Z — RC-10, a partir do baseline de `docs/operations/PRODUCTION_BASELINE_1.9.md`)
**Status**: Preview — objetivos e escopo, sem Blueprint de execução, sem código

---

## Por que este Release existe

A Release 1.9 fechou o ciclo iniciado na Release 1.8: toda a fundação de engenharia (Connector Platform, Product Identity, Canonical Catalog, Exchange Intelligence, Real-Time Commerce, Market Intelligence, Marketplace Operations, Merchant Platform, Analytics/Decision/Growth Engine, Trust Platform) está consolidada, testada e verificada em produção, e a primeira experiência de produto construída sobre ela — a Home Premium — está publicada, congelada e auditada (ver `docs/operations/PRODUCTION_BASELINE_1.9.md`).

A Release 2.0 é o primeiro Release cujo mandato central deixa de ser "existe a infraestrutura?" e passa a ser "essa infraestrutura converte em decisão de compra, recomendação relevante e resultado para comprador e lojista?". O foco muda de plataforma para produto e inteligência.

---

## Objetivos

1. Transformar os dados já coletados (preço, catálogo, câmbio, mudança de mercado) em **recomendação e inteligência acionável** para quem compra e para quem vende — não apenas exibição.
2. Estender a Home Premium (hoje o único ponto de contato de produto) para uma **experiência de comprador completa** — não só a porta de entrada.
3. Fazer o **Merchant Platform** evoluir de painel operacional para parceiro de crescimento ativo, usando o que Growth Engine/Decision Engine (Release 1.6) já calculam.
4. Dar ao **ParaguAI Brain** (Trust/Knowledge Graph, existente desde a Release 1.5) seu primeiro conjunto de consumidores reais de produto, fechando a lacuna entre "mecanismo construído" e "mecanismo usado".
5. Manter a disciplina já estabelecida: nenhuma Wave duplica um Engine/domínio existente sem auditoria prévia; toda decisão de arquitetura de blast radius maior exige sua própria ADR (ver ADR-055, `docs/operations/DECISIONS.md`).

## Escopo

Cinco grandes domínios, sequenciados como Waves em `docs/product/ROADMAP_2_0.md`:

- **Marketplace Intelligence** — elevar Market Intelligence/Marketplace Operations (hoje compute-on-read, cobertura ainda baixa) a um nível de confiabilidade e escala que sustente as Waves seguintes.
- **Recommendation Engine** — primeiro motor de recomendação real do ParaguAI, construído sobre Canonical Catalog + Market Intelligence + Trust, não um domínio isolado.
- **Buyer Platform** — identidade e experiência do comprador além da Home (favoritos sincronizados, histórico, alertas reais usando o `BuyerAlertEngine` já existente em fundação).
- **Merchant Platform** — evolução do painel para recomendações de crescimento acionáveis, consumindo Decision Engine/Growth Engine já existentes.
- **ParaguAI Brain** — primeiros consumidores de produto reais do Knowledge Graph/Trust, hoje só instrumentado internamente.

### Fora de escopo desta preview

Blueprint de execução por Epic, cronograma, alocação de Waves a datas, e qualquer decisão de schema/API/componente — tudo isso é trabalho da(s) Wave(s) quando formalmente aberta(s), não desta preview.

## Como este Release decide o que construir

Mesma disciplina usada em toda Wave da Release 1.8/1.9: auditoria de sobreposição antes de qualquer código (o que já existe e faz isso?), preferência por estender um serviço existente a criar um novo domínio, gaps documentados em vez de mascarados por dado fabricado, e Quality Gate completo (lint/typecheck/testes/build) antes de qualquer Wave ser considerada concluída (ADR-051).

Ver `docs/product/ROADMAP_2_0.md` para o detalhamento Wave a Wave (objetivo, escopo, dependências, critérios de aceite, riscos).
