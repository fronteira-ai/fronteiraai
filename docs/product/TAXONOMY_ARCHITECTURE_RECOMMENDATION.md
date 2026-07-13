# TAXONOMY_ARCHITECTURE_RECOMMENDATION.md
# PROGRAM Κ (KAPPA) — MISSION Κ-1 — Objetivo 5/6: Recomendação Final

**Categoria**: `docs/product/`
**Data**: 2026-07-13
**Fecha**: `CATEGORY_INVENTORY_REPORT.md`, `CATEGORY_SIMILARITY_ANALYSIS.md`, `CATEGORY_CLUSTER_MATRIX.md`, `UNIVERSAL_TAXONOMY_OPTIONS.md`.

---

## 1. Pergunta do mandato, respondida diretamente

> "Vale realmente construir uma Universal Taxonomy ou um mapeamento inteligente já resolve?"

**Nem um, nem outro sozinho.** As medições desta Mission mostram dois problemas de natureza diferente, não um:

- Um mapeamento simples (Opção A/B) resolve **100% do problema de sinônimo** (66 clusters, 152 categorias, `CATEGORY_CLUSTER_MATRIX.md` §2) com custo muito baixo.
- Mas 377 pares medidos (`CATEGORY_SIMILARITY_ANALYSIS.md` §5) são estruturalmente **pai/filho** (categoria-produto × sua variante/acessório — Perfume×Perfume Masculino, Celulares×Suporte-para-Celular, TVs×TV-Box), e nenhum mapeamento flat os resolve sem risco real de falso positivo (a mesma classe de erro que a Sprint 2.7 já provou inaceitável).

Isso não é opinião — é a proporção medida: **377 pares pai/filho contra 170 categorias em sinônimo puro**. O problema estruturalmente maior (em contagem de pares, não de categorias) é justamente o que um mapeamento simples não alcança.

## 2. Recomendação: Opção C (Universal Taxonomy), com sequenciamento em 2 fases

Não recomendamos pular direto para C. Recomendamos que **MISSION Κ-2 implemente C, mas começando pelo subconjunto que a Opção A já resolveria**, porque:

1. **Fase 1 dentro de C = exatamente o mapeamento da Opção A/B, sem descartável.** Os 66 clusters desta Mission alimentam `universal_categories` como nós-folha sem hierarquia (equivalente a rodar A/B primeiro). Nenhum trabalho é jogado fora.
2. **Fase 2 dentro de C = os 377 pares pai/filho**, agora modelados como `parent_id` real, o que A/B nunca teriam schema para representar sem uma segunda migração de qualquer forma.
3. **D (Knowledge Graph) é sobre-engenharia hoje**: resolve o mesmo problema que C resolve, ao custo de uma ontologia nova e infraestrutura que o time (1 pessoa, `docs/foundation/NORTH_STAR.md`) não sustenta neste estágio pré-lançamento. Migrar de C para D mais tarde é aditivo, não destrutivo — não há custo de esperar.

### Por que não parar em B (Opção "só mapeamento")

Parar em B deixaria os 377 pares pai/filho permanentemente sem solução correta — e o padrão se repete estruturalmente (não é um resíduo pequeno): gênero em perfume/relógio (1.450+ produtos), dispositivo×acessório em celular/tablet/TV/câmera/notebook. Resolver isso mais tarde, depois de B já estar em produção, exigiria a mesma migração de schema que C já pede hoje — adiar não economiza custo de implementação, só adia o benefício.

## 3. O que a simulação de impacto (Objetivo 4) diz sobre o retorno esperado

`CATEGORY_CLUSTER_MATRIX.md` §6 mediu, com o `ProductIdentityEngine` real, marketplace inteiro: aplicar os 66 clusters de sinônimo (Fase 1 de C) desbloqueia o gate de categoria para ~40 mil pares cross-merchant e produz **1 candidato de produto genuinamente idêntico** (Memória RAM Keepdata KD32N22, mesma marca/modelo/spec/cor, duas lojas) que hoje está preso só por fragmentação de nome de categoria — verificado manualmente, não hipotético. CPC não se move de forma perceptível (não existe hoje um executor de merge — achado já estabelecido pela Sprint 2.7, fora do escopo desta Mission corrigir). **A expectativa correta para MISSION Κ-2 não é "CPC vai subir muito quando a Fase 1 for implementada"** — é "o gate para de rejeitar por engano pares que a marca/nome/spec já identificariam corretamente", o que é uma pré-condição necessária, mas sozinha insuficiente, para qualquer ganho real de CPC (que também depende de `specifications` mais ricas — Sprints 2.5/2.6 — e de um executor de merge — gap identificado pela Sprint 2.7 e ainda não endereçado).

## 4. Objetivo 6 — Escalabilidade para novos merchants

A pergunta do mandato: a solução escolhida (C) continua válida quando entrarem Cellshop, Nissei, Casa Americana, New Zone e futuros marketplaces?

**Sim, com uma ressalva importante medida nesta Mission.** A arquitetura de C (categorias brutas do merchant continuam existindo em `categories`; `universal_categories` é a camada de leitura) significa que **um merchant novo nunca precisa ser comparado par-a-par contra todos os outros já certificados** — só precisa mapear suas próprias categorias brutas contra os nós já existentes em `universal_categories` (sinônimo — Fase 1) e contra os nós pai/filho já modelados (Fase 2). Isso é o mesmo padrão de custo que `CATEGORY_INVENTORY_REPORT.md` §5 já mediu: cada merchant novo hoje adiciona dezenas a centenas de categorias, não milhares — revisável em lote, não combinatorialmente.

**A ressalva**: os 4 merchants nomeados (Cellshop, Nissei, Casa Americana, New Zone) foram certificados só como *auditoria de acesso* (`docs/marketplace/` — ADR-048, Program A Wave 3) — nenhum dado real de catálogo/categoria deles existe ainda no marketplace (todos os 4 bloqueiam `ClaudeBot` em `robots.txt`, achado da mesma Wave). **Não há como medir hoje se as categorias desses 4 merchants específicos vão colidir por sinônimo ou por variante com as 929 já existentes — isso só será mensurável quando (e se) a integração comercial (`docs/business/`, ADR-049) desbloquear acesso real.** A arquitetura C generaliza para qualquer merchant novo pela forma como foi desenhada (mapeamento incremental, não combinatório), mas essa generalização em si não foi e não pode ser testada empiricamente nesta Mission — fica registrada como suposição informada, não medição, diferentemente do resto deste documento.

## 5. Recomendação para MISSION Κ-2

Escopo proposto (arquitetura, não execução — Κ-2 é quem decide se aceita):

1. **Migração**: criar `universal_categories` (`id, name, slug, parent_id nullable`) + tabela de mapeamento `category_id → universal_category_id` (equivalente à Opção B, mas apontando para C em vez de para si mesma).
2. **Backfill Fase 1 (sinônimo)**: os 66 clusters de `CATEGORY_CLUSTER_MATRIX.md` §2, sem hierarquia (nós-irmãos apontando pro mesmo `universal_category_id`, `parent_id` nulo).
3. **Backfill Fase 2 (pai/filho)**: os 377 pares de `CATEGORY_SIMILARITY_ANALYSIS.md` §5 modelados com `parent_id` real — este é o trabalho de julgamento humano que esta Mission deliberadamente não fez (mandato: só medir), e onde a maior parte do esforço de Κ-2 deve ir.
4. **`ProductIdentityEngine`**: decidir (fora do escopo desta Mission, decisão de Κ-2) se o gate de categoria passa a comparar por `universal_category_id` de nível topo (gate duro, como hoje) e usa o nível filho (variante) como um fator pontuado — não um segundo gate — para não recriar o mesmo problema de falso positivo que motivou o gate duro original.
5. **Os 8 buckets de fallback** (`GENERAL`, `ELECTRONICOS`, etc., `CATEGORY_SIMILARITY_ANALYSIS.md` §2) ficam deliberadamente fora do escopo de Κ-2 como está definido acima — resolver exige reclassificação por nome de produto, um problema de natureza diferente (mais próximo de Data Quality/Sprint 2.4-2.6 do que de taxonomia), e deveria ser seu próprio mandato.

## 6. O que esta Mission não fez (por restrição do mandato, não por limitação)

Nenhuma categoria foi criada, renomeada ou fundida. Nenhuma migração foi executada. `ProductIdentityEngine`, Connector Platform e Canonical Catalog não foram tocados. Toda conclusão acima cita uma medição específica (`CATEGORY_INVENTORY_REPORT.md`, `CATEGORY_SIMILARITY_ANALYSIS.md`, `CATEGORY_CLUSTER_MATRIX.md`) — nenhuma é uma opinião de arquitetura sem número por trás, conforme exigido pelo mandato.
