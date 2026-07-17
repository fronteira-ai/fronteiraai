import type { MerchantAttributePattern } from "../domain/MerchantAttributePattern";
import type { MerchantAttributePatternInput } from "../types/marketplace-memory.types";

export interface IMerchantAttributePatternRepository {
  findByStoreId(storeId: string): Promise<MerchantAttributePattern[]>;

  findByStoreAndKey(storeId: string, rawKey: string): Promise<MerchantAttributePattern | null>;

  /** Idempotent upsert on (storeId, rawKey). Callers wanting to record a
   * repeat observation should read the existing row first (findByStoreAndKey)
   * and pass `occurrences + 1` — this method never increments implicitly,
   * so it never silently double-counts a caller that retries a failed
   * write. */
  upsert(input: MerchantAttributePatternInput, occurrences: number): Promise<MerchantAttributePattern>;

  countTotal(): Promise<number>;
}
