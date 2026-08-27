# ROADMAP.md

**Era Marketplace v2** — a partir de Architecture v1.0 (2026-07-17).

O roadmap de arquitetura foi encerrado (`docs/architecture/ARCHITECTURE_CERTIFICATE.md`). Este documento contém exclusivamente iniciativas de negócio, fundamentadas nas evidências reais dos Programas Λ, Μ, Ν e Ο. Nenhum item de reescrita, novo algoritmo ou novo componente arquitetural pertence a este roadmap — mudanças ao núcleo congelado seguem os Critérios para Reabertura em `docs/engineering/ENGINEERING_CONSTITUTION.md`.

## Roadmap rebasado — Product Rebaseline V2 (2026-08-26)

> Auditoria somente; requisitos formais PR-001 a PR-006 em `docs/product/PRODUCT_REBASELINE_REQUIREMENTS.md`. Core commerce permanece prioridade sobre expansão prematura.

### NOW — próximas 1–3 Sprints
1. **Sprint "Search Ordering + Out-of-Stock + SEO fix"**: publicar o fix de ordenação da busca (esgotados-last + `price ASC`) do baseline para produção; aplicar a RPC `search_products_catalog` no self-hosted (fecha ADR-011, ordenação global do catálogo); configurar `NEXT_PUBLIC_SITE_URL` no deploy (destrava canonical/robots/sitemap).
2. **Sprint "Home 2.0 publish + dados de loja"**: deploy da Home 2.0 do baseline (congelada ADR-050 — publish é deploy, não redesenho); preencher `stores.logo_url` (LOGO_COVERAGE 0%) e `address`/`latlng` (latlng 0/7) com origem autorizada.
3. **Sprint "Maps Directions"**: utilidade `buildGoogleMapsDirectionsUrl()` + CTA "Como chegar" (Ponte da Amizade → loja) em ProductOffers/OfferCard/StoreDetails mobile.

### NEXT — releases seguintes
- **Price History público em UI**: gráfico/histórico em `/product/[slug]` (backend pronto, 72.413 linhas em prod) — conversão direta.
- **Câmeras ao Vivo da Ponte** (PR-003): após definir fonte oficial/legal, embed progressivo com lazy-load e fallback (LiveCameras já é contrato).
- **Compare/Canonical**: consolidar `canonical_products` (hoje 0) para comparação cross-loja completa e dados de preço canônicos.
- **IA real (LLM)** alimentada pelos dados de preço/histórico — responder "Qual notebook comprar?", "Vale pagar mais?"; hoje rule-based.
- **Reviews + Favoritos/Alertas**: habilita Auth de comprador (`profiles`/`users`), reviews públicos (`reviews`), favoritos e alertas sincronizados.

### LATER
- IA avançada (busca semântica/embeddings, `ai_embeddings`) · motoristas · hotéis · restaurantes · planejamento de viagem · dashboards B2B · monetização · APIs públicas · mobile nativo.

---

## Marketplace Operations

- Revisão humana dos 41 near-misses e dos 85 merge candidates cross-loja pendentes (Μ-1, Ν-1) — a ação de maior ROI comprovado, zero código
- Normalização de chaves de especificação duplicadas por variação de maiúscula/minúscula (Modelo/MODELO, COR/Color)
- Mapeamento da Taxonomia Universal para as categorias de maior volume ainda não cobertas (86,18% dos slugs reais, Μ-1)

## Merchant Success

- Expansão de catálogo com atacado-connect — maior taxa de comparabilidade real observada (0,52%, Μ-1)
- Sourcing direcionado nos merchants existentes especificamente nas categorias de overlap comprovado

## Catalog Expansion

- Priorizar categorias com nomenclatura de modelo padronizada por fabricante: Celulares (16,67% de comparabilidade real), Drones (33,33%), Notebooks (10,00%) — e categorias estruturalmente equivalentes (Smartwatch, Console, Tablet)
- Avaliar novos merchants com catálogo deliberadamente sobreposto às categorias-alvo, não por tamanho de catálogo

## Growth

- Acompanhar a curva de crescimento de Comparable Product Coverage definida em Ο-1 (0,08% → 0,45% → 1% → 2% → 5% → 10%), cada marco com suas iniciativas necessárias documentadas

## Analytics

- Instrumentar mais eventos de comprador — hoje 68 eventos em toda a história do produto, insuficiente para medir conversão ou qualidade de busca com confiança estatística (Λ-1)

## Revenue

- Nenhuma iniciativa de monetização foi auditada nos Programas Κ-ΩΩ — fora do escopo desta sequência, a ser tratado por um programa de negócio dedicado
