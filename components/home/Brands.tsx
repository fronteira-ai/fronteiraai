import Section from "@/components/ui/Section";
import SectionTitle from "@/components/ui/SectionTitle";
import Reveal from "@/components/ui/Reveal";
import { Brand } from "@/types/brand";

type Props = {
  brands: Brand[];
};

export default function Brands({ brands }: Props) {
  return (
    <Section>
      <SectionTitle eyebrow="Marcas" title="As marcas que você confia" />

      <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
        {brands.map((brand, index) => (
          <Reveal key={brand.id} direction="none" delay={index * 50}>
            <span className="text-xl font-bold tracking-tight text-slate-500 transition-all duration-300 hover:scale-110 hover:text-white">
              {brand.name}
            </span>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
