import { Search, Scale, PiggyBank } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionTitle from "@/components/ui/SectionTitle";
import FeatureCard from "@/components/ui/FeatureCard";
import Reveal from "@/components/ui/Reveal";

const steps = [
  {
    step: "01",
    icon: Search,
    title: "Busque",
    description: "Diga o que você quer comprar.",
  },
  {
    step: "02",
    icon: Scale,
    title: "Analisamos",
    description: "Preço, confiança e timing, cruzados na hora.",
  },
  {
    step: "03",
    icon: PiggyBank,
    title: "Decida",
    description: "Receba uma recomendação clara, com o porquê.",
  },
];

export default function HowItWorks() {
  return (
    <Section>
      <SectionTitle
        eyebrow="Como funciona"
        title="Simples, rápido e inteligente"
        description="Três passos para encontrar a melhor compra no Paraguai."
      />

      <div className="grid gap-6 sm:grid-cols-3">
        {steps.map((item, index) => (
          <Reveal key={item.step} direction="up" delay={index * 100}>
            <FeatureCard
              step={item.step}
              icon={item.icon}
              title={item.title}
              description={item.description}
            />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
