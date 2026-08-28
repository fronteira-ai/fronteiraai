export const NEW_ZONE_CONFIG = {
  connectorId: "newzone",
  connectorVersion: "1.0.0",
  storeSlug: "new-zone",
  baseUrl: "https://www.newzone.com.py",
  graphqlUrl: "https://www.newzone.com.py/api/graphql",

  // Strategic categories são AUTO-DESCOBERTAS via category_get_all (não hardcode
  // de um único id). Este array é um fallback/seed mínimo caso a query de
  // categorias falhe (TELEFONIA=1, APPLE=41, ELECTRONICA=3, INFORMATICA=103,
  // GAMES=132, AURICULARES=21, CAMARAS=68).
  STRATEGIC_CATEGORY_IDS: [1, 41, 3, 181, 103, 132, 47, 68, 21, 37, 66],

  // Max product families fetched per category — paginal real até o count da
  // API; este é um teto de segurança/backstop contra crescimento anômalo, não
  // o tamanho fixo.
  maxPerCategory: 2000,
  pageSize: 48,

  // Continuous Price Collection (Adaptive Sync Engine — tier WARM 2h).
  // syncFrequencyHours stays for retrocompat config; the engine's sync_state
  // will set HOT/WARM tier.
  syncFrequencyHours: 2,

  // Politeness for public API requests.
  requestDelayMs: 350,
  timeoutMs: 15_000,
} as const;
