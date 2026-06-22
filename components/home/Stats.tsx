import Section from "@/components/ui/Section";
import StatCard from "@/components/ui/StatCard";
import Reveal from "@/components/ui/Reveal";

const stats = [
  { value: 500000, suffix: "+", label: "Produtos monitorados" },
  { value: 350, suffix: "+", label: "Lojas parceiras" },
  { value: 2000000, suffix: "+", label: "Ofertas analisadas" },
  { value: 12000, suffix: "+", label: "Atualizações por dia" },
];

export default function Stats() {
  return (
    <Section>
      <div className="flex flex-wrap justify-center gap-6">
        {stats.map((stat, index) => (
          <Reveal key={stat.label} direction="up" delay={index * 80}>
            <StatCard
              value={stat.value}
              suffix={stat.suffix}
              label={stat.label}
            />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
