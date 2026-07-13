export interface BuyerConsentRecord {
  id: string;
  buyerId: string;
  consentType: string;
  granted: boolean;
  metadata: Record<string, unknown>;
  recordedAt: string;
}

export interface RecordConsentInput {
  buyerId: string;
  consentType: string;
  granted: boolean;
  metadata?: Record<string, unknown>;
}

// Append-only — deliberately no update/delete method. buyer_consent_log
// (migration 20260713120000_buyer_identity.sql) has no UPDATE/DELETE RLS
// policy at all; this interface mirrors that at the domain boundary so no
// caller can even attempt to mutate a past consent record. A change of
// mind is always a NEW row (granted: false), never an edit of the old one
// — the log itself is the compliance proof.
export interface IBuyerConsentRepository {
  record(input: RecordConsentInput): Promise<BuyerConsentRecord | null>;
  findByBuyerId(buyerId: string): Promise<BuyerConsentRecord[]>;
  /** Current standing per consent type — the most recent row wins. */
  findCurrentByBuyerId(buyerId: string): Promise<Map<string, BuyerConsentRecord>>;
}
