export const dynamic = "force-dynamic";

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
import { getStores } from "@/services/store.service";
import { getBrands } from "@/services/brand.service";
import { getCategories } from "@/services/category.service";
import { getProductsCatalog } from "@/services/product.service";
import { ProductHighlight } from "@/types/product";

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
      <CTASection />
      <Footer />
    </main>
  );
}
