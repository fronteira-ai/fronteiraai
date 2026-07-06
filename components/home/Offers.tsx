import Section from "@/components/ui/Section";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import ProductCard from "@/components/product/ProductCard";
import { ProductHighlight } from "@/types/product";
import { getProductsCatalog } from "@/services/product.service";

const FEATURED_PRODUCTS_LIMIT = 4;

// "Produtos Mais Buscados"/"Produtos Populares" — reuses the existing
// product catalog service (services/product.service.ts, pre-existing,
// unchanged) rather than a new query.
export default async function Offers() {
  const { products: catalogProducts } = await getProductsCatalog({ perPage: FEATURED_PRODUCTS_LIMIT });
  const products: ProductHighlight[] = catalogProducts.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    imageUrl: p.image_url,
    priceUSD: p.lowestPriceUSD ?? undefined,
    inStock: p.inStock,
  }));

  return (
    <Section id="produtos">
      <SectionTitle
        eyebrow="Em destaque"
        title="Produtos em destaque"
        description="As melhores ofertas encontradas pelo ParaguAI nas últimas horas."
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product, index) => (
          <Reveal key={product.id} direction="up" delay={index * 70}>
            <ProductCard
              slug={product.slug}
              name={product.name}
              imageUrl={product.imageUrl}
              priceUSD={product.priceUSD}
              originalPriceUSD={product.originalPriceUSD}
              subtitle={product.storeName}
              inStock={product.inStock}
            />
          </Reveal>
        ))}
      </div>

      <div className="mt-12 flex justify-center">
        <Button href="/products" variant="secondary">
          Ver todos os produtos
        </Button>
      </div>
    </Section>
  );
}
