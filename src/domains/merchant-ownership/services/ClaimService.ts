import { ProgressiveVerificationEngine } from "../domain/ProgressiveVerificationEngine";
import { ClaimStatus } from "../types/enums";
import type { StoreClaim } from "../domain/StoreClaim";
import type { ClaimantInput, StoreChannels } from "../types/merchant-ownership.types";
import type { IStoreClaimRepository } from "../repositories/IStoreClaimRepository";
import type { IMerchantStoreLinkRepository } from "../repositories/IMerchantStoreLinkRepository";
import {
  claimCancelledEvent,
  claimRequestedEvent,
  ownershipRejectedEvent,
  ownershipRevokedEvent,
  ownershipVerifiedEvent,
  toCreateEventInput,
} from "../events/merchant-ownership.events";
import { VerificationType, EvidenceType } from "@/src/domains/trust/types/enums";
import type { VerificationService } from "@/src/domains/trust/services/VerificationService";
import type { VerificationEvidenceService } from "@/src/domains/trust/services/VerificationEvidenceService";
import type { EventService } from "@/src/domains/trust/services/EventService";

// Epic B/C — Smart Claim Flow + Progressive Verification. Reuses the trust
// domain's verification lifecycle (VerificationService/
// VerificationEvidenceService) rather than duplicating a second state
// machine — "nunca misturar regras de propriedade com autenticação" applies
// equally to not duplicating verification infrastructure that already
// exists.
export class ClaimService {
  private readonly engine = new ProgressiveVerificationEngine();

  constructor(
    private readonly claimRepo: IStoreClaimRepository,
    private readonly storeLinkRepo: IMerchantStoreLinkRepository,
    private readonly verificationService: VerificationService,
    private readonly evidenceService: VerificationEvidenceService,
    private readonly eventService: EventService
  ) {}

  // Idempotent: a merchant with an already-active (pending/awaiting-review)
  // claim on this store gets that same claim back, never a duplicate.
  async create(
    merchantId: string,
    storeId: string,
    input: ClaimantInput,
    storeChannels: StoreChannels,
    submittedByUserId: string
  ): Promise<StoreClaim> {
    const existing = await this.claimRepo.findActiveByStoreAndMerchant(storeId, merchantId);
    if (existing) return existing;

    const result = this.engine.evaluate(input, storeChannels);

    const verification = await this.verificationService.submitVerification(merchantId, VerificationType.StoreClaim, {
      store_id: storeId,
      confidence: result.confidence,
      auto_approvable: result.autoApprovable,
    });

    if (verification) {
      await this.evidenceService.addEvidence(
        {
          verification_id: verification.id,
          merchant_id: merchantId,
          evidence_type: EvidenceType.Json,
          label: "Progressive Verification — sinais automáticos comparados com os dados da loja",
          content: JSON.stringify(result.signals),
        },
        submittedByUserId
      );
    }

    const claim = await this.claimRepo.create({
      merchantId,
      storeId,
      status: result.autoApprovable ? ClaimStatus.Approved : ClaimStatus.AwaitingReview,
      claimantName: input.name,
      claimantPhone: input.phone,
      claimantEmail: input.email,
      claimantRole: input.role,
      automatedConfidence: result.confidence,
      signalBreakdown: result.signals,
      verificationId: verification?.id ?? null,
    });

    await this.eventService.recordEvent(toCreateEventInput(claimRequestedEvent(merchantId, storeId, claim.id)));

    if (result.autoApprovable) {
      await this.storeLinkRepo.link(merchantId, storeId);
      if (verification) await this.verificationService.approveVerification(verification.id, submittedByUserId);
      await this.eventService.recordEvent(
        toCreateEventInput(ownershipVerifiedEvent(merchantId, storeId, claim.id, true))
      );
    }

    return claim;
  }

  async cancel(claimId: string, merchantId: string): Promise<void> {
    const claim = await this.claimRepo.findById(claimId);
    if (!claim || claim.merchantId !== merchantId) return;
    if (claim.status !== ClaimStatus.Pending && claim.status !== ClaimStatus.AwaitingReview) return;

    await this.claimRepo.updateStatus(claimId, { status: ClaimStatus.Cancelled });
    await this.eventService.recordEvent(toCreateEventInput(claimCancelledEvent(merchantId, claimId)));
  }

  // Admin action — approve. Only meaningful for a claim still awaiting
  // review (auto-approved claims never reach this path).
  async approve(claimId: string, adminId: string): Promise<StoreClaim | null> {
    const claim = await this.claimRepo.findById(claimId);
    if (!claim || claim.status !== ClaimStatus.AwaitingReview) return null;

    await this.storeLinkRepo.link(claim.merchantId, claim.storeId);
    if (claim.verificationId) await this.verificationService.approveVerification(claim.verificationId, adminId);
    await this.claimRepo.updateStatus(claimId, { status: ClaimStatus.Approved, reviewedBy: adminId });

    await this.eventService.recordEvent(
      toCreateEventInput(ownershipVerifiedEvent(claim.merchantId, claim.storeId, claimId, false))
    );

    return this.claimRepo.findById(claimId);
  }

  async reject(claimId: string, adminId: string, reason: string): Promise<StoreClaim | null> {
    const claim = await this.claimRepo.findById(claimId);
    if (!claim || claim.status !== ClaimStatus.AwaitingReview) return null;

    if (claim.verificationId) await this.verificationService.rejectVerification(claim.verificationId, adminId, reason);
    await this.claimRepo.updateStatus(claimId, { status: ClaimStatus.Rejected, reviewedBy: adminId, rejectionReason: reason });

    await this.eventService.recordEvent(toCreateEventInput(ownershipRejectedEvent(claim.merchantId, claimId, reason)));

    return this.claimRepo.findById(claimId);
  }

  async requestInfo(claimId: string, note: string): Promise<StoreClaim | null> {
    const claim = await this.claimRepo.findById(claimId);
    if (!claim) return null;
    await this.claimRepo.addAdminNote(claimId, note);
    return this.claimRepo.findById(claimId);
  }

  // Revokes ownership after the fact — the claim's own history stays
  // Approved (it WAS legitimately approved at the time); what's reverted is
  // the merchant_stores link + the verification. Never deletes the claim
  // record (auditoria append-only).
  async revoke(claimId: string, adminId: string, reason: string): Promise<StoreClaim | null> {
    const claim = await this.claimRepo.findById(claimId);
    if (!claim || claim.status !== ClaimStatus.Approved) return null;

    await this.storeLinkRepo.unlink(claim.merchantId, claim.storeId);
    if (claim.verificationId) await this.verificationService.revokeVerification(claim.verificationId, adminId, reason);

    await this.eventService.recordEvent(toCreateEventInput(ownershipRevokedEvent(claim.merchantId, claim.storeId, reason)));

    return this.claimRepo.findById(claimId);
  }
}
