import { scoreOffer, getHealthBreakdown } from "../services/ProductHealthService";
import { ProductHealthStatus, ProductDiagnosisType } from "../types/enums";

type OfferRow = Parameters<typeof scoreOffer>[0];

function completeOffer(): OfferRow {
  return {
    id: "offer-1",
    in_stock: true,
    price_usd: 100,
    products: {
      id: "product-1",
      name: "Produto Completo",
      image_url: "https://example.com/img.jpg",
      category_id: "cat-1",
      brand_id: "brand-1",
      description: "Boa descrição",
    },
  };
}

function emptyOffer(): OfferRow {
  return {
    id: "offer-2",
    in_stock: false,
    price_usd: 0,
    products: {
      id: "product-2",
      name: "Produto Vazio",
      image_url: null,
      category_id: null,
      brand_id: null,
      description: null,
    },
  };
}

describe("scoreOffer", () => {
  it("ideal offer scores 100 with no diagnoses", () => {
    const result = scoreOffer(completeOffer());
    expect(result.score).toBe(100);
    expect(result.status).toBe(ProductHealthStatus.Ideal);
    expect(result.diagnoses).toHaveLength(0);
  });

  it("offer missing all fields scores 0 and is Critical", () => {
    const result = scoreOffer(emptyOffer());
    expect(result.score).toBe(0);
    expect(result.status).toBe(ProductHealthStatus.Critical);
    expect(result.diagnoses).toHaveLength(5);
  });

  it("missing image subtracts 30 points and adds NoImage diagnosis", () => {
    const offer = completeOffer();
    offer.products.image_url = null;
    const result = scoreOffer(offer);
    expect(result.score).toBe(70);
    expect(result.diagnoses.some((d) => d.type === ProductDiagnosisType.NoImage)).toBe(true);
    expect(result.status).toBe(ProductHealthStatus.Attention);
  });

  it("missing category subtracts 25 points and adds NoCategory diagnosis", () => {
    const offer = completeOffer();
    offer.products.category_id = null;
    const result = scoreOffer(offer);
    expect(result.score).toBe(75);
    expect(result.diagnoses.some((d) => d.type === ProductDiagnosisType.NoCategory)).toBe(true);
  });

  it("missing brand subtracts 15 points and adds NoBrand diagnosis", () => {
    const offer = completeOffer();
    offer.products.brand_id = null;
    const result = scoreOffer(offer);
    expect(result.score).toBe(85);
    expect(result.diagnoses.some((d) => d.type === ProductDiagnosisType.NoBrand)).toBe(true);
  });

  it("empty description subtracts 15 points", () => {
    const offer = completeOffer();
    offer.products.description = "   ";
    const result = scoreOffer(offer);
    expect(result.score).toBe(85);
    expect(result.diagnoses.some((d) => d.type === ProductDiagnosisType.NoDescription)).toBe(true);
  });

  it("zero price subtracts 15 points and adds NoPrice diagnosis", () => {
    const offer = completeOffer();
    offer.price_usd = 0;
    const result = scoreOffer(offer);
    expect(result.score).toBe(85);
    expect(result.diagnoses.some((d) => d.type === ProductDiagnosisType.NoPrice)).toBe(true);
  });

  it("score 55 is Attention status", () => {
    const offer = completeOffer();
    offer.products.image_url = null;
    offer.products.brand_id = null;
    const result = scoreOffer(offer);
    expect(result.score).toBe(55);
    expect(result.status).toBe(ProductHealthStatus.Attention);
  });

  it("score < 50 is Critical status", () => {
    const offer = completeOffer();
    offer.products.image_url = null;
    offer.products.category_id = null;
    const result = scoreOffer(offer);
    expect(result.score).toBe(45);
    expect(result.status).toBe(ProductHealthStatus.Critical);
  });

  it("NoImage diagnosis has critical severity", () => {
    const offer = completeOffer();
    offer.products.image_url = null;
    const { diagnoses } = scoreOffer(offer);
    const d = diagnoses.find((x) => x.type === ProductDiagnosisType.NoImage);
    expect(d?.severity).toBe("critical");
  });

  it("NoBrand diagnosis has warning severity", () => {
    const offer = completeOffer();
    offer.products.brand_id = null;
    const { diagnoses } = scoreOffer(offer);
    const d = diagnoses.find((x) => x.type === ProductDiagnosisType.NoBrand);
    expect(d?.severity).toBe("warning");
  });

  it("NoDescription diagnosis has info severity", () => {
    const offer = completeOffer();
    offer.products.description = null;
    const { diagnoses } = scoreOffer(offer);
    const d = diagnoses.find((x) => x.type === ProductDiagnosisType.NoDescription);
    expect(d?.severity).toBe("info");
  });
});

describe("getHealthBreakdown", () => {
  it("returns zeros for empty list", () => {
    const b = getHealthBreakdown([]);
    expect(b.total).toBe(0);
    expect(b.health_score).toBe(0);
    expect(b.ideal_count).toBe(0);
    expect(b.critical_count).toBe(0);
  });

  it("counts each status correctly", () => {
    const complete = completeOffer();
    const empty = emptyOffer();

    const records = [complete, complete, empty].map((o, i) => {
      const { score, status, diagnoses } = scoreOffer(o);
      return {
        offer_id: String(i),
        product_id: String(i),
        product_name: "test",
        image_url: null,
        price_usd: 100,
        in_stock: true,
        status,
        score,
        diagnoses,
        action_href: "/merchant/catalog",
      };
    });

    const b = getHealthBreakdown(records);
    expect(b.total).toBe(3);
    expect(b.ideal_count).toBe(2);
    expect(b.critical_count).toBe(1);
    expect(b.attention_count).toBe(0);
    expect(b.ideal_pct).toBe(67);
    expect(b.critical_pct).toBe(33);
  });

  it("health_score is the average of all product scores", () => {
    const records = [completeOffer(), emptyOffer()].map((o, i) => {
      const { score, status, diagnoses } = scoreOffer(o);
      return {
        offer_id: String(i),
        product_id: String(i),
        product_name: "test",
        image_url: null,
        price_usd: 100,
        in_stock: true,
        status,
        score,
        diagnoses,
        action_href: "/merchant/catalog",
      };
    });

    const b = getHealthBreakdown(records);
    expect(b.health_score).toBe(50); // (100 + 0) / 2
  });
});
