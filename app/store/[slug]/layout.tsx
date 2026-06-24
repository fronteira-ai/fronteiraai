import { cache } from "react";
import type { Metadata } from "next";
import { getStoreBySlug } from "@/services/store.service";
import { storeUrl } from "@/constants/routes";

type Params = Promise<{ slug: string }>;

// generateMetadata e este layout precisam da mesma loja; cache() evita
// buscar duas vezes na mesma requisicao de servidor (mesmo padrao de
// app/product/[slug]/layout.tsx).
const getCachedStore = cache(getStoreBySlug);

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await getCachedStore(slug);

  if (!store) {
    return {
      title: "Loja não encontrada | ParaguAI",
      description: "A loja que você procura não foi encontrada no ParaguAI.",
    };
  }

  const title = `${store.name} | ParaguAI`;
  const description = store.description
    ? store.description.slice(0, 160)
    : `Confira os produtos e ofertas de ${store.name} no ParaguAI.`;

  const url = storeUrl(store.slug);
  const images = store.cover_image
    ? [store.cover_image]
    : store.logo_url
      ? [store.logo_url]
      : [];

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "ParaguAI",
      images,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
  };
}

export default async function StoreLayout({
  params,
  children,
}: {
  params: Params;
  children: React.ReactNode;
}) {
  const { slug } = await params;
  const store = await getCachedStore(slug);

  const jsonLd = store
    ? {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: store.name,
        description: store.description,
        image: store.cover_image ?? store.logo_url ?? undefined,
        url: storeUrl(store.slug),
        telephone: store.phone ?? undefined,
        email: store.email ?? undefined,
        address: {
          "@type": "PostalAddress",
          streetAddress: store.address ?? undefined,
          addressLocality: store.city,
          addressCountry: store.country,
        },
      }
    : null;

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      ) : null}

      {children}
    </>
  );
}
