import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Breadcrumb from "@/components/ui/Breadcrumb";
import ProductHeader from "@/components/product/ProductHeader";
import RelatedProducts from "@/components/product/RelatedProducts";
import CompareSummary from "@/components/compare/CompareSummary";
import CompareOfferCard from "@/components/compare/CompareOfferCard";
import BestDealCard from "@/components/product/BestDealCard";
import ShouldIBuyNowCard from "@/components/product/ShouldIBuyNowCard";
import TrustCard from "@/components/product/TrustCard";
import { getProductComparisonBySlug } from "@/services/compare.service";
import { getRelatedProducts } from "@/services/product.service";
import { compareUrl, productPath } from "@/constants/routes";

const getCachedComparison = cache(getProductComparisonBySlug);

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getCachedComparison(slug);
  if (!result) return {};

  const { product, summary } = result;
  const title = `Comparar ${product.name} — ${summary.storeCount} loja${summary.storeCount !== 1 ? "s" : ""} no ParaguAI`;
  const description = summary.lowestPriceUSD
    ? `Compare ${product.name} em ${summary.storeCount} lojas. Menor preço: $${summary.lowestPriceUSD.toFixed(2)} USD. Economize até $${(summary.absoluteDifferenceUSD ?? 0).toFixed(2)}.`
    : `Compare ${product.name} entre lojas do Paraguai no ParaguAI.`;

  return {
    title,
    description,
    alternates: { canonical: compareUrl(slug) },
    openGraph: { title, description },
    twitter: { card: "summary", title, description },
  };
}

export default async function ComparePage({ params }: Props) {
  const { slug } = await params;

  const result = await getCachedComparison(slug);
  if (!result) notFound();

  const { product, offers, summary, bestDeal, bestDealStoreName, purchaseTiming, trust } = result;

  const relatedProducts = product.category_id
    ? await getRelatedProducts(product.category_id, product.id)
    : [];

  const breadcrumbItems = [
    ...(product.category
      ? [{ label: product.category.name, href: `/products?category=${product.category.slug}` }]
      : []),
    { label: product.name, href: productPath(slug) },
    { label: "Comparar" },
  ];

  return (
    <main className="min-h-screen bg-[#050816] text-white">

      <Navbar />

      <div className="mx-auto max-w-5xl px-6 pt-32 pb-24">

        <Breadcrumb items={breadcrumbItems} />

        {/* Product header */}
        <div className="mt-10">
          <ProductHeader product={product} />
        </div>

        {/* Best Deal */}
        {bestDeal ? (
          <div className="mt-10">
            <BestDealCard bestDeal={bestDeal} storeName={bestDealStoreName ?? ""} />
          </div>
        ) : null}

        {/* Should I Buy Now */}
        {purchaseTiming ? (
          <div className="mt-6">
            <ShouldIBuyNowCard timing={purchaseTiming} />
          </div>
        ) : null}

        {/* Trust */}
        {trust ? (
          <div className="mt-6">
            <TrustCard trust={trust} />
          </div>
        ) : null}

        {/* Summary stats */}
        <div className="mt-10">
          <CompareSummary summary={summary} />
        </div>

        {/* Ranked offers */}
        <section className="mt-8">

          <h2 className="text-2xl font-bold text-white">
            Ofertas ({offers.length})
          </h2>

          {offers.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-10 text-center">
              <p className="text-slate-400">
                Ainda não encontramos nenhuma loja vendendo este produto.
                Volte em breve — novas ofertas são adicionadas com frequência.
              </p>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-4">
              {offers.map((rankedOffer) => (
                <CompareOfferCard
                  key={rankedOffer.offer.id}
                  rankedOffer={rankedOffer}
                />
              ))}
            </div>
          )}

        </section>

        {/* Related products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <RelatedProducts products={relatedProducts} />
          </div>
        )}

      </div>

      <Footer />

    </main>
  );
}
