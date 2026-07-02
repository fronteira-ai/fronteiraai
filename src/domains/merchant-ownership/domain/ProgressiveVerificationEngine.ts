import type { ClaimantInput, ProgressiveVerificationResult, SignalCheckResult, StoreChannels } from "../types/merchant-ownership.types";

// Epic C — Progressive Verification (mission): never ask for documents up
// front. Automated = comparing what the claimant submits against what the
// store already has on file (email domain, phone, WhatsApp, website,
// Instagram) — no calls to Meta Graph API / WhatsApp Business API, which
// this environment has no credentials for (confirmed with the CTO). No
// Facebook check — `stores` has no `facebook` column; adding one is out of
// scope for this domain, documented gap rather than a silent omission.
//
// Explainable by construction, same discipline as Waves 3/4's
// ProductIdentityEngine/OfferRankingService: every signal is recorded with
// its own evidence, matched or not, and a signal the store has no data for
// is marked "not applicable" rather than silently penalized — a claimant
// isn't punished for the store's incomplete data.
//
// Anti-fraud mechanism (mission: "extremamente difícil para um impostor"):
// a claim with everything mismatched scores 0 confidence and is never
// auto-approved, regardless of how many fields were filled in.

const WEIGHTS = {
  emailDomain: 30,
  phone: 25,
  whatsapp: 20,
  website: 15,
  instagram: 10,
} as const;

const AUTO_APPROVE_THRESHOLD = 80;
// Below this much *applicable* weight, there isn't enough store data to
// trust an automated decision either way — always routes to review.
const MIN_APPLICABLE_WEIGHT = 45;

function extractDomain(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed.includes("@")) return trimmed.split("@")[1]?.trim() || null;
  try {
    const url = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function normalizePhone(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  // Compares the last 8 digits — tolerant of country/area code formatting
  // differences (+595, 0, parentheses, dashes, etc.) between what the store
  // has on file and what the claimant types.
  return digits.length >= 8 ? digits.slice(-8) : null;
}

function normalizeInstagramHandle(value: string | null | undefined): string | null {
  if (!value) return null;
  const handle = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, "")
    .replace(/^@/, "")
    .replace(/\/$/, "");
  return handle || null;
}

interface SignalOutcome {
  applicable: boolean;
  matched: boolean;
  evidence: string;
}

interface SignalDefinition {
  signal: string;
  weight: number;
  check: (input: ClaimantInput, store: StoreChannels) => SignalOutcome;
}

const SIGNAL_DEFINITIONS: SignalDefinition[] = [
  {
    signal: "email_domain",
    weight: WEIGHTS.emailDomain,
    check: (input, store) => {
      const storeDomain = extractDomain(store.website);
      if (!storeDomain) return { applicable: false, matched: false, evidence: "loja não tem website cadastrado" };
      const claimantDomain = extractDomain(input.email);
      const matched = claimantDomain !== null && claimantDomain === storeDomain;
      return {
        applicable: true,
        matched,
        evidence: matched
          ? `domínio do e-mail "${claimantDomain}" corresponde ao website da loja`
          : `domínio do e-mail "${claimantDomain ?? "?"}" difere do website da loja "${storeDomain}"`,
      };
    },
  },
  {
    signal: "phone",
    weight: WEIGHTS.phone,
    check: (input, store) => {
      const storePhone = normalizePhone(store.phone);
      if (!storePhone) return { applicable: false, matched: false, evidence: "loja não tem telefone cadastrado" };
      const matched = normalizePhone(input.phone) === storePhone;
      return { applicable: true, matched, evidence: matched ? "telefone corresponde ao cadastrado na loja" : "telefone difere do cadastrado na loja" };
    },
  },
  {
    signal: "whatsapp",
    weight: WEIGHTS.whatsapp,
    check: (input, store) => {
      const storeWhatsapp = normalizePhone(store.whatsapp);
      if (!storeWhatsapp || !input.whatsapp) {
        return { applicable: false, matched: false, evidence: "WhatsApp não informado pela loja ou pelo requerente" };
      }
      const matched = normalizePhone(input.whatsapp) === storeWhatsapp;
      return { applicable: true, matched, evidence: matched ? "WhatsApp corresponde ao cadastrado na loja" : "WhatsApp difere do cadastrado na loja" };
    },
  },
  {
    signal: "website",
    weight: WEIGHTS.website,
    check: (input, store) => {
      const storeDomain = extractDomain(store.website);
      if (!storeDomain || !input.website) {
        return { applicable: false, matched: false, evidence: "website não informado pela loja ou pelo requerente" };
      }
      const matched = extractDomain(input.website) === storeDomain;
      return { applicable: true, matched, evidence: matched ? "website corresponde ao cadastrado na loja" : "website difere do cadastrado na loja" };
    },
  },
  {
    signal: "instagram",
    weight: WEIGHTS.instagram,
    check: (input, store) => {
      const storeHandle = normalizeInstagramHandle(store.instagram);
      if (!storeHandle || !input.instagram) {
        return { applicable: false, matched: false, evidence: "Instagram não informado pela loja ou pelo requerente" };
      }
      const matched = normalizeInstagramHandle(input.instagram) === storeHandle;
      return { applicable: true, matched, evidence: matched ? "Instagram corresponde ao cadastrado na loja" : "Instagram difere do cadastrado na loja" };
    },
  },
];

export class ProgressiveVerificationEngine {
  evaluate(input: ClaimantInput, store: StoreChannels): ProgressiveVerificationResult {
    const signals: SignalCheckResult[] = [];
    let earnedWeight = 0;
    let applicableWeight = 0;

    for (const definition of SIGNAL_DEFINITIONS) {
      const outcome = definition.check(input, store);
      if (!outcome.applicable) {
        signals.push({ signal: definition.signal, matched: false, weight: 0, evidence: outcome.evidence });
        continue;
      }
      applicableWeight += definition.weight;
      if (outcome.matched) earnedWeight += definition.weight;
      signals.push({ signal: definition.signal, matched: outcome.matched, weight: outcome.matched ? definition.weight : 0, evidence: outcome.evidence });
    }

    const confidence = applicableWeight > 0 ? Math.round((earnedWeight / applicableWeight) * 100) : 0;
    const autoApprovable = confidence >= AUTO_APPROVE_THRESHOLD && applicableWeight >= MIN_APPLICABLE_WEIGHT;

    return { confidence, autoApprovable, signals };
  }
}
