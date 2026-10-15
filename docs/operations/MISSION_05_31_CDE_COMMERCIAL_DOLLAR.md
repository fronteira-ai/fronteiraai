# MISSION 05.31 — DIRETRIZ FINAL DO CEO (dólar comercial de Ciudad del Este)

**Categoria**: `docs/operations/`
**Branch**: `mission-05-31-cde-commercial-dollar` (base `mission-05-30-post-launch-stability` @ `5fb7780`)
**Natureza**: branch isolada + testes + relatório. **Nenhuma alteração em produção** (sem deploy, merge, DDL/DML, DNS/Caddy/Kong/Supabase/timers/GHA/secrets/crons). Mission 04 e `origin/main` (`c43538b`) preservados.

---

## 0. O que o sistema faz HOJE (medido, não presumido)

| Fato verificado | Evidência |
|---|---|
| Só existem taxas de **mercado internacional** | `exchange_rates` = `USD/PYG`, `USD/BRL`, `BRL/PYG`, `source=keyless-open-er-api`, atualizadas pelo timer (idade 3–5 min) |
| A app **já declara** que a taxa não é o valor cobrado | `app/termos/page.tsx:88`: *"…de câmbio, e não representam o valor efetivamente cobrado por qualquer meio de…"* |
| **Não existe** conceito de dólar comercial/paralelo/CDE | grep em todo o código e docs: nenhuma ocorrência de "paralelo"/"dólar comercial"; "Ciudad del Este" aparece apenas como **cidade** |
| **Não existe** taxa por loja | `types/offer.ts` tem `price_usd`; **nenhuma** coluna de câmbio em `stores` ou `offers` |
| Pares rastreados hoje | `app/api/exchange/current/route.ts`: `UsdPyg, UsdBrl, BrlPyg` |
| Apresentação de dinheiro/“economia” | `src/domains/exchange` (`MoneyPresentation`, `MoneySavingsPresentation`) + `types/compare.ts` (`maxSavingsUSD`, `absoluteDifferenceUSD`) |

**Conclusão**: o produto exibe hoje a cotação **internacional** (com ressalva nos termos). A diretriz pede o oposto: **dólar comercial de CDE como protagonista, internacional apenas como comparação explícita.**

---

## 1. Modelo proposto (branch; **migração NÃO aplicada**)

`database/migrations/20261016000000_store_exchange_quotes.PROPOSAL.sql` (renomear para `.sql` apenas quando autorizado):

- **`store_exchange_quotes`** — uma linha por **loja + par + forma de pagamento**, com campos que respondem diretamente à diretriz:
  - `rate`, `pair`, `payment_method` (`cash` | `pix` | `card` | `unspecified`) ⇒ cobre *"condições de pagamento (dinheiro, Pix e cartão)"*;
  - **`kind` = `confirmed` | `reference`** ⇒ é aqui que a **Vertex R$ 5,12** entra: `kind='reference'`, `store=vertex`, **nunca** promovida a cotação das lojas prioritárias;
  - `source_channel` (`site`/`instagram`/`whatsapp`/`in_store`/`phone`) + `source_url` + `verified_by` + `observed_at` ⇒ procedência auditável de **canal oficial**;
  - índice por `(store_id, pair, observed_at DESC)`.
- **`exchange_rates.quote_kind`** (`international` | `commercial_reference`, default `international`) ⇒ torna **impossível** confundir as duas no banco e nas consultas.
- **Invariantes de exibição** (documentados no próprio arquivo): homepage = melhor `confirmed` das lojas prioritárias, **nada** se não houver; ofertas = taxa **individual da loja** (casando forma de pagamento quando conhecida); internacional **só** rotulada como referência de mercado.

**Rollback** documentado no fim do arquivo (drop table/constraint/column).

## 2. Fontes automatizáveis — avaliação honesta

| Canal | Automatizável? | Observação |
|---|---|---|
| Site institucional de **Cellshop** / **Shopping China** | ⚠️ **a verificar** — não confirmei nenhuma cotação publicada de câmbio nesses sites | É a **verificação por canal oficial** que a diretriz exige; precisa de coleta humana/merchant na primeira vez |
| Instagram/WhatsApp oficiais | ❌ não confiável para automação (ToS/anti-bot; conteúdo em imagem) | Útil como **confirmação** periódica humana |
| Telefone/atendimento da loja | ❌ manual | Caminho de **confirmação** (`source_channel='phone'`, `verified_by`) |
| Cotação internacional (o que já existe) | ✅ já automatizada | **NÃO** substitui a comercial — passa a `quote_kind='international'` |

**Recomendação de arquitetura de coleta**: começar **manual-assistido** (um operador registra a cotação observada com canal + data + quem confirmou), com automação **só** onde houver endpoint estável e público; qualquer automação futura escreve em `store_exchange_quotes` com `kind='reference'` até haver confirmação humana (`kind='confirmed'`). Isso evita o pior cenário: automatizar um número que ninguém verificou e apresentá-lo como cotação da loja.

**Cadência**: `confirmed` deve ter **idade máxima curta** (sugestão: 24 h; > 48 h deixa de ser exibida como comercial); `reference` pode ter janela maior, sempre rotulada. (Espelha a política de idade já usada para o câmbio na Mission 05.24 §4.)

## 3. Homepage × ofertas (regra de produto)

- **Homepage**: exibir a **referência comercial identificada** — a melhor cotação `confirmed` entre **Cellshop** e **Shopping China**, com rótulo de loja, forma de pagamento e **data da observação**. Sem nenhuma `confirmed`, **não exibir câmbio comercial** (e não cair para a internacional de forma silenciosa).
- **Ofertas**: priorizar a **taxa individual da loja** (`store_exchange_quotes` daquela loja/pagamento); sem taxa da loja, exibir a comercial geral **marcada como referência**; a internacional aparece apenas se **explicitamente rotulada** como referência de mercado.
- **Internacional nunca em silêncio**: proibido renderizar um valor `quote_kind='international'` sem o rótulo de origem.

## 4. Correções de UI solicitadas — **bloqueio declarado**

Duas mudanças foram pedidas e **não** foram implementadas, por motivos que exigem decisão sua:

1. **“Corrigir o alinhamento do card”** — o candidato natural é `components/compare/CompareOfferCard.tsx`, que é **exatamente o arquivo com alterações não commitadas da Mission 04** (preservação obrigatória, com tag `mission-04-preservation`). Mexer nele agora **misturaria** trabalho de outra missão ainda não decidido. Preciso saber **qual card** (Compare? oferta na página de produto? card da home?) e idealmente um print.
2. **“Remover percentuais ou setas sem cálculo comprovado”** — os candidatos são a **apresentação de economia** (`MoneySavingsPresentation`, `maxSavingsUSD`/`absoluteDifferenceUSD` em `types/compare.ts`) e `priceChangePercent` (`types/priceHistory.ts`). **Não** localizei com segurança qual percentual/seta o senhor considera sem cálculo comprovado: a busca por `%`/setas devolve muitos ícones (`TrendingUp`) e **não** quero remover algo com cálculo válido por engano. Preciso do ponto exato (print ou URL).

⚠️ **ADR-050 (Home congelada)**: `app/page.tsx` e `components/home/**` são **visualmente READ-ONLY** por decisão do próprio CEO (DESIGN_CONSTITUTION). As mudanças pedidas de *homepage* (item 3) exigem **exceção formal ao ADR-050** — registro isto para não violar a constituição de design por conta própria. O que dá para fazer **sem** tocar o congelado: a **camada de dados/regra** (procedência, idade, prioridade por loja) que alimenta a home.

## 5. O que **foi** implementado nesta branch

- O **modelo de dados** proposto (migração como artefato, **não aplicada**) + invariantes de exibição.
- A **separação de procedência** (`quote_kind`), que é a implementação possível da regra *“não utilizar silenciosamente a cotação internacional como substituta”* **sem** alterar UI congelada nem produção.
- Este relatório com o **checklist de verificação em canal oficial** para Cellshop e Shopping China (loja, canal, forma de pagamento, valor, data, quem confirmou).

## 6. GO / NO-GO

**GO** para: modelagem, política de procedência/idade, revisão deste relatório e a coleta **manual-assistida** da cotação oficial das duas lojas prioritárias (nenhum risco de produção).

**NO-GO** (nesta missão e até decisão sua) para: aplicar a migração, ligar qualquer automação de coleta, alterar `app/page.tsx`/`components/home/**` (ADR-050), tocar `components/compare/CompareOfferCard.tsx` (Mission 04 pendente) e remover percentuais/setas **sem** identificação precisa do elemento — remover por suposição seria trocar um problema de precisão por outro de informação.

**Próximo passo mínimo para destravar (mãos humanas)**: (1) confirmar em canal oficial a cotação de **Cellshop** e **Shopping China** (uma vez, manualmente); (2) enviar print/URL do **card desalinhado** e do **percentual/seta** a remover; (3) autorizar a exceção ao ADR-050 para a linha de câmbio comercial da home.

**Limitações declaradas**: não consultei os canais oficiais das lojas nesta missão (a diretriz pede verificação em canal oficial, que é uma ação de coleta humana/merchant; eu não tenho acesso nem autorização para contatá-los e não invento cotação); a Vertex (**R$ 5,12**) foi tratada **apenas como referência comparativa**, conforme instruído, e **não** está gravada em lugar nenhum; não executei a migração nem qualquer escrita; os percentuais/setas e o card desalinhado **não** foram localizados com certeza suficiente para edição.
