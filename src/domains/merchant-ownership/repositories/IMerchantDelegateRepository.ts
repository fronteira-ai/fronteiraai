import type { MerchantDelegate } from "../domain/MerchantDelegate";
import type { DelegateRole, DelegateStatus } from "../types/enums";

export interface CreateDelegateInput {
  merchantId: string;
  invitedEmail: string;
  role: DelegateRole;
  inviteToken: string;
  invitedBy: string;
}

export interface IMerchantDelegateRepository {
  create(input: CreateDelegateInput): Promise<MerchantDelegate>;
  findById(id: string): Promise<MerchantDelegate | null>;
  findByToken(inviteToken: string): Promise<MerchantDelegate | null>;
  findByMerchantId(merchantId: string): Promise<MerchantDelegate[]>;
  /** Resolves the merchant a logged-in delegate acts for — used by requireMerchantContext(). */
  findActiveByUserId(userId: string): Promise<MerchantDelegate | null>;
  accept(id: string, userId: string): Promise<void>;
  updateStatus(id: string, status: DelegateStatus): Promise<void>;
}
