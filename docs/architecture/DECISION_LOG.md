# DECISION_LOG.md

**Categoria**: `docs/architecture/`
**Propósito**: memória institucional completa da arquitetura — todas as decisões estruturais dos Programas Κ, Π, Ω, Λ, Μ, Ν, Ο e ΩΩ, em formato individual e rastreável. Não substitui `ENGINEERING_DECISIONS.md` (o resumo executivo) nem `docs/operations/DECISIONS.md` (ADRs numerados de produto/negócio) — este é o registro completo, decisão por decisão, especificamente da linha do tempo de encerramento da arquitetura.

---

### Decision #1
**Program**: Κ
**Data**: (não registrada com data exata nas Missions originais)
**Problema**: 929 categorias reais fragmentadas por merchant, sem taxonomia unificada, impedindo comparação cross-merchant por categoria.
**Alternativas consideradas**: normalização automática por IA; unificação manual completa das 929 categorias de uma vez; taxonomia top-down desenhada previamente e ancorada progressivamente em clusters reais validados.
**Decisão tomada**: construir uma Universal Taxonomy top-down (`UNIVERSAL_TAXONOMY`), ancorada bottom-up apenas nos 66 clusters já validados manualmente (PT/ES), com nós vazios (`realCategorySlugs: []`) tratados como placeholders honestos, não como cobertura fictícia.
**Motivação**: nunca depender das categorias dos lojistas como fonte de verdade; nunca fingir cobertura que não existe.
**Evidências**: Κ-1 (descoberta dos 66 clusters), Κ-2 (engine construída); Μ-1 mediu depois que apenas 13,82% dos slugs reais estão mapeados — gap de conteúdo, não de mecanismo.
**Mission que validou**: Μ-1 (mecanismo correto, conteúdo incompleto)
**Status**: **Frozen** (mecanismo) / conteúdo permanece item de roadmap de negócio

---

### Decision #2
**Program**: Κ
**Data**: (não registrada com data exata)
**Problema**: `ProductIdentityEngine` comparava produtos usando colunas brutas (`category_id`, `specifications` fragmentado), sem nunca ter sido conectado à Taxonomia Universal nem ao Product Signature.
**Alternativas consideradas**: reescrever o motor de matching; manter o motor e trocar apenas o que é alimentado a ele.
**Decisão tomada**: manter `ProductIdentityEngine.ts` inalterado (mesmos pesos, mesmos gates) e substituir apenas o que é passado a ele — categoria resolvida via Taxonomia Universal, especificações via Product Signature.
**Motivação**: "substitui O QUE é passado para esse campo — nunca COMO ele é comparado" (princípio explícito de Κ-3).
**Evidências**: Κ-4 — candidatos cross-merchant reais passaram a aparecer após a integração.
**Mission que validou**: Κ-4, reconfirmado por Ν-1 (replay do motor original sem nenhuma alteração desde então)
**Status**: **Frozen**

---

### Decision #3
**Program**: Π
**Data**: (não registrada com data exata)
**Problema**: o motor de matching não usava `manufacturerCode`, um dos sinais de maior poder discriminativo disponível no texto dos produtos.
**Alternativas consideradas**: criar um novo motor de matching específico para códigos de fabricante; integrar como mais um campo de especificação no motor já existente.
**Decisão tomada**: integrar `manufacturerCode` como parte do Product Signature já consumido pelo motor existente — nenhum motor novo, nenhum peso especial fora do fator `specifications` já existente.
**Motivação**: manter um único motor de decisão, nunca múltiplos motores concorrentes.
**Evidências**: Program Π — Knowledge Graph construído sobre a mesma base.
**Mission que validou**: Π-1
**Status**: **Frozen**

---

### Decision #4
**Program**: Ω
**Data**: 2026-07-16/17
**Problema**: `findByBrandId` recomputava a assinatura de produto de todo o cohort de marca a cada chamada — 624,2x de redundância medida (Ξ-2), com o cohort "Outros" (3.054 produtos) respondendo por 83% do desperdício.
**Alternativas consideradas**: cap arbitrário no tamanho do cohort; cache sem validação; camada de persistência com validação contínua contra o valor fresco.
**Decisão tomada**: Marketplace Memory — camada de leitura (`getSpecificationsReadThrough`) que reaproveita fatos persistidos, mas nunca confia cegamente: valida por amostragem contra o cálculo original e prefere o valor fresco em qualquer divergência.
**Motivação**: um cache nunca pode ser a causa de uma decisão de merge incorreta — correção antes de performance.
**Evidências**: Ω-2 (validação de sombra), Ω-3 (integração real), Ω-4 (0 Parity Errors em 141.434 leituras reais de produção).
**Mission que validou**: Ω-4
**Status**: **Frozen**

---

### Decision #5
**Program**: Ω
**Data**: 2026-07-17
**Problema**: como testar e liberar em produção um mecanismo novo sem risco de regressão silenciosa.
**Alternativas consideradas**: liberação total imediata; feature flag binária (ligado/desligado); rollout percentual gradual com bucketing determinístico e amostragem contínua de paridade.
**Decisão tomada**: `PRODUCT_IDENTITY_MEMORY_ROLLOUT_PERCENT` com bucketing determinístico por hash de id, e `PRODUCT_IDENTITY_MEMORY_PARITY_SAMPLE_PERCENT` (default 100%) validando continuamente.
**Motivação**: nenhuma mudança de comportamento sem trilha de auditoria e sem capacidade de reversão imediata.
**Evidências**: Ω-4 — rollout real 0→5→10→25→50→100%, 0 regressões em `merge_candidates`, 0 Parity Errors em qualquer estágio; achado colateral: 100% de parity sampling torna 100% de rollout 9x mais lento que o baseline.
**Mission que validou**: Ω-4
**Status**: **Frozen** (mecanismo) — configuração de percentuais permanece decisão operacional, explicitamente fora de escopo de reabertura de código

---

### Decision #6
**Program**: Λ
**Data**: 2026-07-17
**Problema**: a infraestrutura (Marketplace Memory, Product Identity) estava validada e correta, mas nenhum KPI de negócio (CPC, qualidade de busca, contexto do Advisor) havia sido medido contra ela.
**Alternativas consideradas**: assumir que a infraestrutura correta implica melhoria de negócio automática; medir diretamente contra dado real de produção.
**Decisão tomada**: auditar o marketplace inteiro com dado real e responder honestamente que Marketplace Memory, por design (parity-neutra), é estruturalmente incapaz de mover CPC — sua função é performance, não cobertura.
**Motivação**: nunca presumir impacto de negócio sem medir.
**Evidências**: CPC real de 0,08% (14/18.001), inalterado por nenhum dos 6 estágios reais do rollout de Ω-4.
**Mission que validou**: Λ-1
**Status**: **Active** (achado de negócio, não um componente de código a congelar)

---

### Decision #7
**Program**: Μ
**Data**: 2026-07-17
**Problema**: Λ-1 recomendou revisar primeiro a fila de merge candidates de alta confiança (≥95%) como maior alavanca de CPC.
**Alternativas consideradas**: manter a recomendação de Λ-1; investigar a composição real da fila antes de agir.
**Decisão tomada**: reverter a recomendação — revisar primeiro os 85 candidates cross-loja do tier de revisão manual (70-84%), não os de alta confiança.
**Motivação**: dado real mostrou que 100% dos candidates de alta e média confiança (41 + 1.780) são intra-loja — não movem CPC mesmo se aprovados; os únicos 85 candidates cross-loja capazes de mover CPC estão todos no tier mais baixo.
**Evidências**: simulação real via union-find sobre `merge_candidates` — aprovar alta+média confiança produziu CPC inalterado (14→14); aprovar todos os pendentes produziu 14→69.
**Mission que validou**: Μ-1 (autocorreção transparente de Λ-1)
**Status**: **Active** (achado de negócio, orienta o roadmap, não um componente de código)

---

### Decision #8
**Program**: Ν
**Data**: 2026-07-17
**Problema**: `ProductIdentityEngine.evaluate()` mantém apenas o melhor candidato por chamada — risco teórico de suprimir um segundo candidato válido (cross-loja) em favor de um primeiro colocado (intra-loja).
**Alternativas consideradas**: alterar o motor para reter múltiplos candidatos por chamada; manter o design atual e medir o impacto real antes de qualquer mudança.
**Decisão tomada**: não alterar o motor — replay real de 5.642 produtos (bucket "Outros" completo) encontrou 0 casos reais de supressão causados por este design.
**Motivação**: nunca alterar código por risco teórico sem evidência real de impacto — Evidence First.
**Evidências**: Ν-1 — reclassificação completa do bucket "Outros", 0 casos em `falso_negativo_alta` / `mascarado_por_intra_loja` / `ja_deveria_ter_candidate`.
**Mission que validou**: Ν-1
**Status**: **Frozen** (decisão de não alterar o motor, reafirmada)

---

### Decision #9
**Program**: Ο
**Data**: 2026-07-17
**Problema**: como priorizar investimento de crescimento de CPC entre merchants, categorias e correções de dado.
**Alternativas consideradas**: expandir catálogo genericamente; priorizar merchants por tamanho; priorizar por taxa de overlap real observada por categoria.
**Decisão tomada**: focar expansão de catálogo nas categorias com nomenclatura de modelo padronizada por fabricante (Celulares 16,67%, Drones 33,33%, Notebooks 10,00% de comparabilidade real) e no merchant com melhor taxa de conversão real (atacado-connect, 0,52%), não no maior catálogo.
**Motivação**: taxa de overlap real observada, não tamanho de catálogo, é o preditor correto de ganho de CPC.
**Evidências**: `cpc-report` segmentado por categoria (Λ-1); overlap matrix completo por par de merchant (Μ-1).
**Mission que validou**: Ο-1
**Status**: **Active** (estratégia de negócio, ver `ROADMAP.md`)

---

### Decision #10
**Program**: ΩΩ
**Data**: 2026-07-17
**Problema**: após 7 programas de construção e validação, era necessário decidir formalmente se o núcleo arquitetural estava maduro o suficiente para ser congelado.
**Alternativas consideradas**: continuar investindo em arquitetura indefinidamente; congelar sem validação formal; conduzir uma revisão final por Architecture Review Board com critérios explícitos de aprovação/reprovação.
**Decisão tomada**: revisão formal em duas etapas (ΩΩ-1 auditoria completa, ΩΩ-2 revalidação rigorosa dos riscos encontrados) — resultado **ENGINEERING APPROVED WITH MONITORING**, núcleo congelado, nenhuma reescrita necessária.
**Motivação**: encerrar a arquitetura exige o mesmo rigor de evidência que qualquer outra decisão da sequência — nunca por cansaço ou pressão de cronograma.
**Evidências**: ΩΩ-1 (5 riscos nomeados, nenhum crítico); ΩΩ-2 (revalidação — nenhum risco bloqueia operação na escala evidenciada).
**Mission que validou**: ΩΩ-2
**Status**: **Frozen**
