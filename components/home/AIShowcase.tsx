import { Bot } from "lucide-react";
import Section from "@/components/ui/Section";
import Badge from "@/components/ui/Badge";
import Chip from "@/components/ui/Chip";
import Button from "@/components/ui/Button";
import GradientCard from "@/components/ui/GradientCard";
import Reveal from "@/components/ui/Reveal";

const examples = [
  "Quero um iPhone até US$900",
  "Melhor notebook para arquitetura",
  "Qual câmera comprar para YouTube?",
  "DJI ou GoPro?",
];

export default function AIShowcase() {
  return (
    <Section id="ia">
      <Reveal direction="up">
        <GradientCard className="flex flex-col items-center text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
            <Bot size={32} />
          </div>

          <Badge className="mt-8">Assistente de compras</Badge>

          <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold text-white sm:text-4xl">
            Pergunte. A IA do ParaguAI encontra a melhor compra para você.
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
            Descreva o que você precisa em poucas palavras e deixe a nossa IA
            comparar preços, lojas e especificações por você.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {examples.map((example) => (
              <Chip key={example}>{example}</Chip>
            ))}
          </div>

          <Button href="/search" variant="primary" className="mt-10">
            Perguntar para a IA
          </Button>
        </GradientCard>
      </Reveal>
    </Section>
  );
}
