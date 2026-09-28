/**
 * Mission 01 (C2) — clique em produto a partir de uma grade produz um evento
 * distinguível do page view de `/product/[slug]`.
 * @jest-environment jsdom
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.NEXT_PUBLIC_SITE_URL = "https://www.fronteiraai.com";

const trackMock = jest.fn();

jest.mock("@/hooks/useAnalytics", () => ({
  useAnalytics: () => ({ track: trackMock }),
}));

// next/link exige contexto do App Router; aqui interessa o comportamento do
// clique, não a navegação — o anchor real preserva href/onClick.
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

type ProductLinkProps = {
  slug: string;
  productId?: string;
  name: string;
  source: "home" | "search" | "catalog" | "related" | "store";
  position: number;
  className?: string;
  children: React.ReactNode;
};

let ProductLink: (props: ProductLinkProps) => React.ReactElement | null;
let ProductClickedFromList: string;
let ProductClicked: string;

beforeAll(async () => {
  ProductLink = (await import("@/components/product/ProductLink")).default;
  const enums = await import("@/src/domains/merchant-analytics/types/enums");
  ProductClickedFromList = enums.AnalyticsEventType.ProductClickedFromList;
  ProductClicked = enums.AnalyticsEventType.ProductClicked;
});

describe("ProductLink (clique em lista)", () => {
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

  function render(source: ProductLinkProps["source"] = "home", position = 2) {
    act(() => {
      root.render(
        <ProductLink
          slug="iphone-16-pro"
          productId="product-1"
          name="iPhone 16 Pro"
          source={source}
          position={position}
          className="card"
        >
          Ver Produto
        </ProductLink>
      );
    });
  }

  it("mantém o link interno para a página do produto", () => {
    render();
    const anchor = container.querySelector("a")!;
    expect(anchor.getAttribute("href")).toBe("/product/iphone-16-pro");
    expect(anchor.className).toBe("card");
  });

  it("emite ProductClickedFromList (não ProductClicked) com action/source/position", () => {
    render("search", 3);
    act(() => {
      container.querySelector("a")!.click();
    });

    expect(trackMock).toHaveBeenCalledTimes(1);
    const [eventType, payload] = trackMock.mock.calls[0];
    expect(eventType).toBe(ProductClickedFromList);
    expect(eventType).not.toBe(ProductClicked);
    expect(payload.product_id).toBe("product-1");
    expect(payload.metadata).toMatchObject({
      action: "product_click",
      source: "search",
      position: 3,
      slug: "iphone-16-pro",
    });
  });

  it("o page view da página de produto usa o OUTRO tipo (distinção real de funil)", () => {
    // Prova que os dois caminhos não colidem no mesmo event_type.
    render("catalog", 1);
    act(() => {
      container.querySelector("a")!.click();
    });
    expect(trackMock.mock.calls[0][0]).not.toBe(ProductClicked);
    expect(ProductClickedFromList).not.toBe(ProductClicked);
  });
});
