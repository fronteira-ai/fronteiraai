import type { TrustSignalRecord, PaginatedResult, PaginationOptions } from "../types/trust.types";
import type { TrustSignalStatus } from "../types/enums";

export interface ITrustSignalRepository {
  findByMerchantId(merchantId: string, options?: PaginationOptions): Promise<PaginatedResult<TrustSignalRecord>>;
  findActiveByMerchantId(merchantId: string): Promise<TrustSignalRecord[]>;
  findById(id: string): Promise<TrustSignalRecord | null>;
  findByVerificationId(verificationId: string): Promise<TrustSignalRecord | null>;
  create(input: Omit<TrustSignalRecord, "id" | "created_at" | "last_updated_at">): Promise<TrustSignalRecord | null>;
  updateStatus(id: string, status: TrustSignalStatus): Promise<TrustSignalRecord | null>;
  update(id: string, patch: Partial<TrustSignalRecord>): Promise<TrustSignalRecord | null>;
}
