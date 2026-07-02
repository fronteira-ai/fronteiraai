export interface UpgradeLead {
  id: string;
  merchantId: string;
  triggerContext: string;
  createdAt: string;
}

// Epic H — Premium Upgrade Journey (lead-capture, no billing — ADR-035).
// Append-only by convention: no update/delete method exists here, same
// structural-safety pattern already used for Wave 3/4's audit tables.
export interface IUpgradeLeadRepository {
  create(merchantId: string, triggerContext: string): Promise<UpgradeLead>;
  findByMerchantId(merchantId: string): Promise<UpgradeLead[]>;
}
