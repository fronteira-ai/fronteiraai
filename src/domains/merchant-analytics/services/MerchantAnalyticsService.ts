import type { IAnalyticsEventRepository } from "../repositories/IAnalyticsEventRepository";
import type {
  MerchantAnalyticsSummary,
  ProductAnalyticsResult,
  TrafficAnalyticsResult,
  StoredAnalyticsEvent,
} from "../types/analytics.types";
import { AnalyticsEventType, AnalyticsWindow } from "../types/enums";

export class MerchantAnalyticsService {
  constructor(private readonly eventRepo: IAnalyticsEventRepository) {}

  async getSummary(merchantId: string, window: AnalyticsWindow): Promise<MerchantAnalyticsSummary> {
    const events = await this.eventRepo.findByMerchant(merchantId, window, 2000);
    return this.computeSummary(merchantId, window, events);
  }

  async getProductAnalytics(
    merchantId: string,
    window: AnalyticsWindow
  ): Promise<ProductAnalyticsResult> {
    const events = await this.eventRepo.findByMerchant(merchantId, window, 2000);
    const productMap = new Map<string, { impressions: number; clicks: number; saves: number; name: string | null }>();

    for (const ev of events) {
      if (!ev.product_id) continue;
      if (!productMap.has(ev.product_id)) {
        productMap.set(ev.product_id, { impressions: 0, clicks: 0, saves: 0, name: null });
      }
      const row = productMap.get(ev.product_id)!;

      if (ev.event_type === AnalyticsEventType.ProductImpression) row.impressions++;
      else if (ev.event_type === AnalyticsEventType.ProductClicked) row.clicks++;
      else if (ev.event_type === AnalyticsEventType.OfferSaved) row.saves++;

      // Extract product name from metadata if available
      if (!row.name && ev.metadata?.product_name) {
        row.name = String(ev.metadata.product_name);
      }
    }

    const products = Array.from(productMap.entries())
      .map(([product_id, stats]) => ({
        product_id,
        product_name: stats.name,
        impressions: stats.impressions,
        clicks: stats.clicks,
        saves: stats.saves,
        ctr: stats.impressions > 0 ? +(stats.clicks / stats.impressions * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 20);

    return {
      merchant_id: merchantId,
      window,
      products,
      total_analyzed: productMap.size,
      generated_at: new Date().toISOString(),
    };
  }

  async getTrafficAnalytics(
    merchantId: string,
    window: AnalyticsWindow
  ): Promise<TrafficAnalyticsResult> {
    const events = await this.eventRepo.findByMerchant(merchantId, window, 2000);

    const sourceMap = new Map<string, number>();
    const hourMap = new Map<number, number>();

    for (const ev of events) {
      // Traffic source from referrer
      const source = this.classifySource(ev.referrer);
      sourceMap.set(source, (sourceMap.get(source) ?? 0) + 1);

      // Hour distribution
      const hour = new Date(ev.occurred_at).getHours();
      hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1);
    }

    const total = events.length;
    const sources = Array.from(sourceMap.entries())
      .map(([source, visits]) => ({
        source,
        visits,
        percentage: total > 0 ? +(visits / total * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => b.visits - a.visits);

    const hourly_distribution = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      events: hourMap.get(hour) ?? 0,
    }));

    return {
      merchant_id: merchantId,
      window,
      total_visits: total,
      sources,
      hourly_distribution,
      generated_at: new Date().toISOString(),
    };
  }

  async getRecentEvents(
    merchantId: string,
    window: AnalyticsWindow,
    limit = 50
  ): Promise<StoredAnalyticsEvent[]> {
    return this.eventRepo.findByMerchant(merchantId, window, limit);
  }

  private computeSummary(
    merchantId: string,
    window: AnalyticsWindow,
    events: StoredAnalyticsEvent[]
  ): MerchantAnalyticsSummary {
    let views = 0;
    let product_impressions = 0;
    let product_clicks = 0;
    let contact_clicks = 0;
    let whatsapp_clicks = 0;
    let phone_clicks = 0;
    let website_clicks = 0;
    let offer_saves = 0;

    const uniqueVisitors = new Set<string>();

    for (const ev of events) {
      uniqueVisitors.add(ev.anonymous_id);
      switch (ev.event_type) {
        case AnalyticsEventType.MerchantViewed:
        case AnalyticsEventType.MerchantPassportViewed:
          views++;
          break;
        case AnalyticsEventType.ProductImpression:
          product_impressions++;
          break;
        case AnalyticsEventType.ProductClicked:
          product_clicks++;
          break;
        case AnalyticsEventType.MerchantContactClicked:
          contact_clicks++;
          break;
        case AnalyticsEventType.MerchantWhatsAppClicked:
          whatsapp_clicks++;
          contact_clicks++;
          break;
        case AnalyticsEventType.MerchantPhoneClicked:
          phone_clicks++;
          contact_clicks++;
          break;
        case AnalyticsEventType.MerchantWebsiteClicked:
          website_clicks++;
          break;
        case AnalyticsEventType.OfferSaved:
          offer_saves++;
          break;
      }
    }

    const ctr = product_impressions > 0
      ? +(product_clicks / product_impressions * 100).toFixed(1)
      : 0;

    return {
      merchant_id: merchantId,
      window,
      views,
      unique_visitors: uniqueVisitors.size,
      product_impressions,
      product_clicks,
      contact_clicks,
      whatsapp_clicks,
      phone_clicks,
      website_clicks,
      offer_saves,
      ctr,
      generated_at: new Date().toISOString(),
    };
  }

  private classifySource(referrer: string | null): string {
    if (!referrer) return "Direto";
    const r = referrer.toLowerCase();
    if (r.includes("google")) return "Google";
    if (r.includes("facebook") || r.includes("fb.com")) return "Facebook";
    if (r.includes("instagram")) return "Instagram";
    if (r.includes("whatsapp")) return "WhatsApp";
    if (r.includes("tiktok")) return "TikTok";
    if (r.includes("paraguai") || r.includes("fronteiraai")) return "Interno";
    return "Outros";
  }
}
