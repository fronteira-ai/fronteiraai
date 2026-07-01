# Acquisition Engine — RETIRADO (Release 1.7 — Epic 1)

O `acquisition/` descrito originalmente neste documento (Release 0.9) foi **absorvido por completo** pelo Connector Platform Framework em `src/domains/connectors/` e **removido do repositório**.

Toda a lógica reutilizável (Validation/Normalization/Deduplication/Media engines, `HttpFetchStrategy`, a sequência de escrita do catálogo) foi portada 1:1 para trás de interfaces de repositório (`ICatalogRepository`), fechando o vazamento de infraestrutura que existia no `PipelineContext` original (carregava um `SupabaseClient` bruto).

- Arquitetura e diagrama atuais: `docs/architecture/ARCHITECTURE.md`, seção "Connector Platform Framework".
- Modelo de domínio e invariantes: `docs/architecture/DOMAIN_MODEL.md`, seção "Connector Platform".
- Como criar um novo conector: `docs/engineering/CONNECTOR_GUIDE.md`.
- Decisões de arquitetura da migração e paridade comportamental verificada: `docs/product/releases/RELEASE_1_7_EXECUTION_PLAN.md`.
- Contexto estratégico do porquê esta migração aconteceu agora: `docs/product/releases/RELEASE_1_7_BLUEPRINT.md`, Capítulo 3.

Os scripts CLI (`npm run connectors:import-json`, `connectors:import-csv`, `sync:shoppingchina`) continuam existindo, agora em `scripts/` em vez de `acquisition/scripts/`.
