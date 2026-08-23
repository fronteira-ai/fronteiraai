import { buildStoreTrustView } from "@/utils/storeTrust";

describe("buildStoreTrustView", () => {
  it("loja verificada sem nível → rótulo genérico, sem score inventado", () => {
    const view = buildStoreTrustView({ is_verified: true, rating: 4.5 }, {});
    expect(view.isVerified).toBe(true);
    expect(view.verifiedLabel).toBe("Loja verificada");
    expect(view.scoreLabel).toBeNull();
    expect(view.merchantScore).toBeNull();
  });

  it("loja verificada com nível real → usa o nível", () => {
    const view = buildStoreTrustView({ is_verified: true, rating: 4.5 }, { verifiedLevel: "Ouro" });
    expect(view.verifiedLabel).toBe("Ouro");
  });

  it("loja não verificada → nenhum rótulo de verificação", () => {
    const view = buildStoreTrustView({ is_verified: false, rating: 3.0 }, { verifiedLevel: "Ouro" });
    expect(view.isVerified).toBe(false);
    expect(view.verifiedLabel).toBeNull();
  });

  it("score só aparece quando é número real finito", () => {
    expect(buildStoreTrustView({ is_verified: true, rating: 4 }, { merchantScore: 87.4 }).scoreLabel).toBe("87");
    expect(buildStoreTrustView({ is_verified: true, rating: 4 }, { merchantScore: null }).scoreLabel).toBeNull();
    expect(buildStoreTrustView({ is_verified: true, rating: 4 }, { merchantScore: NaN }).scoreLabel).toBeNull();
  });

  it("nunca deriva 'seguro/protegido/garantido' de rating ou score", () => {
    const view = buildStoreTrustView({ is_verified: true, rating: 5 }, { merchantScore: 100 });
    expect(view.verifiedLabel ?? "").not.toMatch(/segur|protegid|garantid/i);
    expect(view.scoreLabel ?? "").not.toMatch(/segur|protegid|garantid/i);
  });

  it("propaga contagem de ofertas e rating reais", () => {
    const view = buildStoreTrustView({ is_verified: false, rating: 4.2 }, { offerCount: 137 });
    expect(view.offerCount).toBe(137);
    expect(view.rating).toBe(4.2);
  });
});
