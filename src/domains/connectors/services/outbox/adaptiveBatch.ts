// Mission Ω-Hardening. Pure — zero I/O, same discipline as backoff.ts.
//
// Scales the claim batch size with backlog pressure: a small backlog uses
// a small batch (avoid over-fetching when there's nothing to gain), a
// large backlog grows the batch toward maxBatch (drain faster) — but never
// beyond what recent throughput suggests can be usefully processed within
// one sweep call, and always clamped to [minBatch, maxBatch]. Never alters
// per-item processing semantics or idempotency — this function only
// decides HOW MANY rows claimBatch() asks for, never what happens to each
// claimed row (unchanged: claim → suggestMergesFor → done/retry/dead_letter).

// Sprint 15C (egress). `budgetMs` é OPCIONAL e ADITIVO: omitido, esta
// função é byte-idêntica à versão anterior — todo chamador de 4 argumentos
// (os testes desta função, qualquer uso fora do sweep) continua obtendo
// exatamente o mesmo número. Só quem informa o orçamento real muda de
// comportamento.
//
// Por que era necessário. Medido em simulação local (orçamento 45s, custo
// ~1,5s por item => capacidade ~30 itens): a versão anterior reivindicava
// 200 e processava 29 — 13,2% de eficiência. Duas causas somadas:
//
//   1. O alvo era "~1 minuto de trabalho", mas o orçamento real da rota é
//      ROUTE_TIME_BUDGET_MS = 45s. Dimensionar para 60s e parar aos 45s
//      garante sobra reivindicada e não processada.
//   2. Sem sinal de throughput, o fallback era `backlog/10` — com um
//      backlog de 7,7 mil isso dá 770, imediatamente truncado no teto de
//      200. E o sinal é estruturalmente ausente no PRIMEIRO sweep de cada
//      invocação: a janela de throughput é de 5 minutos e o cron roda a
//      cada 15, então nunca há conclusão recente para amostrar. O ramo
//      "cold start" não era exceção — era a regra, toda invocação.
//
// Cada linha reivindicada e não processada é uma linha lida do banco à toa
// (o claim faz `UPDATE ... select("*")`) e devolvida ao backlog depois,
// para ser reivindicada de novo no ciclo seguinte: trabalho repetido sem
// progresso. Reivindicar o que cabe no orçamento elimina esse desperdício
// SEM tocar em nada além da quantidade — o que acontece com cada item
// reivindicado (claim -> suggestMergesFor -> done/retry/dead_letter)
// continua idêntico, e o laço de até MAX_ITERATIONS da rota segue
// reivindicando de novo enquanto sobrar orçamento.
export function computeAdaptiveBatchSize(
  backlogRemaining: number,
  recentThroughputPerMinute: number,
  minBatch: number,
  maxBatch: number,
  budgetMs?: number
): number {
  if (backlogRemaining <= 0) return minBatch;

  // Com throughput conhecido: quantos itens cabem no orçamento REAL (ou em
  // ~1 minuto, quando nenhum orçamento é informado — comportamento antigo).
  // Sem throughput: `minBatch`, deliberadamente conservador. É melhor
  // reivindicar de menos e voltar a reivindicar na iteração seguinte (a
  // rota permite até MAX_ITERATIONS) do que reivindicar 200 às cegas e
  // travar a maioria em `processing`. A primeira iteração já produz
  // conclusões, então as seguintes passam a ter sinal e escalam sozinhas.
  const throughputTarget =
    recentThroughputPerMinute > 0
      ? Math.ceil(recentThroughputPerMinute * (budgetMs === undefined ? 1 : budgetMs / 60_000))
      : budgetMs === undefined
        ? Math.ceil(backlogRemaining / 10)
        : minBatch;

  const target = Math.min(backlogRemaining, throughputTarget);
  return Math.min(maxBatch, Math.max(minBatch, target));
}
