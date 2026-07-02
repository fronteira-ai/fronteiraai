// Deliberately self-contained shapes (no import from `@/types/store` or
// `@/types/merchant`) — same domain-boundary convention already used by
// connectors/product-identity/canonical-catalog.

// The store's already-known channels (all columns confirmed to exist on
// `stores`: email, phone, whatsapp, website, instagram). No `facebook`
// column exists yet — the Facebook signal from the mission is deliberately
// not checked this Wave; documented gap, not a silent omission.
export interface StoreChannels {
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  instagram: string | null;
}

// What the claimant submits in the Smart Claim Flow form.
export interface ClaimantInput {
  name: string;
  role: string;
  email: string;
  phone: string;
  whatsapp?: string | null;
  website?: string | null;
  instagram?: string | null;
}

export interface SignalCheckResult {
  signal: string;
  matched: boolean;
  weight: number;
  evidence: string;
}

export interface ProgressiveVerificationResult {
  confidence: number;
  autoApprovable: boolean;
  signals: SignalCheckResult[];
}

export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}
