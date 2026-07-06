# DATABASE_ENGINEERING.md

**Versão**: 1.0
**Criado**: 2026-07-01
**Status**: Padrão permanente (Database Migration System V2)

Este documento é o padrão oficial de engenharia de banco de dados do ParaguAI. Substitui o fluxo anterior — copiar SQL manualmente para o Supabase SQL Editor — como caminho padrão de mudança de schema. Toda mudança de banco a partir de agora segue este documento.

---

## 1. Por que este documento existe

Até a migration `0021`, toda mudança de schema no ParaguAI seguia o mesmo caminho: uma migration numerada (`database/migrations/000N_*.sql`) era escrita, revisada, e aplicada manualmente pelo CTO no Supabase SQL Editor. Essa decisão foi deliberada (ver ADR-017/018 em `docs/operations/DECISIONS.md`) — não existia, até este momento, uma ferramenta de execução de DDL neste projeto.

Isso funcionou em escala pequena, mas expôs problemas estruturais reais durante a Release 1.7:

- Consultas de verificação embutidas nas próprias migrations usando `information_schema.tables.row_security` — **essa coluna não existe** em `information_schema.tables`. O check sempre falhava silenciosamente ou retornava vazio.
- Migrations não idempotentes: `CREATE POLICY` sem `DROP POLICY IF EXISTS` antes causou uma falha real de reexecução, corrigida ad-hoc em `0017_hotfix_trust_experience.sql`.
- Nenhuma automação, nenhuma validação automática, nenhum ambiente de staging, nenhuma política de rollback documentada.

O Database Migration System V2 elimina essas causas raiz, adotando a **Supabase CLI** como caminho oficial de execução.

---

## 2. Onde as migrations vivem

| Intervalo | Local | Status |
|---|---|---|
| `0001`-`0017` | `database/migrations/` | Congelado. Já aplicado em produção. Não editar. |
| `0018`-`0021` | `database/migrations/` | Já aplicado em produção. Corrigido nesta versão (verificação extraída, `0018` ganhou guards de idempotência) — a edição não reaplica nada, é higiene de arquivo. |
| `0022`+ | `supabase/migrations/` | Caminho oficial a partir daqui. Nomeado `<timestamp>_<nome>.sql`, aplicado via `supabase db push`. |

Nenhuma migration nova deve ser criada em `database/migrations/`. A partir de `0022`, `supabase/migrations/` é a única fonte de verdade.

**Validado em produção contínua (Release 1.7 — Waves 4 e 5)**: `0025_canonical_catalog.sql` e `0026_merchant_ownership.sql` seguiram este padrão sem nenhuma exceção — schema apenas, verificação em `database/verification/`, `db:lint` verde em ambas. O sistema não precisou de ajuste para acomodar novas Waves.

---

## 3. Padrão de migration

Toda migration nova nasce de `database/templates/MIGRATION_TEMPLATE.sql` via:

```bash
npx supabase migration new <nome_descritivo>
```

Isso cria `supabase/migrations/<timestamp>_<nome_descritivo>.sql` automaticamente numerado pelo CLI.

**Uma migration deve conter exclusivamente**: `CREATE`, `ALTER`, `DROP`, `INSERT`, `UPDATE`, `DELETE`.

**Uma migration nunca deve conter**: `SELECT` avulso, health check, consulta de auditoria, consulta operacional. Um `INSERT INTO ... SELECT ...` (migração de dados) é permitido — é DML, não uma consulta de auditoria. Essa regra é validada automaticamente por `npm run db:lint` (`scripts/db-migration-lint.ts`), não apenas por convenção.

**Idempotência obrigatória**:
- `CREATE TABLE IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- `DROP POLICY IF EXISTS` antes de todo `CREATE POLICY` (Postgres não tem `CREATE POLICY IF NOT EXISTS`)
- `DROP TRIGGER IF EXISTS` antes de todo `CREATE TRIGGER`
- `CREATE OR REPLACE FUNCTION` em vez de `CREATE FUNCTION` quando a função pode já existir

**Toda migration declara seu status de rollback** no cabeçalho (ver §5).

---

## 4. Verificação (nunca embutida)

Toda migration tem um arquivo irmão em `database/verification/<NNNN>_verify.sql` (para as migrations `0018`-`0024` já existentes) ou nomeado pelo próprio número/nome da migration nova. Esse arquivo contém **apenas** consultas `SELECT` de validação — nunca é executado automaticamente, nunca faz parte do pipeline de aplicação. É colado manualmente no SQL Editor (ou listado via `npm run db:verify`) quando alguém quer confirmar que uma migration específica aplicou como esperado.

**Regra crítica corrigida (a causa raiz do ETAPA 1)**: para checar RLS, use sempre

```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = '...';
```

nunca

```sql
SELECT table_name, row_security FROM information_schema.tables WHERE table_name = '...'; -- INVÁLIDO
```

Template: `database/templates/VERIFICATION_TEMPLATE.sql`.

---

## 5. Health System (verificações de sistema, não de uma migration)

`database/health_checks/` contém verificações permanentes, independentes de qualquer migration específica, chamáveis a qualquer momento:

- `rls.sql` — status de RLS de toda tabela pública
- `policies.sql` — todas as policies + tabelas com RLS habilitado e zero policies
- `indexes.sql` — todos os índices + candidatos a índice não utilizado
- `foreign_keys.sql` — todas as FKs e suas `delete_rule`
- `triggers.sql` — todos os triggers
- `extensions.sql` — extensões Postgres instaladas
- `storage_buckets.sql` — buckets do Supabase Storage + suas policies

Diferença de `database/verification/`: verificação checa "esta migration aplicou corretamente"; health check checa "o sistema como um todo está saudável agora", sem estar amarrado a nenhuma migration.

---

## 6. Política de Rollback

Toda migration declara uma das três classes no cabeçalho (ver `database/templates/ROLLBACK_TEMPLATE.sql`):

| Classe | Significado | Exemplo |
|---|---|---|
| **Possible** | Reversível por completo, sem perda de dados | Nova tabela/coluna/índice que nada mais depende ainda |
| **Partial** | Reversível, mas descarta dados escritos depois da aplicação | Tabela de histórico/auditoria — reverter apaga o que foi acumulado |
| **Impossible** | Não reversível | Mudança destrutiva de tipo de coluna, backfill que não pode ser re-derivado, mudança da qual outra migration já aplicada depende |

Quando "Possible" ou "Partial", o SQL de reversão real vive em um arquivo companheiro (mesmo padrão de `database/templates/ROLLBACK_TEMPLATE.sql`). Quando "Impossible", a razão é documentada no cabeçalho da própria migration — nenhum arquivo de rollback é criado para essa classe.

---

## 7. Automação (`package.json`)

| Script | Comando | Uso |
|---|---|---|
| `npm run db:push` | `supabase db push` | Aplica migrations pendentes de `supabase/migrations/` ao projeto linkado |
| `npm run db:reset` | `supabase db reset` | Reseta o banco local (requer Docker — ver §9) |
| `npm run db:diff` | `supabase db diff` | Gera diff entre schema local e migrations |
| `npm run db:status` | `supabase migration list` | Lista migrations aplicadas vs. pendentes |
| `npm run db:lint` | `tsx scripts/db-migration-lint.ts` | Valida que nenhuma migration em `supabase/migrations/` contém SELECT avulso |
| `npm run db:verify` | `tsx scripts/db-verify.ts` | Lista os arquivos de verificação/health check disponíveis |

**Não renomeado**: `npm run db:seed` / `db:seed:execute` continuam apontando para `database/seed/index.js` (o pipeline de seeding de catálogo já existente e testado) — deliberadamente não substituído pelo `supabase/seed.sql` (que fica como placeholder para reset local via Docker; ver `supabase/seed.sql`).

---

## 8. Fluxo Dev → Staging → Produção

**Dev (esta máquina / qualquer contribuidor)**:
1. `npx supabase migration new <nome>` a partir de `database/templates/MIGRATION_TEMPLATE.sql`.
2. Escrever a migration (só DDL/DML) + seu par em `database/verification/`.
3. `npm run db:lint` local antes de commitar.
4. Se Docker estiver disponível: `npm run db:reset` para testar contra um Postgres local antes de tocar o projeto real.

**Staging**: não existe hoje um projeto Supabase de staging separado — gap nomeado explicitamente (ETAPA 8), não escondido. Até que um projeto de staging seja provisionado, o pipeline em `.github/workflows/database.yml` aponta direto para o único projeto existente.

**Produção**: `supabase db push` (manual pelo CTO hoje; via CI/CD uma vez que os secrets `SUPABASE_ACCESS_TOKEN`/`SUPABASE_PROJECT_REF`/`SUPABASE_DB_PASSWORD` sejam configurados no GitHub).

---

## 9. Runbook — primeira vez linkando o projeto real

**Status (2026-07-02): concluído.** O CTO já linkou o projeto e rodou `db push` — `supabase/migrations/` cresceu de 3 para 5 arquivos ao longo das Waves 3-5 (`0022`-`0026`: `connector_platform`, `merchant_entitlements_discovery`, `product_identity`, `canonical_catalog`, `merchant_ownership`), e todas as 5 estão confirmadas aplicadas (`supabase migration list` retorna `local`==`remote` para as 5; `supabase db push` retorna "Remote database is up to date"). O runbook abaixo fica documentado para a próxima vez que uma migration nova for adicionada a `supabase/migrations/` (basta repetir o passo 3):

```bash
# 1. Login (abre o navegador para autenticação)
npx supabase login

# 2. Link com o projeto real (ref já confirmado em NEXT_PUBLIC_SUPABASE_URL)
npx supabase link --project-ref acairzpzsklctaqjsukw

# 3. Push de qualquer migration nova em supabase/migrations/
npm run db:push

# 4. Confirmar
npm run db:status
```

**Por que não precisou de "baseline"/"repair"**: `supabase/migrations/` só contém as migrations nunca antes aplicadas manualmente. `0001`-`0021` continuam vivendo só em `database/migrations/`, fora do controle da CLI — o schema de produção deles já existia e não muda. Cada `supabase db push` aplica exatamente as migrations pendentes daquele momento, sem tocar em nada anterior.

**Docker**: `supabase start`/`db reset` (banco local) exigem Docker Desktop, não disponível no ambiente onde este sistema foi construído. Necessário apenas se/quando quiser testar migrations localmente antes de aplicar — `db push`/`link`/`diff` contra o projeto remoto não precisam de Docker.

---

## 10. Governança permanente (institucionalizado)

Nenhuma migration pode conter: SELECT de auditoria, health check, verificação, consulta operacional.

Toda migration deve ser: atômica, versionada, idempotente quando possível, compatível com PostgreSQL, compatível com Supabase, reproduzível, auditável, automatizada.

O SQL Editor do Supabase permanece legítimo apenas para: debug, consultas ad-hoc, inspeção, investigação. **Nunca mais** para aplicar migrations como fluxo padrão — ver ADR de superação do ADR-017 em `docs/operations/DECISIONS.md`.

## 11. Padrão de dado pessoal (LGPD) — estabelecido pela ADR-045/046, obrigatório para qualquer tabela nova com PII

Nenhuma migration futura que armazene dado pessoal identificável (de comprador ou qualquer outro público) deve ser escrita sem seguir o padrão já decidido para o Buyer Identity Model (`docs/product/releases/RELEASE_1_8_BUYER_IDENTITY_MODEL.md`):

- **Deleção é anonimização, nunca hard delete.** A linha e seu `id` sobrevivem; colunas de PII são sobrescritas; `anonymized_at` é setado. Isso preserva integridade referencial e sinal comportamental agregado (`STRATEGIC_ASSETS.md` Anti-Pattern 5 — nunca destruir dado histórico) sem violar direito de apagamento.
- **FK para `auth.users` usa `ON DELETE SET NULL`, nunca `CASCADE`**, quando a tabela precisa sobreviver à conta de autenticação ser de fato apagada como um tombstone anonimizado.
- **Todo consentimento é um log INSERT-only** (nunca um campo booleano sobrescrito) — mesma disciplina de `price_history`/`review_history`. É a prova de conformidade, não um estado atual.
- **Nenhuma tabela de identidade nova reaproveita `profiles`** — `profiles` é exclusiva de staff/operator/merchant (ADR-031), decisão reafirmada como definitiva pela ADR-046. Cada público com ciclo de vida/exigência de dado pessoal diferente ganha seu próprio aggregate root.

---

## 12. Padrões consolidados por precedente — INSERT-only e RLS sem policy pública

Dois padrões que várias migrations já seguiam implicitamente, agora explícitos aqui (Release 1.8 — Program A — Wave 1, ao criar `exchange_rates`):

**INSERT-only para dado de Core Asset (`STRATEGIC_ASSETS.md` Anti-Pattern 5, "nunca sobrescrever histórico"):**

| Tabela | Migration | O que nunca é sobrescrito |
|---|---|---|
| `price_history` | `database/migrations/0006` | Preço de uma oferta em um momento — uma correção é uma nova linha |
| `exchange_rates` | `supabase/migrations/20260703140000_exchange_intelligence.sql` | Cotação capturada — uma nova leitura do provedor é sempre uma nova linha, nunca um `UPDATE` |
| `market_changes` | `supabase/migrations/20260703170000_realtime_commerce.sql` | Toda mudança de mercado detectada (preço, estoque, catálogo) — o ledger é a fonte única de verdade da qual Volatility/Freshness/Store Update Intelligence/Market Pulse são todos *derivados por leitura*, nunca uma segunda fonte de estado |

Regra: toda tabela que registra "o valor de algo em um momento no tempo" (preço, cotação, evento) é `INSERT`-only por design — nenhum método de `UPDATE` existe no repositório correspondente, mesmo que o schema tecnicamente permitisse. `market_changes` (Program A — Wave 2) leva esse padrão um passo além: em vez de cada engine derivada persistir seu próprio snapshot, a maioria (Volatility, Freshness, Store Update) computa sob demanda diretamente do ledger — zero tabela de estado duplicado, mesma disciplina de `MerchantPriorityService` (Program 0 — Wave 1). Só o Market Pulse (agregado marketplace-wide, caro de recomputar por requisição) ganha um rollup diário persistido (`market_pulse_snapshots`, upsert-by-date, mesmo padrão de `marketplace_health_snapshots`) — cache de leitura, nunca fonte de verdade.

**RLS habilitada, zero policy pública, leitura via service_role no servidor** — o padrão real deste projeto para dado público sem sensibilidade (não um padrão novo, só nunca antes documentado explicitamente):

| Tabela | Consumidor público | Como lê |
|---|---|---|
| `canonical_products` | `GET /api/canonical-catalog/[slug]` | Service-role client, no servidor (ADR-036) |
| `exchange_rates` | `GET /api/exchange/current`, `/history` | Service-role client, no servidor (mesmo padrão) |

Regra: uma tabela pública **não precisa** de uma policy `SELECT` para `anon`/`authenticated` — a rota de API já resolve isso lendo com `service_role` no servidor e decidindo o que expor na resposta (frequentemente um subconjunto de campos, ver `GET /api/exchange/providers`, que nunca expõe texto de erro bruto). Criar uma policy pública nova é uma decisão deliberada e rara neste projeto, não o padrão default — confirme que não há um caminho "service_role no servidor" mais simples antes de propor uma.
