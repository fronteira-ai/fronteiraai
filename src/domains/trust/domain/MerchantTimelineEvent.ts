import type { MerchantTimelineRecord } from "../types/trust.types";
import { TimelineVisibility } from "../types/enums";

export class MerchantTimelineEvent {
  constructor(private readonly record: MerchantTimelineRecord) {}

  get id() { return this.record.id; }
  get merchantId() { return this.record.merchant_id; }
  get eventType() { return this.record.event_type; }
  get title() { return this.record.title; }
  get category() { return this.record.category; }
  get visibility() { return this.record.visibility; }
  get occurredAt() { return this.record.occurred_at; }
  get referenceId() { return this.record.reference_id; }
  get referenceType() { return this.record.reference_type; }

  isPublic(): boolean {
    return this.record.visibility === TimelineVisibility.Public;
  }

  toRecord(): MerchantTimelineRecord {
    return { ...this.record };
  }
}
