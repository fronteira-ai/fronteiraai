import { CanonicalSuggestionSweepService } from "../services/CanonicalSuggestionSweepService";
import { computeAdaptiveBatchSize } from "../services/outbox/adaptiveBatch";
import { MAX_ATTEMPTS } from "../services/outbox/backoff";
import type { ICanonicalSuggestionOutboxRepository } from "../repositories/ICanonicalSuggestionOutboxRepository";
import type { CanonicalSuggestionOutboxEntry } from "../domain/CanonicalSuggestionOutboxEntry";
import type { CanonicalMergeSuggestionService } from "@/src/domains/product-identity";

// Sprint 15C (egress) — o claim passou a respeitar o orçamento de tempo real
// do worker.
//
// O defeito, medido em simulação local (orçamento 45s, ~1,5s por item =>
// capacidade ~30): reivindicava 200 e processava 29 — 13,2% de eficiência, e
// os ~170 restantes ficavam presos em `processing` até expirar a janela de
// staleness, para serem reivindicados de novo no ciclo seguinte. Trabalho
// repetido, sem progresso.
//
// Estes testes fixam as duas metades da correção: o claim dimensionado pelo
// orçamento, e o fato de que NENHUMA garantia de entrega mudou junto.

function makeEntry(overrides: Partial<CanonicalSuggestionOutboxEntry> = {}): CanonicalSuggestionOutboxEntry {
  return {
    id: "entry-1",
    canonicalProductId: "canonical-1",
    status: "processing",
    priority: "normal",
    attempts: 0,
    lastError: null,
    lastAttemptedAt: null,
    nextAttemptAt: "2026-07-24T00:00:00Z",
    claimedAt: "2026-07-24T00:00:00Z",
    algorithmVersion: null,
    source: "test:batch-1",
    enqueuedAt: "2026-07-24T00:00:00Z",
    completedAt: null,
    createdAt: "2026-07-24T00:00:00Z",
    ...overrides,
  };
}

/** Amostras de conclusão com duração média `itemMs`. */
function samplesOf(itemMs: number, n = 3) {
  return Array.from({ length: n }, (_, i) => ({
    claimedAt: new Date(1_000_000 + i * itemMs).toISOString(),
    completedAt: new Date(1_000_000 + (i + 1) * itemMs).toISOString(),
  }));
}

function makeOutboxRepo(overrides: Partial<ICanonicalSuggestionOutboxRepository> = {}): ICanonicalSuggestionOutboxRepository {
  return {
    enqueue: jest.fn().mockResolvedValue(undefined),
    claimBatch: jest.fn().mockResolvedValue([]),
    markDone: jest.fn().mockResolvedValue(undefined),
    markFailedForRetry: jest.fn().mockResolvedValue(undefined),
    markDeadLetter: jest.fn().mockResolvedValue(undefined),
    countByStatus: jest.fn().mockResolvedValue({ pending: 7700, processing: 0, done: 0, failed: 0, dead_letter: 0, expired: 0 }),
    oldestPendingNextAttemptAt: jest.fn().mockResolvedValue(null),
    countRetrying: jest.fn().mockResolvedValue(0),
    averageAttempts: jest.fn().mockResolvedValue(0),
    recentCompletionSamples: jest.fn().mockResolvedValue([]),
    countCompletedSince: jest.fn().mockResolvedValue({ done: 0, deadLetter: 0, expired: 0 }),
    deleteDoneOlderThan: jest.fn().mockResolvedValue(0),
    expireStaleRetries: jest.fn().mockResolvedValue(0),
    ...overrides,
  };
}

const noopSuggestion = () => ({ suggestMergesFor: jest.fn().mockResolvedValue(undefined) }) as unknown as CanonicalMergeSuggestionService;

describe("computeAdaptiveBatchSize — orçamento real (Sprint 15C)", () => {
  it("sem budgetMs é byte-idêntica ao comportamento anterior", () => {
    // Cold start: backlog/10, truncado no teto. Era o ramo que produzia 200.
    expect(computeAdaptiveBatchSize(7700, 0, 10, 200)).toBe(200);
    // Com throughput: ~1 minuto de trabalho.
    expect(computeAdaptiveBatchSize(500, 12, 10, 200)).toBe(12);
  });

  it("com budgetMs dimensiona pela capacidade do orçamento, não por 1 minuto", () => {
    // 40 itens/min (1,5s cada), orçamento de 45s => 30 cabem.
    expect(computeAdaptiveBatchSize(7700, 40, 10, 200, 45_000)).toBe(30);
    // O mesmo throughput sem orçamento pediria 40 — mais do que cabe.
    expect(computeAdaptiveBatchSize(7700, 40, 10, 200)).toBe(40);
  });

  it("cold start COM orçamento é conservador (minBatch), nunca o teto", () => {
    // Era exatamente aqui que 7700/10 -> 770 -> 200 acontecia, toda invocação,
    // porque a janela de throughput está sempre vazia com cron de 15 min.
    expect(computeAdaptiveBatchSize(7700, 0, 10, 200, 45_000)).toBe(10);
  });

  it("nunca ultrapassa o backlog nem sai da faixa [minBatch, maxBatch]", () => {
    expect(computeAdaptiveBatchSize(3, 1000, 10, 200, 45_000)).toBe(10); // piso
    expect(computeAdaptiveBatchSize(100_000, 100_000, 10, 200, 45_000)).toBe(200); // teto
    expect(computeAdaptiveBatchSize(0, 40, 10, 200, 45_000)).toBe(10); // backlog vazio
  });

  it("orçamento menor reivindica menos; orçamento maior reivindica mais", () => {
    const curto = computeAdaptiveBatchSize(7700, 40, 10, 200, 15_000);
    const longo = computeAdaptiveBatchSize(7700, 40, 10, 200, 45_000);
    expect(curto).toBeLessThan(longo);
  });
});

describe("CanonicalSuggestionSweepService — claim dentro do orçamento (Sprint 15C)", () => {
  it("com deadline, reivindica o que cabe no orçamento em vez do teto", async () => {
    const outboxRepo = makeOutboxRepo({ recentCompletionSamples: jest.fn().mockResolvedValue(samplesOf(1_500)) });
    const service = new CanonicalSuggestionSweepService(outboxRepo, noopSuggestion());

    await service.sweep(undefined, 60_000, Date.now() + 45_000);

    const [limitArg] = (outboxRepo.claimBatch as jest.Mock).mock.calls[0];
    // 1,5s por item, 45s de orçamento => 30, não 200.
    expect(limitArg).toBe(30);
  });

  it("sem deadline mantém o dimensionamento anterior (compatibilidade)", async () => {
    const outboxRepo = makeOutboxRepo({ recentCompletionSamples: jest.fn().mockResolvedValue([]) });
    const service = new CanonicalSuggestionSweepService(outboxRepo, noopSuggestion());

    await service.sweep(undefined, 60_000);

    const [limitArg] = (outboxRepo.claimBatch as jest.Mock).mock.calls[0];
    expect(limitArg).toBe(200); // backlog 7700 / 10 -> teto 200, como antes
  });

  it("batchLimit explícito continua passando intacto, sem cálculo adaptativo", async () => {
    const outboxRepo = makeOutboxRepo();
    const service = new CanonicalSuggestionSweepService(outboxRepo, noopSuggestion());

    await service.sweep(37, 60_000, Date.now() + 45_000);

    expect(outboxRepo.claimBatch).toHaveBeenCalledWith(37, 60_000);
    expect(outboxRepo.recentCompletionSamples).not.toHaveBeenCalled();
  });

  it("amostras inválidas (duração <= 0) não envenenam a estimativa", async () => {
    const outboxRepo = makeOutboxRepo({
      recentCompletionSamples: jest.fn().mockResolvedValue([
        { claimedAt: "2026-07-24T00:00:10.000Z", completedAt: "2026-07-24T00:00:05.000Z" }, // negativa
        { claimedAt: "nao-e-data", completedAt: "tambem-nao" }, // NaN
      ]),
    });
    const service = new CanonicalSuggestionSweepService(outboxRepo, noopSuggestion());

    await service.sweep(undefined, 60_000, Date.now() + 45_000);

    const [limitArg] = (outboxRepo.claimBatch as jest.Mock).mock.calls[0];
    expect(limitArg).toBe(10); // trata como cold start, não como capacidade infinita
  });
});

describe("CanonicalSuggestionSweepService — garantias preservadas (Sprint 15C)", () => {
  it("lote que cabe no orçamento é processado por inteiro", async () => {
    const entries = [makeEntry({ id: "a" }), makeEntry({ id: "b" }), makeEntry({ id: "c" })];
    const outboxRepo = makeOutboxRepo({ claimBatch: jest.fn().mockResolvedValue(entries) });
    const service = new CanonicalSuggestionSweepService(outboxRepo, noopSuggestion());

    const result = await service.sweep(undefined, 60_000, Date.now() + 45_000);

    expect(result.succeeded).toBe(3);
    expect(result.stoppedForDeadline).toBe(false);
    expect(outboxRepo.markDone).toHaveBeenCalledTimes(3);
  });

  it("deadline já vencido não processa nada e não marca nada como sucesso", async () => {
    const entries = [makeEntry({ id: "a" }), makeEntry({ id: "b" })];
    const suggestion = noopSuggestion();
    const outboxRepo = makeOutboxRepo({ claimBatch: jest.fn().mockResolvedValue(entries) });
    const service = new CanonicalSuggestionSweepService(outboxRepo, suggestion);

    const result = await service.sweep(undefined, 60_000, Date.now() - 1);

    expect(result.stoppedForDeadline).toBe(true);
    expect(result.succeeded).toBe(0);
    expect(suggestion.suggestMergesFor).not.toHaveBeenCalled();
    expect(outboxRepo.markDone).not.toHaveBeenCalled();
    // Nenhum item vira done/dead_letter sem ter sido processado: continuam
    // `processing` e voltam pelo caminho de stale-claim — AT LEAST ONCE.
    expect(outboxRepo.markDeadLetter).not.toHaveBeenCalled();
  });

  it("itens não processados por deadline NÃO consomem tentativa", async () => {
    const entries = [makeEntry({ id: "a", attempts: 2 })];
    const outboxRepo = makeOutboxRepo({ claimBatch: jest.fn().mockResolvedValue(entries) });
    const service = new CanonicalSuggestionSweepService(outboxRepo, noopSuggestion());

    await service.sweep(undefined, 60_000, Date.now() - 1);

    // Nunca tentado => `attempts` intacto, senão o item chegaria a
    // dead_letter sem jamais ter sido executado.
    expect(outboxRepo.markFailedForRetry).not.toHaveBeenCalled();
    expect(outboxRepo.markDeadLetter).not.toHaveBeenCalled();
  });

  it("falha real continua incrementando attempts e reagendando com backoff", async () => {
    const entries = [makeEntry({ id: "a", attempts: 1 })];
    const outboxRepo = makeOutboxRepo({ claimBatch: jest.fn().mockResolvedValue(entries) });
    const suggestion = { suggestMergesFor: jest.fn().mockRejectedValue(new Error("falhou")) } as unknown as CanonicalMergeSuggestionService;
    const service = new CanonicalSuggestionSweepService(outboxRepo, suggestion);

    const result = await service.sweep(undefined, 60_000, Date.now() + 45_000);

    expect(result.retried).toBe(1);
    expect(outboxRepo.markFailedForRetry).toHaveBeenCalledWith("a", expect.objectContaining({ attempts: 2 }));
  });

  it("MAX_ATTEMPTS continua levando a dead_letter", async () => {
    const entries = [makeEntry({ id: "a", attempts: MAX_ATTEMPTS - 1 })];
    const outboxRepo = makeOutboxRepo({ claimBatch: jest.fn().mockResolvedValue(entries) });
    const suggestion = { suggestMergesFor: jest.fn().mockRejectedValue(new Error("falhou")) } as unknown as CanonicalMergeSuggestionService;
    const service = new CanonicalSuggestionSweepService(outboxRepo, suggestion);

    const result = await service.sweep(undefined, 60_000, Date.now() + 45_000);

    expect(result.deadLettered).toBe(1);
    expect(outboxRepo.markDeadLetter).toHaveBeenCalledWith("a", expect.objectContaining({ attempts: MAX_ATTEMPTS }));
  });

  it("backlog vazio: nada reivindicado, nada processado", async () => {
    const outboxRepo = makeOutboxRepo({
      countByStatus: jest.fn().mockResolvedValue({ pending: 0, processing: 0, done: 0, failed: 0, dead_letter: 0, expired: 0 }),
    });
    const service = new CanonicalSuggestionSweepService(outboxRepo, noopSuggestion());

    const result = await service.sweep(undefined, 60_000, Date.now() + 45_000);

    expect(result).toMatchObject({ claimed: 0, succeeded: 0, retried: 0, deadLettered: 0 });
  });

  it("backlog menor que a capacidade nunca reivindica mais que o backlog", async () => {
    const outboxRepo = makeOutboxRepo({
      countByStatus: jest.fn().mockResolvedValue({ pending: 4, processing: 0, done: 0, failed: 0, dead_letter: 0, expired: 0 }),
      recentCompletionSamples: jest.fn().mockResolvedValue(samplesOf(10)),
    });
    const service = new CanonicalSuggestionSweepService(outboxRepo, noopSuggestion());

    await service.sweep(undefined, 60_000, Date.now() + 45_000);

    const [limitArg] = (outboxRepo.claimBatch as jest.Mock).mock.calls[0];
    expect(limitArg).toBeLessThanOrEqual(10); // piso minBatch, nunca 200
  });

  it("o claim continua sendo o único ponto de exclusão mútua (staleClaimMs repassado intacto)", async () => {
    const outboxRepo = makeOutboxRepo({ recentCompletionSamples: jest.fn().mockResolvedValue(samplesOf(1_500)) });
    const service = new CanonicalSuggestionSweepService(outboxRepo, noopSuggestion());

    await service.sweep(undefined, 300_000, Date.now() + 45_000);

    // A janela de staleness não foi tocada por esta Sprint: dois workers
    // continuam protegidos exatamente pelo mesmo mecanismo de antes.
    const [, staleArg] = (outboxRepo.claimBatch as jest.Mock).mock.calls[0];
    expect(staleArg).toBe(300_000);
  });

  it("throughput medido menor (itens mais caros) reivindica menos", async () => {
    const barato = makeOutboxRepo({ recentCompletionSamples: jest.fn().mockResolvedValue(samplesOf(500)) });
    const caro = makeOutboxRepo({ recentCompletionSamples: jest.fn().mockResolvedValue(samplesOf(5_000)) });
    const deadline = Date.now() + 45_000;

    await new CanonicalSuggestionSweepService(barato, noopSuggestion()).sweep(undefined, 60_000, deadline);
    await new CanonicalSuggestionSweepService(caro, noopSuggestion()).sweep(undefined, 60_000, deadline);

    const [limiteBarato] = (barato.claimBatch as jest.Mock).mock.calls[0];
    const [limiteCaro] = (caro.claimBatch as jest.Mock).mock.calls[0];
    expect(limiteBarato).toBeGreaterThan(limiteCaro);
    expect(limiteCaro).toBe(10); // 5s/item em 45s => 9, elevado ao piso
  });
});
