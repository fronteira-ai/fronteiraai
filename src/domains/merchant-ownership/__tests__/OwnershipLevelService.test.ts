import { computeOwnershipLevel, type OwnershipLevelInput } from "../services/OwnershipLevelService";
import { ClaimStatus, OwnershipLevel } from "../types/enums";

function makeInput(overrides: Partial<OwnershipLevelInput> = {}): OwnershipLevelInput {
  return {
    hasClaim: false,
    claimStatus: null,
    automatedConfidence: 0,
    isLinkedToStore: false,
    verifiedLevel: "none",
    plan: "free",
    ...overrides,
  };
}

describe("computeOwnershipLevel", () => {
  it("is StoreDiscovered when nothing has happened yet", () => {
    expect(computeOwnershipLevel(makeInput())).toBe(OwnershipLevel.StoreDiscovered);
  });

  it("is ClaimRequested once a claim exists but confidence/linkage haven't progressed", () => {
    const input = makeInput({ hasClaim: true, claimStatus: ClaimStatus.AwaitingReview, automatedConfidence: 0 });
    expect(computeOwnershipLevel(input)).toBe(OwnershipLevel.ClaimRequested);
  });

  it("is IdentityVerified once Progressive Verification produced some confidence", () => {
    const input = makeInput({ hasClaim: true, claimStatus: ClaimStatus.AwaitingReview, automatedConfidence: 40 });
    expect(computeOwnershipLevel(input)).toBe(OwnershipLevel.IdentityVerified);
  });

  it("is OwnershipVerified once merchant_stores links the merchant to the store", () => {
    const input = makeInput({ hasClaim: true, automatedConfidence: 90, isLinkedToStore: true });
    expect(computeOwnershipLevel(input)).toBe(OwnershipLevel.OwnershipVerified);
  });

  it("is MerchantVerified once the merchant has a broader verified_level, regardless of claim state", () => {
    const input = makeInput({ isLinkedToStore: true, verifiedLevel: "verified" });
    expect(computeOwnershipLevel(input)).toBe(OwnershipLevel.MerchantVerified);
  });

  it("is PremiumMerchant once the plan is not free, overriding everything else", () => {
    const input = makeInput({ verifiedLevel: "official", plan: "business" });
    expect(computeOwnershipLevel(input)).toBe(OwnershipLevel.PremiumMerchant);
  });

  it("falls back to StoreDiscovered when the only claim on record was rejected or cancelled", () => {
    const rejected = makeInput({ hasClaim: true, claimStatus: ClaimStatus.Rejected });
    const cancelled = makeInput({ hasClaim: true, claimStatus: ClaimStatus.Cancelled });
    expect(computeOwnershipLevel(rejected)).toBe(OwnershipLevel.StoreDiscovered);
    expect(computeOwnershipLevel(cancelled)).toBe(OwnershipLevel.StoreDiscovered);
  });
});
