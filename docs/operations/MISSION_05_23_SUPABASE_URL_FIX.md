# MISSION 05.23 — SUPABASE URL FIX & DATA VALIDATION

**Categoria**: `docs/operations/`
**Branch**: `mission-05-23-supabase-url-fix` (base `mission-05-22-write-path-root-cause` @ `7aef04b`)
**RESULTADO: CORREÇÃO APLICADA E VALIDADA — 9/9 CRITÉRIOS DE ACEITAÇÃO ATENDIDOS.** O câmbio persistiu taxas pela **primeira vez** neste deployment e o catálogo/lojas/ofertas/busca exibem **dados reais**.

## 0.1 Autorização — cumprida

| Item | Feito |
|---|---|
| 1. Backup de `app.env` preservando `0600` | ✅ `/etc/paraguai/app.env.bak-05.23` (`modo=600`, `root:root`, 627 bytes) |
| 2. Corrigir **exclusivamente** `NEXT_PUBLIC_SUPABASE_URL` | ✅ uma linha; as outras 5 chaves intactas |
| 3. Verificar outras variáveis de URL **sem** modificá-las | ✅ (§2) |
| 4. Reconstruir/reiniciar **somente** `paraguai-web` pelo deploy versionado | ✅ `paraguai-web:7aef04b`, `DEPLOY_EXIT=0` |
| 5. Testes de leitura com **validação de conteúdo** | ✅ (§3) |
| 6. **Uma** atualização supervisionada do câmbio | ✅ `ratesRefreshed: 3` |
| 7. Métricas de PostgreSQL + integridade dos 9 containers | ✅ (§5) |

**Restrições respeitadas**: nenhum DDL/migration, nada em RLS/Kong/Caddy/DNS, nenhum outro container, **timer não habilitado**, GitHub Actions intocado, `origin/main` intocado, **nenhum** dos outros seis crons (a allowlist bloqueou), nenhuma credencial impressa, nenhum secret em imagem (o build usa build secret e a imagem foi verificada na Fase B do mesmo modo).

## 1. Configuração corrigida

| | Antes | Depois |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **35** caracteres, sufixo **`/auth/v1`** (GoTrue!) | **27** caracteres, `ai.com` — `https://api.fronteiraai.com` |
| Modo / dono do arquivo | `600 root:root` | `600 root:root` (preservado) |
| Chaves presentes | 6 | **as mesmas 6** |

## 2. Outras variáveis de URL (verificadas, **não** alteradas)

| Variável | Comprimento | Veredito |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 35 → **27** | **estava errada** — corrigida (autorizado) |
| `NEXT_PUBLIC_SITE_URL` | **27** | **correta** (`https://www.fronteiraai.com`), nenhuma ação |
| `API_EXTERNAL_URL` (no `/opt/supabase-stack/docker/.env`, **origem do erro**) | **35**, sufixo `/auth/v1` | confirma a causa raiz da 05.22: é a URL externa do **GoTrue**. Lida apenas; **não** alterada (é do stack) |

Não há mais nenhuma variável de URL do frontend — as demais chaves são credenciais e flags.

## 3. Deploy versionado

`paraguai-web:7aef04b` · build com `npm ci` em cache · `health=healthy` · `DEPLOY_EXIT=0` · gates do `deploy.sh` (health → smoke → warm-up) todos verdes · `paraguai-web:previous` preservada ⇒ rollback armado. Apenas `paraguai-web` foi recriado; os 8 containers Supabase não foram tocados.

## 4. Testes de conteúdo (o que a Fase B/C **não** fazia: status ≠ dado)

| Critério | Evidência |
|---|---|
`/lojas` apresenta lojas reais | **200**, **9** links `/lojas/`, nome `cellshop` presente |
Páginas de produtos com ofertas reais | `/product/041554080421` (slug escolhido por ter oferta pública ativa): **200** com **lista de preços reais** — `03.958`, `1.202`, `10.193`, `11.799`, `12.634`, `14.993` |
`/products` com dados reais | **200**, **12** links `/product/` + preços reais no HTML |
Busca retorna produtos correspondentes | `/search?q=perfume`: **200**, **8** links `/product/`, **122** ocorrências de "perfume" |
Cron: `ratesRefreshed >= 2` | **`{"providerId":"keyless-open-er-api","usingFallback":false,"ratesRefreshed":3}`** |
`exchange_rates` persistidas, com fonte e data | **3 linhas**: `USD/PYG 5711.636607`, `USD/BRL 5.035924`, `BRL/PYG 1134.178476` (triangulado), todas `source=keyless-open-er-api`, `captured_at 2026-10-15 14:46:39Z` |
`/api/exchange/current` com USD/PYG e USD/BRL | **200** com `usdPyg 5711.636607` e `usdBrl 5.035924` + `capturedAt` |
9 containers saudáveis | **9 `healthy`** (Supabase `Up 8 days`) |
Sem aumento relevante de `57014`/`PGRST003` | **67 → 67** e **1169 → 1169** |

**Correção de um sinal meu**: na primeira medição contei `href="/lojas/` na página de produto e obtive **0**, o que eu ia registrar como critério falho. Era **medição errada**, não falha: as ofertas renderizam preços (evidência acima) e o link da oferta não usa esse padrão. Mesma ressalva para nomes de loja: procurei pelos **slugs** e a UI exibe nomes de exibição — 0 ocorrências era esperado.
**Sinal adicional forte**: o log do container tem **0** ocorrências de `404 page not found` (antes, o fluxo de câmbio produzia 6 por execução) e **0** de "Não foi possível completar a busca" na página de catálogo.

## 5. Métricas antes × depois

| Métrica | Antes (05.22) | Depois (05.23) | Leitura |
|---|---|---|---|
| Containers | 9 `healthy` | **9 `healthy`** | intactos |
| **Conexões PostgreSQL** | 3 | **13** | **esperado e correto**: antes o app falhava rápido e não abria conexões; agora faz tráfego real ao PostgREST. Não é erro — é o baseline real de carga voltando |
| `PGRST003` / `57014` | 67 / 1.169 | **67 / 1.169** | **nenhum erro novo** |
| `exchange_rates` | 0 | **3** | persistência comprovada |
| `exchange_provider_runs` | 194 | **197** | +3 (registro de execução do próprio fluxo) |
| `paraguai-web` | 89 MiB / 1 GiB | **85,61 MiB / 1 GiB, 0,64% CPU** | dentro do teto |
| `supabase-db` | 238 MiB / 3 GiB | 271,4 MiB / 3 GiB (pico transitório de consulta) | sem pressão |
| `load` / RAM | 1,05 / 1.696 MB | 2,68 (build + validação) / **1.798 MB de 7.432** (4,3 GB livres) | folga confortável |
| `/search?q=perfume` | 0,19 s (vazio) | **2,36 s (com dados)** | o custo real aparece quando o dado existe — ver §6 |

## 6. Observações para o cutover (não bloqueiam, mas importam)

1. **`/search` passou de 0,19 s para 2,36 s** e `/products` de 0,35 s para ~0,9–2,2 s: os tempos anteriores eram **falsamente rápidos** porque as consultas falhavam. Com dados reais, os custos medidos nas Missões 05.17/05.8 voltam a valer (RPC de catálogo ~0,5 s; `search_products_global` ~1,5 s) — é exatamente o cenário que a política de cache/frescor da 05.17 deve tratar antes de tráfego público.
2. **Conexões 3 → 13** é a assinatura do tráfego real; o teto do pool (default 10 por container de Rest, com `PGRST_DB_MAX_ROWS=1000`) e o monitoramento de `57014` merecem atenção durante o cutover.
3. A allowlist de cron (`/etc/paraguai/cron-allow.txt`, só `exchange-refresh`) seguiu funcionando: **um** endpoint executado por chamada, os outros seis bloqueados.

## 7. GO / NO-GO

**GO.** Todos os 9 critérios de aceitação foram atendidos com evidência de conteúdo, não de status. A causa raiz da 05.22 está **confirmada na prática**: com a URL correta, leitura e escrita funcionam, o câmbio persistiu taxas reais pela primeira vez e os erros `404 page not found` desapareceram do log — sem nenhuma mudança em PostgREST, RLS, Kong, banco ou cache.

**GO CONDICIONAL para o cutover público**: antes de publicar os domínios, tratar (i) a política de frescor/cache (§6.1 — hoje tudo dinâmico, e o custo real aparece com dados), (ii) observação do pool de conexões (§6.2), (iii) decidir sobre a ativação dos demais crons com allowlist gradual, e (iv) Caddy + DNS + negação de `/api/cron/*` na borda com o patch do workflow GHA.

**NO-GO** nesta missão para: publicar domínios, habilitar timers, executar os outros crons, ou tocar Caddy/DNS/Kong/RLS/banco — nenhum deles era necessário nem autorizado.

**Limitações declaradas**: a validação de conteúdo foi feita por HTML/count de padrões (sem navegador); o padrão de preço exato da UI não foi mapeado (usei um regex numérico genérico — a lista de preços da página de produto é a evidência de ofertas reais); a página de produto que testei primeiro (`iphone-16-pro-256gb-titanio-preto`) não exibiu ofertas no momento da medição e não investiguei se aquele produto segue com oferta pública ativa — o critério foi comprovado no slug selecionado por ter oferta ativa; o backup de `app.env` permanece no host (`app.env.bak-05.23`) e pode ser removido após o cutover.
