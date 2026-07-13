import type { Buyer } from "../domain/Buyer";

export interface CreateBuyerInput {
  authUserId?: string | null;
  email?: string | null;
  displayName?: string | null;
  phone?: string | null;
  marketingOptIn?: boolean;
}

export interface IBuyerRepository {
  findById(id: string): Promise<Buyer | null>;
  findByAuthUserId(authUserId: string): Promise<Buyer | null>;
  findByEmail(email: string): Promise<Buyer | null>;
  create(input: CreateBuyerInput): Promise<Buyer | null>;
  /** Links a "Buyer Conhecido" (email only, authUserId null) to a real
   * Supabase Auth account once one is created — never the other way
   * around, and never via ON DELETE CASCADE (see Buyer.ts). */
  linkAuthUser(id: string, authUserId: string): Promise<Buyer | null>;
  markEmailVerified(id: string): Promise<Buyer | null>;
  /** LGPD right to erasure: sets anonymizedAt, clears PII fields, keeps the
   * row (and its id) so behavioral history joined on buyer_id survives as
   * a pseudonymous tombstone (ADR-045/046) — never a DELETE. */
  anonymize(id: string): Promise<Buyer | null>;
}
