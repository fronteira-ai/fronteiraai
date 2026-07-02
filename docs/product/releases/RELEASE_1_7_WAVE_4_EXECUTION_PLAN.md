# RELEASE_1_7_WAVE_4_EXECUTION_PLAN.md
# Plano de Execução Técnica — Wave 4: Canonical Catalog & Compare Foundation

**Versão**: 1.0
**Criado**: 2026-07-01
**Status**: Entregue e certificado
**Referência**: `docs/product/releases/RELEASE_1_7_BLUEPRINT.md` v1.2 (Capítulo 4 — Waves, re-escopo do CTO)
**Arquitetura base**: Release 1.7 — Wave 3 — `docs/product/releases/RELEASE_1_7_WAVE_3_EXECUTION_PLAN.md`

---

## Premissa

Este documento detalha a execução técnica da Wave 4. Waves 5–6 serão detalhadas em documentos equivalentes quando sua vez chegar no ciclo faseado.

## Re-escopo do CTO (pré-implementação)

A Wave 4 original deste Release era "Merchant Claim + Onboarding". Em 2026-07-01 o CTO re-escopou a Wave 4 para o Canonical Catalog, priorizado por ser a fundação de que Compare, Search, Recommendation Engine, Merchant Intelligence e o Brain dependerão. Merchant Claim + Onboarding foi realocado para a nova Wave 5 (Blueprint v1.2).

## Decisões numeradas

1. **`src/domains/canonical-catalog/` é um domínio fundação, não um domínio comum.** Nunca depende de `connectors/` nem de `product-identity/` — todos os outros domínios podem depender dele. Isso estende a regra de convergência do Capítulo 8 (Product Identity) um nível abaixo: `product-identity/` agora depende de `canonical-catalog/` para candidatos de merge, nunca o contrário.
2. **O bootstrap 1:1 não é uma união.** Todo `products` existente ganha exatamente um `canonical_products` (reaproveitando o `slug` já único do produto — migration `0008` — como `canonical_slug`, sem risco de colisão), e toda `offers` sob esse produto ganha `canonical_product_id` correspondente. Isso é um espelhamento sem perda, não uma fusão — não viola a regra "nenhuma união automática". `products.slug`/`offers.product_id` nunca são tocados — `/product/[slug]` continua resolvendo exatamente como antes.
3. **`MergeCandidate` (canonical-vs-canonical) é distinto do `product_identity_match_log` da Wave 3 (offer-vs-produto-existente).** O primeiro é uma sugestão revisável, com ciclo de vida de status (`pending`/`approved`/`rejected`/`ignored`); o segundo é um log de auditoria informacional por sincronização. Ambos compartilham o mesmo motor de scoring (`ProductIdentityEngine`), mas servem propósitos diferentes.
4. **Mesmo "aprovar" não executa uma união real nesta Wave.** `IMergeCandidateRepository` não tem nenhum método que reatribua `offers.canonical_product_id` ou depracie um `canonical_products` — a garantia é estrutural (não existe o código para fazer isso), não apenas uma convenção documentada. Executar merges aprovados fica para uma Wave futura, uma vez que o mecanismo de revisão tenha dados reais para validar.
5. **Sem UI de admin nesta Wave** (confirmado com o CTO) — `GET`/`PATCH /api/admin/canonical-catalog/merge-candidates` são reais e testados, mas nenhuma página os consome ainda. Mesmo precedente do shadow log da Wave 3.
6. **`canonical_slug` é reservado para uma URL pública futura, não ativada nesta Wave** (confirmado com o CTO) — nenhuma rota `/produto/[slug]` nova. `GET /api/canonical-catalog/[slug]` existe e é testável, mas nenhuma página o consome ainda.
7. **Offer Ranking nunca usa Reputation Score.** Restrição permanente desde o Release 1.5 (`docs/releases/RELEASE_CERTIFICATION_1.5.md`: "Zero Reputation Score... nenhum componente calcula ou exibe score de reputação"). O fator "trust" do `OfferRankingService` é um booleano explícito (`stores.is_verified`, coluna já existente), resolvido pelo chamador — o serviço nunca computa nem consulta um score de reputação.
8. **Price History Foundation não cria uma tabela nova.** Agrega `price_history` (inalterada desde a migration `0006`) por `offers.canonical_product_id` em tempo de leitura — mesma convenção "computado sob demanda" já usada por merchant-decision/catalog-intelligence.
9. **Wiring no `SyncOrchestrator` fica para uma Wave futura, nomeado explicitamente.** Esta Wave não adiciona bootstrap/merge-suggestion automático ao pipeline de sincronização de conectores — o pipeline já é complexo (Validation→Normalization→Deduplication→ProductIdentityShadow→Media→CatalogWrite); adicionar mais um estágio é escopo real de uma Wave dedicada, não um corte de canto silencioso aqui. O bootstrap desta Wave é um script standalone (`scripts/canonical-catalog-bootstrap.ts`).
10. **10 novos `TrustEventType`, taxonomia apenas.** Nenhum tem factory function nem ingestão real — nenhuma das superfícies de disparo existe ainda (sem página para os eventos `*Viewed`; sem `merchantId` natural para os eventos de sistema/admin). Mesma disciplina do `StoreDiscovered` da Wave 2.
11. **Achado não relacionado, documentado e não corrigido nesta Wave**: um teste de completude do registro do Brain descobriu 21 `TrustEventType` do Release 1.6 sem entrada em `TRUST_EVENT_BRAIN_IMPACT`. Registrado em `docs/engineering/TECH_DEBT.md`, não corrigido aqui — fora do escopo desta Wave.

## Verificação / Quality Gate

`npm run lint` (0) · `npx tsc --noEmit` (0) · `npm test` (245/245, suíte completa — 26 novos testes) · `npm run build` · `npm run db:lint` (4 migrations em `supabase/migrations/`, nenhum SELECT embutido).

**Migration `0025` requer aplicação manual do CTO** via `npm run db:push` (Database Migration System V2 — `docs/engineering/DATABASE_ENGINEERING.md`).

**Bootstrap não executado nesta sessão**: `scripts/canonical-catalog-bootstrap.ts --execute` grava no projeto Supabase real — fica para o CTO rodar quando a migration `0025` estiver aplicada, mesmo espírito de "ação em produção é o CTO quem decide quando" já estabelecido.

**Deferido explicitamente para Waves futuras**: execução real de merges aprovados; UI de Match Review; rota pública `/produto/[slug]`; wiring do bootstrap/merge-suggestion no `SyncOrchestrator`; emissão real dos 10 eventos Brain; correção do gap de 21 eventos legados (TECH_DEBT).
