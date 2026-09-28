import { AnalyticsEventType } from "@/src/domains/merchant-analytics/types/enums";
import {
  PRODUCT_ACTION_CLICK,
  PRODUCT_ACTION_VIEW,
  PRODUCT_LIST_CLICK_EVENT,
  PRODUCT_VIEW_EVENT,
  SEARCH_ACTION_SUBMIT,
  SEARCH_SUBMITTED_EVENT,
  compareViewMetadata,
  outboundOfferItemId,
  productListClickMetadata,
  productViewMetadata,
  searchSubmitDecision,
  searchSubmitMetadata,
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

// Mission 02A — Home Search Instrumentation. Contrato de submissão de busca:
// 1 evento por submissão, passo de funil distinto de SearchPerformed.
describe("submissão de busca (M02A)", () => {
  it("o evento é PRÓPRIO — nunca reutiliza SearchPerformed (passos distintos do funil)", () => {
    expect(SEARCH_SUBMITTED_EVENT).toBe(AnalyticsEventType.SearchSubmitted);
    expect(SEARCH_SUBMITTED_EVENT).not.toBe(AnalyticsEventType.SearchPerformed);
    expect(SEARCH_SUBMITTED_EVENT).not.toBe(AnalyticsEventType.SearchZeroResults);
  });

  it("termo válido: navega, has_query=true, search_query presente e source=home", () => {
    const d = searchSubmitDecision("Notebook Gamer", "home");
    expect(d.navigate).toBe(true);
    expect(d.query).toBe("Notebook Gamer");
    expect(d.event.event_type).toBe(AnalyticsEventType.SearchSubmitted);
    expect(d.event.search_query).toBe("Notebook Gamer");
    expect(d.event.metadata).toEqual({
      action: SEARCH_ACTION_SUBMIT,
      source: "home",
      has_query: true,
    });
  });

  it("normaliza o termo (trim) e usa o MESMO valor na navegação e no evento", () => {
    const d = searchSubmitDecision("   iphone 17 pro   ");
    expect(d.query).toBe("iphone 17 pro");
    expect(d.navigate).toBe(true);
    expect(d.event.search_query).toBe("iphone 17 pro");
  });

  it("source default é home", () => {
    expect(searchSubmitDecision("tv").event.metadata.source).toBe("home");
    expect(searchSubmitMetadata("home", false)).toEqual({
      action: "search_submit",
      source: "home",
      has_query: false,
    });
  });

  it("termo vazio: NÃO navega, NÃO carrega search_query e NÃO é uma busca válida", () => {
    for (const raw of ["", "   ", "\t\n"]) {
      const d = searchSubmitDecision(raw, "home");
      expect(d.navigate).toBe(false);
      expect(d.query).toBe("");
      expect(d.event.search_query).toBeUndefined();
      expect(d.event.metadata.has_query).toBe(false);
    }
  });

  it("emite exatamente um evento por submissão — vazia ou válida (sem duplicação)", () => {
    // A decisão é pura: uma chamada ⇒ exatamente um evento. O "uma vez" é
    // garantido pelo chamador (SearchBar.handleSubmit emite 1× por
    // clique/Enter) e provado no teste de interação do componente.
    const valid = searchSubmitDecision("tv 4k");
    const empty = searchSubmitDecision("  ");
    expect(valid.event.event_type).toBe(empty.event.event_type);
    expect(valid.event.metadata.has_query).toBe(true);
    expect(empty.event.metadata.has_query).toBe(false);
  });

  it("o payload só tem chaves primitivas aceitas por EventPlatformService.sanitizeMetadata", () => {
    const d = searchSubmitDecision("ps5", "home");
    for (const value of Object.values(d.event.metadata)) {
      expect(["string", "number", "boolean"]).toContain(typeof value);
    }
  });
});
