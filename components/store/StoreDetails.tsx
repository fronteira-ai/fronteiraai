import { memo } from "react";
import {
  Star,
  MapPin,
  BadgeCheck,
  Phone,
  Mail,
  Globe,
  Clock,
  MessageCircle,
} from "lucide-react";
import { Store } from "@/types/store";

type Props = {
  store: Store;
};

function StoreDetails({ store }: Props) {
  const contactItems = [
    store.phone ? { icon: Phone, label: store.phone, href: `tel:${store.phone}` } : null,
    store.whatsapp
      ? { icon: MessageCircle, label: "WhatsApp", href: `https://wa.me/${store.whatsapp.replace(/\D/g, "")}` }
      : null,
    store.email ? { icon: Mail, label: store.email, href: `mailto:${store.email}` } : null,
    store.website ? { icon: Globe, label: store.website, href: store.website } : null,
  ].filter((item): item is { icon: typeof Phone; label: string; href: string } => item !== null);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="flex items-center gap-1.5 rounded-full bg-blue-500/20 px-4 py-1.5 font-medium text-blue-300">
          <Star size={14} fill="currentColor" />
          {store.rating.toFixed(1)}
        </span>

        {store.is_verified ? (
          <span className="flex items-center gap-1.5 rounded-full border border-slate-700 px-4 py-1.5 text-slate-300">
            <BadgeCheck size={14} />
            Loja verificada
          </span>
        ) : null}
      </div>

      <h1 className="mt-4 text-4xl font-black text-white">{store.name}</h1>

      <p className="mt-3 flex items-center gap-2 text-sm text-slate-400">
        <MapPin size={14} />
        {store.address ? `${store.address}, ` : ""}
        {store.city}, {store.country}
      </p>

      <p className="mt-4 max-w-2xl leading-7 text-slate-400">
        {store.description}
      </p>

      {contactItems.length > 0 || store.opening_hours ? (
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          {contactItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target={item.href.startsWith("http") ? "_blank" : undefined}
              rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="flex items-center gap-1.5 rounded-full border border-slate-700 px-4 py-1.5 text-slate-300 transition hover:border-blue-500 hover:text-white"
            >
              <item.icon size={14} />
              {item.label}
            </a>
          ))}

          {store.opening_hours ? (
            <span className="flex items-center gap-1.5 rounded-full border border-slate-700 px-4 py-1.5 text-slate-300">
              <Clock size={14} />
              {store.opening_hours}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default memo(StoreDetails);
