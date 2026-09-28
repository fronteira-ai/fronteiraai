// Mission 02B.2 — regressão do N+1 de `ConnectorDirectoryService.listAll`.
//
// ANTES: um `connectorRepo.findByKey(m.id)` por conector registrado (9 com o
// registry atual) — 9 consultas a `connectors` para montar a MESMA lista que
// um `connectorRepo.list()` único entrega. Este arquivo FALHA se o padrão
// `findByKey` por item voltar (asserção `findByKey: 0 chamadas`).

import type { SupabaseClient } from "@supabase/supabase-js";

const mockList = jest.fn();
const mockFindByKey = jest.fn();
const mockGetSummaries = jest.fn();
const mockListMetadata = jest.fn();

jest.mock("@/lib/connectors-factory", () => ({
  createConnectorsServices: () => ({
    connectorRepo: { list: mockList, findByKey: mockFindByKey },
    healthService: { getSummaries: mockGetSummaries },
  }),
}));

jest.mock("@/src/domains/connectors/services/ConnectorRegistry", () => ({
  connectorRegistry: { listMetadata: () => mockListMetadata() },
}));

// Importado no topo do módulo, mas só usado por `getDetail` — mockado para não
// arrastar as dependências da certificação para dentro deste teste.
jest.mock("@/lib/connector-certification-service", () => ({
  ConnectorCertificationService: class {},
}));

type Directory = typeof import("@/lib/connector-directory-service");
let ConnectorDirectoryService: Directory["ConnectorDirectoryService"];

beforeAll(async () => {
  const mod = await import("@/lib/connector-directory-service");
  ConnectorDirectoryService = mod.ConnectorDirectoryService;
});

function makeClient(tables: Record<string, unknown[]>) {
  const tables_ = tables;
  const from = jest.fn((table: string) => ({
    select: () => ({ in: async () => ({ data: tables_[table] ?? [] }) }),
  }));
  return { client: { from } as unknown as SupabaseClient, from };
}

function metadata(id: string, storeSlug: string) {
  return { id, name: `Connector ${id}`, version: "1.0.0", storeSlug, capabilities: ["catalog"] };
}

beforeEach(() => {
  mockList.mockReset();
  mockFindByKey.mockReset();
  mockGetSummaries.mockReset();
  mockListMetadata.mockReset();

  mockList.mockResolvedValue([]);
  mockFindByKey.mockResolvedValue(null);
  mockGetSummaries.mockResolvedValue([]);
  mockListMetadata.mockReturnValue([]);
});

describe("Mission 02B.2 — ConnectorDirectoryService.listAll sem N+1", () => {
  it("lê `connectors` UMA vez (list) e NUNCA por chave (findByKey)", async () => {
    mockListMetadata.mockReturnValue([
      metadata("a", "loja-a"),
      metadata("b", "loja-b"),
      metadata("c", "loja-c"),
    ]);
    mockList.mockResolvedValue([
      { connectorKey: "a", status: "active" },
      { connectorKey: "b", status: "paused" },
      { connectorKey: "c", status: "active" },
    ]);
    mockGetSummaries.mockResolvedValue([
      { connectorKey: "a", healthScore: 90, lastSyncAt: "2026-01-01T00:00:00.000Z" },
      { connectorKey: "b", healthScore: 50, lastSyncAt: null },
      { connectorKey: "c", healthScore: 70, lastSyncAt: "2026-01-02T00:00:00.000Z" },
    ]);
    const { client } = makeClient({});

    const entries = await new ConnectorDirectoryService(client).listAll();

    // O detector de regressão: antes eram 3 chamadas de findByKey para 3 conectores.
    expect(mockList).toHaveBeenCalledTimes(1);
    expect(mockFindByKey).not.toHaveBeenCalled();
    expect(entries.map((e) => e.connectorId)).toEqual(["a", "b", "c"]);
    expect(entries.map((e) => e.status)).toEqual(["active", "paused", "active"]);
    expect(entries.map((e) => e.healthScore)).toEqual([90, 50, 70]);
  });

  it("o número de leituras de `connectors` não cresce com o número de conectores", async () => {
    mockListMetadata.mockReturnValue(Array.from({ length: 9 }, (_, i) => metadata(`c${i}`, `loja-${i}`)));
    const { client } = makeClient({});

    await new ConnectorDirectoryService(client).listAll();

    expect(mockList).toHaveBeenCalledTimes(1);
    expect(mockFindByKey).not.toHaveBeenCalled();
  });

  it("preserva a ORDEM de `listMetadata()`", async () => {
    mockListMetadata.mockReturnValue([metadata("z", "loja-z"), metadata("m", "loja-m"), metadata("a", "loja-a")]);
    const { client } = makeClient({});

    const entries = await new ConnectorDirectoryService(client).listAll();

    expect(entries.map((e) => e.connectorId)).toEqual(["z", "m", "a"]);
  });

  it("conector sem linha persistida nem sumário de saúde mantém os fallbacks (null / 0)", async () => {
    mockListMetadata.mockReturnValue([metadata("novo", "loja-nova")]);
    mockList.mockResolvedValue([]); // nada persistido
    mockGetSummaries.mockResolvedValue([]); // nada de saúde
    const { client } = makeClient({});

    const [only] = await new ConnectorDirectoryService(client).listAll();

    expect(only).toMatchObject({
      connectorId: "novo",
      storeSlug: "loja-nova",
      merchantId: null,
      status: null,
      healthScore: 0,
      lastSyncAt: null,
    });
  });

  it("resolve merchantId por store_slug (o merchantId continua vindo do link, não da linha do conector)", async () => {
    mockListMetadata.mockReturnValue([metadata("a", "loja-a"), metadata("b", "loja-b")]);
    const { client } = makeClient({
      stores: [
        { id: "store-a", slug: "loja-a" },
        { id: "store-b", slug: "loja-b" },
      ],
      merchant_stores: [
        { merchant_id: "merchant-a", store_id: "store-a" },
        // store-b sem link ⇒ merchantId null
      ],
    });

    const entries = await new ConnectorDirectoryService(client).listAll();

    expect(entries[0].merchantId).toBe("merchant-a");
    expect(entries[1].merchantId).toBeNull();
  });

  it("registry vazio ⇒ [] e ZERO consultas ao repositório", async () => {
    mockListMetadata.mockReturnValue([]);
    const { client, from } = makeClient({});

    const entries = await new ConnectorDirectoryService(client).listAll();

    expect(entries).toEqual([]);
    expect(mockList).not.toHaveBeenCalled();
    expect(mockFindByKey).not.toHaveBeenCalled();
    expect(mockGetSummaries).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });
});
