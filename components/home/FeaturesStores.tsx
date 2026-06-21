import Section from "@/components/ui/Section";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import StoreCard from "@/components/store/StoreCard";
import { Store } from "@/types/store";

type StoreDisplay = Store & { productCount?: number };

type Props = {
  stores: StoreDisplay[];
};

export default function FeaturesStores({ stores }: Props) {
  return (
    <Section id="lojas">
      <SectionTitle
        eyebrow="Lojas parceiras"
        title="Lojas em destaque"
        description="As lojas mais confiáveis do Paraguai, monitoradas pelo ParaguAI."
      />

      <div className="grid gap-8 lg:grid-cols-3">
        {stores.map((store, index) => (
          <Reveal key={store.id} direction="up" delay={index * 90}>
            <StoreCard store={store} productCount={store.productCount} />
          </Reveal>
        ))}
      </div>

      <div className="mt-12 flex justify-center">
        <Button href="/stores" variant="secondary">
          Ver todas as lojas
        </Button>
      </div>
    </Section>
  );
}
