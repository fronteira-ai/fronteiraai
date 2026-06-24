# database/seed/

Sistema oficial de seed do ParaguAI — modular, reexecutável e seguro por padrão.

```
brands/data.js       dados de exemplo (marcas)
categories/data.js   dados de exemplo (categorias)
stores/data.js       backfill de slug/active nas 5 lojas reais já existentes (não cria lojas)
products/data.js     produtos de exemplo
offers/data.js       ofertas de exemplo (preço/estoque por loja)
lib/client.js         cliente Supabase desta ferramenta (lê .env.local direto)
index.js              orquestrador — dry-run por padrão
validate.js            auditoria de qualidade de dados, somente leitura
```

## Uso

```bash
node database/seed/index.js              # dry-run — só imprime o que faria
node database/seed/index.js --execute    # escreve de fato no Supabase
node database/seed/validate.js           # auditoria de qualidade, sempre seguro
```

`--execute` exige aprovação explícita do CTO antes de ser rodado contra o
banco real (`.ai/CLAUDE_SYSTEM.md`, Restrições Absolutas) — o dry-run é o
padrão para que rodar o comando por engano nunca escreva nada.

Sem `SUPABASE_SERVICE_ROLE_KEY` em `.env.local`, o script usa a chave
anônima — inserts podem falhar por RLS dependendo das policies da tabela
(ver `docs/TECH_DEBT.md`).

Cada entidade é resolvida por uma chave natural antes de inserir (idempotente):
`slug` para `brands`/`categories`/`products`, `name` para a loja já existente,
`product_id`+`store_id` para `offers`.
