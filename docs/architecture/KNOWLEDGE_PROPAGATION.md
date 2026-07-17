# KNOWLEDGE_PROPAGATION.md
# Program Ξ (Xi) — Mission Ξ-2 — Marketplace Learning Engine

**Categoria**: `docs/architecture/`
**Criado**: 2026-07-16
**Status**: Proposta arquitetural pura.

---

## Como um único fato aprendido beneficia todo consumidor (Objetivo 4)

Princípio único, reaproveitado em cada linha da tabela: **todo consumidor abaixo já lê estado resolvido, nunca recomputa por conta própria** — confirmado por auditoria de código em cada Mission anterior desta sequência. A propagação não exige nenhuma mudança nesses consumidores porque eles já estão desacoplados da forma como o fato foi calculado.

| Consumidor | Como já consome hoje (sem mudança) | O que a propagação evita |
|---|---|---|
| Product Identity | Recebe `EvaluableProduct`/`MatchCandidate` já montados por `CanonicalMergeSuggestionService` — nunca chama `buildProductSignature` diretamente | Recalcular a mesma assinatura a cada avaliação de par (o fator 624,2x medido) |
| Merge Engine | Lê `merge_candidates` já persistidos — nunca reavalia | Nenhuma mudança de comportamento — já é o consumidor mais desacoplado de todos |
| Opportunity Engine | Lê Comparable Coverage/`canonical_product_id` já resolvidos | Nenhuma mudança — confirmado em `CROSS_MERCHANT_ACTIVATION_PILOT.md` (Mission OPS-1): 0 linhas mudaram, resultado real apareceu sozinho |
| Buyer Intelligence | Mesmo padrão de Opportunity Engine | idem |
| Search | Busca textual sobre `products.name`, hoje — ver `SEARCH_EVOLUTION.md` (Π-1) para a evolução proposta (agrupar por `manufacturerCode` antes de apresentar resultados) | Recalcular manufacturerCode a cada busca, se a evolução de Search for adotada no futuro |
| Advisor | Consome Opportunity/Comparable Coverage | Mesmo padrão — nenhuma mudança |
| **Future Connectors** | Um conector novo, no primeiro sync, já encontraria fatos de marca+manufacturerCode previamente aprendidos por OUTROS merchants — não precisa "reaprender" que a Apple usa o formato "A" + 4 dígitos, por exemplo | Reaprendizado do zero por cada merchant novo — o ganho mais direto de ter uma Memória por (`brand_id`, `manufacturerCode`) em vez de por produto isolado |
| **Merchant Integration** | Um novo merchant que vende um produto já visto (mesmo `manufacturerCode`) se beneficia imediatamente, mesmo antes de qualquer merge ser aprovado para ELE especificamente — o fato de identidade já existe, só falta a oferta se juntar ao grupo | Reprocessamento completo do catálogo do zero a cada onboarding de merchant — hoje, cada bootstrap roda `suggestMergesFor` para TODOS os produtos, não só os novos |
| Knowledge Graph | A camada lógica de composição (Π-1) — passa a compor sobre fatos já persistidos, não sobre chamadas de função ao vivo | A composição em si já era barata (funções puras); o ganho aqui é que ela deixa de ser refeita do zero a cada leitura |

## O caso mais importante: Merchant Integration

Hoje, integrar um merchant novo significa rodar `canonical-catalog-bootstrap.ts --execute` sobre o catálogo **inteiro** (18.010 produtos, confirmado em `CROSS_MERCHANT_ACTIVATION_PILOT.md`), porque não há como saber, sem reprocessar tudo, quais produtos já existentes poderiam casar com os novos. Com o Learning Engine, o fluxo inverte: os produtos NOVOS (do merchant recém-integrado) são avaliados contra a Memória já persistida (agrupada por `brand_id` + `manufacturerCode`) — uma consulta, não uma reavaliação de todo o catálogo. Isso é o que realmente resolve "sem aumentar trabalho humano" à medida que o número de merchants cresce (Objetivo 6/8) — hoje, cada merchant novo custa O(catálogo inteiro); com a Memória, custa O(produtos do merchant novo).

## Sem duplicação — o mecanismo que garante isso

Nenhum consumidor grava sua própria cópia do fato — todos leem da mesma fonte (`Learning Repository`, `MARKETPLACE_LEARNING_ENGINE.md` §3). Isso não é uma regra nova: é a mesma disciplina que já rege `canonical_products` como fonte única de identidade (Program Ω) — a Memória só estende essa disciplina de "produto" para "fato sobre produto."
