# Canonical Sync Field Matrix

**Fase 2 — Sprint 2.8 — Objetivo 1.** Auditoria completa de todo campo de `products` versus `canonical_products`, com base nas colunas reais em produção (lidas via `select *` em uma linha de cada tabela, não em suposição de schema).

## Colunas reais (produção, 2026-07-12)

**`products`** (22 colunas): `id, name, image_url, description, created_at, slug, brand_id, category_id, model, sku, gtin, gallery, specifications, active, weight, featured, created_by_ai, normalized_name, search_keywords, aliases, release_date, updated_at, popularity_score`.

**`canonical_products`** (9 colunas): `id, canonical_slug, name, brand_id, category_id, image_url, specifications, created_at, updated_at`.

## Matriz completa

| Campo `products` | Existe em `canonical_products`? | Pode divergir hoje? | Já diverge (medido)? | Nunca deveria divergir? | Decisão desta Sprint |
|---|---|---|---|---|---|
| `specifications` | Sim | Sim — `products` é reenriquecido por syncs de conector; `canonical_products` só é escrito no bootstrap inicial | **Sim, massivamente.** Sprint 2.7 mediu 87% de uma amostra "iPhone 17 Pro Max" com `canonical_products.specifications` vazio vs. `products.specifications` rico | Deveria — é o dado que o Product Identity mais precisa (peso 30/100 no score) | **Sincronizar** (escopo explícito do brief) |
| `category_id` | Sim | Sim — Sprint 2.5 normalizou taxonomia em `products`, nunca propagado a `canonical_products` | **Sim.** CPC report (antes desta Sprint): 17.010/18.009 (94,5%) dos canonical products com oferta caem em "Sem categoria" no agrupamento por `category_id` | Deveria — é o gate duro do `ProductIdentityEngine` (99,3% dos descartes cross-merchant medidos na Sprint 2.7 vêm daqui) | **Sincronizar** (escopo explícito do brief) |
| `brand_id` | Sim | Em tese sim, mas raro | Não medido divergindo em volume — Sprint 2.3 comprovou que a extração de marca não fragmenta (Apple/Samsung/Sony/Nintendo resolvem 1:1) | **Sim** — brand é a identidade mais estável de um produto; uma mudança pós-criação é mais provável de ser um bug de conector do que uma correção legítima | **Sincronizar, mas validar/reportar separadamente** (escopo explícito do brief: "validar consistência") — todo drift de `brand_id` é contado à parte (`brand_id drift`) no relatório de execução como sinal de integridade de dado, não como refresh de rotina |
| `image_url` | Sim | Sim — foto de origem pode mudar/ser corrigida pelo conector | Não medido diretamente nesta Sprint (fora do foco de Product Identity), mas mesma causa estrutural do `specifications`/`category_id`: nunca atualizado pós-bootstrap | Não é crítico para Product Identity, mas afeta a experiência do usuário em `/produto` e vitrines | **Interpretado como o "atributo derivado" citado no Objetivo 3** (é o único campo compartilhado restante, de natureza apresentacional/derivada, não identitária) — **sincronizado** |
| `name` | Sim | Sim — `products.name` pode ser corrigido/normalizado por um conector | Não medido | Discutível — mudar `name` de um canonical product já referenciado por `merge_candidates`/UI é uma decisão de produto, não só de dado | **Fora do escopo desta Sprint, deliberadamente.** O brief lista "escopo mínimo: specifications; category_id; brand_id; atributos derivados" — `name` não está na lista. Alterá-lo also risks changing what a pending `MergeCandidate.reason` text already refers to. Registrado para decisão explícita em Sprint futura. |
| `canonical_slug` (↔ `products.slug`) | Sim (nome de campo diferente) | **Não deveria nunca** | Não diverge — é a chave de bootstrap 1:1, imutável por design (`ICanonicalCatalogRepository.findOrCreateBySlug` doc comment) | **Sim, estruturalmente imutável** | Não tocado — fora de escopo e do próprio contrato do domínio |
| `description` | **Não** — sem coluna correspondente | N/A — não pode divergir, não existe onde divergir | N/A | N/A | Fora de escopo (exigiria migração de schema, não pedida) |
| `model` | **Não** | N/A | N/A | N/A | Fora de escopo — nota: o `ProductIdentityEngine` já deriva um sinal equivalente (`model-number`) por regex sobre `name`, não usa esta coluna |
| `sku` | **Não** | N/A | N/A | N/A | Fora de escopo — sinal de identidade potencialmente forte para uma Sprint futura de Product Identity, não desta |
| `gtin` | **Não** | N/A | N/A | N/A | Fora de escopo, mesma nota que `sku` |
| `gallery` | **Não** | N/A | N/A | N/A | Fora de escopo — puramente apresentacional |
| `active` | **Não** | N/A | N/A | N/A | Fora de escopo — **risco nomeado**: um canonical product não tem como saber que seu `products` de origem foi desativado; não afeta o Product Identity (não é um fator de match) mas pode afetar exibição futura em `/produto/<canonical_slug>` |
| `weight` | **Não** | N/A | N/A | N/A | Fora de escopo |
| `featured` | **Não** | N/A | N/A | N/A | Fora de escopo |
| `created_by_ai` | **Não** | N/A | N/A | N/A | Fora de escopo |
| `normalized_name` | **Não** | N/A | N/A | N/A | Fora de escopo |
| `search_keywords` | **Não** | N/A | N/A | N/A | Fora de escopo |
| `aliases` | **Não** | N/A | N/A | N/A | Fora de escopo |
| `release_date` | **Não** | N/A | N/A | N/A | Fora de escopo |
| `popularity_score` | **Não** | N/A | N/A | N/A | Fora de escopo |
| `created_at` | Sim (semântica própria) | Não aplicável — cada tabela tem seu próprio `created_at`, não deveriam ser iguais | — | Nunca deveria divergir de si mesmo (é imutável por definição em ambas as tabelas) | Não tocado |
| `updated_at` | Sim | Sim, esperado — `canonical_products.updated_at` deve refletir a última sincronização, não a última mudança em `products` | Passa a ser escrito por esta Sprint | Deve divergir — timestamps de eventos diferentes | Estampado em toda sincronização (`updateSyncedFields`, `new Date().toISOString()`) — não havia trigger de banco para isso (confirmado lendo a migration `20260701120300_canonical_catalog.sql`: só `DEFAULT now()` no insert, sem trigger) |

## Conclusão do Objetivo 1

4 campos entram no escopo de sincronização desta Sprint: `specifications`, `category_id`, `brand_id` (com relato separado de drift) e `image_url` (interpretado como o "atributo derivado" citado no brief, por ser o único campo compartilhado restante). `name` e `canonical_slug` ficam deliberadamente de fora. 13 colunas de `products` não têm nenhuma coluna correspondente em `canonical_products` e portanto não podem divergir — não representam um gap desta Sprint, mas são candidatas nomeadas para uma futura extensão de schema, fora deste escopo.
