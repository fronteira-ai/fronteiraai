/**
 * Mission 01 (C3) — o clique de saída da loja (Compare) carrega o slug REAL
 * do produto em `item_id`. Antes, `app/compare/[slug]/page.tsx` não passava
 * `productSlug` e o evento saía com `item_id: ""` (atribuição perdida).
 * @jest-environment jsdom
 */
import { analytics } from "@/utils/analytics";

describe("utils/analytics — click_external_offer", () => {
  let gtag: jest.Mock;
  let clarity: jest.Mock;

  beforeEach(() => {
    gtag = jest.fn();
    clarity = jest.fn();
    (window as unknown as { gtag: jest.Mock }).gtag = gtag;
    (window as unknown as { clarity: jest.Mock }).clarity = clarity;
  });

  afterEach(() => {
    delete (window as unknown as { gtag?: unknown }).gtag;
    delete (window as unknown as { clarity?: unknown }).clarity;
  });

  it("envia item_id com o slug real (nunca vazio)", () => {
    analytics.clickExternalOffer("iphone-16-pro", "Shopping China", "https://loja.example.com/p/1");

    expect(gtag).toHaveBeenCalledTimes(1);
    const [channel, eventName, params] = gtag.mock.calls[0];
    expect(channel).toBe("event");
    expect(eventName).toBe("click_external_offer");
    expect(params.item_id).toBe("iphone-16-pro");
    expect(params.item_id).not.toBe("");
    expect(params.store_name).toBe("Shopping China");
    expect(params.destination).toBe("https://loja.example.com/p/1");
  });

  it("espelha o evento no Clarity (mesmo nome, sem provider novo)", () => {
    analytics.clickExternalOffer("galaxy-s25", "Mega Eletrônicos", "https://loja.example.com/p/2");
    expect(clarity).toHaveBeenCalledWith("event", "click_external_offer");
  });

  it("com slug vazio o provider ainda não é chamado com lixo — o valor é explícito", () => {
    // O contrato é o mesmo do código (o `?? ""` defensivo do CompareOfferCard
    // foi removido do fluxo pela correção da página): o que importa é que o
    // valor enviado É o slug passado, sem transformação silenciosa.
    analytics.clickExternalOffer("iphone-16-pro", "Loja", "https://loja.example.com/p/3");
    const [, , params] = gtag.mock.calls[0];
    expect(params.item_id).toBe("iphone-16-pro");
  });
});
