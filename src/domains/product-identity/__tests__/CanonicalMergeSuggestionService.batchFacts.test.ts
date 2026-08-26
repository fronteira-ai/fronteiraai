import { CanonicalMergeSuggestionService, readThroughMetrics, resetReadThroughMetricsForTests } from "../services/CanonicalMergeSuggestionService";
import type { ICanonicalCatalogRepository, CanonicalProduct, IMergeCandidateRepository } from "@/src/domains/canonical-catalog";
import { FactType, type LearnedFact, type MarketplaceMemoryService } from "@/src/domains/marketplace-memory";

// Sprint 15B (egress) — o read-through do merge-suggestions fazia UMA
// consulta de fatos POR CANDIDATO (`getFactsForProduct`), todas disparadas
// em paralelo pelo Promise.all de `suggestMergesFor`. Agora um único
// `getFactsForProducts` prefetcha o lote e cada candidato lê do Map.
//
// O que estes testes provam é o que a troca NÃO pode ter mudado: o rollout
// de 50% continua selecionando exatamente os mesmos produtos, o write-back
// no miss continua acontecendo, o resultado do merge é idêntico ao do
// caminho individual, e uma falha do lote degrada para o caminho antigo.
//
// Buckets determinísticos destas fixtures (bucketFor):
//   canonical-1 -> 36   canonical-2 -> 37
// Por isso `rollout=37` deixa canonical-1 DENTRO e canonical-2 FORA — é o
// que torna o teste de rollout parcial uma prova, e não uma coincidência.

function makeCanonicalProduct(overrides: Partial<CanonicalProduct> = {}): CanonicalProduct {
  return {
    id: "canonical-1",
    canonicalSlug: "notebook-acer-aspire-3-a315-23-r7ve",
    name: "Notebook Acer Aspire 3 A315-23-R7VE",
    brandId: "brand-acer",
    categoryId: "category-notebooks",
    imageUrl: null,
    specifications: { ram: "8GB", storage: "256GB SSD" },
    createdAt: "2026-07-01T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
    isActive: true,
    mergedIntoId: null,
    ...overrides,
  };
}

function makeSourceAndTarget(): { source: CanonicalProduct; target: CanonicalProduct } {
  return {
    source: makeCanonicalProduct(),
    target: makeCanonicalProduct({ id: "canonical-2", canonicalSlug: "notebook-acer-aspire-3-a315-23-r7ve-2" }),
  };
}

function makeCatalogRepo(overrides: Partial<ICanonicalCatalogRepository> = {}): ICanonicalCatalogRepository {
  return {
    findBySlug: jest.fn(),
    findById: jest.fn(),
    findOrCreateBySlug: jest.fn(),
    updateSyncedFields: jest.fn(),
    findByBrandId: jest.fn().mockResolvedValue([]),
    findByCategoryId: jest.fn().mockResolvedValue([]),
    findCanonicalProductIdByProductId: jest.fn(),
    findCategorySlugsByIds: jest.fn().mockResolvedValue(new Map()),
    findAll: jest.fn(),
    linkOffer: jest.fn(),
    findOffersByCanonicalProductIds: jest.fn().mockResolvedValue(new Map()),
    findOffersByCanonicalProductId: jest.fn(),
    findOfferIdsByCanonicalProductId: jest.fn(),
    reassignOffers: jest.fn(),
    reassignOffersByIds: jest.fn(),
    deactivateAndMerge: jest.fn(),
    reactivate: jest.fn(),
    ...overrides,
  };
}

function makeMergeCandidateRepo(overrides: Partial<IMergeCandidateRepository> = {}): IMergeCandidateRepository {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByStatus: jest.fn(),
    findByPair: jest.fn().mockResolvedValue(null),
    updateStatus: jest.fn(),
    updateScoring: jest.fn(),
    ...overrides,
  };
}

function makeFact(overrides: Partial<LearnedFact> = {}): LearnedFact {
  return {
    id: "fact-1",
    canonicalProductId: "canonical-1",
    factType: FactType.ManufacturerCode,
    factValue: "A315-23-R7VE",
    confidence: "medium",
    source: "name",
    extractedFrom: null,
    merchantId: null,
    origin: "backfill",
    validationStatus: "unvalidated",
    algorithmVersion: "1.0.0",
    createdAt: "2026-07-16T00:00:00Z",
    updatedAt: "2026-07-16T00:00:00Z",
    ...overrides,
  };
}

/** Memória COM leitura em lote — o caminho novo. */
function makeBatchMemoryService(factsByProduct: Map<string, LearnedFact[]> = new Map()) {
  return {
    getFactsForProduct: jest.fn().mockResolvedValue([]),
    getFactsForProducts: jest.fn().mockResolvedValue(factsByProduct),
    learnFacts: jest.fn().mockResolvedValue([]),
  } as unknown as MarketplaceMemoryService & { getFactsForProduct: jest.Mock; getFactsForProducts: jest.Mock; learnFacts: jest.Mock };
}

/** Memória SEM leitura em lote — reproduz o caminho individual anterior
 * (chamar o método ausente lança, o prefetch degrada e volta ao antigo). */
function makeIndividualMemoryService(factsByProduct: Map<string, LearnedFact[]> = new Map()) {
  return {
    getFactsForProduct: jest.fn((id: string) => Promise.resolve(factsByProduct.get(id) ?? [])),
    learnFacts: jest.fn().mockResolvedValue([]),
  } as unknown as MarketplaceMemoryService & { getFactsForProduct: jest.Mock; learnFacts: jest.Mock };
}

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  resetReadThroughMetricsForTests();
});

describe("Sprint 15B — prefetch em lote dos fatos", () => {
  it("elimina o N+1: uma leitura em lote, zero leituras por candidato", async () => {
    process.env.PRODUCT_IDENTITY_MEMORY_ROLLOUT_PERCENT = "100";
    const { source, target } = makeSourceAndTarget();
    const catalogRepo = makeCatalogRepo({
      findById: jest.fn().mockResolvedValue(source),
      findByBrandId: jest.fn().mockResolvedValue([source, target]),
    });
    const memoryService = makeBatchMemoryService();
    const service = new CanonicalMergeSuggestionService(catalogRepo, makeMergeCandidateRepo(), memoryService);

    await service.suggestMergesFor("canonical-1");

    expect(memoryService.getFactsForProducts).toHaveBeenCalledTimes(1);
    expect(memoryService.getFactsForProduct).not.toHaveBeenCalled();
    // source + candidato, num único lote.
    expect(memoryService.getFactsForProducts).toHaveBeenCalledWith(["canonical-1", "canonical-2"]);
    // As duas leituras de memória continuam sendo contabilizadas.
    expect(readThroughMetrics.reads).toBe(2);
  });

  it("rollout parcial: só os IDs DENTRO do rollout entram no lote", async () => {
    // canonical-1 (bucket 36) dentro; canonical-2 (bucket 37) fora.
    process.env.PRODUCT_IDENTITY_MEMORY_ROLLOUT_PERCENT = "37";
    const { source, target } = makeSourceAndTarget();
    const catalogRepo = makeCatalogRepo({
      findById: jest.fn().mockResolvedValue(source),
      findByBrandId: jest.fn().mockResolvedValue([source, target]),
    });
    const memoryService = makeBatchMemoryService();
    const service = new CanonicalMergeSuggestionService(catalogRepo, makeMergeCandidateRepo(), memoryService);

    await service.suggestMergesFor("canonical-1");

    expect(memoryService.getFactsForProducts).toHaveBeenCalledWith(["canonical-1"]);
    expect(readThroughMetrics.reads).toBe(1); // exatamente um produto consultou memória
  });

  it("rollout 0%: nenhuma leitura de memória, nem em lote nem individual", async () => {
    process.env.PRODUCT_IDENTITY_MEMORY_ROLLOUT_PERCENT = "0";
    const { source, target } = makeSourceAndTarget();
    const catalogRepo = makeCatalogRepo({
      findById: jest.fn().mockResolvedValue(source),
      findByBrandId: jest.fn().mockResolvedValue([source, target]),
    });
    const memoryService = makeBatchMemoryService();
    const service = new CanonicalMergeSuggestionService(catalogRepo, makeMergeCandidateRepo(), memoryService);

    await service.suggestMergesFor("canonical-1");

    expect(memoryService.getFactsForProducts).not.toHaveBeenCalled();
    expect(memoryService.getFactsForProduct).not.toHaveBeenCalled();
    expect(readThroughMetrics.reads).toBe(0);
  });

  it("sem memória configurada nada muda (contrato de 2 argumentos preservado)", async () => {
    process.env.PRODUCT_IDENTITY_MEMORY_ROLLOUT_PERCENT = "100";
    const { source, target } = makeSourceAndTarget();
    const catalogRepo = makeCatalogRepo({
      findById: jest.fn().mockResolvedValue(source),
      findByBrandId: jest.fn().mockResolvedValue([source, target]),
    });
    const mergeRepo = makeMergeCandidateRepo();
    const service = new CanonicalMergeSuggestionService(catalogRepo, mergeRepo);

    await expect(service.suggestMergesFor("canonical-1")).resolves.toBeUndefined();
    expect(readThroughMetrics.reads).toBe(0);
  });

  it("cache miss pelo lote continua fazendo o write-back", async () => {
    process.env.PRODUCT_IDENTITY_MEMORY_ROLLOUT_PERCENT = "100";
    const { source, target } = makeSourceAndTarget();
    const catalogRepo = makeCatalogRepo({
      findById: jest.fn().mockResolvedValue(source),
      findByBrandId: jest.fn().mockResolvedValue([source, target]),
    });
    // Map vazio = nenhum produto tem fato = miss para os dois.
    const memoryService = makeBatchMemoryService(new Map());
    const service = new CanonicalMergeSuggestionService(catalogRepo, makeMergeCandidateRepo(), memoryService);

    await service.suggestMergesFor("canonical-1");

    expect(readThroughMetrics.misses).toBe(2);
    expect(memoryService.learnFacts).toHaveBeenCalled();
  });

  it("cache hit pelo lote não dispara write-back", async () => {
    process.env.PRODUCT_IDENTITY_MEMORY_ROLLOUT_PERCENT = "100";
    const { source, target } = makeSourceAndTarget();
    const catalogRepo = makeCatalogRepo({
      findById: jest.fn().mockResolvedValue(source),
      findByBrandId: jest.fn().mockResolvedValue([source, target]),
    });
    // Fatos que reproduzem EXATAMENTE o que uma computação fresca produziria
    // (`specifications: { ram: "8GB" }` -> ramGb "8"), para que a verificação
    // de paridade passe e o teste exercite um hit de verdade, não um hit que
    // o safety-first converte de volta em valor fresco.
    const facts = new Map<string, LearnedFact[]>([
      ["canonical-1", [makeFact(), makeFact({ id: "fact-1b", factType: FactType.RamGb, factValue: "8" })]],
      [
        "canonical-2",
        [
          makeFact({ id: "fact-2", canonicalProductId: "canonical-2" }),
          makeFact({ id: "fact-2b", canonicalProductId: "canonical-2", factType: FactType.RamGb, factValue: "8" }),
        ],
      ],
    ]);
    const memoryService = makeBatchMemoryService(facts);
    const service = new CanonicalMergeSuggestionService(catalogRepo, makeMergeCandidateRepo(), memoryService);

    await service.suggestMergesFor("canonical-1");

    expect(readThroughMetrics.hits).toBe(2);
    expect(readThroughMetrics.misses).toBe(0);
    expect(memoryService.learnFacts).not.toHaveBeenCalled();
  });

  it("produto ausente do Map é tratado como [] — mesmo miss que o individual produziria", async () => {
    process.env.PRODUCT_IDENTITY_MEMORY_ROLLOUT_PERCENT = "100";
    const { source, target } = makeSourceAndTarget();
    const catalogRepo = makeCatalogRepo({
      findById: jest.fn().mockResolvedValue(source),
      findByBrandId: jest.fn().mockResolvedValue([source, target]),
    });
    // Só canonical-1 tem fatos; canonical-2 nem aparece no Map.
    const memoryService = makeBatchMemoryService(
      new Map([["canonical-1", [makeFact(), makeFact({ id: "fact-1b", factType: FactType.RamGb, factValue: "8" })]]])
    );
    const service = new CanonicalMergeSuggestionService(catalogRepo, makeMergeCandidateRepo(), memoryService);

    await service.suggestMergesFor("canonical-1");

    expect(readThroughMetrics.hits).toBe(1); // canonical-1
    expect(readThroughMetrics.misses).toBe(1); // canonical-2, ausente do Map
  });

  it("falha do lote degrada para as leituras individuais, sem interromper o merge", async () => {
    process.env.PRODUCT_IDENTITY_MEMORY_ROLLOUT_PERCENT = "100";
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const { source, target } = makeSourceAndTarget();
    const catalogRepo = makeCatalogRepo({
      findById: jest.fn().mockResolvedValue(source),
      findByBrandId: jest.fn().mockResolvedValue([source, target]),
    });
    const memoryService = makeBatchMemoryService();
    (memoryService.getFactsForProducts as jest.Mock).mockRejectedValue(new Error("batch indisponivel"));
    const service = new CanonicalMergeSuggestionService(catalogRepo, makeMergeCandidateRepo(), memoryService);

    await expect(service.suggestMergesFor("canonical-1")).resolves.toBeUndefined();

    // Caminho antigo assume: uma leitura por produto.
    expect(memoryService.getFactsForProduct).toHaveBeenCalledTimes(2);
    expect(memoryService.getFactsForProduct).toHaveBeenCalledWith("canonical-1");
    expect(memoryService.getFactsForProduct).toHaveBeenCalledWith("canonical-2");
    spy.mockRestore();
  });

  it("EQUIVALÊNCIA: lote e individual produzem o mesmo merge candidate", async () => {
    process.env.PRODUCT_IDENTITY_MEMORY_ROLLOUT_PERCENT = "100";
    // Fatos que reproduzem EXATAMENTE o que uma computação fresca produziria
    // (`specifications: { ram: "8GB" }` -> ramGb "8"), para que a verificação
    // de paridade passe e o teste exercite um hit de verdade, não um hit que
    // o safety-first converte de volta em valor fresco.
    const facts = new Map<string, LearnedFact[]>([
      ["canonical-1", [makeFact(), makeFact({ id: "fact-1b", factType: FactType.RamGb, factValue: "8" })]],
      [
        "canonical-2",
        [
          makeFact({ id: "fact-2", canonicalProductId: "canonical-2" }),
          makeFact({ id: "fact-2b", canonicalProductId: "canonical-2", factType: FactType.RamGb, factValue: "8" }),
        ],
      ],
    ]);

    async function run(memoryService: MarketplaceMemoryService) {
      resetReadThroughMetricsForTests();
      const { source, target } = makeSourceAndTarget();
      const catalogRepo = makeCatalogRepo({
        findById: jest.fn().mockResolvedValue(source),
        findByBrandId: jest.fn().mockResolvedValue([source, target]),
      });
      const mergeRepo = makeMergeCandidateRepo();
      await new CanonicalMergeSuggestionService(catalogRepo, mergeRepo, memoryService).suggestMergesFor("canonical-1");
      return (mergeRepo.create as jest.Mock).mock.calls;
    }

    const viaBatch = await run(makeBatchMemoryService(facts));
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const viaIndividual = await run(makeIndividualMemoryService(facts));
    spy.mockRestore();

    // Mesma sugestão, mesmo alvo, mesma confiança, mesmos atributos.
    expect(viaBatch).toEqual(viaIndividual);
    expect(viaBatch.length).toBeGreaterThan(0); // o cenário realmente gera sugestão
  });
});
