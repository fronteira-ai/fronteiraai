export const NEW_ZONE_CONFIG = {
  connectorId: "newzone",
  connectorVersion: "1.0.0",
  storeSlug: "new-zone",
  baseUrl: "https://www.newzone.com.py",
  graphqlUrl: "https://www.newzone.com.py/api/graphql",

  // Strategic categories (Apple, smartphones, computing, games, audio, photo).
  STRATEGIC_CATEGORY_IDS: [
    1, // TELEFONIA
    41, // APPLE
    3, // ELECTRONICA
    181, // ELECTRONICOS
    103, // INFORMATICA
    132, // GAMES
    47, // TV
    68, // CAMARAS Y FILMADORAS
    21, // AURICULARES
    37, // RELOJERIA
    66, // ACCESORIOS TECNOLOGIA
  ],

  // Max product families fetched per category (the API returns per-category
  // counts; bounded to keep the sweep reasonable and respectful).
  maxPerCategory: 500,
  pageSize: 48,

  // Continuous Price Collection (Adaptive Sync Engine — tier WARM 2h).
  // syncFrequencyHours stays for retrocompat config; the engine's sync_state
  // will set HOT/WARM tier.
  syncFrequencyHours: 2,

  // Politeness for public API requests.
  requestDelayMs: 350,
  timeoutMs: 15_000,
} as const;
