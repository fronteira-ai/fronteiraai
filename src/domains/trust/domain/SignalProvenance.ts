import type { SignalProvenanceRecord } from "../types/trust.types";

export class SignalProvenance {
  constructor(private readonly record: SignalProvenanceRecord) {}

  get id() { return this.record.id; }
  get signalId() { return this.record.signal_id; }
  get merchantId() { return this.record.merchant_id; }
  get generatedBy() { return this.record.generated_by; }
  get verificationId() { return this.record.verification_id; }
  get trustLevel() { return this.record.trust_level; }
  get isAuditable() { return this.record.is_auditable; }
  get evidenceSummary() { return this.record.evidence_summary; }
  get howObtained() { return this.record.how_obtained; }

  toRecord(): SignalProvenanceRecord {
    return { ...this.record };
  }
}
