// Deliberately tiny and single-purpose — this is the one point where
// Merchant Ownership is allowed to write to `merchant_stores` (the same
// table `app/api/merchant/onboarding/route.ts`'s unguarded upsert writes to
// today). Claim approval is what should gate this write going forward.
export interface IMerchantStoreLinkRepository {
  link(merchantId: string, storeId: string): Promise<void>;
  unlink(merchantId: string, storeId: string): Promise<void>;
  isLinked(merchantId: string, storeId: string): Promise<boolean>;
}
