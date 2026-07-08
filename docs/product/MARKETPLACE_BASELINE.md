# MARKETPLACE_BASELINE.md
# PROGRAM Ω — Mission Ω-4.0 — Fotografia do Marketplace em 2026-07-08

**Categoria**: `docs/product/` (companion de Program Ω)
**Natureza**: Fotografia factual de um instante — como `docs/operations/PROJECT_STATUS.md`, mas focada exclusivamente em densidade de dado de marketplace, não em estado de engenharia. Não é um roadmap, não é um score — é o que existe, hoje, medido diretamente.
**Fonte**: query read-only direta contra produção, 2026-07-08 (ver `KPI_BASELINE.md` para o detalhe por KPI e `database/health_checks/marketplace_density.sql` para reprodutibilidade)

---

## Resumo em uma frase

O ParaguAI tem hoje um catálogo pequeno mas **limpo** (650 produtos, praticamente 100% com imagem/marca/categoria), alimentado por **4 conectores reais** com sincronização ativa, mas com **densidade de comparação quase nula** (1 oferta por produto em média) e **canonicalização apenas iniciada** (5,5% do catálogo tem identidade canônica) — e **zero** lojas reivindicadas por lojistas reais.

---

## O que existe

### Catálogo

650 produtos. 648 com imagem (99,7%), 650 com marca (100%), 650 com categoria (100%). A limpeza estrutural do catálogo é real e não é o gargalo — todo produto que entra pelo Connector Platform sai completo nos campos básicos.

**Mas** 140 marcas e 175 categorias para 650 produtos é uma proporção que levanta uma bandeira real de fragmentação (§ "Riscos não auditados" abaixo) — "100% preenchido" não é o mesmo que "100% correto".

### Marketplace (ofertas)

653 ofertas para 650 produtos — uma razão de 1,0046. Na prática, isso significa que a esmagadora maioria dos produtos tem **exatamente uma** loja vendendo, não múltiplas. O Compare Engine, o ranking de ofertas e qualquer noção de "melhor preço entre lojas" têm, hoje, muito pouco material real para trabalhar — não porque o mecanismo esteja quebrado, mas porque a densidade de oferta simplesmente ainda não existe.

101 das 653 ofertas (15,5%) estão marcadas `in_stock=false`.

### Conectores e Lojas

4 conectores reais certificados — Shopping China, Mega Eletrônicos, Roma Shopping, Atacado Connect — de 10 merchants Tier 1 já auditados. Juntos, já rodaram 19 sincronizações (18 com sucesso), todos os 4 com pelo menos um sync completo. 6 lojas existem no banco, todas criadas administrativamente (nenhuma via o mecanismo de Discovery automático, apesar de ele existir em código desde a Release 1.7).

**Zero** lojas foram reivindicadas por um lojista real (`merchant_stores` vazio). Todo o Merchant OS — Command Center, Analytics, Decision Engine, Growth Engine — opera sem nenhum usuário real validando-o. Este é o achado mais repetido em todas as auditorias estratégicas anteriores (RC-10, Mission Ω-1), agora com o número exato: 0.

### Histórico de Preço

618 registros de `price_history` cobrindo 615 das 653 ofertas. Profundidade média por oferta-com-histórico: ~1,005 — ou seja, na prática, quase todo histórico existente é um único ponto no tempo, não uma série. Isso é esperado dado que os conectores só têm ~19 execuções acumuladas no total; a profundidade cresce organicamente a cada sync real, sem exigir nenhum código novo.

### Canonical Catalog

**O achado mais concreto desta baseline**: apenas 36 `canonical_products` existem para 650 produtos (5,5%), e apenas 39 das 653 ofertas (5,97%) têm `canonical_product_id` preenchido. A migration que criou essa tabela (Release 1.7 Wave 4) já descrevia um script de bootstrap (`scripts/canonical-catalog-bootstrap.ts`) para espelhar 1:1 todo produto existente em um canonical product — pelos números, esse bootstrap não foi rodado contra o catálogo completo, só contra uma fração pequena dele.

Mais revelador ainda: a tabela `merge_candidates` — onde o Product Identity Engine registraria sugestões de fusão entre produtos duplicados — tem **zero linhas**, em qualquer status, desde que foi criada. O motor de matching existe em código (`ProductIdentityEngine`, Shadow Mode desde a Release 1.7 Wave 3) mas não há evidência de que ele já tenha rodado contra o catálogo de produção e persistido um resultado.

---

## Riscos não auditados (nomeados, não medidos nesta Wave)

- **Fragmentação de marca**: 140 marcas para 650 produtos. Sem uma auditoria nominal (fora do escopo de uma query agregada), não é possível dizer quantas dessas são a mesma marca real grafada diferente.
- **Fragmentação de categoria**: mesma situação, 175 categorias para 650 produtos.
- **Bug de moeda pré-existente**: já nomeado em `docs/engineering/TECH_DEBT.md` — o parser do Shopping China grava preço em Guarani como se fosse `price_usd`. Não recontado nesta baseline (exigiria amostragem de valores, não apenas contagem), mas relevante para interpretar qualquer KPI de preço dessa loja com cautela.

---

## O que esta baseline não mede (e por quê)

- **Price Volatility real** — depende da execução do `VolatilityEngine`, não de uma contagem simples.
- **Marketplace Health/Density Score compostos** — dependem de engines já existentes (`MarketplaceHealthEngine`); esta baseline fornece o insumo, não recalcula o composto.
- **Tamanho real do mercado de Ciudad del Este** — não existe no banco; qualquer "% de cobertura do mercado real" citado em `KPI_BASELINE.md` é uma meta direcional, não uma fração calculável hoje.

---

## Como este documento deve ser usado

Como ponto de comparação para a próxima medição. Toda Wave futura de densidade (`MISSION_OMEGA_4_EXECUTION_BLUEPRINT.md` §2, Ω-4.1 em diante) deve ser avaliada contra os números aqui, não contra suposição. Reexecutar `database/health_checks/marketplace_density.sql` periodicamente (proposta: a cada Wave concluída) e comparar.
