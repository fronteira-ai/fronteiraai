import type { StoreClaim } from "../domain/StoreClaim";
import { ClaimStatus } from "../types/enums";
import type { PaginatedResult, PaginationParams, SignalCheckResult } from "../types/merchant-ownership.types";

export interface CreateStoreClaimInput {
  merchantId: string;
  storeId: string;
  status: ClaimStatus;
  claimantName: string;
  claimantPhone: string;
  claimantEmail: string;
  claimantRole: string;
  automatedConfidence: number;
  signalBreakdown: SignalCheckResult[];
  verificationId: string | null;
}

export interface UpdateStoreClaimStatusInput {
  status: ClaimStatus;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface IStoreClaimRepository {
  create(input: CreateStoreClaimInput): Promise<StoreClaim>;
  findById(id: string): Promise<StoreClaim | null>;
  findByMerchantId(merchantId: string): Promise<StoreClaim[]>;
  findByStoreId(storeId: string): Promise<StoreClaim[]>;
  /** Used to prevent a merchant from opening a second active claim on a store they already have one pending for. */
  findActiveByStoreAndMerchant(storeId: string, merchantId: string): Promise<StoreClaim | null>;
  findByStatus(status: ClaimStatus, pagination: PaginationParams): Promise<PaginatedResult<StoreClaim>>;
  updateStatus(id: string, input: UpdateStoreClaimStatusInput): Promise<void>;
  /** "Solicitar informação adicional" (Epic F) — doesn't change status. */
  addAdminNote(id: string, note: string): Promise<void>;
}
