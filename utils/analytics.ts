declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    clarity?: (method: string, ...args: unknown[]) => void;
  }
}

function pushEvent(name: string, params?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", name, params);
  window.clarity?.("event", name);
}

export const analytics = {
  search(query: string) {
    pushEvent("search", { search_term: query });
  },

  viewProduct(slug: string, name: string, priceUSD?: number) {
    pushEvent("view_item", {
      item_id: slug,
      item_name: name,
      ...(priceUSD !== undefined && { value: priceUSD, currency: "USD" }),
    });
  },

  clickOffer(productSlug: string, storeName: string, priceUSD: number) {
    pushEvent("select_item", {
      item_id: productSlug,
      item_name: storeName,
      value: priceUSD,
      currency: "USD",
    });
  },

  compare(productSlug: string, storeCount: number) {
    pushEvent("compare_product", {
      item_id: productSlug,
      store_count: storeCount,
    });
  },

  viewStore(slug: string, name: string) {
    pushEvent("view_store", { store_id: slug, store_name: name });
  },

  clickExternalOffer(productSlug: string, storeName: string, url: string) {
    pushEvent("click_external_offer", {
      item_id: productSlug,
      store_name: storeName,
      destination: url,
    });
  },
};
