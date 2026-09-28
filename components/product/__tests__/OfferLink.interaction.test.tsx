/**
 * Mission 01 (C4) — regressão: o clique de saída para a loja continua
 * emitindo `OfferClicked` com EXATAMENTE o mesmo contrato de antes.
 * @jest-environment jsdom
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const trackMock = jest.fn();

jest.mock("@/hooks/useAnalytics", () => ({
  useAnalytics: () => ({ track: trackMock }),
}));

let OfferLink: (props: {
  offerId: string;
  productId: string;
  storeId: string;
  productUrl: string;
  position: number;
  source: "product_page" | "store_page";
  className?: string;
  children: React.ReactNode;
}) => React.ReactElement | null;

let OfferClicked: string;

beforeAll(async () => {
  OfferLink = (await import("@/components/product/OfferLink")).default;
  OfferClicked = (await import("@/src/domains/merchant-analytics/types/enums")).AnalyticsEventType.OfferClicked;
});

describe("OfferLink (OfferClicked intacto)", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    trackMock.mockClear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function render() {
    act(() => {
      root.render(
        <OfferLink
          offerId="offer-77"
          productId="product-1"
          storeId="store-9"
          productUrl="https://loja.example.com/produto"
          position={2}
          source="product_page"
          className="cta"
        >
          Ver oferta
        </OfferLink>
      );
    });
  }

  it("renderiza link externo seguro (target/rel inalterados)", () => {
    render();
    const anchor = container.querySelector("a")!;
    expect(anchor.getAttribute("href")).toBe("https://loja.example.com/produto");
    expect(anchor.getAttribute("target")).toBe("_blank");
    expect(anchor.getAttribute("rel")).toBe("noopener noreferrer");
    expect(anchor.textContent).toBe("Ver oferta");
    expect(anchor.className).toBe("cta");
  });

  it("emite OfferClicked com o mesmo payload (product_id/store_id/metadata)", () => {
    render();
    act(() => {
      container.querySelector("a")!.click();
    });

    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith(OfferClicked, {
      product_id: "product-1",
      store_id: "store-9",
      metadata: { offer_id: "offer-77", position: 2, source: "product_page" },
    });
  });

  it("o evento continua sendo OfferClicked — a missão não o renomeou nem trocou", () => {
    render();
    act(() => {
      container.querySelector("a")!.click();
    });
    expect(trackMock.mock.calls[0][0]).toBe("OfferClicked");
  });
});
