# RELEASE_2_FOUNDATION_COMPLETE.md
# RELEASE 2.0 — FOUNDATION & DISCOVERY CLOSURE

**Categoria**: `docs/product/`
**Data**: 2026-07-13
**Natureza**: encerramento oficial de fase — não é uma proposta, é um registro histórico do que já foi construído, descoberto e decidido entre a Primeira Versão (2026-06-15) e este momento.
**Escopo coberto**: Releases 0.1–1.9, Programs Ω/Δ/Σ/Ξ/Θ/Κ/Λ/Π, Fase 2 Sprints 2.2–2.8, Connector Platform V1→V3, Canonical Catalog, Product Identity, Trust, Merchant Intelligence/Analytics/Decision/Growth/Ownership, Realtime Commerce, Exchange, Market Insights, Marketplace Operations, Buyer Intelligence Discovery.

---

## 1. O que foi construído

**Plataforma base (Releases 0.1–1.4)**: Home, catálogo, busca, página de produto/loja, Compare Engine (ranking ADR-014), Admin Platform, Acquisition Engine → substituído pelo Connector Platform, primeiro conector real (Shopping China), Merchant OS completo (onboarding, dashboard, score, planos), Merchant Growth Platform (`/lojas`, `/para-lojistas`).

**Trust & Reputação (Release 1.5)**: domínio `trust/` completo — verificação progressiva, badges, sinais de confiança, reviews (schema), timeline pública, Merchant Passport, ponte com o Brain (Cognitive). Doutrina permanente: **Zero Reputation Score** — nunca um score opaco, sempre fatos verificáveis nomeados.

**Command Center + Analytics + Decision + Catalog Intelligence + Growth Engine (Release 1.6)**: 5 domínios voltados 100% ao lojista — saúde do merchant, funil de comportamento (`buyer_events`/`buyer_sessions` nascem aqui), motor de recomendação com 11 regras declaradas, saúde de catálogo por produto, estratégias de crescimento com `PriorityEngine` transparente.

**Marketplace Expansion & Live Commerce (Release 1.8, Programs 0/A/B/C/D)**: Connector Platform V2 (SDK, Capability Matrix, Certificação, Observability), Exchange Intelligence (câmbio real, `ConvertedPrice` explicável), Realtime Commerce Engine (`ChangeDetection`, `VolatilityEngine`, `FreshnessEngine`, `BuyerAlertEngine`, `MarketPulseService`), Market Intelligence (`PriceStatistics`, `SavingsOpportunity`, volatilidade canônica), Marketplace Coverage Expansion (Mega Eletrônicos, Roma Shopping, Atacado Connect — 3 novos merchants reais, 597 ofertas, zero mudança de arquitetura).

**Premium Home Experience (Release 1.9)**: Home/`/categorias` reconstruídos sobre os domínios do Release 1.8, congelados visualmente (ADR-050/053) desde então.

**Product Identity & Category Discovery (Program Σ, Ξ, Θ, Fase 2 Sprints 2.2–2.8, Program Κ)**: `ProductIdentityEngine` (Shadow Mode, nunca auto-merge), Delta Import/Engine generalizado (Program Σ), medição exaustiva de por que candidatos cross-merchant não emergem (Program Ξ/Θ/Fase 2), normalização de categoria e backfill de atributos (Sprints 2.5/2.6), sincronização do Canonical Catalog (Sprint 2.8), e finalmente a descoberta estrutural da fragmentação de categoria (Program Κ Mission Κ-1 — 66 clusters de sinônimo + 377 pares pai/filho, nunca resolvidos por um mapeamento flat).

**Buyer Intelligence Discovery (Program Λ, Mission Π-1)**: auditoria exaustiva de ~95 serviços em 14 domínios provando que a inteligência de comparação, confiança, economia e volatilidade **já existe e já roda em produção** — só nunca foi voltada ao comprador. Desenho completo (jornada, matriz de valor, biblioteca de cards, arquitetura de composição, priorização ICE) sem nenhuma linha de código nova.

## 2. O que foi descoberto

O fio condutor de toda a fase de Discovery (Programs Δ/Σ/Ξ/Θ/Κ/Fase 2): **o gargalo do marketplace nunca foi volume de dado, foi qualidade e unificação de identidade de produto/categoria** — e, em paralelo, **o gargalo de produto nunca foi falta de inteligência, foi falta de exposição dessa inteligência ao comprador** (Programs Λ/Π). Ambos os fios convergem na mesma lição: construir mais dado/serviço não era o problema; o problema era estrutural (categoria fragmentada) ou de exposição (inteligência presa no backend).

## 3. Hipóteses refutadas

- **"Mais catálogo aumenta CPC" (Sprint 2.2)** — refutada: catálogo cresceu 45%, cobertura canônica foi de 46%→94%, CPC ficou estagnado em 4.
- **"O ranking de `ProductIdentityEngine` está suprimindo candidatos cross-merchant mais fracos" (hipótese da Sprint 2.6)** — refutada por medição direta na Sprint 2.7: simulação de 11,28M pares mostrou zero candidatos cross-merchant acima do threshold em qualquer política de persistência (A/B/C/D).
- **"Sincronizar `canonical_products` resolveria o cross-merchant" (Sprint 2.8)** — parcialmente refutada: a sincronização era necessária e foi feita corretamente, mas o Program Κ mediu depois que a causa raiz real é a fragmentação da própria tabela `categories` (929 linhas para poucas centenas de conceitos reais).
- **"Um mapeamento simples de categoria resolveria a fragmentação" (hipótese natural antes da Κ-1)** — refutada parcialmente: resolve 170 categorias (66 clusters de sinônimo), mas 377 pares são estruturalmente pai/filho e um mapeamento flat os resolveria errado, produzindo falso positivo.
- **"Normalizar categoria move CPC de forma relevante" (expectativa antes da simulação de impacto da Κ-1)** — refutada por medição: 1 par de produto genuíno desbloqueado em 1,37M pares avaliados; CPC não se move de forma perceptível porque não existe executor de merge.

## 4. Hipóteses confirmadas

- **O gate de categoria é o principal bloqueador de matching cross-merchant** (Sprint 2.7: 99,3% dos pares cross-merchant capados por categoria).
- **A fragmentação de categoria é 100% lexical, nunca uma limitação técnica de dedupe** (Κ-1: 98/929 categorias já compartilhadas por coincidência exata de slug entre merchants).
- **A inteligência de comparação/confiança/economia já existe e nunca foi exposta ao comprador** (Λ-1, confirmado exaustivamente pela Π-1 em 95 serviços/14 domínios — `CompareFoundationService`/`OfferRankingService` confirmados no próprio código como "zero consumidor").
- **6 domínios inteiros (merchant-intelligence, merchant-analytics, merchant-decision, growth-engine, marketplace-operations, merchant-ownership) foram construídos por desenho para o lojista, não por descuido** (Π-1).
- **O comprador não paga pelo serviço — o modelo é B2B** (`BUSINESS_MODEL.md`, confirmado e respeitado em toda recomendação de "Premium" das Missions Λ/Π).

## 5. Grandes decisões arquiteturais

- **Arquitetura hexagonal DDD por domínio** (14 domínios em `src/domains/`), nunca um domínio de nível inferior importando um de nível superior (regra confirmada e seguida por `product-identity/ → canonical-catalog/`, `buyer-intelligence/ → todos`, proposto na Π-1).
- **Zero Reputation Score** — nenhum score de confiança opaco, sempre fatores nomeados e auditáveis (`OfferRankingService`, `trust/`).
- **Shadow Mode permanente para Product Identity** — o `ProductIdentityEngine` nunca funde produtos automaticamente; toda sugestão é `MergeCandidate` revisado por humano.
- **Compute-on-read sobre tabelas de agregação novas** (ADR-034) — aplicado consistentemente em `MerchantPriorityService`, dashboards de Exchange/Realtime Commerce/Marketplace Operations.
- **Buyer Identity Model como domínio próprio, nunca reaproveitando `profiles`/`auth.users` diretamente** (ADR-045/046, proposto, aguardando aprovação do CTO).
- **Universal Taxonomy faseada (Opção C), não Knowledge Graph** — recomendação da Κ-1, evita sobre-engenharia no estágio atual.
- **Buyer Intelligence Layer como domínio de composição pura, zero inteligência nova** — recomendação da Π-1, reaproveitando o padrão já usado 3x no código (`ExchangeDashboardService`/`RealtimeCommerceDashboardService`/`MarketplaceOperationsDashboardService`).
- **`docs/archive/` como destino permanente de documentação superada — nunca exclusão** (confirmado e reaplicado nesta própria missão de encerramento, ver §10).

## 6. Estado atual da plataforma

Next.js 16.2.9 / React 19.2.4, 14 domínios DDD, ~95 serviços de domínio, 545 testes (84 suites) passando, lint/typecheck/build limpos. 5 clientes Supabase claramente segregados (anon, server, browser, service role). Connector Platform V3 com Delta Engine generalizado, SDK e Certificação. Nenhuma migration pendente crítica — schema estável desde Release 1.8.

## 7. Estado atual do Marketplace

18.010 canonical products, 929 categorias reais (66 clusters de sinônimo + 377 pares pai/filho identificados, não corrigidos), 5 merchants live com dado real (Shopping China, Mega Eletrônicos, Roma Shopping, Atacado Connect, Mobile Zone), 4 merchants certificados mas comercialmente bloqueados (Cellshop, Nissei, Casa Americana, New Zone — bloqueiam `ClaudeBot` em `robots.txt`, caminho comercial já desenhado em `docs/business/`). CPC (Comparable Product Coverage) baixo e estagnado — gargalo estrutural conhecido e medido (categoria fragmentada + ausência de executor de merge), não um gap de volume de catálogo.

## 8. Estado atual da IA

Toda "IA" hoje em produção é **determinística e explicável** — nenhum modelo generativo, nenhum LLM no caminho crítico. `ProductIdentityEngine` (fatores nomeados, gates duros de marca/categoria), `OfferRankingService` (5 fatores ponderados), `VolatilityEngine`/`FreshnessEngine` (fórmulas estatísticas simples, documentadas). O Brain (domínio `trust/`) já tem vocabulário reservado para comprador (`BrainEntityType.Buyer`, `GraphRelationType.BuyerViewed` etc.) desde o Release 1.5, nunca emitido — depende do Buyer Identity Model. `ai/` (pasta) continua só com `.gitkeep` — nenhum código de IA generativa existe no repositório.

## 9. Estado atual da Buyer Experience

Estruturalmente inalterada desde o Release 1.4 nas telas (Home, produto, busca, comparação) — mas o backend acumulou, sem que o comprador soubesse, praticamente tudo que precisaria para responder "vale comprar isto hoje": preço justo, economia estimada, loja recomendada, confiança, frescor do dado. Duas Missions (Λ-1, Π-1) já produziram o desenho completo (jornada, matriz de valor, biblioteca de 11 cards, arquitetura de composição, ICE) para a próxima Release construir sobre isso — nenhuma decisão de produto pendente para começar os 8 itens de maior ICE (`docs/product/QUICK_WINS_RELEASE2.md`).

## 10. Pendências conhecidas

- **LGPD/rate-limiting em `buyer_events`/`buyer_sessions`** — gap de segurança real, já em produção, não corrigido (achado do Buyer Identity Model, Release 1.8).
- **Buyer Identity Model (ADR-045/046)** — proposto, aguardando aprovação formal do CTO; bloqueia Alertas, Reviews de comprador, Favoritos sincronizados.
- **Provedor de notificação (push/e-mail)** — não decidido; bloqueia entrega de Alertas mesmo depois do Buyer Identity Model.
- **Provedor de billing** — aprovado em princípio (Stripe, Release 1.8 Blueprint) mas não integrado; `PremiumUpgradeService` é lead-capture apenas.
- **Executor de merge do Product Identity** — `IMergeCandidateRepository` não tem método que efetivamente funda dois `canonical_products`; um `MergeCandidate` aprovado hoje não move CPC.
- **ADR-041 (algoritmo de Trust Score)** — reservado desde o Release 1.5, nunca escrito; `trust_score` existe como campo sem fórmula.
- **Universal Taxonomy Fase 2 (pares pai/filho)** — medida e recomendada pela Κ-1, não implementada.
- **Rotas mortas conhecidas**: `/stores`, `/categories/[slug]` (referenciadas em nav, sem `page.tsx`).
- **Ordenação por preço no catálogo** (ADR-011, view materializada proposta, não aplicada).
- **Consolidação de scripts de auditoria one-off** (`scripts/kappa1-*.ts`, `scripts/sprint*.ts`) — deliberadamente não integrados a `package.json`, mesmo padrão de todas as Missions anteriores; preservados como registro reproduzível, não como ferramenta de operação contínua.

## 11. Backlog estratégico

1. **Mission Κ-2** — implementação da Universal Taxonomy (Fase 1 sinônimo + Fase 2 pai/filho).
2. **Aprovação do Buyer Identity Model** — desbloqueia toda a Trilha B de Buyer Experience.
3. **Release 2.0, Quick Wins** — os 8 itens de ICE ≥8,0 (`QUICK_WINS_RELEASE2.md`), zero inteligência nova, zero decisão pendente.
4. **Executor de merge do Product Identity** — pré-requisito para qualquer ganho real de CPC via `MergeCandidate` aprovado.
5. **ADR-041** — fechar a dívida de dois Releases sobre o algoritmo de Trust Score.
6. **Fechamento comercial dos 4 merchants Tier 1 bloqueados** (`docs/business/`).
7. **Correção do gap de LGPD/rate-limiting em `buyer_events`** — recomendado antes de qualquer expansão de personalização.

## 12. Critérios que definem o início oficial da Release 2.0

- [x] Todo trabalho local auditado, agrupado e commitado (Objetivo 2 desta missão).
- [x] Todo trabalho enviado ao remoto (`origin/main`).
- [x] Quality Gates (lint/typecheck/testes/build) verdes, sem regressão.
- [x] Este documento (`RELEASE_2_FOUNDATION_COMPLETE.md`) existe e está commitado.
- [x] Tag oficial publicada marcando o encerramento da fase Foundation & Discovery.
- [x] `git status` limpo.
- [ ] **Decisão do CTO** (fora do escopo de engenharia desta missão): aprovar o corte de `QUICK_WINS_RELEASE2.md` como escopo formal da primeira Wave da Release 2.0, e decidir se o Buyer Identity Model começa em paralelo (Trilha B) ou é adiado.

A plataforma está, do ponto de vista técnico e documental, pronta para iniciar a Release 2.0 assim que essa decisão de escopo for tomada.
