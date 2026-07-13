# UNIVERSAL_TAXONOMY_OPTIONS.md
# PROGRAM Κ (KAPPA) — MISSION Κ-1 — Objetivo 5: Arquitetura

**Categoria**: `docs/product/`
**Data**: 2026-07-13
**Pré-requisito**: `CATEGORY_INVENTORY_REPORT.md`, `CATEGORY_SIMILARITY_ANALYSIS.md`, `CATEGORY_CLUSTER_MATRIX.md` (§6 contém a simulação de impacto do Objetivo 4).

---

## 0. O que as medições desta Mission realmente mostraram (resumo para embasar a escolha)

Três fatos medidos, não opiniões, condicionam qualquer arquitetura:

1. **929 categorias, mas o dedupe por slug já funciona tecnicamente** (`CATEGORY_INVENTORY_REPORT.md` §3) — a fragmentação é 100% lexical (idioma, singular/plural, sinônimo comercial), nunca uma limitação de schema ou de unicidade.
2. **A fragmentação real se divide em dois problemas de natureza diferente**, não um só (`CATEGORY_SIMILARITY_ANALYSIS.md`):
   - **170 categorias (66 clusters) são sinônimo puro** — resolvível por um mapeamento estático nome→ID canônico, sem nenhuma estrutura nova.
   - **377 pares são "categoria-pai × acessório/variante/subtipo"** (Celulares×Suporte-para-Celular, Perfume×Perfume-Masculino, TVs×TV-Box) — estruturalmente **não resolvíveis por um mapeamento flat** sem produzir falsos positivos (mesma classe de erro que a Sprint 2.7 já provou ser inaceitável para Product Identity).
3. **8 categorias (3.052 produtos, 17% do catálogo) são buckets de fallback do merchant** (`GENERAL`, `ELECTRONICOS`, etc.) — não resolvíveis por nenhuma arquitetura de categoria, porque a categoria em si não carrega informação; exigem reclassificação por nome de produto, um problema diferente (fora do escopo de qualquer uma das 4 opções abaixo).
4. **O impacto simulado no gate de Product Identity é real, comprovado, mas pequeno em volume** (`CATEGORY_CLUSTER_MATRIX.md` §6) — normalizar os 66 clusters desbloqueou o gate para ~40 mil pares cross-merchant e produziu 1 par de produto genuinamente idêntico (mesma marca/modelo/spec/cor, duas lojas — "Memória RAM para PC Keepdata KD32N22") que hoje está preso só por causa da fragmentação de categoria. Mas isso não move CPC hoje (não existe executor de merge, fato já estabelecido pela Sprint 2.7), e a maioria dos ~40 mil pares desbloqueados continua abaixo do threshold por falta de `specifications`/nome rico — o mesmo gargalo secundário já documentado pela Sprint 2.7.

Essas 4 medições eliminam, de saída, qualquer arquitetura desenhada só para o problema #2 (sinônimo) sem também endereçar #2-b (pai/filho) — e eliminam qualquer arquitetura cujo custo de manutenção não caiba no time hoje (1 pessoa, ParaguAI é pré-lançamento, `docs/foundation/NORTH_STAR.md` — simplicidade radical antes de escala).

## 1. Opção A — Mapeamento simples entre categorias existentes

**O que é**: uma tabela (ou constante versionada no código) `category_id → canonical_category_id`, aplicada em runtime pelo `CanonicalMergeSuggestionService` (ou por quem monta `EvaluableProduct`/`MatchCandidate`) antes do gate de categoria comparar slugs. Nenhuma tabela nova no schema além, no máximo, de uma tabela de 2 colunas.

| Eixo | Avaliação |
|---|---|
| Custo de implementação | **Muito baixo** — os 66 clusters já estão nesta Mission (`CATEGORY_CLUSTER_MATRIX.md` §2), prontos para virar dados. Nenhuma migração de schema é estritamente necessária (pode viver como constante, como o dicionário de sinônimos desta própria Mission). |
| Manutenção | Baixa a curto prazo (66 entradas hoje). Cresce **linearmente com o número de merchants**, não com o catálogo — cada novo merchant adiciona no máximo algumas dezenas de categorias novas para revisar, não milhares. |
| Escalabilidade | Resolve 100% do problema #2 (sinônimo). **Não resolve o problema #2-b (pai/filho)** — 377 pares continuam sem solução correta. |
| Impacto futuro | Nenhuma migração de dado; reversível trivialmente (é uma função pura de lookup, não altera `category_id` armazenado). |

## 2. Opção B — Tabela de equivalência

**O que é**: uma tabela real no banco, `category_equivalences (category_id, canonical_category_id, confidence, reviewed_by, reviewed_at)`, com um processo de revisão (o que esta Mission já fez manualmente para os 66 clusters vira o backfill inicial). Mesma lógica de aplicação da Opção A, mas versionada com proveniência e auditável por query, não por leitura de código.

| Eixo | Avaliação |
|---|---|
| Custo de implementação | Baixo — 1 migração pequena + 1 script de backfill (reaproveitando literalmente a lista já produzida por esta Mission). |
| Manutenção | Levemente mais alta que A (schema formal, precisa de fluxo de revisão para novas entradas), mas ainda barata — mesmo argumento de crescimento linear-por-merchant de A. |
| Escalabilidade | Idêntica à Opção A no que resolve (só problema #2). Ganha auditabilidade (quem revisou, quando) e a capacidade de registrar confiança/histórico, que A não tem. |
| Impacto futuro | Ainda não resolve #2-b. Mas é a base de dado correta para, depois, adicionar uma coluna `parent_category_id` incrementalmente **sem reescrever a solução** — evolução natural para C. |

## 3. Opção C — Camada Universal Taxonomy

**O que é**: uma tabela `universal_categories` (com `parent_id`, hierarquia real) desacoplada de `categories` (que continua sendo a tabela de "categoria como o merchant a enviou", agora só um dado de origem/proveniência). Toda leitura de produto passa a resolver via `universal_categories`, que modela tanto sinônimo (múltiplas `categories` apontando para o mesmo `universal_category`) quanto hierarquia (Perfume → Perfume Masculino/Feminino/Unissex; Celulares → Acessórios para Celular).

| Eixo | Avaliação |
|---|---|
| Custo de implementação | **Médio-alto** — 1-2 migrações (`universal_categories` + FK em `products`/`canonical_products`, ou uma tabela de mapeamento many-to-one), um schema de hierarquia (`parent_id` mínimo, sem precisar de grafo completo), e uma leva de decisões de produto (onde cortar a árvore — 2 níveis? 3?). |
| Manutenção | Mais alta que A/B — exige uma governança de taxonomia (quem decide onde uma nova categoria de merchant entra na árvore), mas é o primeiro nível que resolve #2-b de verdade (o `ProductIdentityEngine` pode comparar por `universal_category_id` de nível 1 como gate duro e usar o nível 2 — variante — como um fator pontuado, não um gate binário, resolvendo o problema Perfume Masculino/Feminino sem inventar falso positivo nem descartar o sinal). |
| Escalabilidade | Resolve #2 e #2-b. Ainda não resolve #3 (buckets fallback tipo `GENERAL`) — isso sempre vai exigir reclassificação por nome de produto, em qualquer opção. |
| Impacto futuro | É a arquitetura que generaliza para novos merchants sem trabalho combinatório (ver Objetivo 6) — um merchant novo só precisa mapear suas categorias brutas para nós já existentes da árvore, não recriar sinônimos par a par. |

## 4. Opção D — Knowledge Graph hierárquico

**O que é**: um grafo de conceitos de produto (categoria, marca, atributo, e as relações entre eles: `is-a`, `has-accessory`, `variant-of`), tipicamente com uma ontologia formal (RDF/property graph) e inferência (ex.: um SPARQL-like ou motor de regras para "categoria X é acessório de categoria Y").

| Eixo | Avaliação |
|---|---|
| Custo de implementação | **Alto** — nova infraestrutura de armazenamento/consulta (grafo dedicado ou emulado em SQL com múltiplas tabelas de relação), uma ontologia a desenhar do zero (não existe uma pronta para o domínio "marketplace de eletrônicos/perfumaria/casa" PT/ES), e reescrita de todo o caminho de leitura de categoria. |
| Manutenção | Alta — exige conhecimento de modelagem de grafo/ontologia que a equipe (hoje 1 pessoa, ver `docs/foundation/NORTH_STAR.md`) não precisa neste estágio; risco real de nunca ser totalmente povoado, virando um "meio-grafo" mais confuso que a tabela flat que substituiu. |
| Escalabilidade | Tecnicamente a mais poderosa (modela `is-a`, `has-accessory`, `variant-of`, `made-by` todos nativamente) — mas **resolve um problema (#2-b) que a Opção C já resolve com uma fração do custo**, para o volume de dados desta Mission (929 categorias, ~152 em clusters, 377 pares ambíguos). Grafo se paga em escalas de dezenas de milhares de categorias com relações multi-tipo — não é o caso aqui hoje. |
| Impacto futuro | Maior otimalidade teórica de longo prazo, mas **sobre-engenharia para o estágio atual** (`docs/foundation/AI_CONSTITUTION.md`/`ENGINEERING_PRINCIPLES.md` — simplicidade e arquitetura evolutiva: não construir para escala hipotética). Migrar de C para D mais tarde, se e quando a ontologia justificar, é uma evolução aditiva — nada da Opção C precisa ser descartado. |

## 5. Comparação lado a lado

| Eixo | A — Mapeamento simples | B — Tabela de equivalência | C — Universal Taxonomy | D — Knowledge Graph |
|---|---|---|---|---|
| Resolve sinônimo (#2, 66 clusters) | Sim | Sim | Sim | Sim |
| Resolve pai/filho (#2-b, 377 pares) | Não | Não | **Sim** | Sim |
| Resolve buckets fallback (#3) | Não | Não | Não | Não |
| Custo de implementação | Muito baixo | Baixo | Médio-alto | Alto |
| Custo de manutenção contínua | Baixo | Baixo-médio | Médio | Alto |
| Migração de schema | Nenhuma (opcional) | 1 pequena | 1-2 | Múltiplas + infra nova |
| Auditabilidade/proveniência | Nenhuma | Sim | Sim | Sim (a mais rica) |
| Escala para novos merchants (Objetivo 6) | Linear, manual | Linear, manual, auditável | Linear, guiado pela árvore existente | Linear, mas exige modelagem de ontologia por conceito novo |
| Risco de sobre-engenharia hoje | Nenhum | Nenhum | Baixo | **Alto** |

## 6. Encaminhamento

Ver `TAXONOMY_ARCHITECTURE_RECOMMENDATION.md` para a decisão final, a justificativa ligada às medições do Objetivo 4, e a recomendação de escopo para MISSION Κ-2.
