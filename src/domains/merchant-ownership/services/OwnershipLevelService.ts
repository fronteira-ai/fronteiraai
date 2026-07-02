import { ClaimStatus, OwnershipLevel } from "../types/enums";

// Epic D — Ownership Levels. Pure, derived from state that already exists
// elsewhere — no new stored column, no drift risk. See types/enums.ts for
// why this is computed rather than persisted.
export interface OwnershipLevelInput {
  hasClaim: boolean;
  claimStatus: ClaimStatus | null;
  automatedConfidence: number;
  /** True once a `merchant_stores` row links this merchant to the store — ownership is confirmed. */
  isLinkedToStore: boolean;
  /** `merchants.verified_level` — broader merchant trust verification, beyond just this one store's ownership. */
  verifiedLevel: "none" | "verified" | "premium" | "official";
  /** `merchants.plan` */
  plan: string;
}

export function computeOwnershipLevel(input: OwnershipLevelInput): OwnershipLevel {
  if (input.plan !== "free") return OwnershipLevel.PremiumMerchant;
  if (input.verifiedLevel !== "none") return OwnershipLevel.MerchantVerified;
  if (input.isLinkedToStore) return OwnershipLevel.OwnershipVerified;
  if (input.hasClaim && input.automatedConfidence > 0) return OwnershipLevel.IdentityVerified;
  if (input.hasClaim && input.claimStatus !== ClaimStatus.Cancelled && input.claimStatus !== ClaimStatus.Rejected) {
    return OwnershipLevel.ClaimRequested;
  }
  return OwnershipLevel.StoreDiscovered;
}

export class OwnershipLevelService {
  computeLevel(input: OwnershipLevelInput): OwnershipLevel {
    return computeOwnershipLevel(input);
  }
}
