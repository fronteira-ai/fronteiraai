import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SupabaseBuyerRepository,
  SupabaseBuyerConsentRepository,
  BuyerIdentityService,
  BuyerConsentService,
} from "@/src/domains/buyer-identity";

// Release 2.0 — Wave 1. Same composition pattern as every other
// lib/*-factory.ts.
export function createBuyerIdentityServices(client: SupabaseClient) {
  const buyerRepo = new SupabaseBuyerRepository(client);
  const consentRepo = new SupabaseBuyerConsentRepository(client);

  const buyerIdentityService = new BuyerIdentityService(buyerRepo);
  const buyerConsentService = new BuyerConsentService(consentRepo);

  return { buyerRepo, consentRepo, buyerIdentityService, buyerConsentService };
}
