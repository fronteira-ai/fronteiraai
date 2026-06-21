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
import { sampleCategories } from "@/constants/categories";
import { Store } from "@/types/store";
import { Brand } from "@/types/brand";
import { ProductHighlight } from "@/types/product";

// Dados de exemplo: a Home ainda não busca do Supabase (ver relatório da
// Sprint 3.0). Cada seção recebe os dados via props com os tipos reais do
// domínio, bastando substituir estes arrays por chamadas de hooks/services
// no futuro, sem alterar os componentes.

const sampleStores: (Store & { productCount: number })[] = [
  {
    id: "1",
    name: "Cellshop",
    slug: "cellshop",
    description: "Eletrônicos e smartphones",
    city: "Ciudad del Este",
    country: "Paraguai",
    rating: 4.9,
    logo_url: null,
    banner_url:
      "https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=800",
    verified: true,
    created_at: new Date().toISOString(),
    productCount: 18500,
  },
  {
    id: "2",
    name: "Shopping China",
    slug: "shopping-china",
    description: "Variedades e importados",
    city: "Ciudad del Este",
    country: "Paraguai",
    rating: 4.8,
    logo_url: null,
    banner_url:
      "https://images.unsplash.com/photo-1481437156560-3205f6a55735?w=800",
    verified: true,
    created_at: new Date().toISOString(),
    productCount: 26000,
  },
  {
    id: "3",
    name: "Nissei",
    slug: "nissei",
    description: "Tecnologia e eletrônicos",
    city: "Ciudad del Este",
    country: "Paraguai",
    rating: 4.8,
    logo_url: null,
    banner_url:
      "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=800",
    verified: true,
    created_at: new Date().toISOString(),
    productCount: 15200,
  },
];

const sampleProducts: ProductHighlight[] = [
  {
    id: "1",
    slug: "iphone-17-pro",
    name: "iPhone 17 Pro 256GB",
    imageUrl: null,
    storeName: "Cellshop",
    priceUSD: 899,
    originalPriceUSD: 999,
    inStock: true,
  },
  {
    id: "2",
    slug: "notebook-gamer-rog",
    name: "Notebook Gamer ASUS ROG",
    imageUrl: null,
    storeName: "Nissei",
    priceUSD: 1299,
    inStock: true,
  },
  {
    id: "3",
    slug: "apple-watch-ultra-2",
    name: "Apple Watch Ultra 2",
    imageUrl: null,
    storeName: "Shopping China",
    priceUSD: 729,
    originalPriceUSD: 799,
    inStock: true,
  },
  {
    id: "4",
    slug: "dji-mini-4-pro",
    name: "DJI Mini 4 Pro",
    imageUrl: null,
    storeName: "Cellshop",
    priceUSD: 759,
    inStock: false,
  },
];

const sampleBrands: Brand[] = [
  "Apple",
  "Samsung",
  "DJI",
  "Sony",
  "Garmin",
  "Asus",
  "Lenovo",
  "Logitech",
].map((name, index) => ({
  id: String(index + 1),
  name,
  slug: name.toLowerCase(),
  logo_url: null,
  created_at: new Date().toISOString(),
}));

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <Navbar />
      <Hero />
      <Categories categories={sampleCategories} />
      <Offers products={sampleProducts} />
      <FeaturesStores stores={sampleStores} />
      <AIShowcase />
      <HowItWorks />
      <Brands brands={sampleBrands} />
      <Stats />
      <CTASection />
      <Footer />
    </main>
  );
}
