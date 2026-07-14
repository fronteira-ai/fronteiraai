# EXCHANGE_DOMAIN_ARCHITECTURE.md
# PROGRAM ΔR — Mission ΔR-1 — Real Time Exchange Audit

**Categoria**: `docs/architecture/`
**Data**: 2026-07-14
**Natureza**: auditoria + arquitetura — nenhum código, migration ou commit. Toda evidência citada foi verificada diretamente no código-fonte e configuração atuais (`src/domains/exchange/**`, `lib/exchange-factory.ts`, `vercel.json`, `.env.local`/`.env.example`).

---

## 1. Inventário completo do domínio Exchange (Objetivo 1)

O domínio já existe, de forma madura, desde o Release 1.8 (ADR-043). Não é greenfield.

| Camada | Arquivo | Responsabilidade |
|---|---|---|
| Provider | `providers/IExchangeRateProvider.ts`, `ExchangeRateApiProvider.ts`, `ExchangeProviderRegistry.ts`, `bootstrap.ts` | Um provedor registrado hoje (ExchangeRate-API.com), registro N-provider-capaz por construção (mesma forma de `ConnectorRegistry`) |
| Cache | `cache/ExchangeRateCache.ts` | TTL de 60s, em memória, por processo — limitação documentada (não compartilhada entre instâncias serverless), aceita conscientemente |
| Repositórios | `infrastructure/SupabaseExchangeRateRepository/ProviderRunRepository/ConversionLogRepository.ts` | `exchange_rates` (append-only), `exchange_provider_runs`, `exchange_conversion_log` |
| **`ExchangeRateService`** | `services/ExchangeRateService.ts` | Failover real entre provedores, triangulação BRL/PYG a partir de USD, degradação honesta a "último valor conhecido" (`usingFallback`), nunca fabrica um valor |
| **`ExchangeHistoryService`** | `history/ExchangeHistoryService.ts` | Leitura histórica (`getLatest`/`getRateAt`/`getRange`) — já usada por Purchase Timing (EI-3) |
| **`AutomaticCurrencyService`** | `services/AutomaticCurrencyService.ts` | **Já é** o conversor USD↔BRL↔PYG com cotação, timestamp e flag de fallback — exatamente o contrato que a Universal Price Presentation precisa (ver §3/§9) |
| `ExchangeProviderHealthService` | `services/ExchangeProviderHealthService.ts` | healthScore/uptime por provedor a partir do histórico de execuções |
| `ExchangeAnalyticsService` | `analytics/ExchangeAnalyticsService.ts` | Analytics de impacto de câmbio no catálogo/lojas — voltado a merchant/ops, não a apresentação de preço ao comprador |
| `ExchangeDashboardService` | `dashboard/ExchangeDashboardService.ts` | Composer do `/admin/exchange`, mesmo padrão `Promise.allSettled` já usado em todo o projeto |
| API | `app/api/exchange/{convert,current,health,history,providers}`, `app/api/cron/exchange/refresh`, `app/api/admin/exchange/*` | Superfície completa já exposta |

**Onde é usado hoje (buyer-facing)**: apenas dois lugares — `CambioCard.tsx` (Home, ticker cru) e `BestDealCard.tsx`'s badge de câmbio (Product/Compare, via `BestDealComposer.exchangeContext`), mais uma influência indireta no veredito do Purchase Timing (`exchangeTrend`, EI-3). **`AutomaticCurrencyService` — o serviço que já converte USD→BRL com cotação e timestamp — não tem nenhum consumidor de UI real hoje**, confirmado por grep: apenas sua própria rota de API e um uso não relacionado em `connector-certification-service.ts`.

### Achado crítico: o sistema nunca rodou de verdade em produção

Dois problemas operacionais, não de código:
1. **`EXCHANGE_RATE_API_KEY` nunca foi configurada** — existe vazia em `.env.example`, ausente em `.env.local`. Toda chamada ao único provedor registrado lança erro.
2. **`/api/cron/exchange/refresh` não está registrado em `vercel.json`** — os únicos crons ativos são `connectors/sync` (diário) e `marketplace-operations/snapshot` (diário). O cron de câmbio existe, está documentado para rodar a cada 5 minutos, mas **nunca foi agendado**.

Combinado, isso significa que `exchange_rates` provavelmente nunca foi populada por um refresh real, e todo consumidor de câmbio hoje está permanentemente no caminho de fallback/ausência — não uma falha rara, o estado padrão.

**Achado secundário**: `ExchangeProviderHealthService.buildProviderHealthSnapshot` retorna `status: Healthy, healthScore: 100` quando não há nenhuma execução registrada (`runs.length === 0`). Com o cron nunca tendo rodado, o dashboard admin mostraria "saudável" para um provedor que nunca foi sequer chamado — um falso positivo que esconde exatamente o problema acima. Deveria default para um estado `Unknown`/"sem dados", nunca `Healthy`.

## 2. Auditoria das telas (Objetivo 2)

| Tela | Câmbio aparece hoje? | Como |
|---|---|---|
| Home | Sim | `CambioCard` (ticker USD/BRL e USD/PYG cru, sem contexto de compra) |
| Busca | Não | — |
| Produto | Sim (parcial) | `BestDealCard`'s badge "🌎 Câmbio USD/BRL X.XX", sempre em USD como preço principal |
| Comparação | Sim (parcial) | Mesmo `BestDealCard` reaproveitado |
| Advisor | Não diretamente | Cita "timing" que internamente pode refletir tendência de câmbio (EI-3), mas nunca mostra o valor em BRL |
| Achado do Dia | **Não** | Mostra apenas USD — o card de maior intenção de conversão da Home não mostra BRL |
| Dashboard (admin) | Sim | `ExchangeDashboardService`, completo |
| Favoritos | N/A | Favoritos ainda é 100% `localStorage`, sem exibição de preço própria |
| Alertas | N/A | Não existe experiência de alertas para o comprador ainda |
| Histórico | Parcial | `ExchangeHistoryService` existe e é usado (Purchase Timing), mas não há uma tela de histórico de câmbio para o comprador |
| Buyer Decision | N/A | EI-6 ("Buyer Decision Center") nunca foi formalmente escopado |
| IA (AIShowcase) | Não | — |

**Conclusão**: câmbio aparece de forma fragmentada e sempre em USD como moeda principal, exceto no ticker cru da Home. Não existe hoje nenhuma tela onde um comprador veja preço + BRL + cotação + timestamp + economia em ambas as moedas juntos.

## 3. Universal Price Presentation (Objetivo 3)

Contrato único, obrigatório para qualquer tela que mostre preço:

```
UniversalPrice {
  amountUSD: number
  amountBRL: number | null      // null quando não há cotação — nunca fabricado
  rate: {
    value: number
    pair: CurrencyPair
    source: string              // já existe em ConvertedPrice.rateVersion
    capturedAt: string
  } | null
  isStale: boolean               // já existe como AutomaticCurrencyService.usingFallback
  presentedAt: string            // já existe como conversionDate
}

UniversalSavings {
  amountUSD: number
  amountBRL: number | null
  percent: number
}
```

Regra definitiva: **toda tela usa exatamente este objeto, produzido por exatamente um serviço** (§9) — nunca uma tela formata `US$ X` e outra formata `US$ X (R$ Y)` com sua própria lógica de arredondamento ou sua própria checagem de "cotação existe?". Hoje cada componente (`CambioCard`, `BestDealCard`, `AchadoDoDia`) faz seu próprio `.toFixed(2)` e sua própria checagem de nulidade — exatamente o tipo de inconsistência que este contrato elimina.

## 4. Exchange Domain definitivo (Objetivo 4)

**Reaproveitado integralmente, sem alteração**: `ExchangeRateService`, `ExchangeHistoryService`, `AutomaticCurrencyService`, `ExchangeRateCache`, `ExchangeProviderRegistry`/`bootstrap`, todos os repositórios, `ExchangeAnalyticsService`, `ExchangeDashboardService`.

**A ser criado** (desenho, não implementação): `PricePresentationService`, um composer fino dentro do próprio domínio `exchange` (não em `buyer-intelligence` — apresentar preço é uma responsabilidade do domínio que já possui a cotação, não uma nova composição de inteligência de comprador). Única responsabilidade: chamar `AutomaticCurrencyService.convert()` e devolver `UniversalPrice`/`UniversalSavings` já arredondados e já checados quanto a nulidade/staleness — nenhuma lógica nova de câmbio, apenas empacotamento.

**Corrigido, não criado**: o default de `ExchangeProviderHealthService` para "sem execuções" (Achado do Objetivo 1) — de `Healthy` para um novo estado `Unknown` em `ProviderStatus`.

## 5. Auditoria de provedores (Objetivo 5)

| Provedor | PYG? | Custo | Limites | Estabilidade | Integração |
|---|---|---|---|---|---|
| **ExchangeRate-API.com** (atual) | Sim, direto | Business plan (~US$10-15/mês) | 125k req/mês | Boa, já integrado e testado (ADR-043) | Já pronto |
| **Open Exchange Rates** | Sim | Gratuito (1k req/mês) a pago | Baixo no plano free | Alta, referência de mercado | Fácil, API bem documentada |
| **AwesomeAPI** | Parcial (foco BRL, cobertura PYG não garantida) | Gratuito | Sem SLA formal | Variável, mantida pela comunidade brasileira | Simples, mas sem contrato de suporte |
| **Banco Central (PTAX)** | **Não** | Gratuito | Sem limite prático | Altíssima (fonte oficial) | Só serve como âncora/reconciliação do câmbio BRL, nunca como fonte de PYG |
| **Frankfurter (ECB)** | **Não** | Gratuito | Sem limite prático | Alta | Não cobre PYG — referência apenas para moedas maiores |
| **ExchangeRate.host** | Depende do plano | Passou a exigir chave paga | Variável | Média | Redundante com ExchangeRate-API.com, sem vantagem clara |

**Achado importante**: PYG (Guarani) é uma moeda de cobertura rara. Banco Central e Frankfurter — ambos gratuitos e de altíssima confiabilidade — **não servem como fonte primária** porque nenhum dos dois cotaciona PYG. Eles só têm valor como **reconciliação da perna BRL** (comparar o BRL do provedor primário contra a PTAX oficial, nunca como fonte de verdade para PYG).

**Arquitetura de failover recomendada** (usando o registro N-provider já pronto):
1. **Primário**: ExchangeRate-API.com (já integrado, cobre USD/PYG e USD/BRL num único request).
2. **Secundário**: Open Exchange Rates (mesma cobertura, provedor independente — falha correlacionada entre os dois é improvável).
3. **Reconciliação (não fallback)**: Banco Central PTAX comparado contra a perna BRL do provedor ativo — um alerta, não uma terceira fonte de dado servido ao usuário.
4. **Última linha**: o `degradeToLastKnownGood()` já existente — nunca fabricar, sempre servir o último valor real conhecido, sinalizado como `isStale`.

## 6. Estratégia de atualização (Objetivo 6)

**Manter os 5 minutos já decididos em ADR-043** — a um request por ciclo, isso é ~8.640 req/mês, uma fração pequena do limite de 125k do plano já contratado, deixando folga ampla para o provedor secundário e para picos de retry. Câmbio para consultoria de compra (não day-trading) não precisa de granularidade de minuto a minuto — 5 minutos já é mais frequente do que qualquer concorrente de comparação de preços no mercado.

- **Cache**: manter TTL de 60s (já menor que o ciclo de refresh, evitando releitura do banco a cada request sem re-buscar o provedor a cada minuto).
- **Invalidação**: já correta — `cache.set()` a cada inserção bem-sucedida; nenhuma invalidação manual é necessária.
- **Evitar chamadas desnecessárias**: já correto — um único request por provedor retorna PYG e BRL simultaneamente (nunca duas chamadas separadas).

## 7. Estratégia de falhas (Objetivo 7)

| Cenário | Comportamento já projetado | O que falta |
|---|---|---|
| Provedor cai | `ExchangeRateService.refresh()` tenta o próximo da fila (registro ordenado por prioridade) | Precisa de um segundo provedor de fato registrado — hoje só há um, então "failover" ainda não tem para onde falhar |
| Internet/rede falha | `degradeToLastKnownGood()` — serve o último valor real do banco, nunca fabrica | — |
| Rate limit esgotado | Provider lança erro, tratado como qualquer outra falha (fallback) | Nenhum circuit-breaker hoje — recomendação: parar de tentar um provedor que já retornou 429 recentemente, não apenas confiar na ordem de prioridade |
| Resposta lenta | Sem timeout explícito no HTTP client hoje | Recomendação: definir um timeout curto (ex.: 5s) — uma resposta lenta não deve atrasar o cron além do necessário |
| Ninguém nota a falha | `ExchangeProviderHealthService` mostra "Healthy" quando não há execuções (achado do Objetivo 1) | Corrigir o default e adicionar um alerta ativo quando `usingFallback` persistir por mais de N ciclos seguidos |

**O ParaguAI nunca esconde essa degradação**: `usingFallback`/`isStale` já são campos de primeira classe em `RefreshResult` e `ConvertedPrice` — a Universal Price Presentation (§3) exige que toda tela repasse esse sinal ao comprador, nunca apresente um valor de câmbio sem indicar quando ele está desatualizado.

## 8. Integração com o Opportunity Engine (Objetivo 8)

Nenhuma arquitetura de EI-2 a EI-6.5 é alterada. O câmbio entra apenas na camada de **apresentação**, nunca na de decisão:

- **Achado do Dia / Economia**: `OpportunityEngine` continua ranqueando inteiramente em USD (nenhuma mudança); ao renderizar, a página chama `PricePresentationService` para anexar `amountBRL`/`rate` ao `Opportunity` já decidido.
- **Advisor**: `ParaguAIAdvisorComposer` continua recebendo `BestDealResult`/`PurchaseTimingResult`/`TrustCardResult` sem alteração; o componente `ParaguAIAdvisor` opcionalmente exibe o valor em BRL ao lado do já existente `savingsUSD`.
- **Best Deal**: `BestDealComposer.exchangeContext` já existe — passa a ser produzido via `PricePresentationService` em vez de montado ad hoc no composer.
- **Purchase Timing**: `exchangeTrend` (favorable/unfavorable/stable) já é uma comparação categórica, não um valor de exibição — nenhuma mudança.
- **Comparação**: os cards de oferta ganham o valor em BRL como informação adicional, nunca substituindo o USD como referência principal do ranking.

## 9. Integração com Program ΔR-1.1 — Universal Price Presentation (Objetivo 9)

| Pergunta | Responsável |
|---|---|
| Quem converte USD → BRL? | `AutomaticCurrencyService.convert()` — já existe, reaproveitado sem alteração |
| Quem arredonda? | `PricePresentationService` (novo, design apenas) — uma única regra de arredondamento (2 casas decimais, padrão já usado em toda a UI) centralizada aqui, nunca em cada componente |
| Quem fornece o timestamp? | `AutomaticCurrencyService.convert()`'s `conversionDate` — já existe |
| Quem fornece a cotação? | `ExchangeRateService.getCurrentRate()`, chamado internamente pelo `convert()` — já existe |
| Quem produz o objeto final consumido pela UI? | `PricePresentationService` — o único seam entre o domínio Exchange e qualquer tela |

## 10. Roadmap (Objetivo 10)

- **Fase 1 — Arquitetura**: esta missão. Concluída.
- **Fase 2 — Implementação**: configurar `EXCHANGE_RATE_API_KEY`; registrar `/api/cron/exchange/refresh` em `vercel.json`; corrigir o default "Healthy" do health service para "Unknown"; implementar `PricePresentationService`/`UniversalPrice`/`UniversalSavings`; registrar um segundo provedor real (Open Exchange Rates) para failover de verdade.
- **Fase 3 — Integração**: conectar `PricePresentationService` a Achado do Dia, Best Deal, Advisor, Comparação, Busca (badge compacto) e substituir a formatação ad hoc do `CambioCard` pelo serviço compartilhado.
- **Fase 4 — Validação**: verificação ao vivo com o provedor real; simular queda do provedor primário e confirmar failover real (hoje intestável — só há um provedor); confirmar consistência de arredondamento entre todas as telas; confirmar que o health service não mostra mais falso-positivo.
- **Fase 5 — Rollout**: ativar o cron em produção; observar o dashboard de saúde do provedor por uma semana antes de expandir; ligar a exibição de BRL tela por tela (Home → Produto → Comparação → Busca → Achado do Dia), na mesma disciplina de governança de um-componente-por-vez já usada neste projeto.
