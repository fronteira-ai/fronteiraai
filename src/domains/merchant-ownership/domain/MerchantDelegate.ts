import type { DelegateRole, DelegateStatus } from "../types/enums";

export interface MerchantDelegate {
  id: string;
  merchantId: string;
  invitedEmail: string;
  userId: string | null;
  role: DelegateRole;
  status: DelegateStatus;
  inviteToken: string;
  invitedBy: string;
  invitedAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
}
