// Mission 03 (Decision Engine). `condition` is written by every connector on
// both insert and update (src/domains/connectors/infrastructure/
// SupabaseCatalogRepository.ts updateOffer/upsertOffer both set it), so
// unlike `old_price` (see below) it stays fresh on every real sync — safe to
// surface as-is. Only the three values our own admin form writes get a
// friendly label; anything else (a merchant-specific raw string a connector
// passed through unnormalized) is shown verbatim rather than guessed at.
const CONDITION_LABELS: Record<string, string> = {
  new: "Novo",
  used: "Usado",
  refurbished: "Recondicionado",
};

export function formatOfferCondition(condition: string | null): string | null {
  if (!condition) return null;
  const trimmed = condition.trim();
  if (trimmed.length === 0) return null;
  return CONDITION_LABELS[trimmed.toLowerCase()] ?? trimmed;
}

// `old_price` is deliberately NOT used for a "price dropped" badge here.
// SupabaseCatalogRepository.updateOffer — the path every real connector sync
// takes for an offer that already exists — never writes old_price (a known,
// documented quirk, unfixed since Release 1.7). Building a discount badge on
// a field that structurally stops updating after the first sync would show
// a stale or absent comparison as if it were a live one — exactly the kind
// of unverifiable claim Mission 03's "não faça suposições" rule forbids.
