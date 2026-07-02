// Public API of the Merchant Acquisition & Ownership Platform domain
// (RELEASE_1_7_BLUEPRINT.md, Wave 5). Independent of connectors/ — depends
// on trust/ deliberately (reuses VerificationService/VerificationEvidence
// Service/EventService rather than duplicating verification/event
// infrastructure that already exists).

export * from "./types/enums";
export * from "./types/merchant-ownership.types";

export type { StoreClaim } from "./domain/StoreClaim";
export type { MerchantDelegate } from "./domain/MerchantDelegate";
export { ProgressiveVerificationEngine } from "./domain/ProgressiveVerificationEngine";

export type { IStoreClaimRepository, CreateStoreClaimInput, UpdateStoreClaimStatusInput } from "./repositories/IStoreClaimRepository";
export type { IMerchantDelegateRepository, CreateDelegateInput } from "./repositories/IMerchantDelegateRepository";
export type { IMerchantStoreLinkRepository } from "./repositories/IMerchantStoreLinkRepository";
export type { IUpgradeLeadRepository, UpgradeLead } from "./repositories/IUpgradeLeadRepository";

export { SupabaseStoreClaimRepository } from "./infrastructure/SupabaseStoreClaimRepository";
export { SupabaseMerchantDelegateRepository } from "./infrastructure/SupabaseMerchantDelegateRepository";
export { SupabaseMerchantStoreLinkRepository } from "./infrastructure/SupabaseMerchantStoreLinkRepository";
export { SupabaseUpgradeLeadRepository } from "./infrastructure/SupabaseUpgradeLeadRepository";

export { ClaimService } from "./services/ClaimService";
export { DelegationService } from "./services/DelegationService";
export type { ActingRole } from "./services/DelegationService";
export { PremiumUpgradeService } from "./services/PremiumUpgradeService";
export { OwnershipLevelService, computeOwnershipLevel } from "./services/OwnershipLevelService";
export type { OwnershipLevelInput } from "./services/OwnershipLevelService";

export * from "./events/merchant-ownership.events";
