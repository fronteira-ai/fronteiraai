import type { IAnalyticsEventRepository } from "../repositories/IAnalyticsEventRepository";
import type { FunnelResult, FunnelStepResult } from "../types/analytics.types";
import { AnalyticsEventType, AnalyticsWindow, FunnelStep } from "../types/enums";
import { windowToDate } from "./WindowHelper";

const FUNNEL_STEPS: Array<{ step: FunnelStep; label: string; type: AnalyticsEventType }> = [
  { step: FunnelStep.Search,       label: "Busca realizada",    type: AnalyticsEventType.SearchPerformed },
  { step: FunnelStep.Impression,   label: "Produto visto",      type: AnalyticsEventType.ProductImpression },
  { step: FunnelStep.Click,        label: "Produto clicado",    type: AnalyticsEventType.ProductClicked },
  { step: FunnelStep.MerchantView, label: "Lojista visitado",   type: AnalyticsEventType.MerchantViewed },
  { step: FunnelStep.Contact,      label: "Contato iniciado",   type: AnalyticsEventType.MerchantContactClicked },
  { step: FunnelStep.Save,         label: "Oferta salva",       type: AnalyticsEventType.OfferSaved },
];

export class FunnelService {
  constructor(private readonly eventRepo: IAnalyticsEventRepository) {}

  async getFunnel(window: AnalyticsWindow, merchantId?: string): Promise<FunnelResult> {
    const since = windowToDate(window);

    const counts = await Promise.all(
      FUNNEL_STEPS.map((s) => this.eventRepo.countByType(s.type, since, merchantId))
    );

    const steps: FunnelStepResult[] = FUNNEL_STEPS.map((s, i) => {
      const count = counts[i];
      const prevCount = i > 0 ? counts[i - 1] : null;
      const drop_rate = prevCount !== null && prevCount > 0
        ? +((1 - count / prevCount) * 100).toFixed(1)
        : null;
      const conversion_rate = prevCount !== null && prevCount > 0
        ? +(count / prevCount * 100).toFixed(1)
        : null;

      return { step: s.step, label: s.label, count, drop_rate, conversion_rate };
    });

    const topCount = counts[0] ?? 0;
    const bottomCount = counts[counts.length - 1] ?? 0;
    const overall_conversion = topCount > 0
      ? +(bottomCount / topCount * 100).toFixed(2)
      : 0;

    return {
      window,
      merchant_id: merchantId ?? null,
      steps,
      overall_conversion,
      generated_at: new Date().toISOString(),
    };
  }
}
