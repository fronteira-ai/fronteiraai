// Deliberately tiny and single-purpose — this is the one point where
// Merchant Ownership is allowed to write to `merchant_stores` (the same
// table `app/api/merchant/onboarding/route.ts`'s unguarded upsert writes to
// today). Claim approval is what should gate this write going forward.
export interface IMerchantStoreLinkRepository {
  link(merchantId: string, storeId: string): Promise<void>;
  unlink(merchantId: string, storeId: string): Promise<void>;
  isLinked(merchantId: string, storeId: string): Promise<boolean>;
  /** Batched reverse lookup (store -> owning merchant) for callers that need
   * to resolve verification/trust status for a list of offers' stores in one
   * query instead of N (e.g. buyer-intelligence composers). Stores with no
   * `merchant_stores` row (unclaimed — the structural default, see
   * DiscoveryService) are simply absent from the returned map, never an error. */
  findMerchantIdsByStoreIds(storeIds: string[]): Promise<Map<string, string>>;
}
