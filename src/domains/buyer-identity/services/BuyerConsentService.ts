import type { BuyerConsentRecord } from "../repositories/IBuyerConsentRepository";
import type { IBuyerConsentRepository } from "../repositories/IBuyerConsentRepository";

/**
 * Release 2.0 — Wave 1. The compliance proof-of-consent log
 * (buyer_consent_log — append-only, never anonymized, ADR-045/046 §8).
 * This service intentionally has no update/revoke method that mutates a
 * past record — "revoking" consent is recording a NEW row with
 * granted=false, exactly like the repository contract requires.
 */
export class BuyerConsentService {
  constructor(private readonly consentRepo: IBuyerConsentRepository) {}

  async grant(buyerId: string, consentType: string, metadata?: Record<string, unknown>): Promise<BuyerConsentRecord | null> {
    return this.consentRepo.record({ buyerId, consentType, granted: true, metadata });
  }

  async revoke(buyerId: string, consentType: string, metadata?: Record<string, unknown>): Promise<BuyerConsentRecord | null> {
    return this.consentRepo.record({ buyerId, consentType, granted: false, metadata });
  }

  async hasCurrentConsent(buyerId: string, consentType: string): Promise<boolean> {
    const current = await this.consentRepo.findCurrentByBuyerId(buyerId);
    return current.get(consentType)?.granted ?? false;
  }

  async getHistory(buyerId: string): Promise<BuyerConsentRecord[]> {
    return this.consentRepo.findByBuyerId(buyerId);
  }
}
