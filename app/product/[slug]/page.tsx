"use client";

import { notFound, useParams } from "next/navigation";
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
import { useProduct } from "@/hooks/useProduct";
import Loading from "./loading";

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const {
    product,
    offers,
    relatedProducts,
    loading,
    notFound: productNotFound,
  } = useProduct(params.slug);

  // Renderizado durante o fluxo de render (não em efeito), para que o
  // notFound() seja capturado corretamente pelo not-found.tsx da rota.
  if (!loading && (productNotFound || !product)) {
    notFound();
  }

  if (loading || !product) {
    return <Loading />;
  }

  return (
    <main className="min-h-screen bg-[#050816] text-white">

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

            <div className="mt-6 flex flex-wrap gap-3">
              <FavoriteButton product={product} />
              <ShareButton slug={product.slug} title={product.name} />
            </div>
          </div>

        </div>

        <div className="mt-12 flex flex-col gap-8">
          <ProductSpecifications specifications={product.specifications} />
          <ProductOffers offers={offers} />
          <RelatedProducts products={relatedProducts} />
        </div>

      </div>

      <Footer />

    </main>
  );
}
