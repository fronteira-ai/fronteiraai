# Como criar um novo Conector — Connector Platform SDK

**Release 1.7 — Epic 1**: este guia foi reescrito para `src/domains/connectors/`, que absorveu por completo o antigo `acquisition/` (Release 0.9, retirado). Ver `docs/engineering/ACQUISITION.md` para o redirecionamento histórico e `docs/product/releases/RELEASE_1_7_EXECUTION_PLAN.md` para o detalhamento da migração.

## Conceito

Um conector é responsável por **buscar dados de uma origem específica** e convertê-los em um `ConnectorBatch`. A partir daí, o `SyncOrchestrator` cuida do resto (validação, normalização, deduplicação, mídia, escrita no catálogo). O conector não valida, não normaliza, não persiste — apenas busca e mapeia.

## Implementação mínima

```typescript
import type { IConnector, ConnectorMetadata } from "@/src/domains/connectors/types/connector.types";
import type { ConnectorBatch } from "@/src/domains/connectors/types/raw.types";
import { ConnectorType } from "@/src/domains/connectors/types/enums";

export class MinhaLojaConnector implements IConnector {
  readonly metadata: ConnectorMetadata = {
    id: "minha-loja:v1",
    name: "Minha Loja Conector",
    version: "1.0",
    type: ConnectorType.ApiRest, // ou JsonFile, CsvFile, XmlFile, Erp, ManualUpload, Crawler
    storeSlug: "minha-loja",
    description: "Conector para a API REST da Minha Loja",
  };

  async fetch(): Promise<ConnectorBatch> {
    const rawData = await fetchFromSource();

    const items = rawData.map((item) => ({
      product: {
        name: item.titulo,
        brand: item.marca,
        category: item.categoria,
        imageUrl: item.foto,
      },
      storeSlug: this.metadata.storeSlug,
      priceUSD: item.preco_dolar,
      priceBRL: item.preco_real,
      inStock: item.estoque > 0,
      stockQuantity: item.estoque,
      productUrl: item.url,
    }));

    return {
      connectorId: this.metadata.id,
      connectorVersion: this.metadata.version,
      fetchedAt: new Date().toISOString(),
      items,
    };
  }
}
```

## Executar o conector com o SyncOrchestrator

```typescript
import { createConnectorsServices } from "@/lib/connectors-factory";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { MinhaLojaConnector } from "./minha-loja.connector";

const connector = new MinhaLojaConnector();
const { manualSyncTrigger } = createConnectorsServices(getSupabaseServiceClient());

const result = await manualSyncTrigger.trigger(connector, {
  dryRun: false,
  skipMedia: false,
  merchantId: "opcional — só rotas disparadas por merchant emitem eventos do Brain",
  verbose: true,
});
```

## Campos obrigatórios em RawOffer

| Campo | Tipo | Regra |
|-------|------|-------|
| `product.name` | `string` | Não vazio |
| `storeSlug` | `string` | Slug válido (`a-z`, `0-9`, `-`); loja deve existir no banco |
| `priceUSD` | `number` | Maior que 0 |

Todos os demais campos são opcionais. Campos ausentes recebem defaults seguros na etapa de normalização (`OfferNormalizer`).

## Pré-condição: a loja deve existir no banco

O `CatalogWriteStage` **não cria lojas automaticamente** — brands, categories e products são criados via upsert, mas a loja deve já existir na tabela `stores`. Isso é intencional: a criação de uma loja é uma operação administrativa (ou, a partir do Epic 4, uma descoberta automática), não parte do fluxo de sincronização de produtos.

Antes de rodar um conector para uma nova loja, garanta que ela existe em `stores` com o `slug` correto.

## Tipos de conector suportados

| `ConnectorType` | Caso de uso |
|-----------------|-------------|
| `json-file` | Arquivo JSON local — referência implementada em `crawler/reference/JsonFileConnector.ts` |
| `csv-file` | Arquivo CSV local — referência implementada em `crawler/reference/CsvFileConnector.ts` |
| `api-rest` | API REST externa (HTTP/HTTPS) — sem referência ainda, chega no Epic 2 |
| `xml-file` | Feed XML / sitemap — chega no Epic 4 (Discovery Connectors) |
| `erp` | Integração com ERP via JDBC/ODBC/REST |
| `manual-upload` | Upload manual via painel admin (futuro) |
| `crawler` | Scraping web respeitando robots.txt/ToS — referência implementada em `crawler/shoppingchina/` |

## Adicionando o conector ao registro

```typescript
import { connectorRegistry } from "@/src/domains/connectors/services/ConnectorRegistry";
import { MinhaLojaConnector } from "./minha-loja.connector";

connectorRegistry.register(new MinhaLojaConnector());

const all = connectorRegistry.list();
const connector = connectorRegistry.get("minha-loja:v1");
```

Todo conector novo deve auto-registrar-se ao ser importado (efeito colateral no próprio arquivo, como em `crawler/shoppingchina/index.ts`), e o import deve ser adicionado a `crawler/bootstrap.ts` para que `bootstrapConnectors()` o alcance.

## Persistência: Connector e SyncRun

Diferente do antigo `ConnectorRegistry` (`acquisition/`, apenas em memória), o Epic 1 introduz persistência real:

- `connectors` — um registro por `connector_key` (o `metadata.id`), upsertado a cada sincronização via `IConnectorRepository`.
- `connector_sync_runs` — uma linha por execução (`running` → `success`/`partial`/`failed`), incluindo dry-runs, com `merchant_id` opcional.

Nenhuma delas substitui o registro em memória (`ConnectorRegistry` continua sendo a fonte de verdade para "quais conectores este processo conhece agora") — elas existem para dar visibilidade histórica e operacional (base do Ecosystem Monitor, Epic 6).

## Checklist para novos conectores

- [ ] Implementa `IConnector` (arquivo em `src/domains/connectors/crawler/`)
- [ ] `metadata.storeSlug` corresponde a um slug real em `stores`
- [ ] `fetch()` retorna somente `RawOffer[]` — sem lógica de validação/negócio
- [ ] Auto-registra-se ao ser importado, e o import está em `crawler/bootstrap.ts`
- [ ] Testado com `npm test` (suíte em `src/domains/connectors/__tests__/`)
- [ ] Testado em dry-run antes de `--execute`
- [ ] Documentado com `metadata.description`
- [ ] Respeita robots.txt e termos de uso da origem (obrigatório — ver `RELEASE_1_7_BLUEPRINT.md`)
