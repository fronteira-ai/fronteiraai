# MISSION 05.25 — KONG MEMORY & LOG STABILIZATION

**Categoria**: `docs/operations/`
**Branch**: `mission-05-25-kong-stabilization` (base `mission-05-24-public-cutover-safety-gates` @ `a98ae8f`)
**RESULTADO: ESTABILIZADO.** Kong saiu de **497,5 MiB / 512 MiB (97%)** para **233,2 MiB / 768 MiB (30%)** com **rotação de log verificada**; API e os 9 containers íntegros; nenhuma alteração de dado. Apenas o Kong foi tocado.

**Proibições respeitadas**: nada em PostgreSQL, PostgREST, Auth, Storage, frontend, outros containers, DDL, dados, secrets, DNS, Caddy, timers, GitHub Actions ou `origin/main`. Domínios não publicados; crons não habilitados.

---

## 1. Baseline

| Item | Valor |
|---|---|
| RAM do host | 1.743 MB usados · **5.206 MB disponíveis** de 7.432 |
| Disco | 26 GB de 91 GB (29%) |
| `supabase-kong` | **mem=496,1 MiB / 512 MiB** · cpu=1,78% |
| Demais (mem/limite) | `db` 234 MiB/3 GiB · `studio` 255,7/512 · `storage` 179,6/768 · `meta` 127,3/256 · `imgproxy` 90,2/256 · `rest` 79,9/512 · `auth` 14,3/384 · `paraguai-web` 89,7/1 GiB |
| API (referência) | `https://api.fronteiraai.com/rest/v1/` → **401** (sem chave = alcançável) · frontend→API `/api/exchange/current` → **200** |
| Somatório dos limites | 7,2 GB para 7.432 MB de RAM — mas o **uso real** é 1,74 GB ⇒ folga de 5,2 GB |

## 2. Memória real × cache (item 2) — o achado que confirma o gate

Lido direto do **cgroup** do container (`/sys/fs/cgroup/system.slice/docker-83e76eb7…`):

```
memory.current: 521.621.504   (497,5 MiB de 512 MiB de max)
  anon          492.470.272   ← 97% do total: memória REAL, não cache
  file           20.893.696   ← apenas 19,9 MiB de page cache
  inactive_file   1.404.928
  slab            6.378.960
memory.max:     536.870.912
```

**Interpretação**: o número do `docker stats` **não** era inflado por cache de arquivo — é memória anônima de verdade. O gate da Mission 05.24 (§1.1) estava **correto e era mais grave do que parecia**: o Kong estava a 2,5% de ser OOM-killado.

## 3. Origem e rotação dos logs (item 3)

| Container | Tamanho | Driver | Opções |
|---|---|---|---|
| **`supabase-kong`** | **4,3 GB** | json-file | **`map[]` — sem rotação** |
| `supabase-rest` | 1,5 M | json-file | `map[]` |
| `paraguai-web` | 4,0 K | json-file | `max-file:5 max-size:50m` ✅ |
| Total em `/var/lib/docker/containers` | **4,4 G** | | |

O arquivo de 4,3 GB **pertence ao Kong** e **não tinha política de rotação** — exatamente o alvo da missão. Crescimento medido agora: **0 bytes em 20 s** (o site está fora do ar), ou seja, os 4,3 GB são **acúmulo histórico** de 8 dias (~6 MB/min em média), não um pico ativo.

## 4. Novo limite calculado (item 4)

Consumo anônimo observado no pico: **~470 MiB**. Piso para margem de ~40%: **768 MiB** (o limite anterior era 512 MiB). Capacidade: +256 MiB leva o somatório dos limites a ~7,45 GB (≈ RAM total, que é *overcommit* normal — os picos não coincidem) enquanto o **uso real** iria de 1,74 GB para ~2,0 GB, com **5,2 GB livres** ⇒ **seguro**.

## 5. Correção aplicada (item 5) — mínima e aditiva

Arquivo novo, **aditivo**, em `/opt/supabase-stack/docker/docker-compose.kong-stab.yml`:

```yaml
services:
  kong:
    mem_limit: 768m
    logging:
      driver: json-file
      options:
        max-size: "50m"
        max-file: "5"
```

Aplicado com `docker compose -f docker-compose.yml -f docker-compose.kong-stab.yml up -d --no-deps kong` após `compose config --quiet` (exit 0). **`--no-deps` garante que nenhum outro serviço foi tocado**; recriação medida em **5 s**.
**Cross-check de integridade**: a cadeia `COMPOSE_FILE` do stack inclui `/opt/paraguai/infra/selfhosted/docker-compose.override.yml`; **verifiquei** (não presumi) que esse override declara **apenas `realtime` e `supavisor`** — **nada** para `kong` ⇒ usar uma cadeia `-f` mais estreita **não removeu nenhuma configuração do Kong**.
**Por que recriar foi indispensável**: as opções de `logging` são fixadas na **criação** do container — não há como alterá-las a quente. A memória poderia ser alterada a quente (`docker update`), mas como a recriação era inevitável para o log, as duas mudanças foram feitas na mesma operação (menos disrupção que duas).

## 6. Validação (itens 6–7)

| Critério | Resultado |
|---|---|
| Kong com margem adequada | **233,2 MiB / 768 MiB (30%)** · `limite=805306368` |
| `docker stats` antes → depois | 496,1 MiB/512 (**97%**) → **233,2 MiB/768 (30%)** |
| Rotação configurada e verificada | `log_opts=map[max-file:5 max-size:50m]` · log novo = **12 K** |
| Logs do Docker | **4,4 G → 49 M** (a recriação removeu o container antigo e seu log de 4,3 GB) |
| Disco | **26 GB → 22 GB (29% → 25%)** |
| API respondendo normalmente | `https://api.fronteiraai.com/rest/v1/` → **401** (idêntico ao baseline) · frontend→API → **200** · `/lojas` → **200** |
| Nove containers saudáveis | **9 `healthy`**, `supabase-kong Up 12 seconds (healthy)` (healthcheck `kong health` passou) |
| Sem novo erro relevante | `PGRST003` **67 → 67** · `57014` **1.169 → 1.169** |
| Sem alteração nos dados | `exchange_rates` = **3** (inalterado) |
| Outros serviços | nenhum reinício; os 8 demais seguem `Up 8 days` |

## 7. Achado que muda a leitura do risco

O Kong **não tinha pegada fixa de ~490 MB**: após a recriação, a instância nova usa **233 MiB** — ou seja, ~263 MiB eram **acúmulo ao longo de 8 dias de operação**. Consequências práticas:
1. O risco de OOM **volta a crescer com o tempo** ⇒ o novo limite de 768 MiB compra margem, mas **não** substitui monitoramento.
2. Recomendações (fora do escopo desta missão): monitorar a memória do Kong no `.timer` de healthcheck existente e, se o acúmulo se repetir, **reiniciar o Kong periodicamente** (janela de segundos) ou investigar a origem — nenhuma mudança de configuração do stack é necessária para o reinício.
3. A rotação de log passa a valer **daqui para frente** (o json-file rotaciona ao atingir 50 MB, mantendo ≤ 5 arquivos) ⇒ o padrão que produziu 4,3 GB está eliminado.

## 8. Rollback

| Cenário | Ação |
|---|---|
| Regressão de memória após o novo limite | `docker update --memory 512m --memory-swap 512m supabase-kong` (a quente, sem recriar) |
| Reverter tudo (limite + rotação) | remover `/opt/supabase-stack/docker/docker-compose.kong-stab.yml` e `docker compose -f docker-compose.yml -f docker-compose.kong-stab.yml up -d --no-deps kong` (**~5 s**, sem tocar outros serviços) |
| Indisponibilidade durante a recriação | já ocorreu (5 s) e foi tolerada: `api.fronteiraai.com` respondeu normalmente antes e depois |
| Log de 4,3 GB | já eliminado pela remoção do container antigo — reversão **não** o traz de volta (não é desejável) |

## 9. GO / NO-GO

**GO** — todos os critérios de aprovação atendidos: Kong saudável com margem (30% do limite), rotação de logs configurada e verificada, API respondendo normalmente, 9 containers saudáveis, nenhum erro novo (`PGRST003`/`57014` inalterados) e **nenhuma alteração nos dados**. O gate de capacidade que bloqueava o cutover na Mission 05.24 está **resolvido**.

**Para o cutover continuam pendentes** (fora desta missão): habilitar o timer do câmbio com allowlist só de `exchange-refresh` (pré-requisito da 05.24 §4) e a etapa de Caddy + Cloudflare com verificação de conteúdo. **NO-GO** nesta missão para publicar domínios, habilitar crons/timers ou tocar qualquer outro serviço.

**Limitações declaradas**: a RAM do host não foi remedida após a mudança (o ganho está demonstrado no cgroup do Kong: −263 MiB); o crescimento de 0 bytes/20 s é uma amostra curta durante a janela sem tráfego público; não investiguei a **causa** do acúmulo de 263 MiB em 8 dias (apenas o efeito) — fica como recomendação de monitoramento.
