import type { TrustSignalRecord } from "../types/trust.types";
import { TrustSignalStatus } from "../types/enums";

export class TrustSignalEntity {
  constructor(private readonly record: TrustSignalRecord) {}

  get id() { return this.record.id; }
  get merchantId() { return this.record.merchant_id; }
  get signalType() { return this.record.signal_type; }
  get status() { return this.record.status; }
  get category() { return this.record.category; }
  get title() { return this.record.title; }
  get description() { return this.record.description; }
  get evidenceSummary() { return this.record.evidence_summary; }
  get isPublic() { return this.record.is_public; }
  get verificationId() { return this.record.verification_id; }
  get issuedAt() { return this.record.issued_at; }
  get expiresAt() { return this.record.expires_at; }

  isActive(): boolean {
    if (this.record.status !== TrustSignalStatus.Active) return false;
    if (!this.record.expires_at) return true;
    return new Date(this.record.expires_at) > new Date();
  }

  toRecord(): TrustSignalRecord {
    return { ...this.record };
  }
}
