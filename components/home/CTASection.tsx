import Section from "@/components/ui/Section";
import GradientCard from "@/components/ui/GradientCard";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";

export default function CTASection() {
  return (
    <Section>
      <Reveal direction="up">
        <GradientCard className="flex flex-col items-center text-center">
          <h2 className="max-w-2xl text-4xl font-black text-white sm:text-5xl">
            Pronto para comprar com inteligência?
          </h2>

          <p className="mt-5 max-w-xl text-lg text-slate-400">
            Pesquise agora e descubra a melhor oferta entre centenas de lojas
            no Paraguai.
          </p>

          <Button href="/search" variant="primary" className="mt-10">
            Pesquisar agora
          </Button>
        </GradientCard>
      </Reveal>
    </Section>
  );
}
