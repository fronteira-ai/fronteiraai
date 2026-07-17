// Program Ω — Implementation Phase, Mission Ω-1. Event SHAPES only — no
// publish/subscribe mechanism exists or is wired here. Event Engine
// (docs/architecture/INCREMENTAL_ARCHITECTURE_CONSTITUTION.md, Article 1)
// is explicitly out of scope for this Mission ("NÃO implementa Event
// Engine"). These types exist so a future Event Engine Mission has an
// exact, already-reviewed contract to implement against, matching the
// Event Catalog (Constitution, Article 4) — nothing here is instantiated
// or emitted by any code in this Mission.

import type { FactType } from "../types/enums";

/** Constitution Article 4: origin = Marketplace Memory, consumers = every
 * downstream domain (Opportunity, Buyer Intelligence, Search, Advisor,
 * future Connectors, Merchant Integration, Knowledge Graph). */
export interface KnowledgeLearnedEvent {
  type: "KnowledgeLearned";
  canonicalProductId: string;
  factType: FactType;
  factValue: string;
  algorithmVersion: string;
  learnedAt: string;
}

/** Constitution Article 4: origin = Marketplace Memory (via Merchant
 * Learning), consumers = Connector Platform (future syncs of the same
 * merchant). */
export interface MerchantLearnedEvent {
  type: "MerchantLearned";
  storeId: string;
  rawKey: string;
  concept: string;
  occurrences: number;
  learnedAt: string;
}

export type MarketplaceMemoryEvent = KnowledgeLearnedEvent | MerchantLearnedEvent;
