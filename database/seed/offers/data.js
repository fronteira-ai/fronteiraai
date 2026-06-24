// Ofertas de demonstração. product_slug/store_slug são resolvidos para
// product_id/store_id pelo orquestrador (database/seed/index.js).
//
// Cobertura deliberada de casos de borda (para validar a UI já implementada):
// - "playstation-5-slim" NÃO tem nenhuma oferta aqui de propósito (testa o
//   estado "produto sem oferta" do catálogo/página de produto).
// - "macbook-air-m3-13-256gb" tem uma oferta com in_stock=false (testa o
//   badge "Sem estoque").
//
// price_brl é um valor de exemplo fixo, não calculado por taxa de conversão
// (ADR-009 removeu a conversão automática de propósito) — em dados reais,
// cada loja fornece os dois valores de forma independente.
module.exports = [
  { product_slug: "iphone-16-pro-256gb-titanio-preto", store_slug: "cellshop", currency: "USD", price_usd: 999, price_brl: 5495, old_price: null, in_stock: true, available: true, stock_quantity: 12, condition: "new", warranty: "12 meses", cashback: null, product_url: null },
  { product_slug: "iphone-16-pro-256gb-titanio-preto", store_slug: "nissei", currency: "USD", price_usd: 1050, price_brl: 5775, old_price: 1099, in_stock: true, available: true, stock_quantity: 5, condition: "new", warranty: "12 meses", cashback: null, product_url: null },

  { product_slug: "macbook-air-m3-13-256gb", store_slug: "nissei", currency: "USD", price_usd: 1199, price_brl: 6595, old_price: null, in_stock: true, available: true, stock_quantity: 3, condition: "new", warranty: "12 meses", cashback: null, product_url: null },
  { product_slug: "macbook-air-m3-13-256gb", store_slug: "shopping-china", currency: "USD", price_usd: 1250, price_brl: 6875, old_price: null, in_stock: false, available: false, stock_quantity: 0, condition: "new", warranty: "12 meses", cashback: null, product_url: null },

  { product_slug: "galaxy-s25-ultra-256gb", store_slug: "shopping-china", currency: "USD", price_usd: 1099, price_brl: 6045, old_price: null, in_stock: true, available: true, stock_quantity: 8, condition: "new", warranty: "12 meses", cashback: null, product_url: null },
  { product_slug: "galaxy-s25-ultra-256gb", store_slug: "mega-eletronicos", currency: "USD", price_usd: 1080, price_brl: 5940, old_price: 1150, in_stock: true, available: true, stock_quantity: 4, condition: "new", warranty: "12 meses", cashback: null, product_url: null },

  { product_slug: "smart-tv-samsung-55-4k-qled", store_slug: "mega-eletronicos", currency: "USD", price_usd: 499, price_brl: 2745, old_price: null, in_stock: true, available: true, stock_quantity: 6, condition: "new", warranty: "12 meses", cashback: null, product_url: null },

  { product_slug: "dji-mini-4-pro", store_slug: "atacado-games", currency: "USD", price_usd: 459, price_brl: 2525, old_price: null, in_stock: true, available: true, stock_quantity: 7, condition: "new", warranty: "12 meses", cashback: null, product_url: null },
  { product_slug: "dji-mini-4-pro", store_slug: "cellshop", currency: "USD", price_usd: 475, price_brl: 2610, old_price: null, in_stock: true, available: true, stock_quantity: 2, condition: "new", warranty: "12 meses", cashback: null, product_url: null },
];
