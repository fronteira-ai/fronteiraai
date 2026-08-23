// Sprint 39A — Home 2.0 Foundation (Store Trust Foundation).
//
// View-model de confiança de loja baseado APENAS em dados reais. Regra da
// Sprint (Trust Must Be Evidence-Based): nunca derivar "seguro", "protegido"
// ou "garantido" de rating/score — os rótulos aqui saem exclusivamente dos
// campos reais (`is_verified`, `verified_level`, `merchant_score`,
// `offer_count`) e são `null` quando o dado não existe.
//
// Fonte dos campos: `stores` (is_verified, rating) + `merchant_stores`/`
// merchants` (merchant_score, verified_level) + contagem de `offers`, como já
// resolvido por services/stores-public.service.ts (StorePublicData).

import type { Store } from "@/types/store";

export interface StoreTrustEvidence {
  merchantScore?: number | null;
  verifiedLevel?: string | null;
  offerCount?: number | null;
}

export interface StoreTrustView {
  isVerified: boolean;
  verifiedLevel: string | null;
  merchantScore: number | null;
  offerCount: number;
  rating: number;
  /** Rótulo apenas quando há evidência de verificação: usa o nível real se
   * existir, senão o genérico "Loja verificada". `null` = sem evidência. */
  verifiedLabel: string | null;
  /** Score real formatado como número inteiro (sem sufixo inventado).
   * `null` = sem score. */
  scoreLabel: string | null;
}

export function buildStoreTrustView(
  store: Pick<Store, "is_verified" | "rating">,
  evidence: StoreTrustEvidence = {}
): StoreTrustView {
  const isVerified = store.is_verified === true;
  const verifiedLevel = evidence.verifiedLevel ?? null;
  const merchantScore = evidence.merchantScore ?? null;
  const offerCount = evidence.offerCount ?? 0;
  const rating = store.rating ?? 0;

  const verifiedLabel = isVerified ? (verifiedLevel ?? "Loja verificada") : null;

  const hasRealScore =
    typeof merchantScore === "number" && Number.isFinite(merchantScore);
  const scoreLabel = hasRealScore ? String(Math.round(merchantScore as number)) : null;

  return {
    isVerified,
    verifiedLevel,
    merchantScore,
    offerCount,
    rating,
    verifiedLabel,
    scoreLabel,
  };
}
