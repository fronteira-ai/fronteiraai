# docs/database/

Documentação do modelo de dados e schema do banco de dados do ParaguAI. Esta pasta contém a especificação formal das entidades, relacionamentos e design do banco.

## Propósito

Dar uma visão completa e legível do banco de dados para pessoas e sistemas que precisam entender o modelo de dados sem executar queries ou ler migrations linha a linha.

## Documentos desta pasta

| Documento | Responde |
|---|---|
| `DATABASE.md` | Descrição completa de todas as tabelas, colunas, tipos, constraints e relacionamentos |
| `ERD.md` | Diagrama Entidade-Relacionamento — representação visual do modelo de dados |

## Onde estão os arquivos de banco de dados

Os arquivos executáveis (migrations, seeds, scripts SQL) permanecem em `database/` na raiz do projeto:

```
database/
├── migrations/     SQL migrations (0001 a 0013+)
├── seed/           Scripts de seed de dados
├── sql/            Queries e scripts utilitários
└── storage/        Scripts de storage do Supabase
```

Separação intencional: documentação aqui (`docs/database/`), código em `database/`. Nunca misturar.

## Quando criar um novo documento aqui

Quando surgir aspecto do banco suficientemente amplo para um documento dedicado. Exemplos válidos: `MIGRATION_GUIDE.md` (quando o processo de migration se tornar complexo), `PERFORMANCE_NOTES.md` (quando índices e otimizações precisarem de documentação).

## Quando não criar

- Para registrar uma decision de schema → `operations/DECISIONS.md` (ADR)
- Para modelagem de domínio de aplicação → `architecture/DOMAIN_MODEL.md`
- Nunca criar migrations aqui — elas pertencem a `database/migrations/`

## Invariante permanente

**Preço pertence à oferta, nunca ao produto.** Esta regra, definida na `foundation/AI_CONSTITUTION.md`, é modelada explicitamente no schema: a tabela `offers` possui `price_usd` e `price_brl`; a tabela `products` não possui campo de preço. Qualquer migration que viole esta invariante deve ser recusada.
