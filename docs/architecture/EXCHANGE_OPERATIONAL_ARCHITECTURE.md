# EXCHANGE_OPERATIONAL_ARCHITECTURE.md
# PROGRAM ΔR — Mission ΔR-1.1 — Exchange Activation

**Categoria**: `docs/architecture/`
**Data**: 2026-07-14
**Natureza**: este documento **substitui** o fluxo operacional narrado em `EXCHANGE_DOMAIN_ARCHITECTURE.md` (Mission ΔR-1) como a referência definitiva — aquele documento permanece válido para a arquitetura de domínio e a comparação de provedores, mas o diagrama de fluxo abaixo é agora a fonte única da verdade sobre como o sistema realmente opera.

---

## 1. Fluxo operacional definitivo (Objetivo 9)

```
Vercel Cron ("*/5 * * * *", vercel.json)
        │  [BLOQUEADO NO PLANO ATUAL — ver §4]
        ▼
GET /api/cron/exchange/refresh  (requireCronSecret)
        │
        ▼
ExchangeRateService.refresh()
        │
        ├─→ ExchangeProviderRegistry.list()  [ordenado por prioridade]
        │        │
        │        ├─ 1. ExchangeRateApiProvider ──(falha? tenta o próximo)──┐
        │        └─ 2. OpenExchangeRatesProvider ─(falha? não há mais)────┤
        │                                                                  │
        │        Cada tentativa grava um IExchangeProviderRunRepository row│
        │        (sucesso ou falha, com responseTimeMs)                    │
        │                                                                  ▼
        │                                                    Todos falharam?
        │                                                          │
        │              não ──► persistAndTriangulate() ──► ExchangeRateCache.set()
        │              sim ──► degradeToLastKnownGood() ──► exchange_rates.getLatest()
        ▼
RefreshResult { rates, usingFallback, providerId }
        │
        ├─→ ExchangeProviderHealthService.getSnapshots()  ──► ProviderStatus (NeverStarted/Healthy/Degraded/Down)
        ├─→ SystemExchangeStatusService.compute(...)      ──► SystemExchangeStatus (NeverStarted/Initializing/Healthy/Degraded/UsingCachedRate/Offline)
        │
        ▼
AutomaticCurrencyService.convert()  [único ponto de conversão USD↔BRL↔PYG]
        │
        ▼
PricePresentationService (Program ΔR-1.2 — ainda não construído)
        │
        ▼
Opportunity Engine → Advisor → Search → Product → Comparison → Home
        (nenhum destes é alterado por esta missão — recebem o valor em BRL
         apenas na camada de apresentação, quando ΔR-1.2 existir)
```

## 2. O que foi ativado nesta missão (código)

| Item | Antes | Depois |
|---|---|---|
| Segundo provedor de câmbio | Nenhum — só `exchangerate-api` | `OpenExchangeRatesProvider` registrado, prioridade 2 |
| `ExchangeProviderHealthService` com 0 execuções | Retornava `Healthy`, 100/100 (falso positivo) | Retorna `NeverStarted`, 0/0 |
| Status de sistema (visão agregada) | Não existia | `SystemExchangeStatusService.computeSystemExchangeStatus`, 6 estados objetivos |
| Cron de câmbio | Não registrado em `vercel.json` | Registrado (`*/5 * * * *`) — ver limitação de plano abaixo |
| Observabilidade da rota de cron | Silenciosa em caso de sucesso/falha do refresh principal | `console.log`/`console.error` explícitos a cada execução |
| Documentação de variáveis de ambiente | Uma linha vazia sem contexto de risco | Comentário explicando a consequência exata de cada chave ausente |

## 3. Estados do ProviderStatus (Objetivo 5) — condição objetiva de cada um

| Estado | Condição |
|---|---|
| `NeverStarted` | Zero execuções registradas para este provedor, jamais |
| `Healthy` | `healthScore ≥ 80` (uptime e taxa de sucesso recentes, com pelo menos 1 execução) |
| `Degraded` | `40 ≤ healthScore < 80` |
| `Down` | `healthScore < 40` — inclui o caso de a última execução ter falhado |

## 4. Achado bloqueante: o plano Vercel atual não suporta o intervalo de 5 minutos

Ao inspecionar `.env.local` para confirmar a configuração local, identifiquei evidência de que o projeto Vercel está no **plano Hobby**. Vercel Cron Jobs no plano Hobby só executam **no máximo uma vez por dia** — `"*/5 * * * *"` não roda a cada 5 minutos nesse plano; a Vercel aceita o arquivo, mas a execução real fica restrita à cadência do plano.

**Isto significa que a Fase 5 (Rollout) de `EXCHANGE_DOMAIN_ARCHITECTURE.md` está bloqueada até uma destas ações**:
1. Fazer upgrade do projeto Vercel para o plano Pro (permite cron mais frequente), ou
2. Usar um agendador externo (ex.: um workflow do GitHub Actions rodando a cada 5 minutos) chamando `GET /api/cron/exchange/refresh` com o mesmo `Authorization: Bearer $CRON_SECRET` — a rota não se importa com quem a chama, apenas com o segredo. Nenhuma mudança de código seria necessária para essa alternativa.

`vercel.json` foi atualizado mantendo `*/5 * * * *` como documentação da cadência pretendida (ADR-043) — não como uma promessa de que ela roda assim hoje.

## 5. Achado bloqueante: nenhuma chave de API real foi configurada

Nem `EXCHANGE_RATE_API_KEY` nem `OPEN_EXCHANGE_RATES_APP_ID` têm um valor real. Confirmado ao vivo: uma chamada real a `/api/cron/exchange/refresh` retornou `providerId: null, usingFallback: true, ratesRefreshed: 0` — ambos os provedores tentados e falhos, exatamente como o novo `ProviderStatus.Down` agora reporta corretamente (antes desta missão, o mesmo cenário seria mascarado como "Healthy"). Obter essas duas chaves é uma ação externa (cadastro/pagamento em cada provedor) que não pode ser feita por código.
