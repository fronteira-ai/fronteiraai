import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { SITE_URL } from "@/constants/routes";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Breadcrumb from "@/components/ui/Breadcrumb";
import StoreOffers from "@/components/store/StoreOffers";
import StoreGrid from "@/components/store/StoreGrid";
import ClaimStoreButton from "@/components/store/ClaimStoreButton";
import { getStorePublic } from "@/services/stores-public.service";
import { getOffersByStore } from "@/services/offer.service";
import { getRelatedStores } from "@/services/store.service";
import {
  Shield, Star, Package, Phone, MessageCircle, Globe, MapPin,
  Clock, TrendingUp, CheckCircle2, Share2, ExternalLink
} from "lucide-react";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStorePublic(slug);

  if (!store) {
    return { title: "Loja não encontrada | ParaguAI" };
  }

  const title = `${store.name} — Loja no Paraguai`;
  const description =
    store.description ||
    `Compare produtos e preços de ${store.name}, localizada em ${store.city ?? "Ciudad del Este"}, Paraguai. ${store.offerCount} ofertas disponíveis.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/lojas/${slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/lojas/${slug}`,
      siteName: "ParaguAI",
      type: "website",
      locale: "pt_BR",
      images: store.cover_image ? [{ url: store.cover_image, alt: store.name }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function LojaPublicaPage({ params }: { params: Params }) {
  const { slug } = await params;
  const store = await getStorePublic(slug);
  if (!store) notFound();

  const [offersReal, related] = await Promise.all([
    getOffersByStore(store.id),
    getRelatedStores(store.id, 3),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: store.name,
    description: store.description ?? undefined,
    url: store.website ?? `${SITE_URL}/lojas/${slug}`,
    telephone: store.phone ?? undefined,
    address: store.address
      ? { "@type": "PostalAddress", streetAddress: store.address, addressLocality: store.city, addressCountry: "PY" }
      : undefined,
    openingHours: store.opening_hours ?? undefined,
    image: store.cover_image ?? undefined,
    aggregateRating: store.rating
      ? { "@type": "AggregateRating", ratingValue: store.rating, bestRating: 5 }
      : undefined,
  };

  const scoreColor =
    (store.merchantScore ?? 0) >= 80 ? "text-emerald-400" :
    (store.merchantScore ?? 0) >= 60 ? "text-yellow-400" : "text-slate-400";

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Navbar />

      <div className="mx-auto max-w-6xl px-6 pt-32 pb-24">
        <Breadcrumb items={[{ label: "Lojas", href: "/lojas" }, { label: store.name }]} />

        {/* Hero banner */}
        <div className="relative mt-8 aspect-[4/1] w-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-950">
          {store.cover_image ? (
            <Image src={store.cover_image} alt={store.name} fill priority sizes="100vw" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-8xl font-black text-slate-800">{store.name.charAt(0)}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
        </div>

        {/* Store header */}
        <div className="mt-6 flex flex-col sm:flex-row items-start gap-5">
          {/* Logo */}
          {store.logo_url && (
            <div className="relative h-16 w-16 rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden shrink-0">
              <Image src={store.logo_url} alt={store.name} fill sizes="64px" className="object-contain p-1" />
            </div>
          )}

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-3xl font-black text-white">{store.name}</h1>
              {store.is_verified && (
                <span className="flex items-center gap-1 rounded-full border border-blue-500/40 bg-blue-500/10 px-2.5 py-1 text-xs font-bold text-blue-400">
                  <Shield size={12} /> Verificada
                </span>
              )}
            </div>
            {store.isUnclaimed && (
              <div className="mt-3">
                <ClaimStoreButton storeSlug={store.slug} />
              </div>
            )}
            {store.city && (
              <p className="text-slate-400 text-sm flex items-center gap-1.5">
                <MapPin size={13} /> {store.city}, {store.country ?? "Paraguay"}
              </p>
            )}
          </div>

          {/* Share */}
          <button
            onClick={undefined}
            className="flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
            aria-label="Compartilhar"
          >
            <Share2 size={14} />
            Compartilhar
          </button>
        </div>

        {/* Stats row */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {store.offerCount > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-center">
              <p className="text-2xl font-black text-white">{store.offerCount.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1"><Package size={11} /> Ofertas</p>
            </div>
          )}
          {store.productCount > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-center">
              <p className="text-2xl font-black text-white">{store.productCount.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-slate-500 mt-1">Produtos</p>
            </div>
          )}
          {store.rating > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-center">
              <p className="text-2xl font-black text-white flex items-center justify-center gap-1">
                <Star size={18} className="text-yellow-400 fill-yellow-400" />
                {store.rating.toFixed(1)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Avaliação</p>
            </div>
          )}
          {store.merchantScore !== null && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-center">
              <p className={`text-2xl font-black flex items-center justify-center gap-1 ${scoreColor}`}>
                <TrendingUp size={18} />
                {store.merchantScore}
              </p>
              <p className="text-xs text-slate-500 mt-1">Merchant Score</p>
            </div>
          )}
        </div>

        {/* Description */}
        {store.description && (
          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/30 p-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">Sobre a loja</h2>
            <p className="text-slate-300 leading-relaxed">{store.description}</p>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact + Info */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">Contato</h2>
              <div className="space-y-3">
                {store.phone && (
                  <a href={`tel:${store.phone}`} className="flex items-center gap-3 text-sm text-slate-300 hover:text-white transition-colors">
                    <Phone size={15} className="text-slate-500 shrink-0" /> {store.phone}
                  </a>
                )}
                {store.whatsapp && (
                  <a
                    href={`https://wa.me/${store.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    <MessageCircle size={15} className="shrink-0" /> WhatsApp
                  </a>
                )}
                {store.website && (
                  <a
                    href={store.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <Globe size={15} className="shrink-0" />
                    <span className="truncate">{store.website.replace(/^https?:\/\//, "")}</span>
                    <ExternalLink size={11} />
                  </a>
                )}
                {store.instagram && (
                  <a
                    href={`https://instagram.com/${store.instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-pink-400 hover:text-pink-300 transition-colors"
                  >
                    <span className="shrink-0 font-bold text-xs">IG</span>
                    @{store.instagram.replace("@", "")}
                  </a>
                )}
                {store.email && (
                  <a href={`mailto:${store.email}`} className="flex items-center gap-3 text-sm text-slate-300 hover:text-white transition-colors">
                    <span className="text-slate-500 shrink-0 text-xs">✉</span> {store.email}
                  </a>
                )}
                {store.address && (
                  <div className="flex items-start gap-3 text-sm text-slate-400">
                    <MapPin size={15} className="text-slate-500 shrink-0 mt-0.5" />
                    <span>{store.address}</span>
                  </div>
                )}
                {store.opening_hours && (
                  <div className="flex items-start gap-3 text-sm text-slate-400">
                    <Clock size={15} className="text-slate-500 shrink-0 mt-0.5" />
                    <span className="whitespace-pre-line">{store.opening_hours}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Services */}
            {(store.delivery || store.pickup || store.pix_br) && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">Serviços</h2>
                <div className="space-y-2">
                  {store.delivery && (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle2 size={14} className="text-emerald-500" /> Entrega disponível
                    </div>
                  )}
                  {store.pickup && (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle2 size={14} className="text-emerald-500" /> Retirada na loja
                    </div>
                  )}
                  {store.pix_br && (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle2 size={14} className="text-emerald-500" /> Aceita Pix (BR)
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CTA compare */}
            <Link
              href={`/products?store=${store.id}`}
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-3 text-sm font-bold text-white transition-colors"
            >
              <Package size={15} />
              Ver todos os produtos
            </Link>
          </div>

          {/* Offers */}
          <div className="lg:col-span-2">
            <StoreOffers offers={offersReal} />
          </div>
        </div>

        {/* Related stores */}
        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-bold text-white mb-5">Outras lojas</h2>
            <StoreGrid stores={related} />
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
