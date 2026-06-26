export const SHOPPING_CHINA_CONFIG = {
  connectorId: "shoppingchina",
  connectorVersion: "1.0.0",
  storeSlug: "shopping-china",
  baseUrl: "https://www.shoppingchina.com.py",

  // Categories to crawl — add or remove as needed
  categories: [
    { slug: "electronicos", name: "Eletrônicos" },
    { slug: "informatica", name: "Informática" },
    { slug: "celulares", name: "Celulares" },
  ],

  // Maximum products per category per sync (raise for full crawl)
  maxProductsPerCategory: 10,

  // Milliseconds to wait between HTTP requests (be respectful)
  requestDelayMs: 500,

  // Request timeout
  timeoutMs: 15_000,
} as const;
