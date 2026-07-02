# RELEASE_1_8_SPRINT_ZERO_REPORT.md
# Sprint Zero — Project Preparation & Foundation Consolidation — Relatório Final

**Versão**: 1.0
**Criado**: 2026-07-02
**Status**: Entregue — aguardando aprovação final do CTO para iniciar a Wave 1 do Release 1.8
**Mandato**: auditoria organizacional completa, padronização, eliminação de pendências, documentação atualizada, ambiente preparado para o Release 1.8. Nenhuma funcionalidade nova, nenhum código, nenhuma migration.

---

## 1. AUDITORIA GERAL

Quatro auditorias paralelas, somadas às auditorias já feitas nas sessões anteriores desta mesma data (Wave 6 do Release 1.7 — arquitetura/RLS/segurança/performance; ADR-046 — acoplamento de identidade), cobrindo `components/`, `hooks/`, `lib/`, `utils/`, `types/`, `constants/`, `scripts/`, `database/`, `supabase/`, `app/`. Achados completos e classificados por severidade em `docs/engineering/TECH_DEBT.md` (nova seção "Sprint Zero — Auditoria Organizacional Completa").

**Os dois achados mais importantes**, ambos verificados de forma independente antes de entrar neste relatório (não aceitos apenas pela palavra do agente que os encontrou):

1. **`hooks/useAnalytics.ts` nunca é importado em lugar nenhum do código.** É o hook que dispara eventos de comportamento do comprador no navegador. Se nada o chama, é plausível que `buyer_events`/`buyer_sessions` estejam vazios ou quase vazios em produção hoje, apesar do backend inteiro (Release 1.6) estar construído e documentado como funcionando. Isso tem uma consequência direta sobre o Buyer Identity Model (ADR-045/046): a maturação de `C-6 Buyer Behavioral Knowledge` foi desenhada assumindo que já existe sinal comportamental real acumulado desde o Release 1.6 — se este achado se confirmar, essa suposição precisa ser revisitada antes da Wave 6.
2. **`/store/[slug]` e `/lojas/[slug]` são rotas duplicadas para a mesma entidade, ambas indexadas simultaneamente** no sitemap. Risco real de conteúdo duplicado — relevante porque `RELEASE_1_8_BLUEPRINT.md` Capítulo 7 (SEO Expansion) planeja expandir cobertura de página em cima de uma arquitetura de rotas que, neste ponto específico, não está limpa.

Nenhum dos dois foi corrigido — ambos exigem uma decisão de produto (qual rota é a canônica; se `useAnalytics` deveria estar em uso e onde) antes de qualquer código mudar, conforme o mandato deste Sprint.

---

## 2. ESTADO DA FOUNDATION

Íntegra, sem alteração nesta Sprint. Os 9 documentos permanentes (`AI_CONSTITUTION.md` → `RELEASE_STRATEGY.md`) não precisaram de correção — são filosóficos/permanentes por design, não descrevem estado específico de código que possa ficar desatualizado. Verificado que nenhum deles contradiz nenhuma decisão tomada nesta data (Buyer Identity Model, Exchange Engine, os 5 novos documentos de produto).

---

## 3. ESTADO DA ARQUITETURA

Confirmada limpa nas dimensões já auditadas na Wave 6 do Release 1.7 (direção de dependência entre domínios, zero domínio duplicado/morto, zero dependência circular). Esta Sprint adiciona: zero script órfão, zero pasta vazia em todo o repositório, todos os 7 `lib/*-factory.ts` corretamente conectados. Duas inconsistências novas de organização de componentes encontradas (não corrigidas): duplicação significativa entre os widgets de `merchant/decision-center/` e `merchant/growth-center/` (5 pares sobrepostos, incluindo um `GrowthTimelineWidget` idêntico em ambas as pastas — o Growth Engine parece ter substituído conceitualmente o Decision Center sem que o mais antigo fosse removido), e `lib/supabase.ts` vs. `lib/supabase/client.ts` como dois caminhos distintos para o mesmo tipo de client.

---

## 4. ESTADO DA DOCUMENTAÇÃO

**Antes desta Sprint**: `docs/README.md` (o mapa oficial do Knowledge System) estava significativamente desatualizado — não listava `docs/product/releases/` (12 arquivos), `STRATEGIC_ASSETS.md`, `MOAT_STRATEGY.md`, `PARAGUAI_BRAIN.md`, `RELEASE_PLAYBOOK.md`, `docs/engineering/DATABASE_ENGINEERING.md`, nem as 2 certificações de Release em `operations/`. `CHANGELOG.md` tinha uma lacuna — nenhuma entrada para o Blueprint do Release 1.8 nem para as ADRs 043/045/046. `docs/engineering/TECH_DEBT.md` tinha pelo menos um item completamente desatualizado (migrations "praticamente vazias" — desatualizado por mais de 20 migrations de distância).

**Depois desta Sprint**: todos os três corrigidos. `docs/README.md` reflete a árvore real; `CHANGELOG.md` tem a entrada que faltava; `TECH_DEBT.md` tem os achados do Sprint Zero classificados por severidade, a entrada obsoleta corrigida, e uma seção de Backlog consolidada.

**Cinco documentos novos criados** (Fases 3-7 deste Sprint): `docs/product/ROADMAP_1_8.md`, `docs/product/MARKETPLACE_VISION.md`, `docs/product/PRODUCT_POLICY.md`, `docs/product/MARKETPLACE_STRATEGY.md`, `docs/product/KPIS.md`.

---

## 5. ESTADO DO BANCO

Migrations: 21 em `database/migrations/` (congeladas, todas aplicadas), 5 em `supabase/migrations/` (todas aplicadas, confirmado via `db:push` na certificação da Wave 6 e novamente ao decidir ADR-043) — nenhuma pendência de aplicação. `database/sql/` é o único artefato funcionalmente vazio que a documentação (`CLAUDE.md`) descreve incorretamente como contendo conteúdo real — achado do Sprint Zero, não corrigido.

**Gargalo real e concreto, verificado diretamente nesta Sprint**: busca (`services/search.service.ts`) usa `ILIKE` com wildcard à esquerda (`%termo%`) em `products.name`/`stores.name`/`brands.name`/`categories.name`, e **nenhum índice trigram (`pg_trgm`/GIN) existe em nenhuma migration**. Isso força um scan sequencial completo nessas tabelas a cada busca. Invisível no catálogo atual (pequeno); um gargalo real e sério aos 500.000 produtos que o Release 1.8 mira — ver Seção 10.

`price_history` (INSERT-only, cresce para sempre) não tem estratégia de particionamento — ao contrário de `buyer_events`, que já tem um plano de particionamento comentado (não aplicado) na própria migration. Aos volumes de oferta que o Live Pricing Engine pretende gerar (Programa A do Release 1.8), este é o segundo gargalo de banco mais relevante identificado.

---

## 6. ESTADO DO ROADMAP

`RELEASE_1_8_BLUEPRINT.md` (8 Waves) reorganizado em 6 Programas (`ROADMAP_1_8.md`) — ver Seções 12-13.

---

## 7. ESTADO DOS ASSETS

Catálogo permanente (`STRATEGIC_ASSETS.md`) íntegro: 6 Core, 5 Supporting, 4 Future. Um Core Asset novo proposto e pendente de ADR formal do CTO (C-7 Live Commerce Velocity, `RELEASE_1_8_BLUEPRINT.md` Capítulo 10) — ainda não criado, apenas nomeado. Três Assets existentes com maturação de estágio já desenhada mas não executada: C-5 (Cross-Border Context, Implícito → Instrumentado via Exchange Engine), C-6 (Buyer Behavioral Knowledge, Incipiente → Ativo Maduro via Buyer Identity Model — **condicionado à resolução do achado crítico da Seção 1 sobre `useAnalytics`**), F-4 (Marketplace Liquidity Model, Não iniciado → Coleta Inicial via Market Intelligence).

---

## 8. ESTADO DOS MOATS

Catálogo permanente (`MOAT_STRATEGY.md`) íntegro: 8 Moats. Um Moat novo proposto e pendente de ADR (Moat 9 — Live Commerce Velocity, nasce junto com C-7). Nenhuma das outras 5 propostas do mandato original do Release 1.8 (Data Flywheel, Network Effect, Historical Knowledge, Brain, Marketplace Scale, SEO Dominance) se qualificou como Moat genuinamente novo — todas já existiam ou duplicariam o catálogo (reconciliação já feita em `RELEASE_1_8_BLUEPRINT.md` Capítulo 11, reafirmada aqui sem alteração).

---

## 9. DÍVIDAS TÉCNICAS

Consolidadas em `docs/engineering/TECH_DEBT.md`. Síntese por severidade desta Sprint: **2 críticas** (`useAnalytics` morto, rotas `/store`/`/lojas` duplicadas), **3 altas** (2 páginas admin inalcançáveis, links mortos no dashboard do merchant apontando para `/merchant/catalog` inexistente), **8 médias** (duplicação decision-center/growth-center, 3 hooks mortos pós-Server-Components, GlassCard/GradientCard, Badge/Chip, dois skeletons duplicados, smell de organização do Supabase client, 4 scripts de validação sobrepostos, gaps de `error.tsx`/`loading.tsx` em rotas públicas, `database/sql/` vazio), **múltiplas baixas** (arquivos vazios/mortos já majoritariamente conhecidos, agora precisamente confirmados). Nenhuma corrigida nesta Sprint, todas classificadas — nenhuma escondida.

---

## 10. GARGALOS

Avaliação estrutural (leitura de schema/código), **não um teste de carga empírico** — distinção importante, nomeada explicitamente, não uma certificação de capacidade real.

| Escala-alvo (mandato do CTO) | Gargalo identificado | Severidade |
|---|---|---|
| 500.000 produtos | Busca via `ILIKE` sem índice trigram — scan sequencial completo a cada busca | **Alta — verificado diretamente nesta Sprint** |
| 5.000.000 ofertas | `price_history` sem particionamento; Live Pricing Engine sem infraestrutura de fila real (já nomeado em `RELEASE_1_8_BLUEPRINT.md` Capítulo 2) — em conjunto, o maior risco estrutural de todo o Release 1.8 | **Alta — já nomeada, reafirmada com os números específicos do mandato** |
| 1.000 lojas | Scheduler de conector (Vercel Cron, interval-based) processando sincronização de 1.000 lojas dentro do limite de tempo de execução de uma função — não medido empiricamente | **Média — estrutural, não verificada por carga real** |
| 100.000 compradores | Ausência de rate limiting em endpoints públicos (`buyer_events`/`buyer_sessions`, e qualquer endpoint futuro de conta de comprador) — já nomeado (ADR-042, ADR-046), mais urgente nesta escala | **Alta — já nomeada, reafirmada** |
| 10.000 lojistas | RLS com subqueries `EXISTS (SELECT 1 FROM profiles WHERE...)` — **verificado e considerado seguro**: `profiles`/`merchants` permanecem pequenas mesmo a essa escala (staff+lojista, não compradores), PK já indexada. Não é um gargalo. | **Nenhuma — checado e confirmado limpo** |
| 100/500 lojas | Nenhum gargalo estrutural identificado a essas escalas menores — a infraestrutura de Connector Platform/Discovery (Release 1.7) foi desenhada para exatamente este volume. | **Nenhuma** |

**Gargalo estrutural único mais importante**: a ausência de infraestrutura de fila real (Redis/BullMQ ou equivalente) é a causa raiz por trás de três dos gargalos acima simultaneamente (Live Pricing em escala, notificações a 100k compradores, potencialmente orquestração de sync a 1.000 lojas) — não são três problemas separados, são três sintomas do mesmo gap arquitetural. Decisão de introduzir fila real é Tipo 1 (`NORTH_STAR.md` §12), não tomada nesta Sprint nem no Blueprint — nomeada como o risco estrutural mais consequente de todo o Release 1.8.

---

## 11. RISCOS

- **`useAnalytics` morto pode invalidar uma suposição do Buyer Identity Model** (Seção 1) — risco de maior impacto encontrado nesta Sprint, porque afeta uma decisão arquitetural já aprovada (ADR-046).
- **Rotas duplicadas `/store`/`/lojas`** comprometem a estratégia de SEO Expansion antes dela começar, se não resolvidas primeiro.
- **Ausência de fila real** (Seção 10) é o risco de maior alcance estrutural — afeta múltiplos Programas simultaneamente.
- **2 achados de segurança de severidade alta do Buyer Identity Model** (ADR-046, já registrados, reafirmados aqui): ausência de aviso de privacidade para coleta comportamental já em produção; `buyer_events`/`buyer_sessions` aceitam INSERT anônimo irrestrito apesar de um comentário no código alegar proteção inexistente.
- **3 decisões Tipo 1 ainda pendentes** fora do escopo deste Sprint (não bloqueiam o início do Release 1.8, mas bloqueiam Waves específicas): fornecedor de notificação (Wave 6), fornecedor de billing (Wave 8), decisão de infraestrutura de fila (impacto cross-Program, sem Wave own ainda).

---

## 12. PROGRAMAS DO RELEASE 1.8

Ver `docs/product/ROADMAP_1_8.md` para o detalhamento completo. Síntese: 6 Programas — **A** Live Commerce Infrastructure, **B** Marketplace Expansion, **C** Marketplace Intelligence, **D** SEO & Organic Growth, **E** Buyer Experience (inclui Fronteira Agora), **F** Merchant Growth.

---

## 13. ORDEM OFICIAL DAS WAVES

```
1. Program A — Wave 1 (Exchange Engine)         → ADR-043 ✅ desbloqueada
2. Program A — Wave 2 (Live Pricing + Freshness) → arquitetura pronta, risco de fila nomeado
3. Program B — Wave 3 (Marketplace Expansion)    → arquitetura pronta
4. Program E — Wave 6 (Buyer Experience)         → ADR-045/046 ✅ maior parte desbloqueada,
                                                     condicionado à verificação do achado
                                                     crítico de useAnalytics (Seção 1)
   Program E — Wave 7 (Fronteira Agora)          → bloco de baixa incerteza primeiro
5. Program C — Wave 4 (Marketplace Intelligence) → depende de volume de A+B
6. Program D — Wave 5 (SEO Expansion)            → depende de C; resolver duplicação
                                                     /store vs /lojas antes de expandir
7. Program F — Wave 8 (Merchant Growth)          → deliberadamente último
```

---

## 14. CHECKLIST DE READINESS

- [x] Auditoria organizacional completa (Fase 1) — achados classificados, nenhum escondido
- [x] Consistência de Foundation verificada (Fase 2) — 3 documentos corrigidos
- [x] `ROADMAP_1_8.md` criado (Fase 3)
- [x] `MARKETPLACE_VISION.md` criado (Fase 4)
- [x] `PRODUCT_POLICY.md` criado (Fase 5)
- [x] `MARKETPLACE_STRATEGY.md` criado (Fase 6)
- [x] `KPIS.md` criado (Fase 7)
- [x] `TECH_DEBT.md` atualizado, backlog consolidado (Fase 8)
- [x] Readiness de escala avaliada estruturalmente, gargalos identificados (Fase 9)
- [x] Ordem de Waves oficializada (Fase 10)
- [ ] **`useAnalytics` morto — verificar se `buyer_events` tem dado real antes de confiar na maturação de C-6** — pendente, ação recomendada antes da Wave 6
- [ ] **Decidir rota canônica entre `/store/[slug]` e `/lojas/[slug]`** — pendente, recomendado antes da Wave 5 (SEO Expansion)
- [ ] Decisão de infraestrutura de fila (ou aceitar o risco nomeado explicitamente) — pendente, recomendado antes da Wave 2
- [ ] Fornecedor de notificação (Wave 6) e de billing (Wave 8) — pendentes, não bloqueiam o início do Release

---

## 15. APROVAÇÃO FINAL

> "O ParaguAI está completamente organizado para iniciar o Release 1.8, permitindo que todas as próximas Waves sejam focadas exclusivamente em crescimento do marketplace, atualização inteligente de preços, expansão do catálogo, experiência do comprador e monetização, sem necessidade de novas reorganizações estruturais?"

**Sim, para o início do Release 1.8 (Programas A e B) — com dois impedimentos nomeados que deveriam ser resolvidos antes de Programas específicos, não antes do Release como um todo:**

1. **`useAnalytics` morto precisa ser investigado antes da Wave 6** — se confirmado que nenhum evento de comprador real existe hoje, a Wave 6 precisa de um passo adicional (instrumentar de verdade) antes de poder assumir que `C-6` já tem base para maturar.
2. **A duplicação `/store` vs. `/lojas` precisa de uma decisão de produto antes da Wave 5** — expandir SEO sobre uma arquitetura de rota duplicada amplificaria o problema, não o resolveria.

Nenhum dos dois impede o início imediato dos Programas A e B (Live Commerce Infrastructure, Marketplace Expansion) — nenhuma das duas Waves iniciais depende de `useAnalytics` nem das rotas de loja pública. O projeto está organizado, a documentação reflete o estado real (corrigida onde não refletia), a dívida técnica está nomeada e classificada, e a ordem de execução está justificada tecnicamente. **Nenhuma reorganização estrutural adicional é necessária para começar** — os dois itens acima são correções pontuais a fazer no momento certo de cada Wave, não uma nova rodada de Sprint Zero.
