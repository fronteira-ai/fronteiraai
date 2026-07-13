import type { Buyer } from "../domain/Buyer";
import type { IBuyerRepository } from "../repositories/IBuyerRepository";

/**
 * Release 2.0 — Wave 1. The two ways a Buyer comes into existence, per
 * RELEASE_1_8_BUYER_IDENTITY_MODEL.md §3-4: "Buyer Conhecido" (email
 * captured, e.g. for a price alert, no password yet) and "Buyer
 * Autenticado" (real Supabase Auth account). Both converge on the same
 * `buyers.id` — authUserId is simply attached later for the first case,
 * never a second identity created.
 *
 * Deliberately thin: no signup UI, no session handling, no notification
 * delivery — this Wave stands up the identity domain itself (schema +
 * find-or-create), not the full account experience (a later Wave, per the
 * approved plan).
 */
export class BuyerIdentityService {
  constructor(private readonly buyerRepo: IBuyerRepository) {}

  async getById(id: string): Promise<Buyer | null> {
    return this.buyerRepo.findById(id);
  }

  async getByAuthUserId(authUserId: string): Promise<Buyer | null> {
    return this.buyerRepo.findByAuthUserId(authUserId);
  }

  /** "Buyer Autenticado" path — a real Supabase Auth session already
   * exists (authUserId is a confirmed auth.users.id); find-or-create is
   * idempotent so this is safe to call on every authenticated request. */
  async findOrCreateForAuthUser(authUserId: string, email: string | null): Promise<Buyer | null> {
    const existing = await this.buyerRepo.findByAuthUserId(authUserId);
    if (existing) return existing;
    return this.buyerRepo.create({ authUserId, email });
  }

  /** "Buyer Conhecido" path — only an email exists (e.g. captured for a
   * price alert before any account is created). Idempotent by email so a
   * repeated capture (same email, different alert) never creates a
   * duplicate identity. */
  async findOrCreateForEmail(email: string): Promise<Buyer | null> {
    const existing = await this.buyerRepo.findByEmail(email);
    if (existing) return existing;
    return this.buyerRepo.create({ email });
  }

  /** Bridges a "Buyer Conhecido" into "Buyer Autenticado" once they create
   * real credentials — same buyers.id throughout, per the doc's identifier
   * table (buyers.id never changes, never re-created). */
  async linkAuthUser(buyerId: string, authUserId: string): Promise<Buyer | null> {
    return this.buyerRepo.linkAuthUser(buyerId, authUserId);
  }

  async markEmailVerified(buyerId: string): Promise<Buyer | null> {
    return this.buyerRepo.markEmailVerified(buyerId);
  }

  /** LGPD right to erasure — anonymizes in place, never deletes the row
   * (ADR-045/046: the id is a stable tombstone so behavioral history
   * already joined on buyer_id doesn't silently orphan or disappear). */
  async anonymize(buyerId: string): Promise<Buyer | null> {
    return this.buyerRepo.anonymize(buyerId);
  }
}
