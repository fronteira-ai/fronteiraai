# PRODUCT_IDENTITY_V2.md
# Program Π (Pi) — Mission Π-1 — Product Knowledge Graph

**Categoria**: `docs/architecture/`
**Criado**: 2026-07-16
**Status**: Proposta arquitetural pura, não implementada, não autorizada para execução. `ProductIdentityEngine` continua intocado por esta Mission e por esta proposta — nenhuma linha, peso ou threshold é alterado no que segue.
**Ver também**: `docs/product/PRODUCT_IDENTITY_EVOLUTION_OPTIONS.md` (Sprint 2.7 — precedente direto desta proposta), `docs/architecture/PRODUCT_KNOWLEDGE_GRAPH.md`.

---

## 1. Onde a última evolução (Sprint 2.7 → Program Κ) chegou

`PRODUCT_IDENTITY_EVOLUTION_OPTIONS.md` (Sprint 2.7, antes de Program Κ existir) diagnosticou com precisão as duas causas reais de CPC travado — `category_id` não normalizado e `specifications` congelado — e recomendou corrigi-las **antes** de qualquer mudança de política de persistência de candidato. Program Κ (Missions Κ-2/Κ-3/Κ-4) fez exatamente isso: Universal Taxonomy resolve categoria, Product Signature resolve especificações. Resultado medido: cross-merchant 0→66 (simulação)→99 (produção real, Mission OPS-1). **A previsão da Sprint 2.7 foi confirmada por dado real, não por opinião.**

## 2. O que "V2" significa aqui — não um Engine novo, um INSUMO novo

Esta proposta não segue nenhuma das 4 opções já avaliadas e rejeitadas em Sprint 2.7 (mudar política de persistência de candidato) — seria repetir um erro já corrigido pela evidência. A proposta é sobre o que entra no Engine, exatamente como Κ-4 já fez para categoria/especificações: **elevar `manufacturerCode` a um insumo de primeira classe do gate, não apenas do fator de especificações.**

### Estado atual (medido, Program Κ-4)
`manufacturerCode` já entra no Engine — mas apenas dentro do `Record<string,string>` de especificações (`signatureToSpecifications()`), competindo por peso com `color`/`voltage`/`powerW`/etc. dentro do fator `SPEC_WEIGHT=30`. Um par com `manufacturerCode` idêntico mas poucas outras especificações compartilhadas ainda pode não cruzar o piso de 70%.

### Proposta (arquitetura, não implementação)
Um **gate adicional opcional**, no mesmo espírito do gate de marca/categoria já existente (`ProductIdentityEngine.ts`, `MISMATCH_CAP`): quando ambos os lados de um par têm `manufacturerCode` extraído (53,63% do catálogo, medido) **e** os valores são idênticos, isso é evidência estruturalmente mais forte que qualquer combinação de nome+especificações — porque um código de fabricante correto tem taxa de falso positivo desprezível (é um identificador, não uma similaridade). Isso não muda pesos existentes; adiciona um caminho paralelo de alta confiança para o subconjunto de pares que já têm esse dado.

**Por que isso não é "alterar Product Identity" no sentido proibido por esta Mission**: nenhuma mudança está sendo feita agora. Isto é uma especificação de arquitetura para uma Mission futura avaliar, auditar, e — se aprovada pelo CTO — implementar, seguindo exatamente o mesmo processo de Κ-4 (wiring no arquivo de ponte `CanonicalMergeSuggestionService`, nunca no `ProductIdentityEngine` em si, se a decisão de design preferir preservar até essa disciplina).

## 3. Camadas de identidade — V1 (hoje) vs. V2 (proposto)

| Camada | V1 (produção hoje) | V2 (proposto) |
|---|---|---|
| Gate de marca | `brandId` exato | Inalterado |
| Gate de categoria | Universal Taxonomy (Κ-4) | Inalterado |
| Fator de nome | Jaccard sobre tokens | Inalterado |
| Fator de especificações | `manufacturerCode` misturado com outros atributos, peso 30 total | Inalterado como fator — mas `manufacturerCode` idêntico passa a também alimentar o gate opcional abaixo |
| **Gate de identificador (novo, proposto)** | Não existe | Se `manufacturerCode` idêntico em ambos os lados: eleva a confiança mínima do par para o piso "Média" (85%) independentemente do nome/especificações — nunca força "Alta" automaticamente (preserva Shadow Mode: aprovação humana continua obrigatória) |

## 4. Por que isso é mensurável antes de ser implementado

A simulação real já rodada nesta Mission (`KNOWLEDGE_GRAPH_ROADMAP.md` §Simulação) já mostra o teto: agrupar por `(brand_id, manufacturerCode)` puro, sem qualquer outro fator, produz 397 grupos com 2+ lojas — 28x o valor real de hoje (14). O gate proposto acima é mais conservador que essa simulação (soma-se ao Engine, não o substitui), então o resultado real de produção ficaria **entre** o valor de hoje e esse teto — nunca acima dele, porque o Engine continua exigindo marca+categoria batendo, o que a simulação pura não exige.

## 5. Riscos nomeados (mesma disciplina de Sprint 2.7 §Riscos)

- **Falso positivo por reuso de código de fabricante**: alguns fabricantes reutilizam MPN entre variantes reais diferentes (ex.: mesma peça, cor diferente, embalagem diferente) — `extractManufacturerCode` já é heurístico, sem garantia formal de unicidade. Mitigação proposta: o gate eleva para "Média" (revisão humana obrigatória), nunca para "Alta"/auto-merge — o mesmo padrão de cautela que todo o resto do sistema já usa.
- **53,63% de cobertura significa 46,37% sem esse sinal** — o gate não resolve o problema para quase metade do catálogo; precisa continuar coexistindo com o Engine atual para o resto, não substituí-lo.
