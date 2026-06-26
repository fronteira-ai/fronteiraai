# Acquisition Engine — Release 0.9

## Visão Geral

O Acquisition Engine é a infraestrutura central de aquisição de dados do ParaguAI. Toda origem de dados (CSV, JSON, API REST, XML, ERP, crawler) passa pelo mesmo pipeline, garantindo qualidade, rastreabilidade e desacoplamento completo entre a origem e o banco.

## Princípio fundamental

Nenhuma etapa do pipeline conhece a origem dos dados. Um item que entrou via CSV é indistinguível de um que entrou via API REST após a etapa de parsing.

## Localização

```
acquisition/
├── types/           # Contratos de dados (RawOffer, NormalizedOffer, PipelineContext…)
├── core/            # AcquisitionPipeline (orquestrador), ConnectorRegistry
├── parsers/         # JSONParser, CSVParser (RFC 4180 custom)
├── engines/         # Validation, Normalization, Deduplication, Canonical, Media
├── persistence/     # CatalogWriter (escritas no Supabase)
├── observability/   # Métricas, relatório de execução
├── lib/             # Cliente Supabase com service role (scripts)
├── connectors/      # JsonFileConnector, CsvFileConnector
├── datasets/        # Dados de teste (JSON + CSV)
└── scripts/         # import-json, import-csv, validate-pipeline
```

## Pipeline

```
Origem (arquivo/API/crawler)
   ↓
Conector (IConnector.fetch() → ConnectorBatch)
   ↓
Parser (JSONParser / CSVParser → RawOffer[])
   ↓  ─────────────────────────── internamente ao AcquisitionPipeline ──────────
Validation Engine       → rejeita itens com campos obrigatórios ausentes/inválidos
   ↓
Normalization Engine    → slugifica nomes, limpa strings, valida URLs, aplica defaults
   ↓
Deduplication Engine    → classifica cada item: new | update | skip
   ↓
Media Pipeline          → download → WebP (sharp) → upload Supabase Storage
   ↓
Catalog Writer          → upsert brand → category → product → offer → price_history
   ↓
Observability           → métricas por etapa, relatório final
```

## Modelo de dados de entrada

```typescript
interface RawOffer {
  product: {
    name: string;          // obrigatório
    brand?: string;        // default: "Outros"
    category?: string;     // default: "Outros"
    description?: string;
    imageUrl?: string;
    specifications?: Record<string, string>;
  };
  storeSlug: string;       // obrigatório — loja deve existir no banco
  priceUSD: number;        // obrigatório, > 0
  priceBRL?: number;
  inStock?: boolean;       // default: false
  condition?: string;
  warranty?: string;
  productUrl?: string;
}
```

## Scripts

```bash
# Validar a pipeline (sem conexão real necessária)
npm run acquisition:validate

# Dry-run do import JSON (sem escrita no banco)
npm run acquisition:import-json

# Executar import JSON (escreve no Supabase)
npm run acquisition:import-json:execute

# Dry-run do import CSV
npm run acquisition:import-csv

# Executar import CSV
npm run acquisition:import-csv:execute
```

## Modo dry-run

Por padrão, todos os scripts de import rodam em **dry-run**: o pipeline executa completamente (validação, normalização, deduplicação) mas **não escreve** nada no banco. Use `--execute` para aplicar.

## Observabilidade

Cada execução produz um relatório com:
- Duração total e por etapa
- Contagens: recebidos, validados, normalizados, deduplicados, persistidos, pulados, falhos
- Lista de erros com stage + mensagem

## Escalabilidade preparada

- **Chunking**: basta chamar `pipeline.run()` com fatias do array
- **Paralelismo**: múltiplos pipelines podem rodar em paralelo (cada um tem seu `PipelineContext` isolado)
- **Filas**: substitua o `IConnector.fetch()` por um consumer de fila (SQS, BullMQ) — o resto não muda
- **Processamento incremental**: o `DeduplicationEngine` classifica cada item individualmente (`new | update | skip`)

## Dependências adicionadas no Release 0.9

| Pacote | Tipo | Propósito |
|--------|------|-----------|
| `tsx` | devDep | Execução de scripts TypeScript sem build |
| `sharp` | devDep | Conversão de imagens para WebP (Media Pipeline) |
