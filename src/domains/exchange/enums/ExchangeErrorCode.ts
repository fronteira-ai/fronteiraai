export enum ExchangeErrorCode {
  ProviderTimeout = "provider_timeout",
  ProviderHttpError = "provider_http_error",
  ProviderMalformedResponse = "provider_malformed_response",
  AllProvidersFailed = "all_providers_failed",
  NoRateAvailable = "no_rate_available",
}
