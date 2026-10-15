# MISSION 05.26 — EXCHANGE CRON ACTIVATION

**Categoria**: `docs/operations/`
**Branch**: `mission-05-26-exchange-cron-activation` (base `mission-05-25-kong-stabilization` @ `1457a80`)
**RESULTADO: ATIVAÇÃO BEM-SUCEDIDA — execução automática real comprovada no journal, taxas renovadas e 8/8 critérios de aprovação atendidos.**
**Proibições respeitadas**: nenhum DDL/migration, nada em outros containers, DNS, Caddy, Kong, PostgREST, RLS, secrets; sem deploy, merge ou mudança no GitHub Actions; **nenhum** dos outros seis crons executado. Domínios não publicados.

---

## 1. Pré-condições verificadas

| Item | Resultado |
|---|---|
| `/etc/paraguai/cron-allow.txt` | **exclusivamente `exchange-refresh`** (`root:root 0644`, 17 bytes) ✅ |
| Timer **antes** | `active=inactive`, `enabled=disabled`, **0** timers `paraguai-crons` agendados |
| **GHA não consegue executar (item 3)** | `api.fronteiraai.com/api/cron/exchange/refresh` → **401** (Kong/PostgREST, **não** chega ao frontend) · `www.fronteiraai.com/api/cron/exchange/refresh` → **402** (Vercel suspensa) ⇒ o workflow não tem caminho até o app neste ambiente ✅ |
| Config do timer | `OnCalendar=*:0/5`, `AccuracySec=30s`, `Unit=paraguai-crons.service` |
| Config do unit | `Type=oneshot` (**sem `RemainAfterExit`** ⇒ o systemd recusa execução sobreposta), `User=root`, `ExecStart=… run-crons.sh due`, `TimeoutStartSec=300` |
| Anti-simultaneidade adicional | `flock -n` presente no script (1 ocorrência) ✅ |
| Taxas antes | 3 linhas, com **idade de 04:47:23** (o timer estava desabilitado desde a Fase C) |

## 2. Ativação (item 5) — somente o timer

```
systemctl enable --now paraguai-crons.timer
Created symlink /etc/systemd/system/timers.target.wants/paraguai-crons.timer → /etc/systemd/system/paraguai-crons.timer
NEXT: Thu 2026-10-15 19:35:00 UTC (55s left)
```

Os seis crons restantes continuam **bloqueados pela allowlist** — nada foi adicionado ao arquivo.

## 3. Execução AUTOMÁTICA real, no journal (item 6) ✅

```
Oct 15 19:35:05 fluence systemd[1]: Starting ParaguAI — crons do frontend (self-hosted)...
Oct 15 19:35:05 fluence run-crons.sh[1510185]: 2026-10-15T19:35:05Z exchange-refresh   http=200
Oct 15 19:35:05 fluence systemd[1]: paraguai-crons.service: Deactivated successfully.
Oct 15 19:35:05 fluence systemd[1]: Finished ParaguAI — crons do frontend (self-hosted).
```

Disparo **pelo timer** (não por comando manual), `http=200`, e **um único** `Starting`/`Finished` ⇒ **nenhuma execução duplicada**. No minuto :35 apenas `exchange-refresh` estava vencido (`35 % 5 = 0`; `35 % 15 = 5`); os seis demais continuam barrados pela allowlist, cujo bloqueio *fail-closed* já foi comprovado em duas ocasiões na Fase C (`SKIP` antes da allowlist existir e 1 endpoint + 6 `SKIP` na execução `all`).

## 4. Taxas persistidas (item 7) ✅

| Par | Taxa | Fonte | `captured_at` | Idade |
|---|---|---|---|---|
| `USD/PYG` | 5711,636607 | `keyless-open-er-api` | 19:35:05.634 | **00:00:29** |
| `USD/BRL` | 5,035924 | `keyless-open-er-api` | 19:35:05.654 | **00:00:29** |
| `BRL/PYG` | 1134,178476 | `keyless-open-er-api` | 19:35:05.672 | **00:00:29** |

- `exchange_rates`: **3 → 6** linhas (a geração anterior, de 14:46, é **preservada** — o histórico se acumula por desenho, sem sobrescrita) · `exchange_provider_runs` 197 → **200** (+3 = uma execução).
- `/api/exchange/current` → **200** com `capturedAt 2026-10-15T19:35:05Z` (**timestamp recente**, critério atendido).
- Valores idênticos aos anteriores porque o provedor keyless não mudou de cotação na janela — coerente, não suspeito.

## 5. Métricas e integridade (item 8)

| Métrica | Antes | Depois |
|---|---|---|
| Containers | 9 `healthy` | **9 `healthy`** (kong Up 4 h; paraguai-web Up 5 h) |
| `PGRST003` / `57014` | 67 / 1.169 | **67 / 1.169** (nenhum erro novo) |
| Conexões PostgreSQL | 3 | **4** |
| **Kong — memória** | 496 MiB / 512 (**97%**, antes da 05.25) | **356 MiB / 768 (46%)** · cpu 1,18% |
| `paraguai-web` | 73,57 MiB / 1 GiB · 0,03% CPU | idem |
| RAM do host | 1,743 MB usados | **1,590 MB usados · 5.358 disponíveis** |
| `load` | 0,79 | 0,79 |

**Observação honesta sobre o Kong**: 4 horas após a recriação da 05.25 (que o deixou em 233 MiB) ele está em **356 MiB** — o acúmulo apontado naquela missão é **real e mensurável** (~30 MiB/h nesta janela). Ainda há **54% de margem** no novo limite, mas isso **reforça** a recomendação de monitorar e, se a tendência se mantiver, reiniciar o Kong periodicamente antes de tráfego real.

## 6. Rollback

`sudo systemctl disable --now paraguai-crons.timer` — o agendamento para imediatamente e a idade das taxas volta a crescer (estado anterior a esta missão). Para bloquear também a execução manual, remover `exchange-refresh` de `/etc/paraguai/cron-allow.txt`. Nenhuma dessas ações toca dados, containers ou o stack. **Não foi necessário reverter**: nenhum critério falhou.

## 7. GO / NO-GO para publicação

**GO** — os 8 critérios de aprovação foram atendidos: timer **ativo e habilitado**; **apenas `exchange-refresh`** executado; **atualização automática comprovada no journal** (disparo pelo timer, `http=200`); **três taxas válidas e recentes** (29 s) persistidas com fonte e timestamp, e `/api/exchange/current` com valor recente; **nenhuma execução duplicada**; **9 containers saudáveis**; `PGRST003`/`57014` **inalterados**; Kong com **46%** do limite (margem segura).

Com isto, o pré-requisito da Mission 05.24 §4 (“habilitar o timer de câmbio é pré-requisito de publicação”) está **cumprido**, e o gate de capacidade da 05.24 foi resolvido na 05.25. **Resta para o cutover** apenas a etapa pública: Caddy + Cloudflare com negação de `/api/cron/*` na borda, verificação de conteúdo e, no mesmo commit do merge, a desativação do `schedule:` do workflow GHA.

**NO-GO** nesta missão para publicar domínios, habilitar os outros seis crons, ou tocar Caddy/DNS/Kong/PostgREST/RLS/banco/secrets — nenhum era necessário nem autorizado.

**Limitações declaradas**: observei **uma** execução automática (a primeira após habilitar); a repetição a cada 5 min é esperada e o `Type=oneshot` + `flock` são as garantias estruturais — não acompanhei múltiplos ciclos; no minuto observado (:35) os seis crons bloqueados não estavam vencidos, de modo que a evidência de `SKIP` neste disparo específico não aparece (o bloqueio já foi provado na Fase C); a tendência de memória do Kong é uma amostra de 4 h.
