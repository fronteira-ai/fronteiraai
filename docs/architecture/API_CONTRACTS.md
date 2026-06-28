# API_CONTRACTS.md
# Contratos de API do ParaguAI

**Versão**: 2.0  
**Criado**: 2026-06-28  
**Status**: Referência permanente — atualizar a cada Release que introduz, modifica ou remove endpoint  
**Alinhado com**: Release 1.4 · `docs/architecture/ARCHITECTURE.md` · `docs/architecture/DOMAIN_MODEL.md`

---

## 1. Filosofia

**Uma API é um contrato, não uma implementação.**

O contrato define o que os módulos prometem uns aos outros: quais dados entram, quais dados saem, quais erros são possíveis e quem tem permissão. A implementação pode ser reescrita, refatorada ou migrada. O contrato deve mudar muito menos frequentemente — e quando muda, comunica explicitamente (versionamento, deprecação, migration guide).

Esta filosofia tem três consequências práticas no ParaguAI:

**1. Estabilidade sobre conveniência.** Um endpoint criado para conveniência de um componente específico é um anti-pattern — viola o princípio de baixo acoplamento. Endpoints representam operações de domínio, não necessidades de tela.

**2. Contratos explícitos antes de código.** A forma do `Request` e do `Response` deve ser decidida antes da implementação, não descoberta lendo o código. Este documento é a fonte de verdade. Quando o código divergir do contrato documentado, o contrato deve ser atualizado — e a divergência investigada.

**3. IA nunca acessa banco diretamente.** O ParaguAI Brain (Release 2.0+) consumirá APIs, não Supabase. Isso garante que a IA opere dentro das regras de negócio definidas pelos contratos, não faça bypass silencioso de validações e RLS.

---

## 2. Arquitetura das APIs

O ParaguAI tem quatro grupos de APIs no Release 1.4, com um quinto planejado:

### 2.1 API Pública (`/api/compare`)

**Propósito**: endpoints acessíveis sem autenticação que expõem informações do catálogo. Qualquer agente pode consumir — browsers, mobile, aplicações de terceiros, futuramente a IA.

**Segurança**: anon key + RLS (migration 0007). Nenhuma mutação. Cache habilitado.

**Estado atual**: 1 endpoint implementado. Expansão planejada para Release 1.5+ (produtos, lojas, categorias).

### 2.2 API Merchant (`/api/merchant/*`)

**Propósito**: operações self-service do portal do lojista. Autenticadas por sessão de merchant (`profiles.role = 'merchant'`).

**Escopo**: o merchant só acessa dados de suas próprias lojas e produtos. Nunca acessa dados de outros merchants.

**Segurança**: `requireMerchant()` valida sessão + role. Service client bypassa RLS apenas dentro do escopo do merchant autenticado.

**Estado atual**: 13 endpoints implementados.

### 2.3 API Admin (`/api/admin/*`)

**Propósito**: operações de gestão interna do catálogo e da plataforma. Autenticadas por sessão de admin ou operator.

**Escopo**: acesso total ao catálogo, importações, qualidade e logs. Sem restrição de escopo por entidade.

**Segurança**: `requireAdmin()` valida sessão + `role IN ('admin', 'operator')`. Service client com acesso total.

**Estado atual**: 16+ endpoints implementados.

### 2.4 API de Auth (`/auth/callback`)

**Propósito**: troca de código PKCE por sessão após confirmação de email. Não é um endpoint de negócio — é infraestrutura do fluxo PKCE do Supabase Auth.

**Segurança**: não requer sessão; valida o código recebido do Supabase.

### 2.5 API Pública Expandida (Planned)

**Propósito**: endpoints REST públicos para consumo por apps mobile, parceiros e a IA. Versionada (`/api/v1/*`).

**Estado**: não implementada. Ver Seção 10 (Roadmap).

---

## 3. Princípios Permanentes

### 3.1 Stateless

Nenhum Route Handler mantém estado entre requests. Toda informação necessária chega via cookie de sessão (auth) ou body/query params (dados). Isso garante escalabilidade horizontal e previsibilidade.

### 3.2 Idempotência

Operações de escrita que podem ser reenviadas sem efeito colateral adicional devem ser idempotentes. Exemplo documentado: `POST /api/merchant/auth/register` verifica existência antes de inserir — chamar duas vezes retorna o mesmo merchant. Imports usam `upsert` com conflito por slug — re-executar não duplica dados.

### 3.3 Tipagem explícita

Toda resposta segue um de dois formatos: `{ data: T }` para sucesso ou `{ error: string }` para erro. Nenhum endpoint retorna shapes diferentes para o mesmo status code.

### 3.4 Autorização por função, não por URL

`requireAdmin()` e `requireMerchant()` encapsulam a lógica de autorização. Route Handlers não implementam verificação de role manualmente. Adicionar um novo endpoint protegido é: chamar a função de guarda e tratar o retorno.

### 3.5 Service role nunca em Client Components

Todas as Route Handlers que usam `serviceClient` são Server-side. A chave `SUPABASE_SERVICE_ROLE_KEY` não tem prefixo `NEXT_PUBLIC_*` e nunca alcança o browser. Violação deste princípio é uma falha de segurança crítica.

### 3.6 Sem lógica de negócio em Route Handlers

Route Handlers orquestram: validam entrada, chamam services, retornam resposta. A lógica de domínio (calcular score, gerar recomendações, computar nível) vive em `services/`. Um Route Handler com mais de 50 linhas de lógica de negócio está violando este princípio.

---

## 4. Organização de Rotas

```
app/
  auth/
    callback/route.ts           PKCE exchange — Supabase Auth

  api/
    compare/route.ts            API pública — Compare Engine

    admin/
      dashboard/stats/route.ts  Estatísticas do painel admin
      products/route.ts         CRUD de produtos (lista + create)
      products/[id]/route.ts    CRUD de produto (get + update + delete)
      categories/route.ts       CRUD de categorias
      categories/[id]/route.ts
      brands/route.ts           CRUD de marcas
      brands/[id]/route.ts
      stores/route.ts           CRUD de lojas
      stores/[id]/route.ts
      offers/route.ts           CRUD de ofertas
      offers/[id]/route.ts
      media/upload/route.ts     Upload de imagens (Supabase Storage)
      quality/report/route.ts   Relatório de qualidade do catálogo
      logs/route.ts             Histórico de importações
      import/
        run/route.ts            Executa pipeline de importação
        connectors/route.ts     Lista connectors disponíveis

    merchant/
      dashboard/stats/route.ts  Dashboard completo do merchant
      onboarding/route.ts       Progresso do onboarding
      stores/route.ts           Lojas vinculadas + lojas disponíveis
      products/route.ts         Produtos do merchant (via lojas)
      imports/
        run/route.ts            Executa importação para merchant
        history/route.ts        Histórico de imports do merchant
      recommendations/route.ts  Recomendações de ação
      audit/route.ts            Log de auditoria do merchant
      settings/route.ts         Configurações do merchant
      plans/route.ts            Planos disponíveis (público)
      auth/
        register/route.ts       Registro de novo merchant
```

---

## 5. Catálogo de Endpoints

### 5.1 Auth

---

**`GET /auth/callback`**  
Tipo: Auth Infrastructure | Auth: nenhuma (recebe code do Supabase)

Objetivo: finalizar o fluxo PKCE de confirmação de email. Troca o `code` por uma sessão ativa, seta cookies de auth e redireciona.

Quem consome: Supabase Auth após confirmação de email do usuário.

Query params: `code` (obrigatório), `next` (opcional, default `/merchant/dashboard`), `error` (presente se Supabase reportou erro).

Resposta: redirect HTTP (não JSON). Sucesso → `next`. Erro de code → `/merchant/login?confirmed=true`. Supabase error → `/merchant/login?error=<msg>`.

Status: **Stable**.

---

### 5.2 API Pública

---

**`GET /api/compare`**  
Tipo: Public API | Auth: nenhuma (anon key)

Objetivo: retornar a comparação completa de ofertas para um produto — produto, ofertas ranqueadas com score composto e métricas de histórico de preço.

Quem consome: `app/compare/[slug]/page.tsx` (Server Component, mas disponível como API pública), futuras apps mobile e IA.

Query params (um obrigatório):
- `slug` — slug do produto (ex: `iphone-17-pro-256gb`)
- `productId` — UUID do produto

Resposta de sucesso `200`:
```json
{
  "product": { "id", "slug", "name", "brand", "category", "image_url", "specifications" },
  "rankedOffers": [
    {
      "rank": 1,
      "rankScore": 87,
      "offer": { "id", "price_usd", "price_brl", "in_stock", "condition", "warranty", "cashback", "product_url", "store": {...} },
      "priceMetrics": { "lowestPriceUSD", "highestPriceUSD", "priceChangePercent", "lastPriceChangeAt", "currentPriceUSD" }
    }
  ],
  "summary": { "totalOffers", "lowestPriceUSD", "highestPriceUSD", "storesCount", "inStockCount" }
}
```

Resposta `400`: `{ "error": "Forneça slug ou productId como query parameter." }`  
Resposta `404`: `{ "error": "Produto não encontrado ou sem dados disponíveis." }`

Cache: `public, s-maxage=60, stale-while-revalidate=120` — cacheable por CDN.

Status: **Stable**.

---

### 5.3 Admin API

Todos os endpoints `/api/admin/*` requerem sessão com `profiles.role IN ('admin', 'operator')`. Retornam `401` se não autenticado, `403` se autenticado mas sem role adequado.

---

**`GET /api/admin/dashboard/stats`**

Objetivo: estatísticas globais da plataforma — contagens de entidades e último import.

Resposta `200`:
```json
{
  "data": {
    "products": 1240,
    "offers": 3800,
    "stores": 45,
    "brands": 180,
    "categories": 22,
    "priceHistoryEntries": 9200,
    "lastImport": { "id", "connector_id", "created_at", "success", "total_persisted", "total_errors" }
  }
}
```

Status: **Stable**.

---

**`GET /api/admin/products`**

Objetivo: listar produtos com paginação e busca textual.

Query params: `page` (default 1), `perPage` (default 20, max 50), `search` (ilike no nome).

Resposta `200`:
```json
{
  "data": [ { "id", "name", "slug", "brand": { "id", "name" }, "category": { "id", "name" }, "image_url", "created_at" } ],
  "total": 1240,
  "page": 1,
  "perPage": 20,
  "totalPages": 62
}
```

Status: **Stable**.

---

**`POST /api/admin/products`**

Objetivo: criar produto no catálogo.

Body:
```json
{
  "name": "iPhone 17 Pro 256GB",
  "slug": "iphone-17-pro-256gb",
  "description": "...",
  "brand_id": "uuid",
  "category_id": "uuid",
  "image_url": "https://...",
  "specifications": { "storage": "256GB", "color": "Titânio Natural" }
}
```

`slug` é opcional — gerado automaticamente via `slugify(name)` se omitido.

Resposta `201`: `{ "data": { ...produto }, "message": "Produto criado com sucesso" }`  
Resposta `400`: `{ "error": "Nome é obrigatório" }` ou erro de constraint (slug duplicado).

Status: **Stable**.

---

**`GET /api/admin/products/[id]`**

Objetivo: buscar produto por UUID com brand e category expandidos.

Resposta `200`: `{ "data": { ...produto, "brand": {...}, "category": {...} } }`  
Resposta `404`: `{ "error": "Produto não encontrado" }`

Status: **Stable**.

---

**`PUT /api/admin/products/[id]`**

Objetivo: atualizar produto. Body idêntico ao POST.

Resposta `200`: `{ "data": { ...produto }, "message": "Produto atualizado com sucesso" }`

Status: **Stable**.

---

**`DELETE /api/admin/products/[id]`**

Objetivo: remover produto do catálogo. Ação destrutiva — sem soft delete.

Resposta `200`: `{ "message": "Produto removido com sucesso" }`

Status: **Stable**.

---

**Padrão CRUD para Categories, Brands, Stores, Offers**

Os endpoints `/api/admin/categories`, `/api/admin/brands`, `/api/admin/stores` e `/api/admin/offers` seguem o mesmo padrão:

| Rota | GET (lista) | POST (create) | GET [id] | PUT [id] | DELETE [id] |
|---|---|---|---|---|---|
| `/api/admin/categories` | ✓ paginado | ✓ | ✓ | ✓ | ✓ |
| `/api/admin/brands` | ✓ paginado | ✓ | ✓ | ✓ | ✓ |
| `/api/admin/stores` | ✓ paginado | ✓ | ✓ | ✓ | ✓ |
| `/api/admin/offers` | ✓ paginado | ✓ | ✓ | ✓ | ✓ |

Campos de criação:
- **Category**: `name`, `slug`, `icon`
- **Brand**: `name`, `slug`, `logo_url`
- **Store**: `name`, `slug`, `city`, `country`, `address`, `phone`, `whatsapp`, `email`, `website`, `opening_hours`, `latitude`, `longitude`, `delivery`, `pickup`, `pix_br`, `is_verified`, `active`
- **Offer**: `product_id`, `store_id`, `price_usd`, `price_brl`, `old_price`, `in_stock`, `condition`, `warranty`, `cashback`, `product_url`

Status: **Stable**.

---

**`POST /api/admin/media/upload`**

Objetivo: fazer upload de imagem para o bucket `catalog` no Supabase Storage.

Entrada: `multipart/form-data` com `file` (max 5MB, JPEG/PNG/WebP/GIF) e `folder` (string, default "uploads").

Resposta `201`:
```json
{ "url": "https://supabase.co/storage/v1/object/public/catalog/uploads/...", "path": "uploads/timestamp-random.jpg" }
```

Resposta `400`: arquivo ausente, tipo inválido ou tamanho acima do limite.

Status: **Stable**.

---

**`GET /api/admin/quality/report`**

Objetivo: relatório de qualidade do catálogo — problemas detectados por tipo com amostra de 20 registros.

Resposta `200`:
```json
{
  "data": {
    "generatedAt": "2026-06-28T12:00:00Z",
    "issues": [
      { "type": "missing_image", "severity": "warning", "count": 47, "label": "Produtos sem imagem", "records": [...] },
      { "type": "missing_brand", "severity": "warning", "count": 12, "label": "Produtos sem marca", "records": [...] },
      { "type": "missing_category", "severity": "warning", "count": 8, "label": "Produtos sem categoria", "records": [...] },
      { "type": "missing_product_url", "severity": "info", "count": 23, "label": "Ofertas sem URL do produto", "records": [...] },
      { "type": "invalid_price", "severity": "error", "count": 2, "label": "Ofertas com preço inválido (≤ 0)", "records": [...] },
      { "type": "out_of_stock", "severity": "info", "count": 180, "label": "Ofertas sem estoque", "records": [] }
    ]
  }
}
```

Status: **Stable**.

---

**`GET /api/admin/logs`**

Objetivo: histórico de execuções do pipeline de importação.

Query params: `page`, `perPage`.

Resposta `200`:
```json
{
  "data": [ { "id", "connector_id", "batch_id", "dry_run", "success", "total_raw", "total_persisted", "total_errors", "created_at", "metrics": {...} } ],
  "total": 42,
  "page": 1,
  "perPage": 20,
  "totalPages": 3
}
```

Status: **Stable**.

---

**`GET /api/admin/import/connectors`**

Objetivo: listar connectors disponíveis no `ConnectorRegistry`.

Resposta `200`:
```json
{
  "data": [
    { "id": "shoppingchina:v1", "name": "Shopping China", "version": "1.0.0", "type": "json", "storeSlug": "shopping-china", "description": "..." }
  ]
}
```

Status: **Stable**.

---

**`POST /api/admin/import/run`**

Objetivo: executar o pipeline de importação via connector. Operação síncrona — bloqueia até o pipeline completar. Adequada para volumes pequenos/médios; para volumes grandes será necessário processamento assíncrono (Planned).

Body:
```json
{
  "connectorId": "shoppingchina:v1",
  "dryRun": true,
  "skipMedia": false
}
```

`dryRun: true` (default) — executa o pipeline mas não persiste dados nem cria import_log.  
`dryRun: false` — persiste dados e cria import_log.

Resposta `200`: `{ "data": { "batchId", "success", "metrics": {...}, "persisted": [...], "errors": [...] } }`  
Resposta `400`: connectorId ausente.  
Resposta `404`: connector não encontrado.

Status: **Stable**.

---

### 5.4 Merchant API

Todos os endpoints `/api/merchant/*` (exceto `/plans` e `/auth/register`) requerem sessão com `profiles.role = 'merchant'` e merchant registrado. Retornam `401` ou `403` via `isMerchantAuthError`.

---

**`POST /api/merchant/auth/register`**

Objetivo: criar o registro de merchant para um usuário já autenticado. Idempotente — chamar duas vezes retorna o mesmo resultado sem duplicar dados.

Auth: requer usuário autenticado (qualquer role). Não requer role 'merchant' previamente — o registro cria o merchant e atualiza o role.

Body: nenhum.

Resposta `200`:
```json
{
  "data": {
    "merchantId": "uuid",
    "alreadyExists": false
  }
}
```

`alreadyExists: true` quando merchant já existia — operação idempotente.

Status: **Stable**.

---

**`GET /api/merchant/plans`**

Objetivo: listar planos disponíveis para exibição no onboarding e configurações. Único endpoint merchant sem autenticação de merchant — é lido publicamente para exibição na landing page também.

Auth: nenhuma (usa service client diretamente — sem dados sensíveis).

Resposta `200`:
```json
{
  "data": [
    { "plan": "free", "name": "Grátis", "price_monthly": 0, "max_products": 50, "max_stores": 1, "features": {...} },
    { "plan": "pro", "name": "Pro", "price_monthly": 49, "max_products": 500, "max_stores": 3, "features": {...} },
    { "plan": "business", "name": "Business", "price_monthly": 149, "max_products": 5000, "max_stores": 10, "features": {...} },
    { "plan": "enterprise", "name": "Enterprise", "price_monthly": null, "max_products": null, "features": {...} }
  ]
}
```

Status: **Stable**.

---

**`GET /api/merchant/dashboard/stats`**

Objetivo: dados completos do dashboard — estatísticas, score, nível, próximo passo, metas, completude de perfil e recomendações ativas. É o endpoint mais complexo do merchant — computa on-demand e persiste score.

Resposta `200`:
```json
{
  "data": {
    "stats": {
      "totalProducts": 120,
      "totalOffers": 120,
      "linkedStores": 1,
      "activeOffers": 98,
      "outOfStockOffers": 22,
      "missingImages": 12,
      "missingCategories": 3,
      "lastImportAt": "2026-06-28T10:00:00Z",
      "merchantScore": 62
    },
    "scoreBreakdown": {
      "total": 62,
      "items": [ { "label": "Loja cadastrada", "points": 10, "earned": true }, ... ]
    },
    "level": { "name": "Ouro", "min": 61, "max": 80, "next": "Diamante", "pointsToNext": 19, "color": "text-yellow-400", "bgColor": "bg-yellow-400" },
    "nextStep": { "title": "...", "description": "...", "href": "...", "priority": "high" },
    "goals": [ { "id", "title", "description", "completed", "completedAt", "reward": "..." } ],
    "profileCompletion": { "percent": 75, "items": [ { "label", "completed", "href" } ] },
    "recommendations": [ { "id", "type", "priority", "title", "body", "created_at" } ],
    "merchant": {
      "id": "uuid",
      "company_name": "Cellshop CDE",
      "plan": "pro",
      "status": "active",
      "onboarding_done": true,
      "verified_level": "verified"
    }
  }
}
```

Status: **Stable**.

---

**`PATCH /api/merchant/onboarding`**

Objetivo: avançar o wizard de onboarding. Atualiza dados do merchant step by step. Ao marcar `done: true`, define `status = 'active'` e `onboarding_done = true`.

Body (campos parciais — apenas os fornecidos são atualizados):
```json
{
  "step": 2,
  "done": false,
  "company_name": "Cellshop CDE",
  "company_doc": "12345678-0",
  "company_website": "https://cellshop.com.py",
  "contact_phone": "+595981234567",
  "contact_whatsapp": "+595981234567",
  "store_id": "uuid",
  "plan": "free"
}
```

Resposta `200`: `{ "data": { "step": 2, "done": false } }`

Status: **Stable**.

---

**`GET /api/merchant/stores`**

Objetivo: listar lojas vinculadas ao merchant com dados da store.

Resposta `200`:
```json
{
  "data": [
    {
      "id": "junction-uuid",
      "is_primary": true,
      "store_id": "uuid",
      "stores": { "id", "name", "slug", "city", "country", "website", "active" }
    }
  ]
}
```

Status: **Stable**.

---

**`POST /api/merchant/stores`**

Objetivo: listar todas as lojas ativas disponíveis para vinculação durante o onboarding.

Body: nenhum.

Resposta `200`:
```json
{
  "data": [ { "id", "name", "slug", "city", "country", "website", "active" } ]
}
```

Nota: este endpoint usa `POST` para listar — anomalia arquitetural. Semanticamente deveria ser `GET`. Candidato a correção quando a API for versionada.

Status: **Stable** (implementação), **candidato a revisão semântica**.

---

**`GET /api/merchant/products`**

Objetivo: listar produtos do merchant via suas lojas vinculadas, com offer e brand/category expandidos.

Query params: `page` (default 1, 20 por página).

Resposta `200`:
```json
{
  "data": [
    {
      "id": "offer-uuid",
      "price_usd": 950,
      "in_stock": true,
      "product_url": "https://...",
      "products": {
        "id", "name", "slug", "image_url",
        "brands": { "name": "Apple" },
        "categories": { "name": "Smartphones" }
      }
    }
  ],
  "total": 120,
  "totalPages": 6
}
```

Status: **Stable**.

---

**`POST /api/merchant/imports/run`**

Objetivo: executar importação de catálogo para o merchant. Idêntico ao `POST /api/admin/import/run` mas autenticado como merchant e limitado ao escopo do connector fornecido. Registra evento de auditoria.

Body: idêntico ao admin run (`connectorId`, `dryRun`, `skipMedia`).

Resposta `200`: `{ "data": { "batchId", "success", "metrics", "persisted", "errors" } }`

Status: **Stable**.

---

**`GET /api/merchant/imports/history`**

Objetivo: histórico de importações do merchant.

Resposta `200`:
```json
{
  "data": [ { "id", "connector_id", "success", "total_persisted", "total_errors", "created_at" } ],
  "totalPages": 2
}
```

Status: **Stable**.

---

**`GET /api/merchant/recommendations`**

Objetivo: recomendações ativas (não lidas) do merchant, ordenadas por prioridade.

Resposta `200`:
```json
{
  "data": [
    { "id", "type": "missing_images", "priority": "warning", "title": "...", "body": "...", "created_at", "read_at": null }
  ]
}
```

Status: **Stable**.

---

**`PATCH /api/merchant/recommendations`**

Objetivo: marcar recomendação como lida.

Body: `{ "id": "uuid" }`

Resposta `200`: `{ "data": { "ok": true } }`  
Resposta `400`: `{ "error": "id required" }`

Status: **Stable**.

---

**`GET /api/merchant/audit`**

Objetivo: log de auditoria do merchant — ações realizadas ordenadas por data decrescente.

Query params: `page` (default 1, 20 por página).

Resposta `200`:
```json
{
  "data": [
    { "id", "event_type": "import_complete", "payload": { "connectorId", "persisted": 45 }, "created_at" }
  ],
  "totalPages": 3
}
```

Status: **Stable**.

---

**`GET /api/merchant/settings`**

Objetivo: dados do merchant e plano atual.

Resposta `200`:
```json
{
  "data": {
    "merchant": { "id", "company_name", "company_doc", "company_website", "contact_phone", "contact_whatsapp", "contact_email", "plan", "status", "verified_level" },
    "plan": { "plan", "name", "price_monthly", "max_products", "max_stores", "features": {...} }
  }
}
```

Status: **Stable**.

---

**`PATCH /api/merchant/settings`**

Objetivo: atualizar configurações do merchant. Apenas campos permitidos são aceitos — a lista é explícita no servidor para prevenir mass assignment.

Campos permitidos: `company_name`, `company_doc`, `company_website`, `contact_phone`, `contact_whatsapp`, `contact_email`.

Body: qualquer combinação dos campos permitidos.

Resposta `200`: `{ "data": { "ok": true } }`  
Resposta `400`: `{ "error": "Nenhum campo válido para atualizar" }`

Status: **Stable**.

---

## 6. Formato de Contratos

### 6.1 Envelope de Resposta

Toda resposta de sucesso usa `{ "data": T }`. Toda resposta de erro usa `{ "error": string }`. Nenhum endpoint retorna um objeto flat sem envelope.

```json
// Sucesso — item único
{ "data": { "id": "...", "name": "..." } }

// Sucesso — lista com paginação
{ "data": [...], "total": 120, "page": 1, "perPage": 20, "totalPages": 6 }

// Sucesso — ação confirmada
{ "data": { "ok": true }, "message": "Produto atualizado com sucesso" }

// Erro
{ "error": "Produto não encontrado" }
```

### 6.2 Paginação

Parâmetros padrão: `page` (int, 1-based), `perPage` (int, default 20, max 50).

Resposta padrão: `data[]`, `total` (contagem real), `page`, `perPage`, `totalPages`.

### 6.3 Filtros

Filtros são query params nomeados pelo campo filtrado. Sem notação de operador — todos são filtros de igualdade ou ilike (busca textual).

### 6.4 Datas

Todas as datas são strings ISO 8601 em UTC: `"2026-06-28T12:00:00Z"`. Nunca timestamps Unix. Nunca datas sem timezone.

### 6.5 Moeda

`price_usd` e `price_brl` são números (`NUMERIC(10,2)` no banco). Nunca strings formatadas. Formatação (`$ 950,00`) acontece no cliente via `formatUSD()`/`formatBRL()` de `utils/currency.ts`.

### 6.6 IDs e Slugs

`id`: UUID v4 (gerado pelo Supabase). Sempre string.  
`slug`: kebab-case, único por tipo de entidade, gerado via `slugify()` de `utils/slug.ts`.

---

## 7. Autenticação

### 7.1 Supabase Auth + JWT

O ParaguAI usa Supabase Auth com PKCE para o fluxo de confirmação de email. A sessão é mantida por cookies HttpOnly gerenciados pelo `@supabase/ssr`.

### 7.2 Camadas de autenticação

| Função | Arquivo | O que verifica | Retorna |
|---|---|---|---|
| `requireAdmin()` | `lib/admin-auth.ts` | sessão + `profiles.role IN ('admin', 'operator')` | `{ serviceClient, user }` ou `NextResponse 401/403` |
| `requireMerchant()` | `lib/merchant-auth.ts` | sessão + `profiles.role = 'merchant'` + merchant existente | `{ serviceClient, merchant, userId, email }` ou erro |
| `requireAuth()` | `lib/merchant-auth.ts` | apenas sessão válida (sem verificar role) | `{ serviceClient, userId, email }` ou erro |
| `isAuthError(result)` | `lib/admin-auth.ts` | detecta se resultado é NextResponse de erro | boolean |
| `isMerchantAuthError(result)` | `lib/merchant-auth.ts` | detecta se resultado é NextResponse de erro | boolean |

### 7.3 Fluxo de autorização

```
Request chega ao Route Handler
    │
requireAdmin() / requireMerchant() / requireAuth()
    │
lib/supabase/server.ts → await cookies() → valida JWT
    │
Supabase profiles.role CHECK
    │
Autorizado: retorna { serviceClient, ... }
Negado: retorna NextResponse(401 ou 403)
    │
Route Handler: isAuthError(auth) → return auth (early exit)
Route Handler: usa auth.serviceClient para queries
```

### 7.4 Cookies e sessão

Cookies de sessão são HttpOnly, gerenciados pelo `@supabase/ssr`. O `createServerClient` em `lib/supabase/server.ts` lê e escreve cookies via `await cookies()`. Route Handlers não manipulam cookies manualmente.

### 7.5 Múltiplas sessões simultaneas

Não há controle de sessão única — um merchant pode estar logado em múltiplos browsers simultaneamente. Não é uma limitação arquitetural — é comportamento padrão do Supabase Auth.

---

## 8. Tratamento de Erros

### 8.1 Códigos HTTP utilizados

| Código | Quando usar |
|---|---|
| `200 OK` | Sucesso para GET, PUT, PATCH, DELETE |
| `201 Created` | Sucesso para POST que cria um recurso |
| `400 Bad Request` | Entrada inválida — campo obrigatório ausente, valor inválido, tipo errado |
| `401 Unauthorized` | Sem sessão ou sessão expirada |
| `403 Forbidden` | Sessão válida mas role insuficiente |
| `404 Not Found` | Recurso não encontrado (produto, connector, etc.) |
| `500 Internal Server Error` | Falha inesperada no servidor ou no Supabase |

### 8.2 Códigos HTTP planejados (Planned)

| Código | Quando usar |
|---|---|
| `409 Conflict` | Recurso já existe (slug duplicado) — hoje retornado como 400 com mensagem de constraint |
| `422 Unprocessable Entity` | Validação semântica falhou (regra de negócio, não só formato) |
| `429 Too Many Requests` | Rate limiting — não implementado no Release 1.4 |

### 8.3 Formato de erro

Sempre `{ "error": string }` com a mensagem mais específica disponível. Nunca expor stack traces ou mensagens internas de banco em produção.

```json
// Correto
{ "error": "Nome é obrigatório" }
{ "error": "Connector 'xyz' não encontrado" }

// Incorreto — nunca em produção
{ "error": "duplicate key value violates unique constraint \"products_slug_key\"" }
```

### 8.4 Erros do Supabase

Erros de constraint do banco são repassados via `error.message` do Supabase diretamente no Release 1.4. Melhoria planejada: mapear erros de constraint para mensagens de domínio amigáveis antes de retornar.

---

## 9. Convenções

### 9.1 Nomenclatura de campos

Campos do banco de dados e respostas de API: `snake_case` (ex: `price_usd`, `company_name`, `created_at`).  
Campos computados em memória e TypeScript: `camelCase` (ex: `lowestPriceUSD`, `rankScore`, `totalPages`).  
Inconsistência: a resposta do dashboard mistura `snake_case` (campos do banco) com `camelCase` (campos computados). Isso será padronizado na API versionada.

### 9.2 JSON

Content-Type: `application/json`. Encoding: UTF-8. Nenhum outro formato suportado exceto `multipart/form-data` no upload de mídia.

### 9.3 Timezone

UTC em todas as datas. Formatação para exibição ao usuário acontece no frontend.

### 9.4 Slugs

Gerados via `slugify()` de `utils/slug.ts`. Lowercase, separados por hífens, sem caracteres especiais. Únicos por tipo de entidade — UNIQUE constraint no banco.

### 9.5 UUIDs

Gerados pelo Supabase (PostgreSQL `gen_random_uuid()`). Versão 4. Nunca gerados no frontend.

---

## 10. Versionamento

### 10.1 Estado atual (Release 1.4)

Nenhum versionamento explícito. As rotas em `/api/` são implicitamente `v1` — um contrato sem número de versão.

### 10.2 Quando versionar

O momento certo para introduzir versionamento é quando o primeiro breaking change for necessário. Breaking changes incluem:
- Remover campo de resposta que consumidores dependem
- Mudar tipo de campo (string → number, etc.)
- Mudar semântica de parâmetro existente
- Remover endpoint

Mudanças não-breaking (adicionar campo opcional, adicionar endpoint novo) não exigem nova versão.

### 10.3 Estratégia de versionamento (Planned)

Quando a API Pública Expandida for lançada (Release 1.5+), o versionamento será por prefixo de URL: `/api/v1/`, `/api/v2/`. O padrão atual (`/api/compare`, `/api/admin/*`, `/api/merchant/*`) permanecerá como está — a versão pública expandida introduz o prefixo.

### 10.4 Deprecação

Endpoints deprecados continuam funcionando por pelo menos 2 releases após a deprecação. Resposta inclui header `Deprecation: true` e `Sunset: <data>`. Documentação atualiza status para **Deprecated** com nota de alternativa.

---

## 11. Segurança

### 11.1 Autorização em camadas

Três barreiras independentes protegem os dados:

1. **Sessão**: `requireAdmin()`/`requireMerchant()` verificam JWT via Supabase. Sem sessão → 401.
2. **Role**: `profiles.role` verifica o papel. Role insuficiente → 403.
3. **RLS**: o `serviceClient` bypassa RLS intencionalmente nos Route Handlers (o controle de escopo é feito pelo código — merchant só vê seus dados via query filtrada por `merchant_id`). A app pública usa anon key + RLS da migration 0007.

### 11.2 Service Role Key

`SUPABASE_SERVICE_ROLE_KEY` não tem prefixo `NEXT_PUBLIC_*`. Não é enviada ao browser. Só existe em `lib/supabase/service.ts`, importada exclusivamente por Route Handlers e Server Components de auth.

Violação: qualquer componente com `"use client"` que importar `lib/supabase/service.ts` expõe a chave no bundle JavaScript. Isso é detectável em `eslint.config.mjs` e deve ser testado em CI (Planned).

### 11.3 Input Validation

Validação atual: manual, com verificações básicas (`!name`, tipos primitivos, slugify). Sem schema de validação (Zod) em Runtime no Release 1.4. Risco: mudança de schema no banco não quebra TypeScript em compilação, apenas em runtime.

Melhoria planejada: validação com Zod em todos os endpoints que recebem body — Release 1.5+.

### 11.4 Mass Assignment Prevention

`PATCH /api/merchant/settings` usa uma allowlist explícita de campos (`allowed = ["company_name", ...]`). Nenhum campo não listado é enviado ao banco, mesmo que presente no body. Este padrão deve ser seguido em todos os endpoints PATCH.

### 11.5 CORS

Next.js App Router não configura CORS por padrão — apenas origens do mesmo domínio. A API pública (`/api/compare`) não tem CORS configurado explicitamente, o que limita consumo por origens externas. Configuração necessária para a API Pública Expandida.

### 11.6 Rate Limiting

Não implementado no Release 1.4. Supabase tem limites na camada de banco (conexões simultâneas) mas não há rate limiting na camada de API. Planned para Release 1.5+ via middleware do Next.js ou edge function.

### 11.7 Sanitização

Strings recebidas no body são tratadas como literais — sem sanitização HTML. Não há risco de XSS via API pois as respostas são consumidas como JSON, não renderizadas como HTML diretamente. `product.specifications` (JSONB) é armazenado e retornado como-está.

---

## 12. Integração com IA

### 12.1 Princípio

O ParaguAI Brain nunca acessa o banco de dados diretamente. Consome APIs. Isso garante:
- Aplicação das mesmas regras de negócio que o frontend
- Rastreabilidade de acesso via logs de API
- Possibilidade de limitar e monitorar o uso da IA por rate limit e quota
- Separação de preocupações: a IA é um consumidor, não um componente interno

### 12.2 Endpoints que a IA consumirá (Planned)

| Endpoint | Uso pela IA |
|---|---|
| `GET /api/v1/products?q=&category=` | Busca semântica + tradicional |
| `GET /api/v1/compare?slug=` | Comparação de ofertas em resposta a perguntas de compra |
| `GET /api/v1/stores?verified=true` | Lojas verificadas para recomendações contextuais |
| `GET /api/v1/categories` | Mapeamento de intenção de compra para categorias |
| `POST /api/v1/ai/search` | Endpoint específico de busca por linguagem natural (Planned) |

### 12.3 Autenticação da IA

A IA não terá acesso a endpoints de admin ou merchant. Consumirá apenas a API Pública Expandida com autenticação por API key (Planned — não é sessão de usuário).

---

## 13. Integração com Connectors

### 13.1 Fluxo de importação

Os connectors não enviam dados diretamente para a API HTTP. O fluxo é:

```
[Connector] → ConnectorRegistry.get(id).fetch() → RawOffer[]
                                    │
                           AcquisitionPipeline.run()
                                    │
                           Validation → Normalization → Deduplication → MediaPipeline → CatalogWriter
                                    │
                           INSERT/UPSERT em: brands → categories → products → offers
                                    │
                           import_logs INSERT (se não dryRun)
```

Os Route Handlers de import (`/api/admin/import/run` e `/api/merchant/imports/run`) chamam o pipeline internamente — não é uma chamada HTTP externa do connector para a API.

### 13.2 Idempotência de importação

O `CatalogWriter` usa `upsert` com `onConflict: slug` para brands, categories e products. Para offers, usa insert com deduplicação prévia. Re-executar um import com os mesmos dados não cria duplicatas.

### 13.3 Rastreabilidade

Cada execução do pipeline recebe um `batchId` (UUID gerado no início do run). O `import_log` registra `connector_id`, `batch_id`, `dry_run`, `success`, contadores e o `PipelineMetrics` completo em JSONB.

### 13.4 Execução síncrona vs. assíncrona

No Release 1.4, o pipeline executa de forma síncrona no mesmo processo do Route Handler. Para volumes grandes (> 10.000 itens), isso pode ultrapassar o timeout da request. Solução planejada: fila de jobs assíncronos com `import_jobs` table e notificação por polling ou webhook.

### 13.5 Retries

Não há lógica de retry automático no Release 1.4. Erros de um item não interrompem o processamento dos demais — o pipeline coleta erros e continua. O campo `errors` no `import_log` registra todos os erros do batch.

---

## 14. Observabilidade

### 14.1 Logging atual

Todos os Route Handlers usam `console.error` para erros não-fatais e falhas de Supabase. Sem `console.log` para sucessos — apenas ruído em produção.

Exemplos de mensagens de log:
- `[stats] score update: <error message>` — falha ao persistir score (non-fatal)
- `[stats] recs select: <error message>` — falha ao buscar recomendações
- `[register] profiles.role update failed (non-fatal): <msg>`
- `[auth/callback] code exchange failed: <msg>`

### 14.2 Request ID (Planned)

Nenhum correlation ID entre requests no Release 1.4. Planejado para Release 1.5+: middleware que injeta `X-Request-ID` em cada request e o inclui nos logs.

### 14.3 Tracing (Planned)

Sem distributed tracing. Candidato a OpenTelemetry quando a arquitetura evoluir para múltiplos serviços.

### 14.4 Métricas (Planned)

Sem métricas de latência, taxa de erro ou throughput por endpoint no Release 1.4. O Import Log já captura métricas de pipeline (duração, contadores) — padrão a ser expandido.

---

## 15. Anti-Patterns

Anti-patterns identificados ou registrados para prevenção futura.

| Anti-Pattern | Onde ocorre / Risco | Alternativa correta |
|---|---|---|
| **Lógica de negócio no Route Handler** | `GET /api/merchant/dashboard/stats` — chama computeMerchantScore, generateRecommendations, getMerchantLevel inline | Extrair para um service `getDashboardPayload()` que o Route Handler chama |
| **`POST` semântico para listagem** | `POST /api/merchant/stores` retorna lista de lojas disponíveis | `GET /api/merchant/stores/available` — corrigir na API versionada |
| **Erro de constraint exposto diretamente** | Erros de slug duplicado retornam a mensagem raw do PostgreSQL | Mapear para `409 Conflict` com mensagem de domínio |
| **Sem validação de schema em runtime** | Body dos Route Handlers é `as Record<string, unknown>` — sem Zod | Validação com Zod antes de qualquer operação de escrita |
| **Pipeline síncrono em Route Handler** | Import run bloqueia o processo até o pipeline concluir | Fila de jobs assíncronos para volumes grandes |
| **Sem rate limiting** | Endpoints de import podem ser chamados infinitamente | Rate limiting por usuário e por endpoint em Release 1.5+ |
| **Mistura de convenções de nomenclatura** | Resposta do dashboard: `snake_case` (banco) misturado com `camelCase` (computados) | Padronizar para `camelCase` na camada de API, transformar `snake_case` do banco |
| **Sem CORS configurado** | `/api/compare` não aceita chamadas de origens externas | Configurar CORS explicitamente quando a API Pública Expandida for lançada |
| **Sem correlation ID** | Impossível rastrear uma request específica nos logs | `X-Request-ID` via middleware |

---

## 16. Roadmap

Evoluções naturais derivadas do estado atual — sem inventar features.

### 16.1 API Pública Expandida v1 (Release 1.5)

Endpoints REST públicos versionados para consumo por apps mobile, parceiros e IA:

```
GET /api/v1/products          → lista paginada com filtros
GET /api/v1/products/[slug]   → detalhe de produto
GET /api/v1/compare/[slug]    → comparação (equivalente ao atual /api/compare)
GET /api/v1/stores            → lojas verificadas com ranking
GET /api/v1/categories        → categorias
GET /api/v1/brands            → marcas
```

Inclui: CORS configurado, rate limiting, API key para consumidores externos, response caching.

### 16.2 Validação com Zod (Release 1.5)

Adicionar schema Zod nos endpoints que recebem body. Retornar `422 Unprocessable Entity` com lista de erros de validação estruturada.

### 16.3 Import Jobs Assíncronos (Release 1.5)

Tabela `import_jobs` + endpoint `GET /api/*/imports/[jobId]/status` para polling. Pipeline passa a rodar em background — Route Handler retorna imediatamente com `jobId`.

### 16.4 Webhooks de eventos (Release 2.0)

Notificações para sistemas externos quando preços mudam, catálogo é atualizado ou alertas são disparados. Padrão: POST para URL configurada com payload assinado (HMAC-SHA256).

### 16.5 API de Busca Semântica (Release 2.0)

`POST /api/v1/ai/search` — aceita query em linguagem natural, retorna produtos ranqueados por relevância semântica. Consome `ai_embeddings` table.

### 16.6 Rate Limiting (Release 1.5)

Middleware Next.js com contador por IP/userId. Limites diferenciados por tier de acesso (anônimo, merchant, admin).

---

*Este documento representa os contratos do Release 1.4. Endpoints planejados estão marcados como Planned e não existem no código. Quando este documento divergir de um Route Handler real em `app/api/`, o Route Handler prevalece como fonte de verdade de implementação — e este documento deve ser corrigido. Nunca documente como implementado o que ainda não existe.*
