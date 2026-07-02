import { ProgressiveVerificationEngine } from "../domain/ProgressiveVerificationEngine";
import type { ClaimantInput, StoreChannels } from "../types/merchant-ownership.types";

function makeStore(overrides: Partial<StoreChannels> = {}): StoreChannels {
  return {
    email: "contato@lojaacme.com",
    phone: "+595981234567",
    whatsapp: "+595981234567",
    website: "https://www.lojaacme.com",
    instagram: "@lojaacme",
    ...overrides,
  };
}

function makeClaimant(overrides: Partial<ClaimantInput> = {}): ClaimantInput {
  return {
    name: "Maria Souza",
    role: "Proprietária",
    email: "maria@lojaacme.com",
    phone: "+595 98 123-4567",
    whatsapp: "0981234567",
    website: "lojaacme.com",
    instagram: "https://instagram.com/lojaacme/",
    ...overrides,
  };
}

describe("ProgressiveVerificationEngine", () => {
  const engine = new ProgressiveVerificationEngine();

  it("auto-approves a legitimate claimant whose submitted info matches the store's channels", () => {
    const result = engine.evaluate(makeClaimant(), makeStore());

    expect(result.confidence).toBeGreaterThanOrEqual(80);
    expect(result.autoApprovable).toBe(true);
    expect(result.signals.every((s) => s.matched || !s.weight)).toBe(true);
  });

  it("never auto-approves an impostor whose info matches nothing (anti-fraud)", () => {
    const impostor = makeClaimant({
      email: "random@gmail.com",
      phone: "+595 99 000-0000",
      whatsapp: "0990000000",
      website: "totally-different-site.com",
      instagram: "@someoneelse",
    });

    const result = engine.evaluate(impostor, makeStore());

    expect(result.confidence).toBe(0);
    expect(result.autoApprovable).toBe(false);
    expect(result.signals.filter((s) => s.matched)).toEqual([]);
  });

  it("routes to review when the store has too little data to check against, even with a perfect single match", () => {
    // Only phone is known on the store side — one matching signal alone
    // (weight 25) is below MIN_APPLICABLE_WEIGHT, so it can't auto-approve
    // even at 100% confidence of what little was checkable.
    const store = makeStore({ email: null, whatsapp: null, website: null, instagram: null });
    const claimant = makeClaimant({ phone: store.phone! });

    const result = engine.evaluate(claimant, store);

    expect(result.confidence).toBe(100);
    expect(result.autoApprovable).toBe(false);
  });

  it("marks a signal as not applicable (not mismatched) when the store has no data for it", () => {
    const store = makeStore({ instagram: null });
    const result = engine.evaluate(makeClaimant(), store);

    const instagramSignal = result.signals.find((s) => s.signal === "instagram");
    expect(instagramSignal?.matched).toBe(false);
    expect(instagramSignal?.evidence).toContain("não informado");
  });

  it("is tolerant of phone formatting differences (spaces, dashes, country code)", () => {
    const store = makeStore({ phone: "0981234567", whatsapp: null, website: null, instagram: null, email: null });
    const claimant = makeClaimant({ phone: "+595 (98) 123-4567" });

    const result = engine.evaluate(claimant, store);
    const phoneSignal = result.signals.find((s) => s.signal === "phone");
    expect(phoneSignal?.matched).toBe(true);
  });

  it("compares email domain against the store's website domain, not full string equality", () => {
    const store = makeStore({ website: "https://lojaacme.com.py", phone: null, whatsapp: null, instagram: null });
    const claimant = makeClaimant({ email: "financeiro@lojaacme.com.py" });

    const result = engine.evaluate(claimant, store);
    const emailSignal = result.signals.find((s) => s.signal === "email_domain");
    expect(emailSignal?.matched).toBe(true);
  });
});
