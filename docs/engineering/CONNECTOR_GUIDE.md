# Como criar um novo Conector — Connector SDK

## Conceito

Um conector é responsável por **buscar dados de uma origem específica** e convertê-los em um `ConnectorBatch`. A partir daí, o pipeline universal cuida do resto. O conector não valida, não normaliza, não persiste — apenas busca e parseia.

## Implementação mínima

```typescript
import type { IConnector, ConnectorMetadata } from "@/acquisition/types/connector";
import type { ConnectorBatch } from "@/acquisition/types/raw";

export class MinhaLojaConnector implements IConnector {
  readonly metadata: ConnectorMetadata = {
    id: "minha-loja:v1",
    name: "Minha Loja Conector",
    version: "1.0",
    type: "api-rest",      // ou json-file, csv-file, xml-file, erp, manual-upload, crawler
    storeSlug: "minha-loja",
    description: "Conector para a API REST da Minha Loja",
  };

  async fetch(): Promise<ConnectorBatch> {
    // 1. Buscar dados da origem (HTTP, arquivo, banco externo…)
    const rawData = await fetchFromSource();

    // 2. Converter para RawOffer[]
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

## Executar o conector com o pipeline

```typescript
import { AcquisitionPipeline } from "@/acquisition/core/pipeline";
import { getServiceClient } from "@/acquisition/lib/client";
import { MinhaLojaConnector } from "./minha-loja.connector";

const connector = new MinhaLojaConnector();
const batch = await connector.fetch();

const pipeline = new AcquisitionPipeline({ skipMedia: false });
const result = await pipeline.run(
  connector.metadata.id,
  batch.items,
  getServiceClient(),
  { dryRun: false, verbose: true }
);
```

## Campos obrigatórios em RawOffer

| Campo | Tipo | Regra |
|-------|------|-------|
| `product.name` | `string` | Não vazio |
| `storeSlug` | `string` | Slug válido (`a-z`, `0-9`, `-`); loja deve existir no banco |
| `priceUSD` | `number` | Maior que 0 |

Todos os demais campos são opcionais. Campos ausentes recebem defaults seguros na etapa de normalização.

## Pré-condição: a loja deve existir no banco

O `CatalogWriter` **não cria lojas automaticamente** — brands, categories e products são criados via upsert, mas a loja deve já existir na tabela `stores`. Isso é intencional: a criação de uma loja é uma operação administrativa, não parte do fluxo de importação de produtos.

Antes de rodar um conector para uma nova loja, garanta que ela existe em `stores` com o `slug` correto (usando o Seed Engine ou o painel do Supabase).

## Tipos de conector suportados

| `ConnectorType` | Caso de uso |
|-----------------|-------------|
| `json-file` | Arquivo JSON local — referência implementada |
| `csv-file` | Arquivo CSV local — referência implementada |
| `api-rest` | API REST externa (HTTP/HTTPS) |
| `xml-file` | Feed XML / RSS |
| `erp` | Integração com ERP via JDBC/ODBC/REST |
| `manual-upload` | Upload manual via painel admin (futuro) |
| `crawler` | Scraping web (Release 1.0+, usar Playwright) |

## Adicionando o conector ao registro

```typescript
import { connectorRegistry } from "@/acquisition/core/registry";
import { MinhaLojaConnector } from "./minha-loja.connector";

connectorRegistry.register(new MinhaLojaConnector());

// Listar todos os conectores registrados
const all = connectorRegistry.list();

// Buscar por id
const connector = connectorRegistry.get("minha-loja:v1");
```

## Checklist para novos conectores

- [ ] Implementa `IConnector` (arquivo em `acquisition/connectors/`)
- [ ] `metadata.storeSlug` corresponde a um slug real em `stores`
- [ ] `fetch()` retorna somente `RawOffer[]` — sem lógica de validação/negócio
- [ ] Testado com `npm run acquisition:validate` (testes de validação e normalização)
- [ ] Testado em dry-run antes de `--execute`
- [ ] Documentado com `metadata.description`
