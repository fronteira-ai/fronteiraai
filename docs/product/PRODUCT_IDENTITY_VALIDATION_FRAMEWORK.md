# PRODUCT_IDENTITY_VALIDATION_FRAMEWORK.md
# PROGRAM Θ — Mission Θ-1 — Framework de Validação para Redução do Shadow Mode

**Categoria**: `docs/product/` (companion de Program Ω/Δ/Ξ — mesma família de `MERGE_CANDIDATES_REPORT.md`, que esta Mission retoma e formaliza)
**Data**: 2026-07-10
**Status**: **BACKLOG ESTRATÉGICO** (decisão do CTO, 2026-07-10) — framework aprovado como consistente e tecnicamente correto, mas deliberadamente não priorizado para a Release atual. Nenhum código escrito, nenhuma query contra produção, nenhum threshold alterado, nenhum merge executado ou aprovado. Não iniciar os Próximos Passos (Seção 6) sem novo mandato explícito do CTO. Ver Seção 0 para o critério de quando retomar.
**Mandato do CTO (verbatim, resumido)**: "Não execute nenhuma mudança automática em Product Identity. O próximo objetivo não é implementar auto-merge. O próximo objetivo é construir um processo de validação baseado em evidências para determinar quando e em quais categorias o Shadow Mode pode ser reduzido com segurança. Preserve a integridade do catálogo como prioridade máxima."
**Companions**: `MERGE_CANDIDATES_REPORT.md` (Mission Ω-4.1 — primeira tentativa, 0 evidência gerada), `COMPARABLE_PRODUCT_COVERAGE_REPORT.md` (Wave Ξ-5 — achado que motivou esta Mission)

---

## 0. Por que isto é Backlog Estratégico, não a próxima Mission

Decisão do CTO, registrada aqui para que a razão sobreviva ao tempo, não só a conclusão: o framework em si foi validado como consistente — as 3 descobertas da Seção 2/5 (o sistema já produz evidência suficiente via `product_identity_match_log`; Shadow Mode é uma garantia estrutural, não só uma política; a proposta é inteiramente read-only) permanecem corretas e não precisam ser refeitas quando esta Mission for retomada.

**Mas o gargalo real do ParaguAI hoje não é a qualidade do matching — é volume.** `COMPARABLE_PRODUCT_COVERAGE_REPORT.md` (Wave Ξ-5) e `MARKETPLACE_DOMINATION_STRATEGY.md` (Mission Ξ-1) já estabelecem isso com dado: baixa competição entre merchants, baixa densidade de ofertas, cobertura limitada nas categorias estrategicamente prioritárias. Investir em validar e eventualmente reduzir Shadow Mode otimiza a *precisão* de comparações entre produtos que já existem duplicados no catálogo — mas hoje há poucos produtos assim para comparar. É otimizar a ponta errada do funil: refinar como unimos duplicatas antes de ter duplicatas suficientes para unir é esforço de engenharia sem alavancagem imediata no problema que mais limita o marketplace agora.

**Critério objetivo para retomar** (não uma data, uma condição de dado — mesma disciplina de `EXECUTION_WAVES.md`): quando uma Wave futura de expansão de merchants/densidade de oferta (ex.: a sucessora de Ξ-1..Ξ-5) produzir `MergeCandidate`s em volume não-trivial — isto é, quando o gargalo deixar de ser "há poucos duplicatas para encontrar" e passar a ser "há duplicatas suficientes, mas Shadow Mode as segura sem agir". Até lá, este documento permanece como está, disponível para qualquer sessão futura, sem necessidade de redescobrir as descobertas da Seção 2.

---

## 1. Por que esta Mission existe agora

A Wave Ξ-5 mudou o que sabíamos sobre o sistema: crescer o catálogo não move Comparable Product Coverage, porque o bootstrap canônico é 1:1 por desenho e a única ponte entre merchants — `CanonicalMergeSuggestionService` — só *sugere* (Shadow Mode), nunca aplica. A tentação óbvia seria "então vamos aplicar merges automaticamente para os casos de alta confiança". Este documento existe para dizer, com evidência, por que isso seria prematuro hoje, e o que precisa ser medido antes de sequer considerar a pergunta caso a caso, por categoria.

**Isto não é uma proposta de auto-merge.** É uma proposta de *como decidir, com dado, se e quando* reduzir Shadow Mode seria seguro — decisão que continua sendo humana e do CTO, tier a tier, categoria a categoria, nunca automática.

---

## 2. O que já existe hoje — inventário, para não duplicar nada

| Componente | O que faz | Estado real |
|---|---|---|
| `ProductIdentityEngine` (`src/domains/product-identity/domain/`) | Scoring determinístico: brand+category são gates duros (mismatch capa a confiança em 40, bem abaixo do tier `possible`=70); name (peso 50) + specifications (30) + model-number (20) compõem o resto. Cada fator carrega evidência textual — nenhum número opaco. | Em produção desde Release 1.7 Wave 3. Thresholds (`auto`=95, `probable`=85, `possible`=70) aprovados pelo CTO, "podem mover conforme o algoritmo é validado contra dado real de Shadow Mode" — **esta Mission é exatamente essa validação, nunca feita até hoje**. |
| `ProductIdentityService.evaluateAndLog` + `ProductIdentityShadowStage` | Chamado para **cada produto de cada sync de cada connector**, desde Release 1.7 Wave 3 — avalia contra candidatos da mesma marca e grava um `MatchLogEntry` completo (score, tier, fatores, penalidades, razão de explicabilidade) em `product_identity_match_log`. | **A fonte de evidência real mais rica que existe** — contínua, em produção, muito maior em volume que os 650 registros de um único bootstrap. Hoje é **write-only**: nenhum código lê essa tabela de volta (confirmado — nenhuma API, nenhum script). |
| `CanonicalMergeSuggestionService.suggestMergesFor` | Roda apenas dentro de `canonical-catalog-bootstrap.ts`, compara canonical products da mesma marca, grava `MergeCandidate` só se confiança ≥ `possible`. | Achado de `MERGE_CANDIDATES_REPORT.md`: 650 execuções, 0 candidatos gerados no catálogo de 2026-07-08. Achado da Wave Ξ-5: o bootstrap nunca processou mais que os primeiros 1000 produtos até o fix desta última Wave — volume de candidatos hoje ainda não remedido pós-fix. |
| `merge_candidates` + `PATCH /api/admin/canonical-catalog/merge-candidates/[id]` | Fluxo de revisão humana: `Pending → Approved/Rejected/Ignored`, registra `reviewedBy`. | **Confirmado por leitura do código, não suposição**: `IMergeCandidateRepository` não tem nenhum método que reatribua ofertas ou deprecie um canonical product. Aprovar um candidato hoje é só um rótulo — **não existe, em lugar nenhum do código-base, um caminho de execução de merge**. Shadow Mode não é só uma política documentada, é uma garantia estrutural: não há função para violá-la ainda. |

**Conclusão do inventário**: a peça que falta não é "decidir os thresholds certos" — é que **nunca foi lido** o maior ativo de evidência que o sistema já produz (`product_identity_match_log`), e o ativo que foi lido (`merge_candidates`) tem volume perto de zero. Qualquer conversa sobre reduzir Shadow Mode antes de olhar para `product_identity_match_log` seria decisão por hipótese, exatamente o que `MERGE_CANDIDATES_REPORT.md` já se recusou a fazer.

---

## 3. O que "evidência" significa aqui, precisamente

**Métrica primária: Precisão por (tier, categoria, algorithmVersion).** Definição: de uma amostra de avaliações do `product_identity_match_log` num tier de confiança dado, dentro de uma categoria dada, que fração é *realmente* o mesmo produto — segundo revisão humana, não segundo o próprio engine (medir a Precisão do engine usando a saída do engine como gabarito seria circular).

**Por que Precisão, e não Recall, é a métrica que este framework persegue primeiro**: o princípio já aprovado pelo CTO em Release 1.7 Wave 3 é explícito — "falso positivo (unir dois produtos diferentes) é inaceitável; falso negativo (deixar uma duplicata sem unir) é aceitável e corrigível depois." Reduzir Shadow Mode significa confiar o engine para *agir*; o risco que importa é o de ação errada (falso positivo), não o de inação (falso negativo). Recall exigiria um censo independente de duplicatas reais no catálogo — não temos isso, não fabricaremos um número para preenchê-lo. Nomeado como limitação real deste framework, não escondido.

**Por que segmentar por categoria**: a hipótese não testada de `MERGE_CANDIDATES_REPORT.md` (threshold conservador demais vs. catálogo genuinamente sem duplicatas) provavelmente não tem uma resposta única — celulares com múltiplas variantes de armazenamento/cor (nomes quase idênticos, especificações que diferem em 1 campo) são um risco de falso positivo estruturalmente diferente de, digamos, eletrodomésticos com nomes de modelo mais distintos. Uma Precisão única para o catálogo inteiro esconderia isso.

**Por que segmentar por `algorithmVersion`**: `MatchLogEntry` já carrega essa coluna por desenho ("uma avaliação histórica nunca é recalculada; uma mudança de algoritmo produz novas linhas, as antigas ficam exatamente como estavam"). Evidência de uma versão do algoritmo não deve validar silenciosamente uma versão diferente — se o `ProductIdentityEngine` mudar, a validação recomeça para a nova versão, não herda a Precisão medida da anterior.

---

## 4. O processo proposto — 4 passos, nenhum executado nesta Mission

### Passo A — Amostragem estratificada (ferramenta nova, read-only)
Construir um script read-only (mesma classe de `cpc-report.ts`/`marketplace-observatory-report.ts`, mesmo padrão de autorização — pedir permissão antes de rodar contra produção) que:
- Lê `product_identity_match_log`, estratificado por (`tier`, categoria do produto avaliado, `algorithmVersion`).
- Amostra aleatoriamente um número fixo de linhas por célula (ex.: até 30 por célula — ver Passo C sobre por que 30).
- Exporta em formato revisável por humano: nome da oferta avaliada, nome do candidato sugerido, todos os `matchedAttributes`/`mismatchedAttributes`/`penalties`, e a `explainabilityReason` já gravada — nada precisa ser recalculado, só exibido.
- **Não grava nada de volta.** Não decide nada. Só extrai amostra para revisão.

### Passo B — Rotulagem humana (fora do código, decisão do CTO ou de quem for designado revisor)
Cada linha da amostra recebe um rótulo: **Duplicata Real** / **Não é Duplicata** / **Incerto**. "Incerto" é um rótulo válido e esperado — contá-lo como "não duplicata" para fins de Precisão seria inflar artificialmente o risco tolerado; contá-lo como "duplicata" seria o oposto. Fica registrado à parte, nunca forçado para um dos dois lados.

### Passo C — Cálculo de Precisão com intervalo de confiança, não percentual bruto
Dado o princípio "falso positivo é inaceitável", uma Precisão pontual (ex.: "18/20 = 90%") não é suficiente — amostras pequenas escondem o pior caso real. Usar o limite inferior de um intervalo de confiança binomial (ex.: Clopper-Pearson, 95%) sobre a amostra rotulada de cada célula. Tamanho mínimo de amostra por célula antes de qualquer célula ser sequer elegível para discussão: a ser definido no momento da execução (não fabricado aqui como número arbitrário), mas nunca inferior ao necessário para que o intervalo de confiança tenha largura informativa — uma amostra de 3 não produz evidência, produz ruído com aparência de dado.

### Passo D — Recomendação, não execução
Mesmo uma célula (tier, categoria) que atinja um limite de Precisão alto produz, no máximo, **uma recomendação escrita, para aprovação explícita do CTO** — nunca uma mudança de código que passa a aplicar merges automaticamente para aquela célula. Se e quando uma célula for aprovada, a capacidade de *executar* um merge aprovado (hoje inexistente no código, confirmado na Seção 2) seria o escopo de uma **Mission futura e separada**, com suas próprias perguntas de segurança — reversibilidade, auditoria, o que acontece com `offers` já vinculadas se um merge precisar ser desfeito — nenhuma delas respondida ou assumida aqui.

---

## 5. O que este framework deliberadamente não propõe

- Nenhuma mudança em `ProductIdentityEngine` (pesos, thresholds, gates).
- Nenhuma capacidade de aplicar um merge — `IMergeCandidateRepository` continua sem esse método.
- Nenhuma promoção automática de `MergeCandidate` para "aplicado".
- Nenhuma query ou escrita contra produção nesta Mission — mesmo o Passo A (ferramenta de amostragem) é só proposto aqui; construí-la e rodá-la são passos futuros, cada um pedindo autorização própria, mesma disciplina de `COMPARABLE_PRODUCT_COVERAGE_REPORT.md`.
- Nenhuma meta de "quantas categorias devem graduar" — este documento não assume que alguma categoria vai passar no critério; a resposta pode ser "nenhuma ainda", e essa seria uma resposta válida e completa.

## 6. Próximos passos, não executados nesta Mission

**Bloqueados pelo Status da Seção 0** — nenhum destes passos deve começar sem novo mandato explícito do CTO, mesmo que pareçam de baixo risco (Passo A é read-only, mas ainda assim não autorizado enquanto este documento estiver em Backlog Estratégico).

1. Autorização explícita do CTO para construir a ferramenta de amostragem do Passo A.
2. Rodar a amostragem read-only contra produção (com permissão, mesma disciplina desta sessão).
3. Rotulagem humana da amostra (Passo B) — trabalho de revisão, não de engenharia.
4. Relatório de Precisão por (tier, categoria, algorithmVersion) com intervalos de confiança — provável próximo documento desta família (`PRODUCT_IDENTITY_PRECISION_REPORT.md` ou nome equivalente).
5. Só então, célula a célula, uma decisão do CTO sobre reduzir Shadow Mode — e mesmo essa decisão não implica automaticamente construir a capacidade de execução (Seção 4, Passo D).
