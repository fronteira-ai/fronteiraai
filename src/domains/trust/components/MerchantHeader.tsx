import { Building2, Globe, Phone, Mail, MessageCircle, Calendar, ShieldCheck } from "lucide-react";
import type { MerchantBasicData, MerchantChannel } from "../types/trust.types";
import { MerchantChannelType } from "../types/enums";

const VERIFIED_LEVEL_LABELS: Record<string, string> = {
  none: "",
  verified: "Verificado",
  premium: "Premium",
  official: "Parceiro Oficial",
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

function channelLabel(ch: MerchantChannel): string {
  switch (ch.type) {
    case MerchantChannelType.Website: return "Site oficial";
    case MerchantChannelType.WhatsApp: return "WhatsApp";
    case MerchantChannelType.Phone: return ch.value;
    case MerchantChannelType.Email: return ch.value;
  }
}

interface Props {
  basic: MerchantBasicData;
  channels: MerchantChannel[];
}

export function MerchantHeader({ basic, channels }: Props) {
  const verifiedLabel = VERIFIED_LEVEL_LABELS[basic.verifiedLevel];
  const joinedYear = new Date(basic.joinedAt).getFullYear();

  return (
    <header className="rounded-xl border border-slate-700/50 bg-slate-800/20 p-6">
      <div className="flex items-start gap-4">
        <div
          className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0"
          aria-hidden="true"
        >
          <Building2 className="w-8 h-8 text-slate-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-white truncate">{basic.companyName}</h1>
            {verifiedLabel && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                {verifiedLabel}
              </span>
            )}
          </div>

          <p className="text-sm text-slate-400 mt-1">
            Perfil de identidade verificado pela equipe ParaguAI
          </p>

          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3">
            {channels.map((ch) => {
              const Icon = CHANNEL_ICONS[ch.type];
              const isExternal = ch.type === MerchantChannelType.Website || ch.type === MerchantChannelType.WhatsApp;
              return (
                <a
                  key={`${ch.type}-${ch.value}`}
                  href={channelHref(ch)}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noopener noreferrer" : undefined}
                  className="flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                  aria-label={`${channelLabel(ch)}${ch.verified ? " (verificado)" : ""}${isExternal ? " (abre em nova aba)" : ""}`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  {channelLabel(ch)}
                  {ch.verified && (
                    <ShieldCheck className="w-3 h-3 text-emerald-400" aria-label="verificado" />
                  )}
                </a>
              );
            })}
          </div>

          <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
            Na plataforma desde {joinedYear}
          </p>
        </div>
      </div>
    </header>
  );
}
