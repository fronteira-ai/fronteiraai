import { notFound } from "next/navigation";
import Link from "next/link";
import { Scale } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Breadcrumb from "@/components/ui/Breadcrumb";
import ProductGallery from "@/components/product/ProductGallery";
import ProductHeader from "@/components/product/ProductHeader";
import ProductSpecifications from "@/components/product/ProductSpecifications";
import ProductOffers from "@/components/product/ProductOffers";
import RelatedProducts from "@/components/product/RelatedProducts";
import FavoriteButton from "@/components/product/FavoriteButton";
import ShareButton from "@/components/product/ShareButton";
import ProductViewTracker from "@/components/product/ProductViewTracker";
import SavingsCallout from "@/components/product/SavingsCallout";
import IntelligenceBadges from "@/components/product/IntelligenceBadges";
import { comparePath } from "@/constants/routes";
import { getCachedProduct, getCachedOffers, getCachedRelatedProducts, getCachedIntelligence } from "./_cache";

type Params = Promise<{ slug: string }>;

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;

  const product = await getCachedProduct(slug);

  if (!product) {
    notFound();
  }

  const [offers, relatedProducts, intelligence] = await Promise.all([
    getCachedOffers(product.id),
    getCachedRelatedProducts(product.category_id, product.id),
    getCachedIntelligence(product.id),
  ]);

  return (
    <main className="min-h-screen bg-[#050816] text-white">

      <ProductViewTracker productId={product.id} />

      <Navbar />

      <div className="mx-auto max-w-7xl px-6 pt-32 pb-24">

        <Breadcrumb
          items={[
            ...(product.category
              ? [{ label: product.category.name, href: `/products?category=${product.category.slug}` }]
              : []),
            { label: product.name },
          ]}
        />

        <div className="mt-10 grid gap-12 lg:grid-cols-2">

          <ProductGallery
            images={product.image_url ? [product.image_url] : []}
            alt={product.name}
          />

          <div>
            <ProductHeader product={product} />

            <IntelligenceBadges comparison={intelligence.comparison} />

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={comparePath(product.slug)}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                <Scale size={16} />
                Comparar preços
              </Link>

              <FavoriteButton product={product} />
              <ShareButton slug={product.slug} title={product.name} />
            </div>
          </div>

        </div>

        <div className="mt-12 flex flex-col gap-8">
          <SavingsCallout comparison={intelligence.comparison} />
          <ProductSpecifications specifications={product.specifications} />
          <ProductOffers offers={offers} />
          <RelatedProducts products={relatedProducts} />
        </div>

      </div>

      <Footer />

    </main>
  );
}
