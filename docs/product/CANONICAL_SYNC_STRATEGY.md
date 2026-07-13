# Canonical Sync Strategy

**Fase 2 — Sprint 2.8 — Objetivo 2.** Comparação técnica das 4 abordagens pedidas, sob as restrições explícitas da Sprint: não alterar Product Identity, Shadow Mode ou Connector Platform.

## As restrições moldam o espaço de soluções antes de qualquer comparação de mérito técnico

- **Connector Platform intocável** → qualquer solução que exija um hook dentro do pipeline de sync (`src/domains/connectors/services/stages/*`) está descartada de saída, não por mérito, mas por escopo. Isso elimina a forma mais natural de "event-driven" (disparar sync no momento em que uma offer é persistida).
- **Product Identity e Shadow Mode intocáveis** → a sincronização não pode viver nesses domínios nem ser disparada por eles.
- Sobra, como território permitido, exclusivamente o domínio `canonical-catalog/` e os scripts que já operam nele (`scripts/canonical-catalog-bootstrap.ts`), que não pertencem a nenhum dos três domínios protegidos.

## As 4 opções

### A — Atualização incremental

Comparar campo a campo o `canonical_products` existente contra o `products` atual, e escrever só o que mudou (diff-based, idempotente, sem-op quando não há drift).

- **A favor**: custo de escrita proporcional ao drift real, não ao tamanho do catálogo. Reaproveita 100% da infraestrutura já testada (`ICanonicalCatalogRepository`, `CanonicalProductService`) sem tocar nos domínios protegidos. Auditável por design — cada sincronização carrega a lista exata de campos que mudaram (`CanonicalDrift[]`), o que também dá de graça o relatório do Objetivo 1 ("o que já diverge").
- **Contra**: precisa rodar em algum lugar — não é "automático" sozinho, precisa de um disparador com cadência.

### B — Rebuild periódico

Recriar `canonical_products` do zero a partir de `products` em cada execução.

- **Contra, decisivo**: `canonical_products.id` é referenciado por `offers.canonical_product_id` (FK) e por `merge_candidates.source_canonical_product_id`/`target_canonical_product_id` (FK). Um "rebuild" que apague e recrie linhas quebraria essas referências ou exigiria uma migração de dados só para preservar `id`s — risco desproporcional ao problema (o problema é campos desatualizados, não identidade errada). A única forma seguramente equivalente de "B" é **atualizar em lugar, para toda linha, sem checar se há drift** — o que é estritamente pior que A no eixo de custo (escreve mesmo quando nada mudou) pelo mesmo resultado final.

### C — Sincronização dirigida por eventos

Disparar a sincronização no momento em que `products` muda (trigger de banco, ou hook na escrita).

- **Contra, decisivo dado o escopo**: a única fonte real de mudança em `products` é o Connector Platform (conectores fazem upsert em `products` durante o sync) — instrumentar esse momento significa tocar `src/domains/connectors/`, exatamente o que a Sprint proíbe. A alternativa que não toca código de aplicação é um **trigger de banco** (`AFTER UPDATE ON products`) — tecnicamente viável, mas: (1) introduz um paradigma novo neste codebase (nenhuma tabela hoje usa trigger — confirmado lendo todas as migrations em `supabase/migrations/` e `database/migrations/`, nenhuma define `CREATE TRIGGER`); (2) reduz observabilidade (uma escrita disparada por trigger não aparece em nenhum log de aplicação, dificultando debug); (3) roda dentro da transação de escrita do conector, adicionando latência/risco a um pipeline que a Sprint proíbe alterar — mesmo indiretamente. Rejeitada por custo/risco arquitetural desproporcional ao ganho (a cadência de batch que já existe é suficiente — ver seção seguinte).
- Caso o requisito de negócio algum dia exija sincronização em tempo real (SLA de segundos), C volta a ser a escolha correta — não é errada em abstrato, é desproporcional a este problema.

### D — Outra abordagem identificada durante a Sprint

Nenhuma abordagem adicional além de A/B/C surgiu como necessária. A combinação real escolhida é **A, executada na cadência que já existe** (ver próxima seção) — não é uma "quinta opção", é a aplicação de A ao ritmo operacional real do sistema.

## Decisão: **A — Atualização incremental, dentro da cadência periódica que já existe**

`scripts/canonical-catalog-bootstrap.ts` já é reexecutado a cada Sprint que altera o catálogo (documentado em toda a série 2.2–2.7 de memórias de Sprint) — ele já itera **todo** `products`, uma vez por execução. Hoje, para uma linha já existente, ele não faz nada (`if (existing) { alreadyExisted++; }`). A mudança desta Sprint é: nesse mesmo branch, calcular o diff (`CanonicalProductService.diffFromProduct`, função pura) e, se houver drift, escrever só os campos que mudaram (`ICanonicalCatalogRepository.updateSyncedFields`). Isso entrega "representação continuamente sincronizada" na única cadência que o sistema já opera — em lote, não em tempo real — sem exigir infraestrutura nova, sem tocar nos domínios protegidos, e sem risco à integridade referencial que B teria introduzido.

## Custo computacional

O diff é uma comparação de campos em memória (nenhuma chamada extra de rede) — o custo adicional é apenas o de uma escrita condicional por produto com drift, adicionado a um loop que já fazia uma leitura (`findBySlug`) por produto. Não muda a ordem de grandeza do que o script já custava.
