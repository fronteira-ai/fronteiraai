import { Radio, ShieldCheck, Brain, History, Lock } from "lucide-react";
import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";

const benefits = [
  { icon: Radio, title: "Preços sempre atualizados", description: "Dados direto das lojas, em tempo real" },
  { icon: ShieldCheck, title: "Lojas verificadas", description: "Avaliadas antes de aparecerem para você" },
  { icon: Brain, title: "Recomendação com evidência", description: "Cada sugestão vem com o motivo" },
  { icon: History, title: "Histórico de preços", description: "Saiba se o preço de hoje é bom" },
  { icon: Lock, title: "Compra protegida", description: "Transparência do início ao fim" },
] as const;

// Release 1.9 — Program F — Wave 1 (revision). Thin horizontal strip, per
// the CTO's refined reference — static copy by nature, no service to
// duplicate.
export default function Benefits() {
  return (
    <section className="border-y border-slate-800 bg-slate-900/30 py-6">
      <Container>
        <Reveal direction="up">
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-5">
            {benefits.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                  <Icon size={18} />
                </span>
                <div>
                  <p className="text-sm font-bold text-white">{title}</p>
                  <p className="text-xs text-slate-500">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
