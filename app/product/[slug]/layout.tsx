import { cache } from "react";
import type { Metadata } from "next";
import { getProductBySlug } from "@/services/product.service";
import { getOffersByProduct } from "@/services/offer.service";
import { productUrl } from "@/constants/routes";

type Params = Promise<{ slug: string }>;

// generateMetadata e este layout precisam do mesmo produto/ofertas; cache()
// evita buscar duas vezes na mesma requisição de servidor.
const getCachedProduct = cache(getProductBySlug);
const getCachedOffers = cache(getOffersByProduct);

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getCachedProduct(slug);

  if (!product) {
    return {
      title: "Produto não encontrado | ParaguAI",
      description:
        "O produto que você procura não foi encontrado no ParaguAI.",
    };
  }

  const title = product.brand
    ? `${product.name} - ${product.brand.name} | ParaguAI`
    : `${product.name} | ParaguAI`;

  const description = product.description
    ? product.description.slice(0, 160)
    : `Compare o preço de ${product.name} em várias lojas do Paraguai com o ParaguAI.`;

  const url = productUrl(product.slug);
  const images = product.image_url ? [product.image_url] : [];

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

export default async function ProductLayout({
  params,
  children,
}: {
  params: Params;
  children: React.ReactNode;
}) {
  const { slug } = await params;
  const product = await getCachedProduct(slug);
  const offers = product ? await getCachedOffers(product.id) : [];

  const jsonLd = product
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.description,
        image: product.image_url ? [product.image_url] : undefined,
        brand: product.brand
          ? { "@type": "Brand", name: product.brand.name }
          : undefined,
        category: product.category?.name,
        offers:
          offers.length > 0
            ? offers.map((offer) => ({
                "@type": "Offer",
                price: offer.price_usd.toFixed(2),
                priceCurrency: "USD",
                availability: offer.in_stock
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
                url: offer.product_url ?? productUrl(product.slug),
                seller: offer.store
                  ? { "@type": "Organization", name: offer.store.name }
                  : undefined,
              }))
            : undefined,
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
