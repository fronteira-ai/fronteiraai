// Release 2.0 — Wave 1 (Buyer Identity Model, ADR-045/046).
// Aggregate root, independent of auth.users/profiles by design
// (docs/product/releases/RELEASE_1_8_BUYER_IDENTITY_MODEL.md §3):
// - authUserId is nullable — a "Buyer Conhecido" (email captured, no
//   password) can exist before any auth.users row does.
// - Never ON DELETE CASCADE from auth.users — this identity survives
//   account deletion, anonymized (see anonymizedAt), so the behavioral
//   history it accumulated (C-6 Buyer Behavioral Knowledge) isn't lost
//   when a buyer deletes their login.
export interface Buyer {
  id: string;
  authUserId: string | null;
  email: string | null;
  emailVerifiedAt: string | null;
  displayName: string | null;
  phone: string | null;
  marketingOptIn: boolean;
  anonymizedAt: string | null;
  createdAt: string;
}
