// Only pairs the marketplace actually needs — USD is the pivot currency
// (ExchangeRate-API.com's base). BRL/PYG is never fetched directly, it's
// triangulated from the other two (rate_BRL_PYG = rate_USD_PYG / rate_USD_BRL).
export enum CurrencyPair {
  UsdPyg = "USD/PYG",
  UsdBrl = "USD/BRL",
  BrlPyg = "BRL/PYG",
}
