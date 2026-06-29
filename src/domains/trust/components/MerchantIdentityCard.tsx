import { FileText, Globe, MessageCircle, Phone, Mail, Building2 } from "lucide-react";
import type { MerchantBasicData, MerchantChannel } from "../types/trust.types";
import { MerchantChannelType } from "../types/enums";

const CHANNEL_LABEL: Record<MerchantChannelType, string> = {
  [MerchantChannelType.Website]: "Site",
  [MerchantChannelType.WhatsApp]: "WhatsApp",
  [MerchantChannelType.Phone]: "Telefone",
  [MerchantChannelType.Email]: "E-mail",
};

const CHANNEL_ICONS: Record<MerchantChannelType, React.FC<{ className?: string }>> = {
  [MerchantChannelType.Website]: Globe,
  [MerchantChannelType.WhatsApp]: MessageCircle,
  [MerchantChannelType.Phone]: Phone,
  [MerchantChannelType.Email]: Mail,
};

function channelHref(ch: MerchantChannel): string {
  switch (ch.type) {
    case MerchantChannelType.Phone: return `tel:${ch.value}`;
    case MerchantChannelType.Email: return `mailto:${ch.value}`;
    default: return ch.value;
  }
}

interface Props {
  basic: MerchantBasicData;
  channels: MerchantChannel[];
}

export function MerchantIdentityCard({ basic, channels }: Props) {
  return (
    <section aria-labelledby="identity-heading">
      <h2 id="identity-heading" className="text-sm font-semibold text-white mb-3">
        Identificação
      </h2>
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 divide-y divide-slate-700/40">
        <div className="flex items-center gap-3 px-4 py-3">
          <Building2 className="w-4 h-4 text-slate-500 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="text-xs text-slate-500">Empresa</p>
            <p className="text-sm text-white font-medium">{basic.companyName}</p>
          </div>
        </div>

        {basic.companyDoc && (
          <div className="flex items-center gap-3 px-4 py-3">
            <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs text-slate-500">Registro</p>
              <p className="text-sm text-white font-medium">{basic.companyDoc}</p>
            </div>
          </div>
        )}

        {channels.map((ch) => {
          const Icon = CHANNEL_ICONS[ch.type];
          const isExternal = ch.type === MerchantChannelType.Website || ch.type === MerchantChannelType.WhatsApp;
          return (
            <div key={`${ch.type}-${ch.value}`} className="flex items-center gap-3 px-4 py-3">
              <Icon className="w-4 h-4 text-slate-500 flex-shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500">{CHANNEL_LABEL[ch.type]}</p>
                <a
                  href={channelHref(ch)}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noopener noreferrer" : undefined}
                  className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors truncate block"
                  aria-label={`${CHANNEL_LABEL[ch.type]}: ${ch.value}${isExternal ? " (abre em nova aba)" : ""}`}
                >
                  {ch.type === MerchantChannelType.Website ? "Acessar site" : ch.value}
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
