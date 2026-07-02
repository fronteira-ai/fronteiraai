# RELEASE_1_8_BUYER_IDENTITY_MODEL.md
# Pré-Release 1.8 — Buyer Identity Model — Decisão Final de Arquitetura (ADR-046)

**Versão**: 1.0
**Criado**: 2026-07-02
**Status**: Proposto — aguardando aprovação do CTO. Nenhum código, migration ou alteração de banco foi feito para produzir este documento — arquitetura estratégica apenas, conforme mandato do CTO.
**Pré-requisito de**: `RELEASE_1_8_BLUEPRINT.md` Capítulo 6 (Buyer Experience) e Wave 6 — nenhuma Wave do Release 1.8 relacionada a comprador começa antes desta decisão ser aprovada.
**Complementa**: ADR-045 (`docs/operations/DECISIONS.md` — LGPD como referência, `buyers` como tabela própria, deleção por anonimização). Este documento não reabre o que a ADR-045 já decidiu — aprofunda o modelo de domínio, o ciclo de vida completo e a separação de identidade que a ADR-045 assumiu em nível de schema, sem detalhar.

---

## 1. PROBLEMA

O ParaguAI tem hoje dois públicos com ciclos de vida estruturalmente diferentes (`AI_CONSTITUTION.md` I): compradores e lojistas. A infraestrutura de identidade construída até o Release 1.7 resolve bem o lado lojista/staff (`profiles` + `merchants`, ADR-031) mas nunca resolveu o lado comprador — `types/user.ts` é um placeholder vazio desde o scaffold original, `useFavorites` é 100% `localStorage`, e a tabela `favorites` existe no banco sem nunca ter sido usada (`DOMAIN_MODEL.md` §3.14). Ao mesmo tempo, `buyer_events`/`buyer_sessions` (Release 1.6, Merchant Analytics Platform) já acumulam comportamento anônimo real desde então — o problema não é falta de dado, é falta de um modelo de identidade que esse dado possa amadurecer para dentro.

Este documento responde à pergunta que o CTO colocou como a questão central: **como um comprador deve evoluir desde sua primeira visita até se tornar um usuário recorrente da plataforma** — e faz isso decidindo, de uma vez, uma arquitetura que precisa permanecer válida por anos (não uma solução mínima para o Wave 6), porque impacta LGPD, Analytics, Brain, Buyer Experience, Marketplace, Merchant Intelligence, SEO, Growth, Notificações, Wishlist, Price Alerts e Conversão simultaneamente — mudar essa decisão depois que estiver em produção teria custo de retrabalho em todos esses domínios ao mesmo tempo.

---

## 2. AUDITORIA

Auditoria de schema real (migrations existentes), não de documentação — a mesma disciplina de `AI_CONSTITUTION.md` V ("dados reais antes de suposições").

### 2.1 `profiles` — não é o que a intuição sugere

`profiles` (`0009_admin_platform.sql`) nasceu como tabela de staff interno (`role IN ('admin', 'operator')`), mas a Release 1.2 (ADR-031, `0012_merchant_platform.sql`) estendeu deliberadamente o `CHECK` para `('admin', 'operator', 'merchant')` — uma decisão consciente e documentada de reaproveitar `auth.users`/`profiles` para lojistas também, especificamente para não duplicar "infraestrutura de sessão, cookies e middleware" (ADR-031, texto original). Um trigger (`handle_new_user()`) roda em **todo** `INSERT` em `auth.users` e cria automaticamente uma linha em `profiles` com `role = 'operator'` por padrão; o fluxo de registro de merchant depois faz `UPDATE profiles SET role = 'merchant'` explicitamente (`app/api/merchant/auth/register/route.ts:24`).

**Achado crítico para esta decisão**: este mecanismo já foi estendido uma vez (admin/operator → +merchant) por uma razão específica e válida no contexto de 2026-06-26. Estendê-lo uma segunda vez para incluir `'buyer'` repetiria o padrão — mas o contexto não é o mesmo. Ver Seção 3 para por que a resposta desta vez é não.

### 2.2 `auth.users` — já usado de duas formas inconsistentes

`buyer_events.buyer_id` e `buyer_sessions.buyer_id` (`0018_analytics_platform.sql`, Release 1.6) já referenciam `auth.users(id)` **diretamente** — não `profiles(id)`, não uma tabela de comprador própria (que nunca existiu). Isso significa que a camada de Analytics já antecipou a existência futura de um "comprador autenticado", mas o fez apontando para o mecanismo de autenticação (`auth.users`) em vez de para um domínio de identidade de comprador — porque esse domínio não existia. **Achado de acoplamento inadequado (Fase 1 do mandato)**: isso mistura "quem está autenticado" (uma preocupação de infraestrutura de auth) com "quem é o comprador" (uma preocupação de domínio) — exatamente o tipo de acoplamento que este documento existe para resolver. Ver Seção 4 (Identificadores) e Seção 11 (Trade-offs) para o que muda e o custo de mudar.

### 2.3 `merchant_reviews`/Trust domain — mesmo sintoma, causa histórica diferente

`merchant_reviews.reviewer_id`, `merchant_reviews.merchant_id`, e virtualmente todo `merchant_id`/`*_by` em `0014`–`0016` (Trust domain, Release 1.5) referenciam `profiles(id)`, não `merchants(id)` (que é o padrão usado corretamente por `merchant_analytics_daily.merchant_id` em `0018`). Como `profiles.id = auth.users.id` (1:1) e `merchants.user_id = auth.users.id` (1:1 único), essas duas chaves (`profiles.id` e `merchants.id`) identificam a mesma pessoa/negócio real, mas por caminhos diferentes — qualquer código que precise correlacionar dado de Trust com dado de Merchant Platform precisa passar por `auth.users.id` como tradutor implícito. **Não é um bug de integridade de dado** (nada está corrompido), é uma inconsistência de convenção entre dois domínios construídos em momentos diferentes. Registrado aqui como dívida técnica pré-existente, de severidade **média** — não causada por este trabalho, mas revelada por ele, e relevante porque `reviewer_id` especificamente nunca foi de fato alimentado por um comprador real (nenhum fluxo de cadastro de comprador jamais existiu) — é um gap latente do Release 1.5, não um dado corrompido em produção. **Não corrigido nesta etapa**, conforme instrução explícita do CTO.

### 2.4 `favorites` (tabela) — órfã

A tabela `favorites` existe no banco desde antes do Release 1.5 mas nunca foi lida nem escrita por nenhum código — `useFavorites.ts` opera inteiramente em `localStorage` (`hooks/useFavorites.ts`, confirmado por leitura direta do arquivo). Sem `buyer_id` real para associar, a tabela não podia ser usada — outro sintoma da mesma causa raiz que este documento resolve.

### 2.5 `buyer_events`/`buyer_sessions` — postura de segurança já auditável

RLS já habilitada, mas a policy de INSERT é `FOR INSERT TO anon, authenticated WITH CHECK (true)` — irrestrita por design ("evento público, sem auth obrigatória"). O comentário no próprio SQL afirma "A API valida rate limit + sanitização" — **esta alegação já foi verificada como falsa** pela auditoria de segurança da Wave 6 deste mesmo Release (nenhum endpoint do projeto tem rate limiting real, exceto lógica de batching em `/api/analytics/events`, que não é rate limiting). **Achado de segurança, severidade alta, não corrigido aqui** — ver Seção 9.

### 2.6 Brain — já tem vocabulário de comprador, nunca conectado

`src/domains/trust/types/enums.ts` já declara `BrainEntityType.Buyer`, e `GraphRelationType` já inclui `BuyerViewed`, `BuyerReviewed`, `BuyerContactedVia`, `BuyerSharedProfile`, `ReviewLinkedToBuyer` (Release 1.5, Epic 4 — Cognitive Integration). Nenhuma dessas relações foi emitida nem consumida até hoje, porque não existia identidade de comprador real para preenchê-las. Este é vocabulário já reservado, esperando o domínio que este documento define — não um conceito novo a inventar.

### 2.7 Growth, Canonical Catalog, Ownership — sem acoplamento a auditar

Confirmado por busca: nenhum desses domínios referencia `auth.users`/`profiles` diretamente. Growth Engine opera sobre `merchantId`; Canonical Catalog nunca depende de identidade de pessoa. Nenhum achado aqui — mencionado porque o mandato pediu auditoria explícita desses domínios, e "nada encontrado" é, em si, uma confirmação que vale registrar, não um espaço vazio.

### 2.8 Síntese da auditoria

| Achado | Domínio | Severidade | Causado por este trabalho? |
|---|---|---|---|
| `profiles` já é compartilhado admin/operator/merchant por decisão deliberada (ADR-031) | Identidade | Informacional | Não — contexto necessário para a decisão da Seção 3 |
| `buyer_events`/`buyer_sessions.buyer_id` referencia `auth.users` diretamente, não um domínio de comprador | Analytics | Média | Não — Release 1.6, revelado agora |
| Trust domain usa `profiles(id)` para "merchant_id" onde Merchant Platform usa `merchants(id)` | Trust / Merchant Platform | Média | Não — Release 1.5, revelado agora |
| `merchant_reviews.reviewer_id → profiles(id)` nunca foi alimentado por um comprador real | Trust | Baixa (gap latente, não dado corrompido) | Não — Release 1.5 |
| Tabela `favorites` existe, nunca usada | Comprador | Baixa | Não — pré-Release 1.5 |
| `buyer_events`/`buyer_sessions` aceitam INSERT anônimo irrestrito; comentário do código alega rate limiting que não existe | Segurança | **Alta** | Não — Release 1.6, mas fica mais urgente com identidade real de comprador |
| Coleta de `buyer_events` já roda em produção hoje, sem nenhum mecanismo de consentimento/aviso de privacidade | LGPD | **Alta** | Não — Release 1.6, é uma exposição real e atual, não hipotética |

Nenhum destes itens é corrigido neste documento — todos ficam registrados para Wave 6 do Release 1.8, com severidade explícita, conforme instrução do CTO.

---

## 3. ARQUITETURA PROPOSTA — Buyer Domain

### As quatro perguntas do mandato, respondidas

**Buyer deverá possuir domínio próprio?** Sim. `src/domains/buyer-identity/`, seguindo a mesma disciplina DDD já estabelecida por `merchant-ownership/`, `trust/`, `canonical-catalog/` — camadas `domain/`, `repositories/`, `infrastructure/`, `services/`, `events/`.

**Buyer deverá utilizar `profiles`?** Não. `profiles` já é, por decisão deliberada (ADR-031), a identidade compartilhada de **staff e lojista** — dois públicos que se autenticam por convite/cadastro controlado, em volume ordens de magnitude menor que compradores, e sem exigência de minimização de dado pessoal no mesmo grau que a LGPD impõe a um consumidor final. Estender `profiles` pela segunda vez (agora para `buyer`) repetiria um padrão que já não se justifica pela mesma razão que justificou a primeira extensão: a motivação de ADR-031 era evitar duplicar sessão/cookies/middleware — um argumento de infraestrutura de autenticação. A infraestrutura de autenticação (Supabase Auth) continua sendo reaproveitada por Buyer também (ver próxima pergunta) — o que este documento recusa não é reusar autenticação, é reusar a **tabela de identidade de domínio**, que carrega uma preocupação completamente diferente (minimização de PII, consentimento, anonimização) que staff/merchant nunca precisaram carregar.

**Buyer deverá utilizar `auth.users` diretamente?** Para autenticação, sim — não há razão para construir um segundo provedor de autenticação. Para identidade de domínio, não — nenhum outro domínio (Analytics, Trust, Favoritos, Alertas, Brain) deve referenciar `auth.users.id` diretamente. `auth.users` é tratado como um detalhe de implementação de "como verificamos quem está logado", nunca como "quem o resto da plataforma referencia". Isso corrige o acoplamento já encontrado na Seção 2.2 (`buyer_events`/`buyer_sessions.buyer_id → auth.users`) — o alvo correto é o aggregate root do Buyer Domain, não `auth.users`.

**Buyer deverá possuir aggregate root independente?** Sim — esta é a decisão mais consequente do documento, e a razão é dupla, não uma única justificativa:
1. **LGPD**: o direito ao apagamento (Seção 8) exige que a identidade sobrevivas à conta de autenticação sendo apagada, na forma anonimizada — algo estruturalmente impossível se o identificador canônico de comprador FOR `auth.users.id` (apagar a conta apagaria, em cascata, todo o histórico comportamental agregado que `C-6 Buyer Behavioral Knowledge` depende).
2. **Fricção reduzida (Fase 7 do mandato)**: um comprador pode ter identidade de domínio válida (`buyers.id`) **antes** de ter uma conta autenticada — o estado "Buyer Conhecido" da Seção 5 (e-mail capturado para um alerta, sem senha) só é possível se `buyers.id` não depender de `auth.users` existir ainda.

### Estrutura do domínio (conceitual, sem código)

```
Buyer (aggregate root)
  ├─ id (uuid, canônico, estável para sempre — mesmo pós-anonimização)
  ├─ authUserId (nullable — existe só a partir de "Buyer Autenticado")
  ├─ email (PII — nullable até "Buyer Conhecido")
  ├─ emailVerifiedAt (nullable — distingue e-mail alegado de e-mail confirmado)
  ├─ displayName (PII opcional)
  ├─ phone (PII opcional)
  ├─ marketingOptIn (boolean)
  ├─ anonymizedAt (nullable — setado no momento do apagamento)
  └─ createdAt

BuyerConsentEvent (INSERT-only, nunca anonimizado — é a prova de conformidade)
BuyerAnonymousLink (liga anonymous_id ao Buyer quando a ponte acontece — ver Seção 4)
```

Nenhuma dessas é uma tabela nova a ser criada agora — é a forma conceitual que a ADR-045 (que já definiu `buyers`/`buyer_consent_log` em nível de schema) assume quando expressa como modelo de domínio.

---

## 4. IDENTIFICADORES — quando cada um existe, quando deixa de existir, qual é canônico

| Identificador | Nasce quando | Morre quando | É PII? | É canônico? |
|---|---|---|---|---|
| `anonymous_id` | Primeira visita, gerado no cliente (já existe: `getOrCreateAnonymousId()`, `hooks/useAnalytics.ts`) | Nunca formalmente — pode ser perdido se o navegador limpar storage; não é governado por retenção porque não carrega PII sozinho | Não | Não — é o identificador **pré-canônico**, válido só até uma ponte para `buyers.id` acontecer |
| `session_id` (`buyer_sessions.id`) | A cada nova sessão de navegação | `ended_at` preenchido — mas a linha histórica permanece (analytics) | Não isoladamente | Não |
| `buyers.id` | No primeiro momento em que o visitante se torna "Buyer Conhecido" ou "Buyer Autenticado" (o que vier primeiro) | **Nunca** — sobrevive à própria anonimização como um tombstone estável (ADR-045) | Não, o UUID em si — mas funciona como chave de pseudonimização (Seção 7) | **Sim — o identificador canônico de comprador, para sempre** |
| `authUserId` (`auth.users.id`, referenciado por `buyers.user_id`) | Quando o comprador cria uma senha/OAuth real ("Buyer Autenticado") | Quando o comprador solicita apagamento real da conta — `buyers.user_id` vira `NULL` (`ON DELETE SET NULL`, nunca `CASCADE`) | Gerenciado pelo Supabase Auth, fora do nosso schema direto | Não — é um detalhe de autenticação, nunca referenciado por outros domínios |
| `profiles.id` | Nunca, para comprador | N/A | N/A | **Nunca usado para comprador, sob nenhuma circunstância** |

### A ponte anonymous_id → buyers.id

Quando um visitante anônimo se torna "Buyer Conhecido" ou "Buyer Autenticado", o histórico de eventos já gerado sob seu(s) `anonymous_id` **pode** ser vinculado retroativamente ao novo `buyers.id` — uma operação de enriquecimento opt-in (mesma sessão de navegador, mesmo `anonymous_id` local), não uma correlação forçada entre dispositivos diferentes. Essa ponte é o que faz `C-6 Buyer Behavioral Knowledge` (`STRATEGIC_ASSETS.md`) amadurecer de "Incipiente" para "Ativo Maduro" sem perder o comportamento pré-cadastro do próprio comprador.

---

## 5. CICLO DE VIDA COMPLETO

```
┌─────────────────────┐
│ Visitante Anônimo    │  Sem identificador. Sub-segundo, antes de qualquer tracking iniciar.
└──────────┬───────────┘
           │  primeira carga de página
           ▼
┌─────────────────────┐
│ Anonymous Session     │  anonymous_id (cliente) + session_id (servidor).
│                       │  Estado de 100% do tráfego hoje. Busca, comparação,
│                       │  favoritos (localStorage) — tudo funciona aqui, sem fricção.
└──────────┬───────────┘
           │  ação de baixo atrito: e-mail para 1 alerta de preço,
           │  wishlist com notificação, newsletter
           ▼
┌─────────────────────┐
│ Buyer Conhecido       │  buyers.id nasce (email preenchido, emailVerifiedAt NULL
│  (não verificado)     │  até clique em link de confirmação — ver Seção 9, Fraude).
└──────────┬───────────┘
           │  clique de confirmação
           ▼
┌─────────────────────┐
│ Buyer Conhecido       │  email confirmado. Pode receber alertas/notificações.
│  (verificado)         │  Ainda sem senha — fricção mínima preservada.
└──────────┬───────────┘
           │  completa cadastro real (senha/OAuth)
           ▼                                    ┌── (visitante pode pular
┌─────────────────────┐                         │    direto para cá sem passar
│ Buyer Autenticado     │ ◄───────────────────────┘    por "Conhecido")
│                       │  authUserId existe, buyers.user_id preenchido.
│                       │  Histórico cross-device, reviews, perguntas habilitados.
└──────────┬───────────┘
           │  reclassificação automática, comportamental
           │  (não é uma transição de identidade — é um rótulo computado)
           ▼
┌─────────────────────┐
│ Buyer Recorrente      │  Segmento derivado (ex.: retornou em N das últimas M semanas).
│  (rótulo derivado)     │  Nenhuma tabela nova — computado sob demanda, mesmo padrão
│                       │  de Merchant Score/Catalog Health.
└──────────┬───────────┘
           │  (futuro, fora de escopo desta Wave)
           ▼
┌─────────────────────┐
│ Buyer Premium         │  Não implementado. O modelo não impede — `buyers` pode
│  (futuro)             │  ganhar um campo `plan` análogo a `merchants.plan` quando
│                       │  justificado por uma Wave própria.
└───────────────────────┘

┌─────────────────────┐
│ Anonimizado           │  Terminal, a partir de qualquer estado autenticado/conhecido.
│  (LGPD)               │  buyers.id sobrevive; PII é escrita por cima; user_id → NULL.
└───────────────────────┘
```

**Nota estrutural**: nem todo comprador passa por todos os estados na ordem — "Buyer Conhecido" é um atalho opcional de baixa fricção, não um portão obrigatório antes de "Buyer Autenticado". Um visitante pode ir direto de Anonymous Session para Buyer Autenticado.

---

## 6. EVENTOS

Nomes na mesma convenção de `TrustEventType` (`src/domains/trust/types/enums.ts`) — a emissão real fica para a Wave 6, aqui apenas a taxonomia:

`BuyerKnown` (e-mail capturado, não verificado) · `BuyerEmailVerified` · `BuyerRegistered` (autenticação completa) · `BuyerAnonymousHistoryLinked` (ponte da Seção 4 executada) · `BuyerConsentGranted`/`BuyerConsentRevoked` (cada linha de `buyer_consent_log`) · `BuyerFavoriteAdded`/`Removed` · `BuyerAlertCreated`/`Triggered`/`Cancelled` · `BuyerWishlistItemAdded` · `BuyerReviewSubmitted` · `BuyerReclassifiedRecurrent` (rótulo derivado, Seção 5) · `BuyerAnonymizationRequested`/`Completed`.

Todos são candidatos a mapeamento em `TRUST_EVENT_BRAIN_IMPACT` (`event-registry.ts`) — não implementado aqui, nomeado para a Wave 6.

---

## 7. LGPD

Esta seção estende a ADR-045 (não repete) — ver lá para o levantamento legal completo (alcance extraterritorial da LGPD, comparação com a Lei paraguaia 6534/2020, que é específica de dado creditício e não se aplica aqui).

**Direito ao apagamento**: operacionalizado como anonimização (ADR-045) — `buyers.id` sobrevive, PII é sobrescrita, `user_id` desvinculado sem cascata. Esta seção acrescenta o que a ADR-045 não detalhou: o que acontece com `anonymous_id`/`session_id`/`buyer_events` ligados a esse `buyers.id` — permanecem, porque uma vez que `buyers.id` está anonimizado, o vínculo remanescente é um UUID sem PII associável, o que satisfaz a definição de dado anonimizado da própria LGPD (Art. 12) para essa camada específica.

**Anonimização vs. pseudonimização — a distinção que este documento precisa deixar explícita**: enquanto uma conta está ativa, `buyers.id` funciona como um **pseudônimo**, não uma anonimização verdadeira — tecnicamente ainda é dado pessoal sob a LGPD (Art. 13, §4º), porque a re-identificação é possível via a própria tabela `buyers`. Isso é aceito deliberadamente: personalização real (recomendações, "Compra Inteligente", `RELEASE_1_8_BLUEPRINT.md` Capítulo 6) é estruturalmente impossível sem alguma continuidade de identidade. A pseudonimização é a medida de redução de risco que a LGPD reconhece como válida (Art. 13) — o que a torna aceitável é o controle de acesso: as colunas de PII (`email`/`display_name`/`phone`) ficam restritas por RLS ao próprio comprador + caminhos de serviço com propósito legítimo explícito; `buyers.id` sozinho, sem join a essas colunas, não identifica ninguém.

**Retenção**: reafirma a ADR-045 — SLA interno de resposta de 72h (mais rígido que os 15 dias que a LGPD exige), `buyer_consent_log` nunca anonimizado (é a prova de conformidade, apagá-lo destruiria a evidência). Este documento não fixa um prazo numérico de retenção para contas inativas-mas-não-apagadas — isso é um parâmetro de negócio/jurídico, não uma decisão técnica, e fica explicitamente aberto para o CTO definir com aconselhamento jurídico, em vez de este documento inventar um número sem justificativa.

**Consentimento e cookies**: `anonymous_id`/`session_id` operam sob base legal de "legítimo interesse" (LGPD Art. 7º, IX — necessário para o funcionamento básico do serviço: sessão, prevenção de fraude) e por isso não exigem opt-in prévio — mas exigem **divulgação clara** (aviso de privacidade), que **não existe hoje** (achado da Seção 2.5/2.8, severidade alta, já em produção). Qualquer uso desse dado para personalização/perfil de marketing exige consentimento explícito, registrado em `buyer_consent_log`.

**Dados comportamentais vs. dados pessoais**: `buyer_events`/`buyer_sessions` (comportamento) são tratados com a disciplina de pseudonimização acima; `buyers.email/display_name/phone` (dados pessoais diretos) são o que efetivamente é minimizado, consentido e apagável.

---

## 8. BRAIN

**Princípio operacional, explicado sem ambiguidade**: o Brain nunca consulta `buyers.email`/`display_name`/`phone` — arquiteturalmente, o pipeline de ingestão do Brain (`CognitiveBrainService`, `src/domains/trust/brain/`) só recebe `buyer_id` (o UUID pseudônimo) como parte do payload de qualquer evento `Buyer*`, nunca as colunas de PII. Isso não é uma política documental que depende de disciplina — é uma restrição de acesso: as colunas de PII vivem numa tabela cujo RLS não concede leitura ao caminho de ingestão do Brain, apenas ao próprio comprador (mesmo princípio já usado para `SUPABASE_SERVICE_ROLE_KEY` nunca alcançar o browser, `docs/architecture/ARCHITECTURE.md` — a separação é arquitetural, não configurável).

O Brain "conhece comportamento, nunca identidade pessoal" na prática significa: ele pode aprender que "o buyer_id X compara preços de eletrônicos toda sexta-feira à noite e converte quando o preço cai mais de 8%" — e nunca precisa, nem consegue, saber que buyer_id X se chama João e seu telefone é tal. As entidades e relações do Brain já reservadas desde o Release 1.5 (`BrainEntityType.Buyer`, `BuyerViewed`/`BuyerReviewed`/`BuyerContactedVia`/`BuyerSharedProfile`/`ReviewLinkedToBuyer`, ver Seção 2.6) são exatamente o que este domínio finalmente preenche — nenhum vocabulário novo precisa ser inventado no Brain, só conectado.

---

## 9. SECURITY

**Achados específicos de identidade de comprador, além do que a auditoria da Wave 6 já cobriu para merchant/admin** (nenhum corrigido aqui, todos nomeados com severidade):

| Achado | Severidade | Descrição |
|---|---|---|
| INSERT anônimo irrestrito em `buyer_events`/`buyer_sessions`, sem rate limiting real apesar do comentário do código afirmar o contrário | **Alta** | Já existe em produção (Seção 2.5). Fica mais grave com `buyer_id` real: um ator poderia injetar comportamento falso atribuído a um `buyer_id` específico, envenenando o sinal que alimenta recomendações/Brain para aquele comprador — uma classe de risco nova ("data poisoning"), não apenas volume de spam. |
| Ausência de aviso de privacidade/consentimento para coleta comportamental já em produção | **Alta** | Exposição legal real e atual (Seção 2.5/7), não hipotética — a coleta já roda desde o Release 1.6. |
| "Buyer Conhecido" sem verificação de e-mail seria uma superfície de fraude/abuso | **Média — mitigada pelo próprio desenho** | Resolvido no modelo (Seção 5): `emailVerifiedAt` distingue e-mail alegado de confirmado; alertas/notificações só disparam após confirmação. Nomeado aqui porque a mitigação precisa ser lembrada como requisito obrigatório na execução da Wave 6, não uma opção. |
| Possível fixação de identificador se `anonymous_id` puder ser aceito de fonte externa (URL/parâmetro) em vez de gerado exclusivamente no cliente | **A verificar na Wave 6** | Não confirmado nesta auditoria se o código aceita `anonymous_id` de alguma fonte não confiável — precisa de verificação explícita antes da implementação, nomeado como item de checklist (Seção 15), não avaliado como resolvido nem como vulnerável. |
| Privilege escalation via confusão Buyer/Merchant/Admin | **Baixa, por desenho** | Como Buyer nunca usa `profiles`, `requireAdmin()`/`requireMerchant()` (que checam `profiles.role`/existência em `merchants`) estruturalmente nunca aceitam uma sessão de Buyer-apenas como suficiente — mas isso precisa de um teste explícito na Wave 6 confirmando o comportamento, não apenas a garantia de design. |

---

## 10. TRADE-OFFS

**Aggregate root independente vs. reaproveitar `profiles` pela segunda vez**: mais uma tabela, mais uma camada de resolução de identidade — o custo real é complexidade de código (duas fontes de "quem é essa pessoa" a considerar: staff/merchant via `profiles`, comprador via `buyers`). Aceito porque o alternativo (estender `profiles` de novo) resolveria menos problemas do que cria: LGPD, fricção de cadastro e volume de escala exigem tratamento diferente do que staff/merchant precisam.

**Corrigir o acoplamento `buyer_events.buyer_id → auth.users` vs. deixar como está**: corrigir exige uma migration real (fora do escopo deste documento, nomeada para a Wave 6) trocando o alvo da FK para `buyers.id`. Não corrigir preserva o acoplamento inadequado identificado na Seção 2.2 indefinidamente. A recomendação é corrigir — o custo de migration é pequeno (a coluna já existe, só o alvo da FK muda, e não há dado de produção real ainda para migrar, porque nenhum `buyer_id` jamais foi de fato preenchido).

**Pseudonimização vs. anonimização total desde o primeiro dia**: anonimização total impediria qualquer personalização (Compra Inteligente, histórico, recomendações) — inviabilizaria metade do Capítulo 6 do Blueprint. Pseudonimização com controle de acesso rígido é o trade-off aceito, consistente com o que a LGPD reconhece como válido.

**Não fixar um prazo numérico de retenção de conta inativa**: deixa uma decisão em aberto que idealmente teria uma resposta — mas inventar um número sem justificativa jurídica seria pior do que nomear explicitamente que ele falta.

---

## 11. ASSETS FORTALECIDOS

Nenhum Asset novo — este documento é o instrumento técnico que efetivamente matura o que `RELEASE_1_8_BLUEPRINT.md` Capítulo 10 já havia nomeado como maturação esperada, não uma criação nova:

**`C-6 Buyer Behavioral Knowledge`** (Core, `STRATEGIC_ASSETS.md`) — a ponte `anonymous_id → buyers.id` (Seção 4) é exatamente o mecanismo que faz este ativo avançar de "Incipiente" para "Ativo Maduro": correlação de sessão persistente através de identidade real, não apenas `anonymous_id` efêmero por dispositivo.

**`C-2 Merchant Trust Score`** (Core) — indiretamente fortalecido: reviews com `reviewer_id → buyers.id` real (em vez do gap latente `→ profiles(id)` nunca alimentado, Seção 2.3) tornam o sinal de reputação de merchant genuinamente verificável pela primeira vez.

---

## 12. MOATS FORTALECIDOS

Nenhum Moat novo. **Moat 6 — Data Flywheel** (`MOAT_STRATEGY.md`) é o que este documento mais diretamente acelera: a maturação de C-6 (Seção 11) é insumo direto do Flywheel já catalogado, não um mecanismo novo. **Moat 7 — ParaguAI Brain** também se beneficia diretamente (Seção 8) — mas, de novo, pela conexão de vocabulário já reservado desde o Release 1.5, não pela criação de algo novo.

---

## 13. ADR-046

Ver `docs/operations/DECISIONS.md` — registrada nesta mesma data, decisão formal e resumida (contexto, decisão, consequência, alternativas descartadas), com este documento referenciado como o detalhamento completo do modelo de domínio.

---

## 14. CHECKLIST DE APROVAÇÃO

- [x] Auditoria de acoplamento completa (Fase 1) — achados na Seção 2.8, nenhum corrigido, todos classificados por severidade
- [x] Buyer Domain projetado com justificativa técnica para as 4 perguntas do mandato (Seção 3)
- [x] Ciclo de vida completo com estados/eventos/transições (Seções 5–6)
- [x] Identificadores mapeados — nascimento, morte, qual é canônico (Seção 4)
- [x] LGPD — apagamento, anonimização, retenção, consentimento, cookies (Seção 7), com um parâmetro (prazo de conta inativa) explicitamente deixado em aberto para o CTO
- [x] Brain — separação comportamento/identidade explicada estruturalmente, não apenas declarada (Seção 8)
- [x] Buyer Experience — quando exigir login, minimizando fricção (Seção 5, estados "Conhecido" vs. "Autenticado")
- [x] Monetização futura preparada sem implementação (não detalhada como seção própria neste documento — herda diretamente de `RELEASE_1_8_BLUEPRINT.md` Capítulo 8/Capítulo 9 "Novos Assets": qualquer capacidade futura de cashback/fidelidade/cupons ancora em `buyers.id`, o mesmo aggregate root que este documento define, sem necessidade de nova decisão de identidade)
- [x] Security auditada com achados específicos de identidade de comprador (Seção 9)
- [x] Trade-offs documentados, não escondidos (Seção 10)
- [x] Assets/Moats reconciliados contra o catálogo permanente, sem duplicação (Seções 11–12)
- [x] ADR-046 registrada formalmente
- [ ] **Aprovação explícita do CTO** — pendente
- [ ] Fornecedor de notificação (push/e-mail) — único item de Wave 6 ainda sem ADR próprio, não coberto por este documento
- [ ] Migration de `buyer_events.buyer_id`/`buyer_sessions.buyer_id` de `auth.users` para `buyers.id` — decisão tomada (Seção 10), execução fica para a Wave 6

---

## RESPOSTA À PERGUNTA OBRIGATÓRIA DO CTO

> "O Buyer Identity Model está definitivamente definido para sustentar o ParaguAI durante os próximos anos, permitindo crescimento do marketplace, conformidade com a LGPD, preservação do Brain e máxima conversão de compradores sem necessidade de novas refatorações estruturais?"

**Sim, com duas limitações explícitas, nomeadas conforme exigido, não escondidas**:

1. **Um parâmetro de negócio permanece em aberto**: o prazo de retenção de conta inativa (Seção 7) é uma decisão jurídica/de negócio, não técnica — este documento define a arquitetura que a suportará qualquer que seja o número escolhido, mas não inventa o número.
2. **Dois achados de segurança de severidade alta já existem em produção hoje**, revelados por esta auditoria, não causados por ela (Seção 9): ausência de rate limiting real em `buyer_events`/`buyer_sessions`, e ausência de qualquer aviso de privacidade para a coleta comportamental que já roda desde o Release 1.6. Nenhum dos dois bloqueia a validade da arquitetura proposta — mas ambos deveriam ser corrigidos com prioridade alta na própria Wave 6, não adiados para depois do lançamento do Buyer Account System.

Fora dessas duas ressalvas, a arquitetura é definitiva: um aggregate root (`buyers.id`) desacoplado tanto de `profiles` (staff/merchant) quanto de `auth.users` (implementação de autenticação), com pseudonimização controlada por acesso servindo o Brain e a personalização simultaneamente, e um caminho de anonimização que satisfaz a LGPD sem destruir o patrimônio comportamental que `C-6` representa. Nenhuma capacidade futura nomeada no mandato (cashback, fidelidade, cupons, gamificação, marketplace transacional) exige revisitar esta decisão — todas ancoram no mesmo `buyers.id`.
