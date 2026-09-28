import { AnalyticsEventType } from "@/src/domains/merchant-analytics/types/enums";
import {
  PRODUCT_ACTION_CLICK,
  PRODUCT_ACTION_VIEW,
  PRODUCT_LIST_CLICK_EVENT,
  PRODUCT_VIEW_EVENT,
  compareViewMetadata,
  outboundOfferItemId,
  productListClickMetadata,
  productViewMetadata,
  zeroResultsDecision,
} from "@/utils/buyerEvents";

// Mission 01 — provas comportamentais das decisões de instrumentação
// (C1 zero-results, C2 clique em produto, C3 compare). Nada aqui toca DOM:
// cada ilha "use client" é um adaptador fino sobre estas funções puras.

describe("zeroResultsDecision (C1)", () => {
  it("emite para total=0 com termo não vazio", () => {
    const decision = zeroResultsDecision("xyzabc", 0, null);
    expect(decision.emit).toBe(true);
    expect(decision.key).toBe("xyzabc|0");
  });

  it("NÃO emite quando existem resultados", () => {
    expect(zeroResultsDecision("iphone", 8, null).emit).toBe(false);
    expect(zeroResultsDecision("iphone", 1, null).emit).toBe(false);
  });

  it("NÃO emite para /search sem termo (página em branco, não zero-result)", () => {
    expect(zeroResultsDecision("", 0, null).emit).toBe(false);
    expect(zeroResultsDecision("   ", 0, null).emit).toBe(false);
  });

  it("não duplica em re-render com a mesma chave", () => {
    const first = zeroResultsDecision("xyzabc", 0, null);
    expect(first.emit).toBe(true);

    // Segundo render com o mesmo (query, total): a chave persistida é igual.
    const second = zeroResultsDecision("xyzabc", 0, first.key);
    expect(second.emit).toBe(false);
    expect(second.key).toBe(first.key);

    // Terceiro render: continua não emitindo (idempotente).
    const third = zeroResultsDecision("xyzabc", 0, second.key);
    expect(third.emit).toBe(false);
  });

  it("emite de novo quando a busca muda", () => {
    const first = zeroResultsDecision("xyzabc", 0, null);
    const next = zeroResultsDecision("outrotermo", 0, first.key);
    expect(next.emit).toBe(true);
    expect(next.key).toBe("outrotermo|0");
  });

  it("normaliza o termo na chave (espaços nas pontas não criam duplicata)", () => {
    const first = zeroResultsDecision("  xyzabc  ", 0, null);
    const second = zeroResultsDecision("xyzabc", 0, first.key);
    expect(first.key).toBe("xyzabc|0");
    expect(second.emit).toBe(false);
  });
});

describe("clique em produto vs page view (C2)", () => {
  it("o clique em lista tem tipo PRÓPRIO — nunca ProductClicked", () => {
    expect(PRODUCT_LIST_CLICK_EVENT).toBe(AnalyticsEventType.ProductClickedFromList);
    expect(PRODUCT_VIEW_EVENT).toBe(AnalyticsEventType.ProductClicked);
    // O requisito central: os dois são distinguíveis por event_type, e não
    // só por metadado — os consumidores existentes contam por tipo.
    expect(PRODUCT_LIST_CLICK_EVENT).not.toBe(PRODUCT_VIEW_EVENT);
  });

  it("os dois lados carregam `action` explícito e oposto", () => {
    expect(productViewMetadata()).toEqual({ action: PRODUCT_ACTION_VIEW });
    expect(productListClickMetadata("home", 3)).toEqual({
      action: PRODUCT_ACTION_CLICK,
      source: "home",
      position: 3,
    });
    expect(PRODUCT_ACTION_VIEW).not.toBe(PRODUCT_ACTION_CLICK);
  });

  it("preserva a superfície de origem e a posição de cada grade", () => {
    for (const source of ["home", "search", "catalog", "related", "store"] as const) {
      expect(productListClickMetadata(source, 1)).toMatchObject({ source, position: 1 });
    }
  });
});

describe("compare (C3)", () => {
  it("metadata de visualização do compare descreve o que foi comparado", () => {
    expect(compareViewMetadata(4, 3)).toEqual({ action: "compare_view", offers: 4, stores: 3 });
  });

  it("o item_id do clique de saída é o slug real, nunca vazio", () => {
    expect(outboundOfferItemId("iphone-16-pro")).toBe("iphone-16-pro");
    expect(outboundOfferItemId("  iphone-16-pro  ")).toBe("iphone-16-pro");
    expect(outboundOfferItemId("iphone-16-pro").length).toBeGreaterThan(0);
  });
});
