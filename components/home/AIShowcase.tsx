import { Bot } from "lucide-react";
import Section from "@/components/ui/Section";
import Badge from "@/components/ui/Badge";
import Chip from "@/components/ui/Chip";
import Button from "@/components/ui/Button";
import GradientCard from "@/components/ui/GradientCard";
import Reveal from "@/components/ui/Reveal";

// Program UX — Mission UX-1B. Every example below shows an outcome the IA
// already produces on real search results (verdict/verification/timing
// badges), never a chat prompt — the previous version's question-style
// chips implied a conversational assistant that doesn't exist.
const examples = [
  "🟢 Comprar agora — 12% abaixo da média",
  "🛡️ Loja verificada há 8 meses",
  "🕒 Melhor aguardar — câmbio em queda",
  "🏆 Melhor compra entre 6 ofertas",
];

export default function AIShowcase() {
  return (
    <Section id="ia">
      <Reveal direction="up">
        <GradientCard className="flex flex-col items-center text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
            <Bot size={32} />
          </div>

          <Badge className="mt-8">Inteligência aplicada</Badge>

          <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold text-white sm:text-4xl">
            Toda busca já vem com a decisão pronta.
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
            Busque um produto e veja, na hora, se o preço é bom, se a loja é
            confiável e se vale a pena comprar agora.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {examples.map((example) => (
              <Chip key={example}>{example}</Chip>
            ))}
          </div>

          <Button href="/search" variant="primary" className="mt-8">
            Descobrir a melhor compra
          </Button>
        </GradientCard>
      </Reveal>
    </Section>
  );
}
