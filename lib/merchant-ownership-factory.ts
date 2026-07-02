import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SupabaseStoreClaimRepository,
  SupabaseMerchantDelegateRepository,
  SupabaseMerchantStoreLinkRepository,
  SupabaseUpgradeLeadRepository,
  ClaimService,
  DelegationService,
  PremiumUpgradeService,
} from "@/src/domains/merchant-ownership";
import { VerificationService } from "@/src/domains/trust/services/VerificationService";
import { VerificationEvidenceService } from "@/src/domains/trust/services/VerificationEvidenceService";
import { VerificationAuditService } from "@/src/domains/trust/services/VerificationAuditService";
import { EventService } from "@/src/domains/trust/services/EventService";
import { SupabaseVerificationRepository } from "@/src/domains/trust/infrastructure/SupabaseVerificationRepository";
import { SupabaseVerificationEvidenceRepository } from "@/src/domains/trust/infrastructure/SupabaseVerificationEvidenceRepository";
import { SupabaseVerificationHistoryRepository } from "@/src/domains/trust/infrastructure/SupabaseVerificationHistoryRepository";
import { SupabaseTrustEventRepository } from "@/src/domains/trust/infrastructure/SupabaseTrustEventRepository";

export function createMerchantOwnershipServices(client: SupabaseClient) {
  const claimRepo = new SupabaseStoreClaimRepository(client);
  const delegateRepo = new SupabaseMerchantDelegateRepository(client);
  const storeLinkRepo = new SupabaseMerchantStoreLinkRepository(client);
  const upgradeLeadRepo = new SupabaseUpgradeLeadRepository(client);

  const eventService = new EventService(new SupabaseTrustEventRepository(client));
  const auditService = new VerificationAuditService(new SupabaseVerificationHistoryRepository(client));
  const verificationService = new VerificationService(new SupabaseVerificationRepository(client), new SupabaseTrustEventRepository(client), auditService);
  const evidenceService = new VerificationEvidenceService(new SupabaseVerificationEvidenceRepository(client), auditService);

  const claimService = new ClaimService(claimRepo, storeLinkRepo, verificationService, evidenceService, eventService);
  const delegationService = new DelegationService(delegateRepo, eventService);
  const premiumUpgradeService = new PremiumUpgradeService(upgradeLeadRepo, eventService);

  return {
    claimRepo,
    delegateRepo,
    storeLinkRepo,
    upgradeLeadRepo,
    eventService,
    verificationService,
    evidenceService,
    claimService,
    delegationService,
    premiumUpgradeService,
  };
}
