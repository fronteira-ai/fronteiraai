// Public API of the Buyer Identity domain (Release 2.0 — Wave 1, ADR-045/046).
// Standalone identity domain — never reuses `profiles`/`auth.users` as the
// canonical id (see docs/product/releases/RELEASE_1_8_BUYER_IDENTITY_MODEL.md
// §3 for why). No other domain in src/domains/ imports from here yet — this
// Wave stands up the schema/domain itself, not its consumers (Favorites
// sync, Alerts delivery, Reviews) — those are later Waves per the approved
// plan.

export type { Buyer } from "./domain/Buyer";

export type { IBuyerRepository, CreateBuyerInput } from "./repositories/IBuyerRepository";
export type {
  IBuyerConsentRepository,
  BuyerConsentRecord,
  RecordConsentInput,
} from "./repositories/IBuyerConsentRepository";

export { SupabaseBuyerRepository } from "./infrastructure/SupabaseBuyerRepository";
export { SupabaseBuyerConsentRepository } from "./infrastructure/SupabaseBuyerConsentRepository";

export { BuyerIdentityService } from "./services/BuyerIdentityService";
export { BuyerConsentService } from "./services/BuyerConsentService";
