import type { ClaimStatus } from "../types/enums";
import type { SignalCheckResult } from "../types/merchant-ownership.types";

// A claim is always a suggestion of ownership pending verification — never
// a union/merge concept (that's Canonical Catalog's MergeCandidate, a
// different domain entirely). Approval is the only thing that creates a
// `merchant_stores` row (see ClaimService.approve).
export interface StoreClaim {
  id: string;
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
  rejectionReason: string | null;
  /** Set by the admin action "Solicitar informação adicional" — doesn't change status. */
  adminNote: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
}
