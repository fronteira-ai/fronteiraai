# RELEASE_1_7_BLUEPRINT.md
# Blueprint Estratégico — Ecosystem Expansion Platform

**Versão**: 1.1
**Criado**: 2026-07-01 · **Revisado**: 2026-07-01 (reorganização em Waves, aprovada pelo CTO após entrega do Epic 1)
**Status**: Epic 1, Wave 2 e Wave 3 entregues e certificados. Waves 4–5 restantes, execução faseada continua.
**Tipo de Release**: Platform + Data + Connector Infrastructure (compounding)
**Fase**: 4 — Expansão do Ecossistema
**Número de Release**: 1.7

---

## Preâmbulo

Este documento é a especificação estratégica do Release 1.7 do ParaguAI.

Diferente dos Releases 1.5 e 1.6 — entregues em um único ciclo de Blueprint → Execução —, o Release 1.7 é maior do que os cinco Epics do Release 1.6 combinados. Por isso, o CTO aprovou um formato de entrega faseado: este Blueprint define a estratégia completa e a sequência de Epics; cada Epic é implementado, testado e aprovado (lint + typecheck + testes + build verdes) antes que o próximo comece. Este documento cobre a estratégia completa; o `RELEASE_1_7_EXECUTION_PLAN.md` companheiro cobre o detalhamento técnico do Epic 1.

Todo desenvolvimento do Release 1.7 deve ser derivado e referenciado a este documento.

---

## PRINCÍPIO MAIS IMPORTANTE

Antes de qualquer decisão de implementação dentro deste Release, cada capacidade proposta deve responder obrigatoriamente às cinco perguntas:

1. **Ajuda o lojista a vender mais?**
2. **Ajuda o lojista a economizar tempo ou dinheiro?**
3. **Aumenta o valor percebido do plano Premium?**
4. **Fortalece algum Asset permanente?**
5. **Fortalece algum Moat permanente?**

Se qualquer resposta for negativa, a funcionalidade deve ser descartada antes de qualquer discussão técnica.

---

## CAPÍTULO 1 — O PROBLEMA

### Contexto: o que o Release 1.6 entregou

O Release 1.6 completou a pilha de Merchant Intelligence: Command Center, Analytics Platform, Decision Engine, Catalog Intelligence e Growth Engine. O lojista que já está na plataforma agora sabe como está seu negócio, onde está perdendo dinheiro, como vender mais, como melhorar seu catálogo e o que fazer hoje.

### O problema que permanece sem solução

Toda essa inteligência depende de um lojista já estar cadastrado. O ParaguAI ainda depende de cadastro manual para conhecer a fronteira. A cobertura do ecossistema — não a tecnologia — é o maior gargalo da plataforma.

### A anatomia do problema

1. **Cobertura dependente de adesão voluntária** — o catálogo só cresce quando um lojista decide se cadastrar.
2. **Nenhum mecanismo de descoberta automática** — lojas que já vendem na fronteira e teriam alto valor de comparação simplesmente não existem no ParaguAI até serem manualmente cadastradas.
3. **Sincronização manual e frágil** — o motor de aquisição existente (Release 0.9) atualiza catálogos via scripts CLI ou botões de painel, nunca de forma automática ou agendada.
4. **Nenhum histórico de mudança estruturado** — o pipeline atual só compara preço; mudanças de estoque, descrição e imagem não geram nenhum sinal.
5. **Nenhum caminho de reivindicação** — se uma loja já existir no catálogo antes de o lojista se cadastrar, hoje não há como ele assumir a gestão dela.

### A síntese do problema

O ParaguAI precisa deixar de ser um diretório que cresce por adesão e se tornar um Digital Twin que já conhece a fronteira antes de qualquer lojista decidir participar.

---

## CAPÍTULO 2 — HIPÓTESE ESTRATÉGICA

**Hipótese central**: se o ParaguAI descobrir e sincronizar automaticamente lojas e produtos através de fontes públicas e oficiais — nunca scraping frágil, sempre respeitando robots.txt e termos de uso —, o catálogo cresce independentemente da velocidade de cadastro de lojistas, e cada lojista que eventualmente se cadastra encontra sua loja já presente, com histórico, pronta para ser reivindicada.

Isso transforma a aquisição de lojistas de um funil de marketing em um funil de reconhecimento: "sua loja já está aqui — venha assumi-la."

---

## CAPÍTULO 3 — RESOLUÇÃO ARQUITETURAL: acquisition/ → src/domains/connectors/

O Release 0.9 já criou um motor de aquisição (`acquisition/`) com engines de Validação, Normalização, Deduplicação, Mídia e um `CatalogWriter`, mais um conector HTTP real (`ShoppingChinaConnector`). Esse motor cobre boa parte da Capability A da missão deste Release, mas foi construído como scripts desacoplados da arquitetura DDD usada por todo domínio criado a partir do Release 1.5 (`src/domains/*`).

**Decisão**: `acquisition/` é absorvido — não duplicado — pela nova `src/domains/connectors/`. A lógica reutilizável (engines de validação/normalização, estratégia HTTP, sequência de escrita no catálogo) é portada 1:1 para trás de interfaces de repositório, fechando um vazamento de infraestrutura (`PipelineContext` carregava um `SupabaseClient` bruto). `acquisition/` é retirado ao final do Epic 1, após um teste de paridade completo.

Esta decisão fortalece diretamente:
- **Asset C-3 — Normalized Catalog**: a base de normalização/deduplicação passa a ter identidade de domínio própria (`ProductIdentity`), pronta para receber correspondência difusa no Epic 3.
- **Asset S-3 — Connector Knowledge**: o conhecimento operacional de como sincronizar catálogos de terceiros passa a viver em um domínio único, testável e extensível, em vez de scripts ad hoc.

---

## CAPÍTULO 4 — WAVES (reorganização v1.1, pós-Epic 1)

### Por que Waves em vez de Epics 2–7

Após a entrega do Epic 1, o CTO determinou que o objetivo central do restante do Release é **acelerar a geração de valor para o ecossistema** — não apenas completar capacidades isoladamente. Por isso, os antigos Epics 2–7 foram reagrupados em **4 Waves**, cada uma entregando um resultado de negócio coeso (não apenas uma capacidade técnica), mantendo o mesmo rigor de execução: uma migration própria, numerada sequencialmente, e um Quality Gate completo (lint + typecheck + testes + build) antes de a próxima Wave começar.

O termo "Epic" permanece exclusivamente associado ao Epic 1 (já entregue, documentado e versionado dessa forma no código/CHANGELOG). A partir daqui, "Wave" é a unidade de entrega deste Release.

### WAVE 1 — Connector Platform Framework — **ENTREGUE** (Epic 1, migration 0022)

Ver Capítulos 1–3 e `RELEASE_1_7_EXECUTION_PLAN.md`. Fundação DDD de conectores, absorção completa de `acquisition/`, Brain events iniciais.

### WAVE 2 (0023) — Merchant Connectors + Scheduler + Discovery — "O ecossistema se descobre e se atualiza sozinho"

Une o antigo Epic 2 (Merchant-Owned Connectors + Entitlements), o antigo Epic 4 (Discovery Connectors) e o Ecosystem Monitor (antigo Epic 6, Capability H) — **realocado para esta Wave** porque monitorar é indissociável de agendar/descobrir: não faz sentido construir scheduler e discovery sem visibilidade operacional imediata sobre eles.

Escopo:
- Fecha a lacuna de autorização hoje existente (`requireMerchant()` não verifica `merchant_stores` — marcada `// TODO(Epic 2)` no código do Epic 1).
- Conector `api-rest` genérico (hoje só existe o scraper do Shopping China).
- Impõe `max_imports_month`/`has_connectors` (hoje dados mortos em `MerchantPlanFeatures`).
- Migra `getMerchantDashboardStats()` de `import_logs` para `connector_sync_runs` (remove a escrita dupla do Epic 1).
- Implementa o primeiro gatilho real de agendamento (Vercel Cron) preenchendo `ISyncScheduler`.
- Conectores de descoberta automática via sitemaps/feeds públicos, sempre respeitando robots.txt e termos de uso — nunca scraping agressivo. Lojas descobertas entram no catálogo em estado "não reivindicado", alimentando a Wave 4.
- Ecosystem Monitor: painel operacional de saúde de conectores (última sincronização, erros, tempo médio, produtos importados, qualidade dos dados).

### WAVE 3 (0024) — Product Identity + Change Detection + Price History — "É o mesmo produto, e o que mudou nele?" — **ENTREGUE**

Ver Capítulo 8 (Product Identity como Core Asset) para a decisão arquitetural completa desta Wave.

Escopo:
- Promove Product Identity de stub (`ProductIdentityResolver` exato-por-slug, dentro de `connectors/normalization/`) a **domínio próprio** (`src/domains/product-identity/`), correspondência difusa entre produtos de diferentes conectores/lojas.
- Substitui a comparação de preço-apenas do `DeduplicationStage` por detecção de mudança em todos os campos relevantes (estoque, descrição, imagem).
- **Antecipa a correção do histórico de preço**: corrige a lacuna do Epic 1 em que uma oferta nova nunca recebe uma linha em `price_history` — a partir desta Wave, todo produto começa a acumular patrimônio temporal **desde a primeira sincronização**, não apenas a partir da primeira atualização de preço.

### WAVE 4 (0025) — Merchant Claim + Onboarding — "Essa loja é sua? Prove — e comece a operar em um clique."

Une o antigo Epic 5 (Merchant Claim Flow) a um fluxo de Onboarding: reivindicar uma loja não pode terminar na aprovação — o lojista precisa ser guiado a completar seu perfil e assumir a operação imediatamente, sem perder o momentum de "minha loja já existe aqui".

Escopo:
- `ClaimService` (interface reservada no Epic 1) implementado de verdade, estendendo `merchant_verifications` com um tipo de verificação de reivindicação de loja. Aprovação cria o vínculo `merchant_stores` — nenhum dado histórico é perdido.
- Onboarding pós-claim: checklist guiado (completar perfil, confirmar canais de contato, revisar catálogo herdado) reaproveitando os padrões já existentes em `OnboardingWizard`/`computeProfileCompletion()`.

### WAVE 5 (0026) — SEO, Performance, Hardening e Release Certification — "Pronto para milhões de páginas, pronto para produção"

Escopo (antigo Epic 7): sitemap-index (`generateSitemaps()`) substituindo o sitemap monolítico atual; retry/backoff/idempotência para execuções de conector; rate limiting, ownership e auditoria; conclusão da lista completa de eventos cognitivos da missão ainda pendentes (`ProductImported`, `ProductUpdated`, `PriceChanged`, `ProductRemoved`, `MerchantDiscovered`, `MerchantClaimRequested/Approved`, `CatalogNormalized`, `SnapshotCreated`, `ImportFailed`); suíte de testes final e Quality Gate completo do Release; relatório final de certificação do Release 1.7.

---

## CAPÍTULO 5 — ASSETS E MOATS FORTALECIDOS

| Asset | Como o Release 1.7 fortalece |
|---|---|
| C-3 Normalized Catalog | Product Identity (Wave 3, Core Asset — Capítulo 8) e conectores de descoberta (Wave 2) aceleram diretamente a taxonomia normalizada |
| S-3 Connector Knowledge | Framework único e testável de conectores (Epic 1) substitui scripts ad hoc |
| S-1 Merchant Network | Merchant Claim + Onboarding (Wave 4) converte descoberta em cadastro sem fricção de marketing |
| C-1 Historical Price Data | Change Detection + correção de `price_history` para ofertas novas (Wave 3) captura sinais que hoje são invisíveis e fecha uma lacuna de patrimônio histórico |

**Moat reforçado**: o Data Flywheel Moat passa a operar mesmo sem crescimento de cadastro manual — o catálogo cresce por descoberta, não apenas por adesão, o que é estruturalmente difícil de copiar sem o mesmo investimento em conectores compatíveis com termos de uso.

---

## CAPÍTULO 6 — PARAGUAI BRAIN

O Epic 1 introduz os primeiros 4 eventos cognitivos do domínio de conectores (`ConnectorRegistered`, `ConnectorSyncStarted`, `ConnectorSyncCompleted`, `ConnectorSyncFailed`), e é o primeiro domínio fora de `src/domains/trust/` a alimentar o Brain — um precedente arquitetural relevante para todos os domínios futuros. A lista completa de eventos cognitivos da missão (`ProductImported`, `MerchantDiscovered`, `MerchantClaimApproved`, etc.) é concluída ao longo das Waves 2–5, à medida que as capacidades correspondentes existem de fato — nenhum evento é declarado antes de a capacidade que o gera estar implementada.

---

## CAPÍTULO 7 — QUALITY GATE POR WAVE (desvio deliberado do precedente 1.5/1.6)

Diferente dos Releases anteriores, cada Wave deste Release exige, antes do início da próxima:

1. `npm run lint` — 0 erros
2. `npx tsc --noEmit` — 0 erros
3. `npm test` — 100% dos testes verdes
4. `npm run build` — build de produção íntegro
5. Teste manual de fumaça das superfícies afetadas
6. Atualização de `PROJECT_STATUS.md`/`CHANGELOG.md` documentando o que foi entregue e o que foi deliberadamente adiado para a próxima Wave

Nenhuma migration deste Release é aplicada automaticamente — todas exigem execução manual do CTO no Supabase SQL Editor, seguindo o precedente registrado nos ADR-017/018.

---

## CAPÍTULO 8 — PRODUCT IDENTITY COMO CORE ASSET

### Declaração

Product Identity — a capacidade de reconhecer que um produto vendido pela Loja A e um produto vendido pela Loja B são **o mesmo produto real** — é declarado **Core Asset estratégico** do ParaguAI, no mesmo nível de `docs/product/STRATEGIC_ASSETS.md` (convergindo diretamente para o Asset **C-3 Normalized Catalog**, hoje classificado ali como "o ativo estrutural que habilita todos os outros").

### A regra de convergência (obrigatória, vale para todo o Release e além dele)

**Toda lógica de comparação entre lojas deve convergir para o domínio de Product Identity. Nenhum outro módulo — conector, busca, comparador — pode implementar sua própria heurística de "é o mesmo produto".**

Auditoria feita antes desta decisão (Wave 3, pré-implementação): `services/compare.service.ts` e `services/search.service.ts` **não duplicam** lógica de correspondência hoje — ambos consomem `product_id` como já-canônico, confiando inteiramente no upsert por slug feito na ingestão (`CatalogWriteStage`/`ICatalogRepository.upsertProduct`). O risco não é uma duplicação existente — é uma duplicação **futura**: qualquer necessidade de "produtos parecidos entre lojas" que apareça em busca, comparação ou recomendação deve chamar o domínio de Product Identity, nunca reimplementar sua própria comparação de nomes/atributos.

### Decisão arquitetural: promoção a domínio próprio

O stub atual (`ProductIdentityResolver`, exato-por-slug) vive dentro de `src/domains/connectors/normalization/` — correto para o Epic 1, onde a única consumidora era a ingestão. A partir da Wave 3, ele é **promovido para `src/domains/product-identity/`**, um domínio DDD próprio e independente:

- `src/domains/connectors/` passa a **depender** de `product-identity/` (para decidir new/update durante a sincronização) em vez de possuí-lo.
- Qualquer necessidade futura de comparação entre lojas (`compare.service.ts`, `search.service.ts`, recomendações) também depende de `product-identity/` — nunca do domínio de conectores.
- Isso evita o anti-pattern de um domínio de infraestrutura de ingestão (`connectors/`) se tornar, por acidente, o dono de um Core Asset que precisa ser consumido por módulos completamente diferentes (busca, comparação).

### Por que isso não podia esperar até a Wave 3 começar

Registrar esta decisão agora, antes da implementação, evita que a Wave 3 comece construindo correspondência difusa dentro de `connectors/` "porque já existe o stub ali" — o que recriaria exatamente o problema que esta seção existe para prevenir.

---

## DECLARAÇÃO FINAL

O Release 1.7 substitui a dependência de cadastro manual por um motor de descoberta e sincronização contínua da fronteira. O Epic 1 (Connector Platform Framework) é a fundação sobre a qual as quatro Waves seguintes — Merchant Connectors/Scheduler/Discovery, Product Identity/Change Detection/Price History, Merchant Claim/Onboarding e SEO/Performance/Hardening/Certificação — serão construídas. Product Identity é, a partir desta revisão, um Core Asset permanente do ParaguAI — não uma capacidade de uma única Wave.

---

## Histórico de revisões

- v1.0 (2026-07-01): criação, aprovação do CTO para execução faseada, início do Epic 1.
- v1.1 (2026-07-01): Epic 1 entregue e certificado. CTO aprovou reorganização dos Epics 2–7 remanescentes em 4 Waves (Capítulo 4 reescrito); Product Identity declarado Core Asset com regra de convergência obrigatória e promoção a domínio próprio `src/domains/product-identity/` (Capítulo 8, novo); Wave 3 passa a antecipar a correção de `price_history` para ofertas novas.
