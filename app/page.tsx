export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { SITE_URL } from "@/constants/routes";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/home/Hero";
import Categories from "@/components/home/Categories";
import Offers from "@/components/home/Offers";
import FeaturesStores from "@/components/home/FeaturesStores";
import AIShowcase from "@/components/home/AIShowcase";
import HowItWorks from "@/components/home/HowItWorks";
import Brands from "@/components/home/Brands";
import Stats from "@/components/home/Stats";
import CTASection from "@/components/home/CTASection";
import ForLojistasSection from "@/components/home/ForLojistasSection";
import { getStores } from "@/services/store.service";
import { getBrands } from "@/services/brand.service";
import { getCategories } from "@/services/category.service";
import { getProductsCatalog } from "@/services/product.service";
import { ProductHighlight } from "@/types/product";

export const metadata: Metadata = {
  title: "ParaguAI — Compare preços e venda no Paraguai",
  description:
    "Pesquise produtos, compare preços entre lojas e descubra as melhores ofertas no Paraguai. Lojistas: cadastre sua loja e sincronize produtos automaticamente.",
  keywords: ["Paraguai", "Ciudad del Este", "comparador de preços", "eletrônicos", "importados", "lojista Paraguai", "marketplace Paraguai"],
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "ParaguAI — Compare preços e venda no Paraguai",
    description:
      "A maior plataforma de comparação de preços do Paraguai. Para compradores e lojistas de Ciudad del Este.",
    url: SITE_URL,
    siteName: "ParaguAI",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "ParaguAI — Compare preços e venda no Paraguai",
    description:
      "A maior plataforma de comparação de preços do Paraguai. Para compradores e lojistas de Ciudad del Este.",
  },
};

export default async function Home() {
  const [stores, brands, categories, catalogResult] = await Promise.all([
    getStores(),
    getBrands(),
    getCategories(),
    getProductsCatalog({ perPage: 4 }),
  ]);

  const featuredProducts: ProductHighlight[] = catalogResult.products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    imageUrl: p.image_url,
    priceUSD: p.lowestPriceUSD ?? undefined,
    inStock: p.inStock,
  }));

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <Navbar />
      <Hero />
      <Categories categories={categories} />
      <Offers products={featuredProducts} />
      <FeaturesStores stores={stores} />
      <AIShowcase />
      <HowItWorks />
      <Brands brands={brands} />
      <Stats />
      <ForLojistasSection />
      <CTASection />
      <Footer />
    </main>
  );
}
