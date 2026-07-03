"use client";

import { Phone, MessageCircle, Globe, ExternalLink } from "lucide-react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { AnalyticsEventType } from "@/src/domains/merchant-analytics/types/enums";

type Props = {
  storeId: string;
  merchantId: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  website?: string | null;
};

// Extracted from app/lojas/[slug]/page.tsx (Release 1.8, Program 0 Wave 0)
// so contact clicks — the highest-value buyer signal for Merchant
// Intelligence/Growth Engine, previously untracked entirely — can fire
// track(). Instagram intentionally excluded: no matching AnalyticsEventType.
export default function StoreContactLinks({ storeId, merchantId, phone, whatsapp, website }: Props) {
  const { track } = useAnalytics({ merchantId: merchantId ?? undefined });

  return (
    <>
      {phone && (
        <a
          href={`tel:${phone}`}
          onClick={() => track(AnalyticsEventType.MerchantPhoneClicked, { store_id: storeId })}
          className="flex items-center gap-3 text-sm text-slate-300 hover:text-white transition-colors"
        >
          <Phone size={15} className="text-slate-500 shrink-0" /> {phone}
        </a>
      )}
      {whatsapp && (
        <a
          href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track(AnalyticsEventType.MerchantWhatsAppClicked, { store_id: storeId })}
          className="flex items-center gap-3 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          <MessageCircle size={15} className="shrink-0" /> WhatsApp
        </a>
      )}
      {website && (
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track(AnalyticsEventType.MerchantWebsiteClicked, { store_id: storeId })}
          className="flex items-center gap-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          <Globe size={15} className="shrink-0" />
          <span className="truncate">{website.replace(/^https?:\/\//, "")}</span>
          <ExternalLink size={11} />
        </a>
      )}
    </>
  );
}
