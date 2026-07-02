import Link from "next/link";
import { Store } from "lucide-react";

// Epic B — Smart Claim Flow entry point. Shown only when a store has no
// `merchant_stores` row yet (the exact "unclaimed" invariant Discovery
// already established in migration 0023 — a join absence, not a flag).
export default function ClaimStoreButton({ storeSlug }: { storeSlug: string }) {
  return (
    <Link
      href={`/merchant/claim/${storeSlug}`}
      className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20"
    >
      <Store className="h-4 w-4" />
      Esta loja é minha
    </Link>
  );
}
