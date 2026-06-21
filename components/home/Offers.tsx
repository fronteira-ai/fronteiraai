import Section from "@/components/ui/Section";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import ProductHighlightCard from "@/components/product/ProductHighlightCard";
import { ProductHighlight } from "@/types/product";

type Props = {
  products: ProductHighlight[];
};

export default function Offers({ products }: Props) {
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
            <ProductHighlightCard product={product} />
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
